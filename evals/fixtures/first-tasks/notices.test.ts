import { strictEqual } from "node:assert"
import { test } from "node:test"
import { approvalNotice } from "./notices.ts"

test("the approval notice names the request", () => {
  strictEqual(approvalNotice("Maple Room"), "Approval completed for Maple Room.")
})
