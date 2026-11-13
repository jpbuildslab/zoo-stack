import { deepEqual, equal, ok } from "node:assert/strict"
import { createRequire } from "node:module"
import { setTimeout as delay } from "node:timers/promises"
import { assertRaceOutcome } from "./race-outcome.mjs"

const require = createRequire("/opt/zoo/package.json")
const { Pool } = require("pg")
const { chromium } = require("playwright")
const origin = "http://127.0.0.1:4173"
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

function call(path, actor, body) {
  return fetch(origin + path, {
    method: body ? "POST" : "GET", redirect: "error", signal: AbortSignal.timeout(4_000),
    headers: { cookie: `fixture_session=${actor}`, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  })
}

async function ready() {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      const response = await call("/api/requests", "cedar-coordinator")
      if (response.ok) {
        await response.body.cancel()
        return
      }
    } catch {
      // An isolated worker can still be building or starting.
    }
    await delay(150)
  }
  throw new Error("The isolated application did not become ready")
}

async function state() {
  return {
    requests: (await pool.query("SELECT * FROM service_requests ORDER BY id")).rows,
    operations: (await pool.query("SELECT * FROM schedule_operations ORDER BY workspace, actor_id, operation_key")).rows,
  }
}

async function rejectUnchanged(path, actor, body, statuses) {
  const before = await state()
  const response = await call(path, actor, body)
  ok(statuses.includes(response.status), `unexpected rejection status ${response.status} for ${path}`)
  const result = await response.json()
  ok(typeof result.error === "string" && result.error.length > 0, "explicit rejection expected")
  deepEqual(await state(), before)
}

const requestId = "cedar-approved"
const base = `/api/requests/${requestId}/reschedule`
const previous = "2030-01-12T10:00:00.000Z"
const proposed = "2030-01-12T14:30:00.000Z"

async function confirmedTime(page, dialog, instant) {
  await page.getByRole("status").filter({ hasText: /reschedul|confirm/i }).first().waitFor()
  const visible = await dialog.isVisible() ? dialog : page
  await visible.locator(`time[datetime="${instant}"]`).first().waitFor()
}

async function closeConfirmation(page, dialog) {
  if (!await dialog.isVisible()) return
  const dismiss = dialog.getByRole("button", { name: /\b(done|close|ok)\b/i }).first()
  if (await dismiss.count()) await dismiss.press("Enter")
  else await page.keyboard.press("Escape")
  await dialog.waitFor({ state: "hidden" })
}

try {
  await ready()
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage"],
    env: { HOME: "/tmp", PATH: process.env.PATH, LANG: "C.UTF-8" } })
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" })
    await context.addCookies([{ name: "fixture_session", value: "cedar-coordinator", url: origin }])
    await context.route("**/*", (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
    const page = await context.newPage()
    page.setDefaultTimeout(8_000)
    await page.goto(origin)
    const reviewApproval = page.getByRole("button", { name: "Review approval for Maple Room" })
    await reviewApproval.press("Enter")
    await page.getByRole("button", { name: "Approve request" }).press("Enter")
    await page.getByRole("status").filter({ hasText: "Approved Maple Room." }).waitFor()
    deepEqual((await pool.query("SELECT status, revision FROM service_requests WHERE id = 'cedar-submitted'")).rows,
      [{ status: "approved", revision: 2 }])
    console.log("Mounted phone-width approval and its PostgreSQL effect passed.")

    if (process.env.ZOO_BASELINE !== "yes") {
      await rejectUnchanged(`${base}/review`, "cedar-viewer", { proposedStart: proposed }, [403, 404])
      await rejectUnchanged(`${base}/review`, "birch-coordinator", { proposedStart: proposed }, [403, 404])
      for (const value of [previous, "2030-02-30T10:00:00Z", "2029-01-01T10:00:00Z"]) {
        await rejectUnchanged(`${base}/review`, "cedar-coordinator", { proposedStart: value }, [400, 409, 422])
      }
      await rejectUnchanged("/api/requests/cedar-cancelled/reschedule/review", "cedar-coordinator",
        { proposedStart: proposed }, [400, 409, 422])
      await rejectUnchanged("/api/requests/birch-submitted/reschedule/review", "birch-coordinator",
        { proposedStart: proposed }, [400, 409, 422])

      let key
      let initialReviewId
      let operation
      const recoveries = []
      let confirms = 0
      let failedRefreshes = 0
      const releaseConfirmation = Promise.withResolvers()
      await page.route(origin + base + "/confirm", async (route) => {
        confirms += 1
        const result = await route.fetch({ maxRedirects: 0, maxRetries: 0 })
        equal(result.status(), 200)
        key = route.request().postDataJSON().operationKey
        initialReviewId = route.request().postDataJSON().reviewId
        operation = await result.json()
        await releaseConfirmation.promise
        await route.abort()
      })
      await page.route(origin + base + "/operations/*", async (route) => {
        recoveries.push(new URL(route.request().url()).pathname.split("/").at(-1))
        if (recoveries.length === 1) await route.abort()
        else await route.continue()
      })
      await page.route(origin + "/api/requests", (route) => {
        if (recoveries.length < 2) return route.continue()
        failedRefreshes += 1
        return route.fulfill({ status: 503, body: "refresh unavailable" })
      })

      const beforeReview = await state()
      await page.getByRole("button", { name: "Review rescheduling for North Hall" }).press("Enter")
      const input = page.getByLabel("New UTC start")
      const entered = (value) => input.getAttribute("type").then((type) =>
        type === "datetime-local" ? value.slice(0, 16) : value)
      await input.fill(await entered(previous))
      await page.getByRole("button", { name: "Review new time" }).press("Enter")
      await page.getByRole("dialog").getByRole("alert").waitFor()
      equal(await input.inputValue(), await entered(previous))
      await input.fill(await entered(proposed))
      await page.getByRole("button", { name: "Review new time" }).press("Enter")
      const dialog = page.getByRole("dialog")
      const confirm = dialog.getByRole("button", { name: "Confirm new time" })
      await confirm.waitFor()
      await dialog.locator(`time[datetime="${previous}"]`).waitFor()
      await dialog.locator(`time[datetime="${proposed}"]`).waitFor()
      deepEqual(await state(), beforeReview)
      const confirmationControl = await confirm.elementHandle()
      try {
        await confirm.press("Enter")
        await page.waitForFunction((button) => !button.isConnected || button.disabled ||
          button.getAttribute("aria-disabled") === "true", confirmationControl, { timeout: 8_000 })
        await page.keyboard.press("Enter")
      } finally {
        releaseConfirmation.resolve()
      }
      const recovery = dialog.getByRole("button", { name: "Recover original result" })
      await recovery.waitFor()
      const failedRecovery = page.waitForEvent("requestfailed", {
        predicate: (request) => request.url().startsWith(origin + base + "/operations/"),
      })
      await recovery.press("Enter")
      await failedRecovery
      await dialog.getByRole("alert").waitFor()
      await dialog.getByRole("button", { name: "Recover original result", disabled: false }).waitFor()
      const failedList = page.waitForResponse((response) =>
        response.url() === origin + "/api/requests" && response.status() === 503)
      await recovery.press("Enter")
      await failedList
      await confirmedTime(page, dialog, proposed)
      ok(failedRefreshes > 0)
      equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
      equal(confirms, 1)
      ok(typeof key === "string" && key.length > 0)
      deepEqual(recoveries, [key, key])
      deepEqual([operation.request.id, operation.request.revision, operation.request.scheduledStart],
        [requestId, 3, proposed])
      ok(typeof operation.operationId === "string" && operation.operationId.length > 0)
      const stored = await state()
      const matching = stored.operations.filter((row) => row.operation_key === key)
      equal(matching.length, 1)
      deepEqual(matching[0].result, operation)
      deepEqual(stored.requests.filter((row) => row.id === requestId).map((row) =>
        [row.revision, row.scheduled_start.toISOString()]), [[3, proposed]])
      const replay = await call(base + "/confirm", "cedar-coordinator",
        { reviewId: initialReviewId, operationKey: key })
      equal(replay.status, 200)
      deepEqual(await replay.json(), operation)
      deepEqual(await state(), stored)
      for (const actor of ["cedar-viewer", "birch-coordinator"]) {
        await rejectUnchanged(base + "/confirm", actor, { reviewId: initialReviewId, operationKey: key }, [403, 404])
        await rejectUnchanged(base + "/operations/" + key, actor, undefined, [403, 404])
      }
      const different = await call(base + "/review", "cedar-coordinator", { proposedStart: "2030-01-12T17:00:00Z" })
      equal(different.status, 200)
      await rejectUnchanged(base + "/confirm", "cedar-coordinator",
        { reviewId: (await different.json()).reviewId, operationKey: key }, [409])
      if (process.env.ZOO_PRE_SUBMIT_RETRY === "yes") {
        await closeConfirmation(page, dialog)
        await page.unroute(origin + base + "/confirm")
        await page.unroute(origin + base + "/operations/*")
        await page.unroute(origin + "/api/requests")
        const nextStart = "2030-01-12T17:00:00.000Z"
        const requests = []
        await page.route(origin + base + "/confirm", async (route) => {
          requests.push(route.request().postDataJSON())
          if (requests.length === 1) await route.abort()
          else await route.continue()
        })
        await page.route(origin + "/api/requests", async (route) => {
          const response = await route.fetch({ maxRedirects: 0, maxRetries: 0 })
          const list = await response.json()
          list.requests.push(null)
          await route.fulfill({ status: 200, json: list })
        })
        await page.getByRole("button", { name: "Review rescheduling for North Hall" }).press("Enter")
        await input.fill(await entered(nextStart))
        await page.getByRole("button", { name: "Review new time" }).press("Enter")
        await confirm.press("Enter")
        await recovery.press("Enter")
        const retry = dialog.getByRole("button", { name: "Retry original confirmation" })
        await retry.waitFor()
        deepEqual(await state(), stored)
        const malformedList = page.waitForResponse((response) =>
          response.url() === origin + "/api/requests" && response.status() === 200)
        await retry.press("Enter")
        await (await malformedList).finished()
        await confirmedTime(page, dialog, nextStart)
        await closeConfirmation(page, dialog)
        await page.getByRole("heading", { name: "Service requests" }).waitFor()
        await page.locator(`time[datetime="${nextStart}"]`).first().waitFor()
        equal(requests.length, 2)
        deepEqual(requests[0], requests[1])
        const afterRetry = await state()
        equal(afterRetry.operations.length, stored.operations.length + 1)
        deepEqual(afterRetry.requests.filter((row) => row.id === requestId).map((row) =>
          [row.revision, row.scheduled_start.toISOString()]), [[4, nextStart]])
        console.log("An undelivered confirmation retried once with the original key; malformed refresh preserved confirmation.")
      }
      if (process.env.ZOO_AUTHORITY) {
        const [table, column] = process.env.ZOO_AUTHORITY.split(".")
        const revoked = await pool.query(`UPDATE public.${table} SET ${column} = false WHERE actor_id = $1`,
          ["cedar-coordinator"])
        equal(revoked.rowCount, 1)
        await rejectUnchanged(base + "/operations/" + key, "cedar-coordinator", undefined, [403, 404])
        await rejectUnchanged(base + "/confirm", "cedar-coordinator",
          { reviewId: initialReviewId, operationKey: key }, [403, 404])
        console.log("Recovery withheld the persisted result after authority was revoked.")
      }
      console.log("Mounted rescheduling recovered the original committed operation once.")

      const racePath = "/api/requests/birch-approved/reschedule"
      const beforeRace = await state()
      const review = await call(racePath + "/review", "birch-coordinator", { proposedStart: proposed })
      equal(review.status, 200)
      const { reviewId } = await review.json()
      const gate = await pool.connect()
      const results = await (async () => {
        let pending
        try {
          await gate.query("BEGIN")
          const locked = await gate.query("SELECT pg_backend_pid() AS pid FROM service_requests WHERE id = 'birch-approved' FOR UPDATE")
          pending = Promise.all(["race-a", "race-b"].map((operationKey) =>
            call(racePath + "/confirm", "birch-coordinator", { reviewId, operationKey })))
          pending.catch(() => {})
          const deadline = Date.now() + 2_500
          for (;;) {
            const blocked = await pool.query(
              "SELECT 1 FROM pg_stat_activity WHERE usename = 'zoo_app' AND $1 = ANY(pg_blocking_pids(pid))",
              [locked.rows[0].pid],
            )
            if (blocked.rowCount) break
            if (Date.now() > deadline) throw new Error("Confirmation did not reach the held database row")
            await delay(25)
          }
        } finally {
          try {
            await gate.query("ROLLBACK")
          } finally {
            gate.release()
          }
        }
        return pending
      })()
      const outcomes = await Promise.all(results.map(async (response, index) => ({
        key: ["race-a", "race-b"][index], status: response.status, body: await response.json(),
      })))
      assertRaceOutcome(outcomes, beforeRace, await state(), proposed, "birch-coordinator")
      console.log("Concurrent distinct keys persisted one revision at the proposed time; the loser reported stale review.")
    }
  } finally {
    await browser.close()
  }
} finally {
  await pool.end()
}
