import { deepEqual, equal, ok } from "node:assert/strict"
import { createRequire } from "node:module"
import { setTimeout as delay } from "node:timers/promises"

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
const mode = process.env.ZOO_CRAFT_MODE
const finishing = mode === "queue-finish"
const scoped = finishing || mode === "queue-direction"
const longTitle = "Long gallery adjoining the north entrance and reception desk"
const readingParagraphs = [
  "Check the room and scheduled time with the requester before approving a change to the schedule. Leave time for the previous group to clear the room.",
  "Check the queue for the approved status. If you lose the confirmation, reopen the queue and find the original request before taking another action.",
  "Send requests for a different workspace to that desk. Include the room name and UTC time so the receiving coordinator can find the right record.",
]

async function ready() {
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const response = await fetch(origin + "/api/requests", {
        headers: { cookie: "fixture_session=cedar-coordinator" },
        signal: AbortSignal.timeout(1000),
      })
      await response.body?.cancel()
      if (response.ok) return
    } catch {
      // The isolated app can still be compiling.
    }
    await delay(250)
  }
  throw new Error("The isolated application did not become ready")
}

async function contextFor(browser, actor) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }, reducedMotion: "reduce", serviceWorkers: "block",
  })
  await context.addCookies([{ name: "fixture_session", value: actor, url: origin }])
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
  return context
}

async function capture(page, name) {
  equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true,
    `no horizontal overflow in ${name}`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `/captures/${name}.png`, animations: "disabled" })
  if (/^(reference-|queue-|reading-)/.test(name)) {
    await page.screenshot({ path: `/captures/${name}-full.png`, fullPage: true, animations: "disabled" })
  }
}

async function dialogFrames(page, label) {
  for (const width of [1280, 680, 390]) {
    await page.setViewportSize({ width, height: 844 })
    const dialog = page.getByRole("dialog")
    const bounds = await dialog.boundingBox()
    equal(Boolean(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width), true,
      `dialog fits within the ${width}px viewport`)
    if (scoped && width === 680 && label === "review") {
      const queueHeader = await page.getByText("Scheduled (UTC)", { exact: true }).boundingBox()
      // The queue headers are hidden from assistive technology because each time carries its timezone.
      equal(Boolean(queueHeader && bounds && bounds.y >= queueHeader.y + queueHeader.height), true,
        "the review sheet leaves the queue headings visible at 680px")
    }
    await capture(page, `${label}-${width}`)
  }
}

async function frames(page, path, heading, label) {
  for (const width of [1280, 680, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto(origin + path)
    await page.getByRole("heading", { name: heading }).waitFor()
    if (path === "/") await page.getByText(longTitle, { exact: true }).first().waitFor()
    await capture(page, `${label}-${width}`)
  }
}

async function tabTo(page, control, limit) {
  await control.waitFor()
  for (let step = 0; step <= limit; step++) {
    if (await control.evaluate((element) => document.activeElement === element)) return
    await page.keyboard.press("Tab")
  }
  throw new Error("The expected control was not reached with the keyboard")
}

async function verifyFailedApproval(page) {
  const path = origin + "/api/requests/cedar-craft-1/approve"
  const row = async () => (await pool.query(
    "SELECT status, revision FROM service_requests WHERE id = 'cedar-craft-1'",
  )).rows
  const before = await row()
  const pending = Promise.withResolvers()
  const release = Promise.withResolvers()
  await page.route(path, async (route) => {
    pending.resolve()
    await release.promise
    await route.abort("failed")
  }, { times: 1 })
  const filter = page.getByRole("searchbox", { name: /search|filter/i })
  await filter.fill("Long gallery")
  const review = page.getByRole("button", { name: `Review approval for ${longTitle}` })
  await tabTo(page, review, 5)
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog")
  const confirm = dialog.getByRole("button", { name: "Approve request" })
  await tabTo(page, confirm, 4)
  try {
    await page.keyboard.press("Enter")
    await Promise.race([pending.promise, delay(5_000).then(() => { throw new Error("Approval request did not start") })])
    console.log("approval-request-held")
    const approving = dialog.getByRole("button", { name: /approving/i })
    await approving.waitFor()
    equal(await approving.isDisabled(), true)
    equal(await dialog.getByRole("button", { name: "Cancel" }).isDisabled(), true)
    if (scoped) {
      await page.keyboard.press("Escape")
      equal(await dialog.isVisible(), true, "pending approval keeps review open")
      await capture(page, "approval-pending-390")
    }
    deepEqual(await row(), before)
  } finally {
    release.resolve()
  }
  await waitForUncertainty(dialog)
  if (mode === "queue-recovery" || scoped) {
    console.log("approval-uncertainty-visible")
    await verifyRecovery(page, dialog, row, before)
    return
  }
  await capture(page, "approval-error-390")
  deepEqual(await row(), before)
  await page.keyboard.press("Escape")
  await dialog.waitFor({ state: "hidden" })
  equal(await filter.inputValue(), "Long gallery")
  equal(await review.evaluate((element) => document.activeElement === element), true)
  console.log("Pending state blocked a duplicate action. An intercepted request showed an error and preserved the row.")
}

async function waitForUncertainty(dialog) {
  if (scoped) await dialog.getByText(/approval could not be confirmed/i).first().waitFor()
  else await dialog.getByRole("alert").waitFor()
}

async function verifyRecovery(page, dialog, readRow, before) {
  const status = dialog.getByRole("button", { name: /check|refresh/i })
  const approve = dialog.getByRole("button", { name: "Approve request", exact: true })
  const assertNoRepeat = async (checkpoint) => {
    equal(await approve.count() === 0 || await approve.isDisabled(), true,
      `repeat-approval-blocked: ${checkpoint}`)
    deepEqual(await readRow(), before)
  }
  await assertNoRepeat("before status check")
  await dialogFrames(page, "approval-error")
  if (scoped) {
    await page.keyboard.press("Escape")
    await dialog.waitFor({ state: "hidden" })
    const unresolved = page.getByRole("listitem").or(page.getByRole("row")).filter({ hasText: longTitle }).getByRole("button", { name: /check status/i })
    await unresolved.waitFor()
    await page.getByText(/approval unconfirmed/i).waitFor()
    await tabTo(page, unresolved, 5)
    await page.keyboard.press("Enter")
    await waitForUncertainty(dialog)
    await assertNoRepeat("after reopening unresolved request")
  }
  const requests = origin + "/api/requests"
  const filter = page.getByRole("searchbox", { name: /search|filter/i })
  await page.route(requests, (route) => route.abort("failed"), { times: 1 })
  await tabTo(page, status, 5)
  const failed = page.waitForEvent("requestfailed", {
    predicate: (request) => request.url() === requests, timeout: 7000,
  })
  await page.keyboard.press("Enter")
  await failed
  await dialog.getByRole("alert").filter({ hasText: /could not check|couldn.t check|status.*(failed|unavailable)/i }).waitFor()
  await assertNoRepeat("after failed status check")
  if (scoped) {
    await page.route(requests, (route) => route.fulfill({
      status: 200, json: { workspace: "cedar", canApprove: true, requests: [{ id: "cedar-craft-1" }] },
    }), { times: 1 })
    await tabTo(page, status, 5)
    const malformed = page.waitForResponse(response => response.url() === requests && response.ok())
    await page.keyboard.press("Enter")
    await malformed
    await dialog.getByRole("alert").filter({ hasText: /could not check|couldn.t check|status.*(failed|unavailable)/i }).waitFor()
    await assertNoRepeat("after malformed status response")
  }
  await tabTo(page, status, 5)
  if (scoped) {
    const releaseRead = Promise.withResolvers()
    await page.route(requests, async (route) => {
      await releaseRead.promise
      await route.continue()
    }, { times: 1 })
    const checked = page.waitForResponse((response) => response.url() === requests && response.ok())
    try {
      await page.keyboard.press("Enter")
      await dialog.getByText(/checking.*status|checking whether/i).first().waitFor()
      equal(await approve.count() === 0 || await approve.isDisabled(), true, "status read must finish before repeat")
      await page.keyboard.press("Escape")
      equal(await dialog.isVisible(), true, "pending status check keeps review open")
      await capture(page, "status-pending-390")
    } finally {
      releaseRead.resolve()
    }
    await checked
  } else {
    const checked = page.waitForResponse((response) => response.url() === requests && response.ok())
    await page.keyboard.press("Enter")
    await checked
  }
  await page.waitForFunction(() => {
    const dialog = document.querySelector("dialog")
    if (!dialog?.open) return true
    return [...dialog.querySelectorAll("button")].some((button) =>
      button.textContent?.trim() === "Approve request" && !button.disabled)
  }, undefined, { timeout: 7000 })
  equal(await filter.inputValue(), "Long gallery")
  deepEqual(await readRow(), before)
  console.log("Interrupted approval required a status read; a failed read kept writes unavailable.")
  if (await dialog.isVisible()) {
    if (scoped) await dialog.getByRole("status").filter({ hasText: /still submitted|review this request again/i }).waitFor()
    await page.keyboard.press("Escape")
    await dialog.waitFor({ state: "hidden" })
  }

  const review = page.getByRole("button", { name: `Review approval for ${longTitle}` })
  await tabTo(page, review, 5)
  await page.keyboard.press("Enter")
  await tabTo(page, approve, 4)
  const commitPath = origin + "/api/requests/cedar-craft-1/approve"
  let writes = 0
  await page.route(commitPath, async (route) => {
    writes++
    const response = await route.fetch({ maxRetries: 0, maxRedirects: 0 })
    equal(response.status(), 200)
    await route.abort("failed")
  })
  await page.keyboard.press("Enter")
  await waitForUncertainty(dialog)
  deepEqual(await readRow(), [{ status: "approved", revision: before[0].revision + 1 }])
  equal(await approve.count() === 0 || await approve.isDisabled(), true)
  await tabTo(page, status, 4)
  await page.keyboard.press("Enter")
  const matched = page.getByRole("listitem").or(page.getByRole("row")).filter({ hasText: longTitle })
  if (scoped) {
    await dialog.getByRole("status").filter({ hasText: /approved/i }).waitFor()
    await dialogFrames(page, "approval-recovered")
    await page.keyboard.press("Escape")
    await dialog.waitFor({ state: "hidden" })
  } else if (await dialog.isVisible()) {
    await dialog.getByRole("status").filter({ hasText: /approved/i }).waitFor()
    await dialogFrames(page, "approval-recovered")
    await page.keyboard.press("Escape")
    await dialog.waitFor({ state: "hidden" })
  }
  if (scoped) await locateApproval(page, matched, filter, "Long gallery")
  await matched.getByText(/^approved$/i).waitFor()
  equal(await filter.inputValue(), "Long gallery")
  equal(writes, 1)
  deepEqual(await readRow(), [{ status: "approved", revision: before[0].revision + 1 }])
  console.log("After a committed response was lost, status recovery found the approved row without another write.")
}

async function verifyApproval(page) {
  const request = page.getByRole("button", { name: "Review approval for Maple Room" })
  await tabTo(page, request, 20)
  equal(await request.evaluate((element) => element.matches(":focus-visible")), true)
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog")
  const heading = dialog.getByRole("heading", { name: /^(?:Approve Maple Room\?|Maple Room)$/ })
  await heading.waitFor()
  equal(await dialog.locator("time").getAttribute("datetime"), "2030-01-12T09:00:00.000Z")
  if (scoped) {
    await page.keyboard.press("Escape")
    await dialog.waitFor({ state: "hidden" })
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Review approval for Maple Room")
    await page.keyboard.press("Enter")
    await heading.waitFor()
  }
  if (mode.startsWith("queue")) await dialogFrames(page, "review")
  await tabTo(page, dialog.getByRole("button", { name: "Approve request" }), 4)
  await page.keyboard.press("Enter")
  await page.getByRole("status").filter({ hasText: /^(?:Maple Room approved\.|Approved Maple Room\.)$/i }).first().waitFor()
  deepEqual((await pool.query("SELECT status, revision FROM service_requests WHERE id = 'cedar-submitted'")).rows,
    [{ status: "approved", revision: 2 }], "approval must advance the stored revision once")
  console.log("Keyboard approval confirmed in the browser and PostgreSQL.")
}

function scopeControl(page, name) {
  const label = name === "Needs review" ? /^Needs review(?: \d+)?$/i : /^All requests$/i
  return {
    radio: page.getByRole("radio", { name: label }),
    button: page.getByRole("button", { name: label }),
  }
}

async function assertScope(page, name) {
  const { radio, button } = scopeControl(page, name)
  if (await radio.count()) equal(await radio.isChecked(), true)
  else equal(await button.getAttribute("aria-pressed"), "true")
}

async function chooseScope(page, name) {
  const { radio, button } = scopeControl(page, name)
  await radio.or(button).waitFor()
  if (await radio.count()) {
    if (!await radio.isChecked()) {
      await tabTo(page, page.getByRole("radio", { checked: true }), 20)
      await page.keyboard.press(name === "Needs review" ? "ArrowRight" : "ArrowLeft")
    }
  } else if (await button.getAttribute("aria-pressed") !== "true") {
    await tabTo(page, button, 20)
    await page.keyboard.press("Enter")
  }
  await assertScope(page, name)
}

async function locateApproval(page, row, search, query) {
  await row.getByText(/^approved$/i).waitFor({ state: "hidden" })
  const result = page.getByRole("button", { name: /view in all requests/i })
  await result.waitFor()
  equal(await page.getByRole("button", { name: /search all requests/i }).isVisible(), false)
  await capture(page, query === "Maple" ? "approved-in-needs-review-390" : "recovered-in-needs-review-390")
  await tabTo(page, result, 8)
  await page.keyboard.press("Enter")
  await row.getByText(/^approved$/i).waitFor()
  equal(await search.inputValue(), query)
  await assertScope(page, "All requests")
  equal(await row.getByRole("heading").evaluate(node => node === document.activeElement), true,
    "focus moves to the updated request heading")
}

async function verifyScopedSearch(page, filter) {
  await chooseScope(page, "Needs review")
  await filter.fill("Side Office")
  await page.getByText(/no matching requests need review/i).waitFor()
  const broaden = page.getByRole("button", { name: /search all requests/i })
  await tabTo(page, broaden, 5)
  await page.keyboard.press("Enter")
  equal(await filter.inputValue(), "Side Office")
  await assertScope(page, "All requests")
  await page.getByRole("heading", { name: "Side Office" }).waitFor()
  await page.getByText(/showing 1 of 12 requests/i).first().waitFor()
  await chooseScope(page, "Needs review")
  await filter.fill("Maple")
  await page.getByText(/showing 1 of 4 requests.*needs review/i).first().waitFor()
  console.log("Scope and search preserve the query, and result totals reflect the selected view.")
}

async function verifyForcedColors(page) {
  await page.emulateMedia({ forcedColors: "active" })
  try {
    const view = scopeControl(page, "Needs review")
    const active = view.button.or(view.radio)
    // Focus and active scope have different visual indicators in forced colors.
    const inactive = scopeControl(page, "All requests")
    const border = control => control.evaluate(node =>
      getComputedStyle(node.type === "radio" ? node.nextElementSibling : node).borderBottomStyle)
    equal(await border(active), "solid")
    equal(await border(inactive.button.or(inactive.radio)), "none")
    const review = page.getByRole("button", { name: "Review approval for Maple Room" })
    await tabTo(page, review, 20)
    await page.keyboard.press("Enter")
    const dialog = page.getByRole("dialog")
    await dialog.waitFor()
    const cancel = dialog.getByRole("button", { name: "Cancel", exact: true })
    equal(await cancel.evaluate(node => node.matches(":focus-visible")), true)
    const maple = page.getByRole("listitem").or(page.getByRole("row")).filter({ hasText: "Maple Room" })
    equal(await maple.getByRole("heading").evaluate(node => getComputedStyle(node).textDecorationLine), "underline")
    await capture(page, "forced-colors-review-390")
    await page.keyboard.press("Escape")
    await dialog.waitFor({ state: "hidden" })
  } finally {
    await page.emulateMedia({ forcedColors: "none" })
  }
}

async function verifyQueueFinish(page) {
  for (const width of [1280, 680, 390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await page.getByRole("heading", { name: longTitle, exact: true }).waitFor()
    const geometry = await page.getByRole("listitem").evaluateAll(rows => rows.map(row => {
      const title = row.querySelector("h2")
      const time = row.querySelector("time")
      const status = row.querySelector(".row-status")
      const action = row.querySelector("button")
      return {
        height: row.getBoundingClientRect().height,
        titleX: title.getBoundingClientRect().x,
        titleBottom: title.getBoundingClientRect().bottom,
        timeX: time.getBoundingClientRect().x,
        timeY: time.getBoundingClientRect().y,
        timeBottom: time.getBoundingClientRect().bottom,
        statusX: status.getBoundingClientRect().x,
        statusY: status.getBoundingClientRect().y,
        actionHeight: action?.getBoundingClientRect().height,
        actionRight: action?.getBoundingClientRect().right,
      }
    }))
    equal(geometry.length, 12)
    ok(geometry.every(row => row.actionHeight === undefined || row.actionHeight >= 44))
    equal(new Set(geometry.map(row => row.titleX)).size, 1)
    equal(new Set(geometry.flatMap(row => row.actionRight === undefined ? [] : [row.actionRight])).size, 1)
    if (width >= 680) {
      const [submitted, approved, cancelled] = geometry
      equal(submitted.height, approved.height, "a Review control must not change a single-line row's height")
      equal(submitted.height, cancelled.height)
      equal(new Set(geometry.map(row => row.timeX)).size, 1)
      equal(new Set(geometry.map(row => row.statusX)).size, 1)
    } else {
      ok(geometry.every(row => row.titleX === row.timeX && row.timeX === row.statusX &&
        row.titleBottom <= row.timeY && row.timeBottom <= row.statusY), "phone metadata stays below the title")
    }
  }

  await page.setViewportSize({ width: 1280, height: 844 })
  const title = page.getByRole("heading", { name: "Maple Room", exact: true })
  const typography = await title.evaluate(async node => {
    await document.fonts.ready
    const text = getComputedStyle(node)
    const pageTitle = getComputedStyle(document.querySelector("h1"))
    const faces = await document.fonts.load(`${text.fontWeight} ${text.fontSize} Inter`, node.textContent)
    return { faces: faces.map(face => face.family.replaceAll('"', "")), family: text.fontFamily,
      titleWeight: Number(text.fontWeight), pageWeight: Number(pageTitle.fontWeight) }
  })
  ok(typography.faces.includes("Inter") && typography.family.startsWith("Inter,"))
  ok(typography.pageWeight > typography.titleWeight)
  console.log("Loaded typography:", JSON.stringify(typography))

  const review = page.getByRole("button", { name: "Review approval for Maple Room" })
  const background = () => review.evaluate(node => getComputedStyle(node).backgroundColor)
  const idle = await background()
  const row = page.getByRole("listitem").filter({ hasText: "Maple Room" })
  await row.screenshot({ path: "/captures/row-idle-1280.png", animations: "disabled" })
  await review.hover()
  const hover = await background()
  ok(hover !== idle)
  await row.screenshot({ path: "/captures/row-hover-1280.png", animations: "disabled" })
  await page.mouse.down()
  try {
    ok(await background() !== hover)
    await row.screenshot({ path: "/captures/row-pressed-1280.png", animations: "disabled" })
  } finally {
    await page.mouse.move(0, 0)
    await page.mouse.up()
  }
  // Start keyboard verification without the pointer press having already focused the button.
  await page.reload()
  await tabTo(page, review, 20)
  equal(await review.evaluate(node => node.matches(":focus-visible") &&
    getComputedStyle(node).outlineStyle === "solid"), true)
  await row.screenshot({ path: "/captures/row-focus-1280.png", animations: "disabled" })
  equal(await page.getByRole("dialog").count(), 0)
  equal(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), true)
  console.log("Verified row rhythm, stable phone metadata, action hit areas and control states.")
  await page.setViewportSize({ width: 390, height: 844 })
}

async function verifyPermissionDenial(page) {
  const before = await pool.query("SELECT id, status, revision FROM service_requests ORDER BY id")
  for (const [actor, expected] of [["cedar-viewer", 403], ["birch-coordinator", 404]]) {
    const response = await fetch(origin + "/api/requests/cedar-submitted/approve", {
      method: "POST", headers: { cookie: `fixture_session=${actor}` }, signal: AbortSignal.timeout(4000),
    })
    equal(response.status, expected, "server retains role and workspace checks")
    await response.body?.cancel()
  }
  deepEqual((await pool.query("SELECT id, status, revision FROM service_requests ORDER BY id")).rows, before.rows)
  ok(await page.getByRole("heading", { name: "Service requests" }).isVisible())
}

try {
  await ready()
  console.log("application-ready")
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage"],
    env: { HOME: "/tmp", PATH: process.env.PATH, LANG: "C.UTF-8" } })
  try {
    const context = await contextFor(browser, "cedar-coordinator")
    const page = await context.newPage()
    page.setDefaultTimeout(7000)
    if (mode === "reference") {
      await frames(page, "/?preview=queue", "Service requests", "reference-queue")
      await frames(page, "/?preview=reading", "Reviewing requests at Cedar", "reference-reading")
      await page.goto(origin)
      await verifyApproval(page)
    } else if (mode === "reading") {
      await frames(page, "/?preview=reading", "Reviewing requests at Cedar", "reading")
      const article = page.getByRole("article")
      await article.getByRole("heading", { name: "After approval" }).waitFor()
      await article.getByRole("heading", { name: "When to hand off" }).waitFor()
      const prose = await article.locator("p").allTextContents()
      deepEqual(prose.map((text) => text.trim().replace(/\s+/g, " "))
        .filter((text) => text !== "Operations note"), readingParagraphs)
    } else {
      await frames(page, "/", "Service requests", "queue")
      await page.setViewportSize({ width: 320, height: 844 })
      await capture(page, "queue-320")
      await page.setViewportSize({ width: 390, height: 844 })
      await page.getByText("Cedar", { exact: false }).first().waitFor()
      for (const foreignTitle of ["Garden Room", "Workshop"]) {
        equal(await page.getByText(foreignTitle, { exact: true }).count(), 0)
      }
      if (finishing) await verifyQueueFinish(page)
      const filter = page.getByRole("searchbox", { name: /search|filter/i })
      await filter.fill("No matching room")
      await page.getByText(/no (matching |results|requests)/i).first().waitFor()
      equal(await page.getByText("Maple Room", { exact: true }).count(), 0)
      await capture(page, "empty-390")
      await tabTo(page, page.getByRole("button", { name: /clear/i }), 4)
      await page.keyboard.press("Enter")
      equal(await filter.inputValue(), "")
      await page.getByText(longTitle, { exact: true }).first().waitFor()
      if (scoped) {
        await verifyPermissionDenial(page)
        await verifyScopedSearch(page, filter)
        await verifyForcedColors(page)
      } else {
        await filter.fill("Maple")
      }
      equal(await page.getByText(longTitle, { exact: true }).count(), 0)
      await verifyApproval(page)
      const maple = page.getByRole("listitem").or(page.getByRole("row")).filter({ hasText: "Maple Room" })
      if (scoped) await locateApproval(page, maple, filter, "Maple")
      await maple.getByText(/^approved$/i).waitFor()
      equal(await maple.getByRole("button", { name: /review/i }).count(), 0)
      await capture(page, "approved-390")
      if (scoped) await chooseScope(page, "Needs review")
      await verifyFailedApproval(page)

      const viewer = await contextFor(browser, "cedar-viewer")
      const viewerPage = await viewer.newPage()
      await viewerPage.goto(origin)
      await viewerPage.getByText(longTitle, { exact: true }).first().waitFor()
      equal(await viewerPage.getByRole("button", { name: /review approval/i }).count(), 0)
      await capture(viewerPage, "viewer-1280")
    }
    console.log(`Rendered ${mode} and checked its nominated task.`)
  } finally {
    await browser.close()
  }
} finally {
  await pool.end()
}
