import { deepEqual, equal } from "node:assert/strict"
import { realpath } from "node:fs/promises"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { test } from "node:test"
import type { confirmDispatch as Gateway } from "../fixtures/api-boundaries/gateway.ts"
import type { canDiscard as Retention } from "../fixtures/api-boundaries/receipt-policy.ts"

const source = process.argv[2]
if (!source) throw new Error("Supply an API fixture export")
const root = await realpath(source)
const url = (path: string) => pathToFileURL(join(root, path)).href
const { confirmDispatch } = await import(url("gateway.ts")) as { confirmDispatch: typeof Gateway }
const { canDiscard } = await import(url("receipt-policy.ts")) as { canDiscard: typeof Retention }
const operationId = "dispatch-62"
const receiptId = "receipt-37"
const uncertain = { outcome: "uncertain", operationId }
const completedAt = Date.UTC(2030, 0, 10, 12)
const hour = 60 * 60 * 1000

test("valid acknowledgement and definite rejection retain the original identity", async () => {
  deepEqual(await confirmDispatch(operationId, async (sent) => {
    equal(sent, operationId)
    return { status: 201, body: { operationId, receiptId } }
  }), { outcome: "confirmed", operationId, receiptId })
  deepEqual(await confirmDispatch(operationId, async () => ({
    status: 422, body: { operationId, code: "not_applied" },
  })), { outcome: "rejected", operationId })
})

test("malformed or mismatched 2xx responses leave an uncertain effect", async () => {
  for (const body of [null, [], {}, { operationId, receiptId: 7 }, { operationId, receiptId: "" },
    { operationId: "another-dispatch", receiptId }, { receiptId }]) {
    deepEqual(await confirmDispatch(operationId, async () => ({ status: 200, body })), uncertain)
  }
})

test("unrecognized rejection or transport failure stays uncertain", async () => {
  for (const body of [{ operationId }, { operationId: "another-dispatch", code: "not_applied" }]) {
    deepEqual(await confirmDispatch(operationId, async () => ({ status: 422, body })), uncertain)
  }
  deepEqual(await confirmDispatch(operationId, async () => { throw new Error("offline") }), uncertain)
})

test("completed receipts cover the full retry window", () => {
  const receipt = { state: "completed", completedAt } as const
  equal(canDiscard(receipt, completedAt + 71 * hour), false)
  equal(canDiscard(receipt, completedAt + 72 * hour), false)
  equal(canDiscard(receipt, completedAt + 72 * hour + 1), true)
})

test("unresolved operations stay reconcilable after the retry window", () => {
  for (const state of ["pending", "uncertain"] as const) {
    equal(canDiscard({ state, startedAt: completedAt }, completedAt + 100 * hour), false)
  }
})
