import { deepEqual, equal, ok } from "node:assert/strict"

export function assertRaceOutcome(outcomes, before, after, proposed, actor) {
  deepEqual(outcomes.map(({ status }) => status).sort(), [200, 409])
  const winner = outcomes.find(({ status }) => status === 200)
  const loser = outcomes.find(({ status }) => status === 409)
  ok(["stale_review", "stale_revision"].includes(loser.body?.error),
    "the losing confirmation must explicitly reject the stale review")

  const original = before.requests.find(({ id }) => id === "birch-approved")
  ok(original, "the approved request must exist before confirmation")
  const scheduled = new Date(proposed)
  const expected = { ...original, revision: original.revision + 1, scheduled_start: scheduled }
  deepEqual(after.requests, before.requests.map((row) => row.id === original.id ? expected : row),
    "persist exactly one revision advance at the proposed time and preserve other requests")
  const { request, operationId } = winner.body
  deepEqual([request.id, request.workspace, request.revision, request.scheduledStart],
    [expected.id, expected.workspace, expected.revision, scheduled.toISOString()])
  ok(typeof operationId === "string" && operationId.length > 0, "the winning operation needs a durable identity")

  const operations = after.operations.filter((row) => row.request_id === original.id)
  equal(operations.length, 1, "exactly one operation must persist")
  const [operation] = operations
  deepEqual([operation.workspace, operation.actor_id, operation.operation_key, operation.result],
    [original.workspace, actor, winner.key, winner.body])
  deepEqual(after.operations.filter((row) => row.request_id !== original.id), before.operations)
}
