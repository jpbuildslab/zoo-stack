import type { IncomingMessage, RequestListener, ServerResponse } from "node:http"
import { prepareSchema, withOwnedDatabase, type Pool } from "../fixtures/service-requests/runner/database.ts"
import { startLocalServer } from "../fixtures/service-requests/runner/listener.ts"
import { requestHandler } from "../fixtures/service-requests/src/server/http.ts"
import { readActor } from "../fixtures/service-requests/src/server/session.ts"
import {
  confirmSchedule, prepareReferenceSchema, recoverSchedule, reviewSchedule,
  type Operation, type Review, type Result,
} from "./rescheduling.ts"

const rejectionStatus: Record<Extract<Result<never>, { ok: false }>["error"], number> = {
  forbidden: 403, not_found: 404, not_approved: 409, invalid_time: 422, unchanged_time: 422,
  invalid_key: 422, review_unavailable: 404, key_conflict: 409, stale_review: 409, operation_unavailable: 404,
}

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" })
  response.end(JSON.stringify(body))
}

async function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  let body = ""
  for await (const chunk of request) {
    body += chunk
    if (body.length > 4_096) throw new Error("Reference request body is too large")
  }
  const parsed = JSON.parse(body)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected an object")
  return parsed
}

interface Faults {
  beforeConfirm?: (key: unknown) => Promise<void>
  dropResponse?: (key: unknown) => boolean
}

export async function runReference<T>(
  faults: Faults,
  exercise: (pool: Pool, origin: string) => Promise<T>,
  mount: (pool: Pool) => RequestListener = requestHandler,
): Promise<T> {
  return withOwnedDatabase(async (pool, identity) => {
    await prepareSchema(pool, identity)
    await prepareReferenceSchema(pool)
    const fallback = mount(pool)
    const server = await startLocalServer((request, response) => {
      const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname
      const route = /^\/api\/requests\/([a-z0-9-]+)\/reschedule\/(review|confirm|operations\/([a-zA-Z0-9_-]+))$/.exec(path)
      if (!route) {
        fallback(request, response)
        return
      }
      const actor = readActor(request)
      if (!actor) {
        send(response, 401, { error: "session_required" })
        return
      }
      const actorId = actor.id
      const [, id, action, key] = route
      async function handle() {
        let result: Result<Review | Operation>
        if (request.method === "POST" && action === "review") {
          result = await reviewSchedule(pool, actorId, id, (await readBody(request)).proposedStart)
        } else if (request.method === "POST" && action === "confirm") {
          const body = await readBody(request)
          await faults.beforeConfirm?.(body.operationKey)
          result = await confirmSchedule(pool, actorId, id, body.reviewId, body.operationKey)
          if (result.ok && faults.dropResponse?.(body.operationKey)) {
            response.destroy()
            return
          }
        } else if (request.method === "GET" && key) {
          result = await recoverSchedule(pool, actorId, id, key)
        } else {
          send(response, 405, { error: "method_not_allowed" })
          return
        }
        if (result.ok) send(response, 200, result.value)
        else send(response, rejectionStatus[result.error], { error: result.error })
      }
      void handle().catch(() => send(response, 500, { error: "reference_error" }))
    })
    try {
      return await exercise(pool, server.origin)
    } finally {
      await server.close()
    }
  })
}
