import { deepEqual, equal, ok } from "node:assert/strict"
import { readFile, rename, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { setTimeout as delay } from "node:timers/promises"

const require = createRequire("/opt/zoo/package.json")
const { Pool } = require("pg")
const { chromium } = require("playwright")
const origin = "http://127.0.0.1:4173"
const id = "cedar-approved"
const actor = "cedar-coordinator"
const path = `/api/requests/${id}/reschedule`
const proposed = "2030-01-12T14:30:00.000Z"
const pool = new Pool({
  host: "127.0.0.1", port: 5432, database: "zoo_fixture", user: "zoo_observer",
  password: process.env.ZOO_OBSERVER_PASSWORD, connectionTimeoutMillis: 2_000,
  onConnect: async (client) => {
    const { rows } = await client.query(
      "SELECT current_database() AS db, current_user AS role, current_setting('cluster_name') AS cluster",
    )
    deepEqual(rows, [{ db: "zoo_fixture", role: "zoo_observer", cluster: process.env.ZOO_CLUSTER }])
  },
})
pool.on("error", () => console.error("An idle observer connection dropped."))

async function state() {
  const requests = (await pool.query("SELECT * FROM service_requests ORDER BY id")).rows
  const operations = (await pool.query("SELECT * FROM schedule_operations ORDER BY operation_key")).rows
  return { requests, operations }
}

async function record(name, value) {
  const target = `/continuation/${name}.json`
  const temporary = target + ".tmp"
  await writeFile(temporary, JSON.stringify(value, null, 2) + "\n", { flag: "wx" })
  await rename(temporary, target)
}

async function awaitResume() {
  const deadline = Date.now() + 360_000
  while (Date.now() < deadline) {
    try {
      return JSON.parse(await readFile("/continuation/resume.json", "utf8"))
    } catch (error) {
      if (error.code !== "ENOENT") throw error
    }
    await delay(200)
  }
  throw new Error("the interrupted episode did not receive a scoped resume request")
}

try {
  const deadline = Date.now() + 30_000
  for (;;) {
    try {
      const response = await fetch(origin + "/api/requests", { signal: AbortSignal.timeout(2_000),
        headers: { cookie: `fixture_session=${actor}` } })
      await response.body?.cancel()
      if (response.ok) break
    } catch {
      // The owned application can still be starting.
    }
    if (Date.now() > deadline) throw new Error("the owned application did not become ready")
    await delay(150)
  }
  const before = await state()
  equal(before.operations.length, 0)
  const original = before.requests.find((row) => row.id === id)
  equal(original.revision, 2)

  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage"],
    env: { HOME: "/tmp", PATH: process.env.PATH, LANG: "C.UTF-8" } })
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" })
    await context.addCookies([{ name: "fixture_session", value: actor, url: origin }])
    await context.route("**/*", (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
    const page = await context.newPage()
    page.setDefaultTimeout(8_000)
    let operation
    const confirmations = []
    const recoveries = []
    await page.route(origin + path + "/confirm", async (route) => {
      confirmations.push(route.request().postDataJSON())
      const response = await route.fetch({ maxRedirects: 0, maxRetries: 0 })
      equal(response.status(), 200)
      operation = await response.json()
      await route.abort()
    })
    page.on("request", (request) => {
      if (request.url().startsWith(origin + path + "/operations/")) {
        recoveries.push({ method: request.method(), url: request.url() })
      }
    })
    await page.goto(origin)
    await page.getByRole("button", { name: "Review rescheduling for North Hall" }).press("Enter")
    const field = page.getByLabel("New UTC start")
    await field.fill(await field.getAttribute("type") === "datetime-local" ? proposed.slice(0, 16) : proposed)
    await page.getByRole("button", { name: "Review new time" }).press("Enter")
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "Confirm new time" }).press("Enter")
    await dialog.getByRole("button", { name: "Recover original result" }).waitFor()
    const pending = await state()
    equal(confirmations.length, 1)
    equal(recoveries.length, 0)
    const { operationKey, reviewId } = confirmations[0]
    ok(operationKey && reviewId && operation.operationId)
    deepEqual(pending.requests, before.requests.map((row) => row.id === id
      ? { ...row, scheduled_start: new Date(proposed), revision: original.revision + 1 } : row))
    equal(pending.operations.length, 1)
    const [stored] = pending.operations
    deepEqual([stored.operation_key, stored.request_id, stored.actor_id, stored.result],
      [operationKey, id, actor, operation])
    await record("pending", { run: process.env.ZOO_CLUSTER, id, actor, reviewId, operationKey,
      operation, before, pending, confirmations: confirmations.length, recoveries: recoveries.length })

    deepEqual(await awaitResume(), { method: "GET", requestId: id, operationKey })
    deepEqual(await state(), pending, "the owned effect must remain unchanged through the interruption")
    await page.reload()
    await page.getByRole("button", { name: "Recover original result" }).press("Enter")
    const recoveryUrl = origin + path + "/operations/" + encodeURIComponent(operationKey)
    const recovered = page.waitForResponse((response) => response.url() === recoveryUrl)
    await dialog.getByRole("button", { name: "Recover original result" }).press("Enter")
    const response = await recovered
    equal(response.status(), 200)
    deepEqual(await response.json(), operation)
    await dialog.getByRole("status").waitFor()
    await dialog.locator(`time[datetime="${proposed}"]`).waitFor()
    const final = await state()
    deepEqual(final, pending)
    equal(confirmations.length, 1)
    deepEqual(recoveries, [{ method: "GET", url: recoveryUrl }])
    await record("recovered", { run: process.env.ZOO_CLUSTER, requestId: id, reviewId, operationKey,
      operationId: operation.operationId, revision: operation.request.revision, scheduledStart: proposed,
      confirmations: confirmations.length, recoveryGets: recoveries.length, persistedOperations: final.operations.length,
      samePersistedState: true })
    console.log("The resumed browser recovered the same committed operation without a second confirmation.")
  } finally {
    await browser.close()
  }
} finally {
  await pool.end()
}
