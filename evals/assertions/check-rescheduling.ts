import { deepEqual, equal, match, rejects } from "node:assert/strict"
import { test } from "node:test"
import type { Pool } from "../fixtures/service-requests/runner/database.ts"
import type { Operation, Review } from "../reference/rescheduling.ts"
import { runReference } from "../reference/server.ts"

const requestId = "cedar-approved"
const oldTime = "2030-01-12T10:00:00.000Z"
const newTime = "2030-01-12T14:30:00.000Z"
const alternateTime = "2030-01-12T16:30:00.000Z"
const coordinator = "cedar-coordinator"
const basePath = `/api/requests/${requestId}/reschedule`

function call(origin: string, path: string, actor: string, body?: object) {
  return fetch(origin + path, {
    method: body ? "POST" : "GET",
    headers: { cookie: `fixture_session=${actor}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(6_000),
  })
}

async function review(origin: string, proposedStart: string): Promise<Review> {
  const response = await call(origin, `${basePath}/review`, coordinator, { proposedStart })
  equal(response.status, 200)
  return await response.json() as Review
}

async function rejected(response: Response, status: number, error: string): Promise<void> {
  equal(response.status, status)
  deepEqual(await response.json(), { error })
}

async function assertPersisted(pool: Pool, scheduledStart: string, revision: number, count: number): Promise<void> {
  const { rows } = await pool.query(
    "SELECT scheduled_start, revision FROM service_requests WHERE id = $1", [requestId],
  )
  deepEqual(rows.map((row) => [row.scheduled_start.toISOString(), row.revision]), [[scheduledStart, revision]])
  const operations = await pool.query("SELECT count(*)::int AS count FROM schedule_operations")
  equal(operations.rows[0].count, count)
}

test("the reference rejects invalid requests and recovers the original committed effect after a lost response", async () => {
  let dropped = 0
  await runReference({
    dropResponse: (key) => {
      if (key !== "lost-reply" || dropped > 0) return false
      dropped += 1
      return true
    },
  }, async (pool, origin) => {
    const path = `${basePath}/review`
    await rejected(await call(origin, path, "birch-coordinator", { proposedStart: newTime, workspace: "cedar" }), 404, "not_found")
    await rejected(await call(origin, path, "cedar-viewer", { proposedStart: newTime, canSchedule: true }), 403, "forbidden")
    for (const proposedStart of ["2030-02-30T10:00:00Z", "2030-01-10T12:00:00Z", null]) {
      await rejected(await call(origin, path, coordinator, { proposedStart }), 422, "invalid_time")
    }
    await rejected(await call(origin, path, coordinator, { proposedStart: oldTime }), 422, "unchanged_time")
    for (const id of ["cedar-cancelled", "cedar-submitted"]) {
      await rejected(await call(origin, `/api/requests/${id}/reschedule/review`, coordinator, { proposedStart: newTime }), 409, "not_approved")
    }
    await assertPersisted(pool, oldTime, 2, 0)

    const first = await review(origin, newTime)
    const equivalent = await review(origin, newTime)
    const different = await review(origin, alternateTime)
    deepEqual([first.requestId, first.revision, first.previousStart, first.proposedStart],
      [requestId, 2, oldTime, newTime])
    await assertPersisted(pool, oldTime, 2, 0)
    const confirmPath = `${basePath}/confirm`
    const operationKey = "lost-reply"
    await rejected(await call(origin, confirmPath, "birch-coordinator", { reviewId: first.reviewId, operationKey }), 404, "not_found")
    await rejected(await call(origin, confirmPath, "cedar-viewer", { reviewId: first.reviewId, operationKey }), 403, "forbidden")
    await assertPersisted(pool, oldTime, 2, 0)
    await rejects(call(origin, confirmPath, coordinator, { reviewId: first.reviewId, operationKey }), /fetch failed/)
    equal(dropped, 1)
    await assertPersisted(pool, newTime, 3, 1)

    const recoveryPath = `${basePath}/operations/${operationKey}`
    await rejected(await call(origin, recoveryPath, "birch-coordinator"), 404, "not_found")
    await rejected(await call(origin, recoveryPath, "cedar-viewer"), 403, "forbidden")
    const recovered = await call(origin, recoveryPath, coordinator)
    equal(recovered.status, 200)
    const result = await recovered.json() as Operation
    match(result.operationId, /^[0-9a-f-]{36}$/)
    deepEqual([result.request.id, result.request.scheduledStart, result.request.revision], [requestId, newTime, 3])
    const replay = await call(origin, confirmPath, coordinator, { reviewId: equivalent.reviewId, operationKey })
    equal(replay.status, 200)
    deepEqual(await replay.json(), result)
    await rejected(await call(origin, confirmPath, coordinator, { reviewId: different.reviewId, operationKey }), 409, "key_conflict")
    await rejected(await call(origin, confirmPath, coordinator, { reviewId: different.reviewId, operationKey: "stale" }), 409, "stale_review")
    await rejected(await call(origin, `${basePath}/operations/missing`, coordinator), 404, "operation_unavailable")
    await pool.query("UPDATE scheduling_actors SET can_schedule = false WHERE id = $1", [coordinator])
    await rejected(await call(origin, recoveryPath, coordinator), 403, "forbidden")
    await rejected(await call(origin, confirmPath, coordinator, { reviewId: first.reviewId, operationKey }), 403, "forbidden")
    await assertPersisted(pool, newTime, 3, 1)

    const approval = await call(origin, "/api/requests/cedar-submitted/approve", coordinator, {})
    equal(approval.status, 200)
    const row = await pool.query("SELECT status, revision FROM service_requests WHERE id = 'cedar-submitted'")
    deepEqual(row.rows, [{ status: "approved", revision: 2 }])
  })
})

test("two distinct keys for one review cross a barrier and advance the PostgreSQL row once", async () => {
  const { promise, resolve, reject } = Promise.withResolvers<void>()
  let deadline: ReturnType<typeof setTimeout> | undefined
  let arrivals = 0
  try {
    await runReference({
      beforeConfirm: async () => {
        arrivals += 1
        if (arrivals === 1) {
          deadline = setTimeout(() => reject(new Error("Both confirms did not reach the write barrier")), 5_000)
        }
        if (arrivals === 2) {
          clearTimeout(deadline)
          resolve()
        }
        await promise
      },
    }, async (pool, origin) => {
      const approvedReview = await review(origin, newTime)
      const responses = await Promise.all(["race-a", "race-b"].map((operationKey) =>
        call(origin, `${basePath}/confirm`, coordinator, { reviewId: approvedReview.reviewId, operationKey })))
      equal(arrivals, 2)
      deepEqual(responses.map((response) => response.status).sort(), [200, 409])
      await rejected(responses.find((response) => response.status === 409)!, 409, "stale_review")
      await assertPersisted(pool, newTime, 3, 1)
    })
  } finally {
    clearTimeout(deadline)
  }
})
