import type { Pool } from "pg"
import type { RequestStatus, ServiceRequest } from "../contract.ts"
import type { Actor } from "./session.ts"

interface RequestRow {
  id: string
  workspace: string
  title: string
  revision: number
  status: RequestStatus
  scheduled_start: Date
}

function toRequest(row: RequestRow): ServiceRequest {
  return {
    id: row.id,
    workspace: row.workspace,
    title: row.title,
    revision: row.revision,
    status: row.status,
    scheduledStart: row.scheduled_start.toISOString(),
  }
}

export async function listRequests(pool: Pool, actor: Actor): Promise<ServiceRequest[]> {
  const result = await pool.query<RequestRow>(
    "SELECT * FROM service_requests WHERE workspace = $1 ORDER BY scheduled_start, id",
    [actor.workspace],
  )
  return result.rows.map(toRequest)
}

type ApprovalResult =
  | { outcome: "approved"; request: ServiceRequest }
  | { outcome: "forbidden" | "not_found" | "not_submitted" }

export async function approveRequest(pool: Pool, actor: Actor, id: string): Promise<ApprovalResult> {
  if (!actor.canApprove) {
    return { outcome: "forbidden" }
  }

  const updated = await pool.query<RequestRow>(
    `UPDATE service_requests
        SET status = 'approved', revision = revision + 1
      WHERE id = $1 AND workspace = $2 AND status = 'submitted'
      RETURNING *`,
    [id, actor.workspace],
  )
  if (updated.rows[0]) {
    return { outcome: "approved", request: toRequest(updated.rows[0]) }
  }

  const existing = await pool.query(
    "SELECT 1 FROM service_requests WHERE id = $1 AND workspace = $2",
    [id, actor.workspace],
  )
  return { outcome: existing.rowCount ? "not_submitted" : "not_found" }
}
