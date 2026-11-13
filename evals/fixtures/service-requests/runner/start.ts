import { constants } from "node:fs"
import { access } from "node:fs/promises"
import { prepareSchema, withOwnedDatabase } from "./database.ts"
import { startServer } from "../src/server/http.ts"

await access(new URL("../dist/index.html", import.meta.url), constants.R_OK)
const stop = new AbortController()
const stopFixture = () => stop.abort()
process.on("SIGINT", stopFixture)
process.on("SIGTERM", stopFixture)
try {
  await withOwnedDatabase(async (pool, identity) => {
    if (stop.signal.aborted) return
    await prepareSchema(pool, identity)
    if (stop.signal.aborted) return
    const server = await startServer(pool)
    try {
      console.log(`Service requests are available at ${server.origin}`)
      console.log("Set the fixture_session cookie to cedar-coordinator. Press Ctrl+C to stop.")
      if (!stop.signal.aborted) {
        await new Promise<void>((resolve) => stop.signal.addEventListener("abort", () => resolve(), { once: true }))
      }
    } finally {
      await server.close()
    }
  })
} finally {
  process.off("SIGINT", stopFixture)
  process.off("SIGTERM", stopFixture)
}
