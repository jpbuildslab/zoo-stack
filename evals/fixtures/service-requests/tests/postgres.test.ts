import { deepEqual, equal, rejects } from "node:assert/strict"
import { once } from "node:events"
import { test } from "node:test"
import { createBoundPool, prepareSchema, withOwnedDatabase } from "../runner/database.ts"
import type { RequestList, ServiceRequest } from "../src/contract.ts"
import { startServer } from "../src/server/http.ts"

test("an owned PostgreSQL fixture rejects the wrong identity and preserves scoped approval", async () => {
  await withOwnedDatabase(async (pool, identity) => {
    await rejects(prepareSchema(pool, { ...identity, cluster: "wrong-run" }), /does not belong/)
    const before = await pool.query("SELECT to_regclass('public.service_requests') AS name")
    equal(before.rows[0].name, null)
    await prepareSchema(pool, identity)

    const foreignBinding = createBoundPool({
      ...pool.options,
      password: pool.options.password,
    }, { ...identity, cluster: "wrong-run" })
    try {
      await rejects(foreignBinding.query("CREATE TABLE wrong_target_write (id text)"), /does not belong/)
      const unexpected = await pool.query("SELECT to_regclass('public.wrong_target_write') AS name")
      equal(unexpected.rows[0].name, null)
    } finally {
      await foreignBinding.end()
    }

    const killer = await pool.connect()
    try {
      const idle = await pool.connect()
      let backend: { pid: number }
      try {
        backend = (await idle.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]
      } finally {
        idle.release()
      }
      await Promise.all([
        once(pool, "error", { signal: AbortSignal.timeout(3_000) }),
        killer.query("SELECT pg_terminate_backend($1)", [backend.pid]),
      ])
      const replacement = await pool.query("SELECT current_setting('cluster_name') AS cluster")
      equal(replacement.rows[0].cluster, identity.cluster)
    } finally {
      killer.release()
    }

    const server = await startServer(pool)
    try {
      function request(path: string, session?: string, method = "GET", body?: string) {
        const headers = session ? { cookie: `fixture_session=${session}` } : undefined
        return fetch(server.origin + path, { headers, method, body })
      }
      equal((await request("/api/requests")).status, 401)
      const cedar = await request("/api/requests", "cedar-coordinator")
      equal(cedar.status, 200)
      const list = await cedar.json() as RequestList
      deepEqual(list.requests.map(({ id, workspace }) => [id, workspace]), [
        ["cedar-submitted", "cedar"], ["cedar-approved", "cedar"], ["cedar-cancelled", "cedar"],
      ])
      const scoped = "/api/requests/cedar-submitted/approve"
      equal((await request(scoped, "cedar-viewer", "POST", '{"canApprove":true}')).status, 403)
      equal((await request(scoped, "birch-coordinator", "POST", '{"workspace":"cedar"}')).status, 404)
      equal((await request("/api/requests/cedar-cancelled/approve", "cedar-coordinator", "POST")).status, 409)

      const results = await Promise.all([
        request(scoped, "cedar-coordinator", "POST"),
        request(scoped, "cedar-coordinator", "POST"),
      ])
      deepEqual(results.map((response) => response.status).sort(), [200, 409])
      const approved = await results.find((response) => response.status === 200)!.json() as ServiceRequest
      deepEqual([approved.id, approved.workspace, approved.status, approved.revision, approved.scheduledStart], [
        "cedar-submitted", "cedar", "approved", 2, "2030-01-12T09:00:00.000Z",
      ])
      const rows = await pool.query("SELECT id, status, revision FROM service_requests ORDER BY id")
      deepEqual(rows.rows, [
        { id: "birch-approved", status: "approved", revision: 2 },
        { id: "birch-submitted", status: "submitted", revision: 1 },
        { id: "cedar-approved", status: "approved", revision: 2 },
        { id: "cedar-cancelled", status: "cancelled", revision: 2 },
        { id: "cedar-submitted", status: "approved", revision: 2 },
      ])
    } finally {
      await server.close()
    }
  })
})
