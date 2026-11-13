import { doesNotThrow, throws } from "node:assert/strict"
import { test } from "node:test"
import { assertDatabaseIdentity } from "../runner/database.ts"

test("the seed guard requires database, user and instance identity", () => {
  const identity = { database: "owned-db", username: "owned-user", cluster: "owned-run" }
  doesNotThrow(() => assertDatabaseIdentity({ ...identity }, identity))
  for (const key of Object.keys(identity) as Array<keyof typeof identity>) {
    throws(() => assertDatabaseIdentity({ ...identity, [key]: "other" }, identity), /does not belong/)
  }
  throws(() => assertDatabaseIdentity(undefined, identity), /does not belong/)
})
