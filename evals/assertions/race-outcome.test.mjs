import { throws } from "node:assert/strict"
import { test } from "node:test"
import { assertRaceOutcome } from "../isolated/race-outcome.mjs"

function control() {
  const actor = "birch-coordinator"
  const proposed = "2030-01-12T14:30:00.000Z"
  const original = {
    id: "birch-approved", workspace: "birch", revision: 2, status: "approved",
    scheduled_start: new Date("2030-01-12T13:00:00.000Z"),
  }
  const result = {
    operationId: "operation-1",
    request: { id: original.id, workspace: original.workspace, revision: 3, scheduledStart: proposed },
  }
  return {
    actor, proposed,
    outcomes: [
      { key: "race-a", status: 200, body: result },
      { key: "race-b", status: 409, body: { error: "stale_review" } },
    ],
    before: { requests: [original], operations: [] },
    after: {
      requests: [{ ...original, revision: 3, scheduled_start: new Date(proposed) }],
      operations: [{ request_id: original.id, workspace: original.workspace, actor_id: actor,
        operation_key: "race-a", result }],
    },
  }
}

function check({ outcomes, before, after, proposed, actor }) {
  assertRaceOutcome(outcomes, before, after, proposed, actor)
}

test("accepts the persisted winner and explicit stale-review loser", () => check(control()))

test("accepts an explicit stale revision for the losing review", () => {
  const fixture = control()
  fixture.outcomes[1].body.error = "stale_revision"
  check(fixture)
})

test("rejects a generic 409 even when the winning response and persistence are correct", () => {
  const fixture = control()
  fixture.outcomes[1].body.error = "operation_conflict"
  throws(() => check(fixture), /explicitly reject the stale review/)
})

test("rejects the old persisted time or a double revision advance despite correct HTTP responses", () => {
  const wrongTime = control()
  wrongTime.after.requests[0].scheduled_start = wrongTime.before.requests[0].scheduled_start
  throws(() => check(wrongTime), /persist exactly one revision advance/)

  const wrongRevision = control()
  wrongRevision.after.requests[0].revision = 4
  throws(() => check(wrongRevision), /persist exactly one revision advance/)
})
