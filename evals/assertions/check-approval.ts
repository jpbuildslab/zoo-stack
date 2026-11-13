import { deepEqual, equal } from "node:assert/strict"
import { realpath } from "node:fs/promises"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { prepareSchema, withOwnedDatabase } from "../fixtures/service-requests/runner/database.ts"
import { startLocalServer } from "../fixtures/service-requests/runner/listener.ts"
import type { requestHandler } from "../fixtures/service-requests/src/server/http.ts"

const candidate = process.argv[2]
if (!candidate) throw new Error("Supply the path to a trusted service-request fixture export")
const serverFile = pathToFileURL(join(await realpath(candidate), "src/server/http.ts"))
const { requestHandler: candidateHandler } = await import(serverFile.href) as { requestHandler: typeof requestHandler }

await withOwnedDatabase(async (pool, identity) => {
  await prepareSchema(pool, identity)
  const server = await startLocalServer(candidateHandler(pool))
  try {
    const response = await fetch(new URL("/api/requests/cedar-submitted/approve", server.origin), {
      method: "POST", headers: { cookie: "fixture_session=cedar-coordinator" },
    })
    equal(response.status, 200)
    const { rows } = await pool.query(
      "SELECT status, revision FROM service_requests WHERE id = $1 AND workspace = $2",
      ["cedar-submitted", "cedar"],
    )
    deepEqual(rows, [{ status: "approved", revision: 2 }], "approval must advance the stored revision once")
    const result = await response.json() as { id: string; status: string; revision: number }
    deepEqual([result.id, result.status, result.revision], ["cedar-submitted", "approved", 2])
  } finally {
    await server.close()
  }
})
console.log("Approval response and stored revision match the contract.")
