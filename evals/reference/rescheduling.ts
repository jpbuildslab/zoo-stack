import { randomUUID } from "node:crypto"
import { fixtureClock, type ServiceRequest } from "../fixtures/service-requests/src/contract.ts"
import type { Pool, PoolClient } from "../fixtures/service-requests/runner/database.ts"

interface ScheduledRow {
  id: string
  workspace: string
  title: string
  revision: number
  status: ServiceRequest["status"]
  scheduled_start: Date
}

interface ReviewRow {
  id: string
  request_id: string
  revision: number
  previous_start: Date
  proposed_start: Date
}

export interface Review {
  reviewId: string
  requestId: string
  revision: number
  previousStart: string
  proposedStart: string
}

export interface Operation {
  operationId: string
  request: ServiceRequest
}

type Rejection = "forbidden" | "not_found" | "not_approved" | "invalid_time" | "unchanged_time" |
  "invalid_key" | "review_unavailable" | "key_conflict" | "stale_review" | "operation_unavailable"
export type Result<T> = { ok: true; value: T } | { ok: false; error: Rejection }

const rejection = (error: Rejection): Result<never> => ({ ok: false, error })
const success = <T>(value: T): Result<T> => ({ ok: true, value })

export async function prepareReferenceSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE scheduling_actors (
      id text PRIMARY KEY,
      workspace text NOT NULL,
      can_schedule boolean NOT NULL
    );
    INSERT INTO scheduling_actors VALUES
      ('cedar-coordinator', 'cedar', true), ('cedar-viewer', 'cedar', false),
      ('birch-coordinator', 'birch', true);
    CREATE TABLE schedule_reviews (
      id text PRIMARY KEY,
      request_id text NOT NULL REFERENCES service_requests(id),
      workspace text NOT NULL,
      actor_id text NOT NULL REFERENCES scheduling_actors(id),
      revision integer NOT NULL,
      previous_start timestamptz NOT NULL,
      proposed_start timestamptz NOT NULL
    );
    CREATE TABLE schedule_operations (
      workspace text NOT NULL,
      actor_id text NOT NULL REFERENCES scheduling_actors(id),
      operation_key text NOT NULL,
      request_id text NOT NULL REFERENCES service_requests(id),
      fingerprint text NOT NULL,
      result jsonb NOT NULL,
      PRIMARY KEY (workspace, actor_id, operation_key)
    );
  `)
}

async function transaction<T>(pool: Pool, run: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    try {
      const result = await run(client)
      await client.query("COMMIT")
      return result
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }
  } finally {
    client.release()
  }
}

async function schedulingWorkspace(client: PoolClient, actor: string): Promise<string | undefined> {
  const { rows } = await client.query<{ workspace: string; can_schedule: boolean }>(
    "SELECT workspace, can_schedule FROM scheduling_actors WHERE id = $1 FOR UPDATE", [actor],
  )
  if (rows[0]?.can_schedule) return rows[0].workspace
}

async function lockedRequest(client: PoolClient, id: string, workspace: string): Promise<ScheduledRow | undefined> {
  const { rows } = await client.query<ScheduledRow>(
    "SELECT * FROM service_requests WHERE id = $1 AND workspace = $2 FOR UPDATE", [id, workspace],
  )
  return rows[0]
}

function utcStart(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value)) return
  const normalized = value.length === 20 ? value.replace(/Z$/, ".000Z") : value
  const parsed = new Date(normalized)
  if (Number.isFinite(parsed.valueOf()) && parsed.toISOString() === normalized && normalized > fixtureClock) {
    return normalized
  }
}

export function reviewSchedule(pool: Pool, actor: string, requestId: string, rawStart: unknown): Promise<Result<Review>> {
  return transaction(pool, async (client) => {
    const workspace = await schedulingWorkspace(client, actor)
    if (!workspace) return rejection("forbidden")
    const request = await lockedRequest(client, requestId, workspace)
    if (!request) return rejection("not_found")
    if (request.status !== "approved") return rejection("not_approved")
    const proposedStart = utcStart(rawStart)
    if (!proposedStart) return rejection("invalid_time")
    const previousStart = request.scheduled_start.toISOString()
    if (proposedStart === previousStart) return rejection("unchanged_time")
    const reviewId = randomUUID()
    await client.query(
      `INSERT INTO schedule_reviews (id, request_id, workspace, actor_id, revision, previous_start, proposed_start)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [reviewId, requestId, workspace, actor, request.revision, previousStart, proposedStart],
    )
    return success({ reviewId, requestId, revision: request.revision, previousStart, proposedStart })
  })
}

function validKey(key: unknown): key is string {
  return typeof key === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(key)
}

function toRequest(row: ScheduledRow): ServiceRequest {
  return {
    id: row.id,
    workspace: row.workspace,
    title: row.title,
    revision: row.revision,
    status: row.status,
    scheduledStart: row.scheduled_start.toISOString(),
  }
}

export function confirmSchedule(
  pool: Pool, actor: string, requestId: string, reviewId: unknown, key: unknown,
): Promise<Result<Operation>> {
  return transaction(pool, async (client) => {
    const workspace = await schedulingWorkspace(client, actor)
    if (!workspace) return rejection("forbidden")
    if (!validKey(key)) return rejection("invalid_key")
    if (typeof reviewId !== "string") return rejection("review_unavailable")
    const request = await lockedRequest(client, requestId, workspace)
    if (!request) return rejection("not_found")

    const { rows: reviews } = await client.query<ReviewRow>(
      `SELECT * FROM schedule_reviews
       WHERE id = $1 AND request_id = $2 AND workspace = $3 AND actor_id = $4`,
      [reviewId, requestId, workspace, actor],
    )
    const review = reviews[0]
    if (!review) return rejection("review_unavailable")
    const proposedStart = review.proposed_start.toISOString()
    const fingerprint = JSON.stringify([requestId, review.revision, review.previous_start.toISOString(), proposedStart])
    const { rows: prior } = await client.query<{ fingerprint: string; result: Operation }>(
      "SELECT fingerprint, result FROM schedule_operations WHERE workspace = $1 AND actor_id = $2 AND operation_key = $3",
      [workspace, actor, key],
    )
    if (prior[0]) {
      return prior[0].fingerprint === fingerprint ? success(prior[0].result) : rejection("key_conflict")
    }
    if (request.status !== "approved" || request.revision !== review.revision ||
        request.scheduled_start.toISOString() !== review.previous_start.toISOString()) {
      return rejection("stale_review")
    }

    const { rows: updated } = await client.query<ScheduledRow>(
      `UPDATE service_requests SET scheduled_start = $1, revision = revision + 1
       WHERE id = $2 AND workspace = $3 AND revision = $4 RETURNING *`,
      [proposedStart, requestId, workspace, review.revision],
    )
    if (!updated[0]) return rejection("stale_review")
    const result = { operationId: randomUUID(), request: toRequest(updated[0]) }
    await client.query(
      `INSERT INTO schedule_operations (workspace, actor_id, operation_key, request_id, fingerprint, result)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [workspace, actor, key, requestId, fingerprint, result],
    )
    return success(result)
  })
}

export function recoverSchedule(pool: Pool, actor: string, requestId: string, key: string): Promise<Result<Operation>> {
  return transaction(pool, async (client) => {
    const workspace = await schedulingWorkspace(client, actor)
    if (!workspace) return rejection("forbidden")
    if (!validKey(key)) return rejection("invalid_key")
    if (!await lockedRequest(client, requestId, workspace)) return rejection("not_found")
    const { rows } = await client.query<{ result: Operation }>(
      `SELECT result FROM schedule_operations
       WHERE workspace = $1 AND actor_id = $2 AND operation_key = $3 AND request_id = $4`,
      [workspace, actor, key, requestId],
    )
    return rows[0] ? success(rows[0].result) : rejection("operation_unavailable")
  })
}
