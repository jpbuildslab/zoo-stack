import { createServer } from "node:http"
import { createRequire } from "node:module"

const require = createRequire("/opt/zoo/package.json")
const { Pool } = require("pg")
const identity = process.env.ZOO_CLUSTER
const pool = new Pool({
  host: "127.0.0.1",
  port: 5432,
  database: "zoo_fixture",
  user: "zoo_app",
  password: process.env.ZOO_APP_PASSWORD,
  connectionTimeoutMillis: 2_000,
  onConnect: async (client) => {
    const { rows } = await client.query(
      "SELECT current_database() AS db, current_user AS role, current_setting('cluster_name') AS cluster",
    )
    if (rows[0]?.db !== "zoo_fixture" || rows[0]?.role !== "zoo_app" || rows[0]?.cluster !== identity) {
      throw new Error("The database is outside this isolated run")
    }
  },
})
pool.on("error", () => console.error("An owned idle PostgreSQL connection dropped."))
if (process.env.ZOO_BASELINE !== "yes") {
  const { prepareRescheduling } = await import("/app/src/server/rescheduling.ts")
  await prepareRescheduling(pool)
}
const { requestHandler } = await import("/app/src/server/http.ts")
createServer(requestHandler(pool)).listen(4173, "127.0.0.1", () => console.log("Zoo fixture listening"))
