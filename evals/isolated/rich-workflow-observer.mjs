import { deepEqual, equal, match, ok } from "node:assert/strict"
import { createRequire } from "node:module"
import { randomUUID } from "node:crypto"
import { setTimeout as delay } from "node:timers/promises"

const require = createRequire("/opt/zoo/package.json")
const { Pool } = require("pg")
const { chromium } = require("playwright")
const origin = "http://127.0.0.1:4173"
const coordinator = "cedar-coordinator"
const pool = new Pool({
  host: "127.0.0.1", port: 5432, database: "zoo_fixture", user: "zoo_observer",
  password: process.env.ZOO_OBSERVER_PASSWORD, connectionTimeoutMillis: 2000,
  onConnect: async client => {
    const { rows } = await client.query("SELECT current_setting('cluster_name') AS cluster")
    deepEqual(rows, [{ cluster: process.env.ZOO_CLUSTER }])
  },
})
const queuePath = "/api/request-queue"
const detailPath = id => `/api/requests/${id}`
const approvalPath = id => `${detailPath(id)}/approve`
const receiptPath = (id, key) => `${detailPath(id)}/approvals/${key}`
const query = (path, params) => path + "?" + new URLSearchParams(params)
const ids = result => result.requests.map(row => row.id)
const cedarIds = Array.from({ length: 48 }, (_, i) => "cedar-" + String(i + 1).padStart(2, "0"))
const richMode = process.env.ZOO_CRAFT_MODE
const composed = richMode.startsWith("queue-workflow-composed")
const authoredDates = process.env.ZOO_CEDAR_CALENDAR === "yes"
const compactReview = process.env.ZOO_CEDAR_REVIEW_LAYOUT === "yes"
const transfer = richMode.endsWith("-transfer")
const route = { view: "review", q: composed ? "a" : "Workshop", from: "2030-01-12", to: "2030-01-13", order: "asc" }
const title20 = composed ? "Gallery access and arrival planning" : "Workshop: gallery access and arrival planning"
const title21 = composed ? "Materials and safety briefing" : "Workshop: materials and safety briefing"
const title01 = composed ? "Volunteer orientation in Maple Room" : "Workshop: Community planning 01"

async function api(path, actor = coordinator, body, timeout = 4000) {
  const response = await fetch(origin + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(actor ? { cookie: `fixture_session=${actor}` } : {}), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  })
  return { status: response.status, value: await response.json() }
}

async function expectApi(path, status = 200, actor, body) {
  const response = await api(path, actor, body)
  equal(response.status, status, `${path} status`)
  return response.value
}

async function ready() {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      const result = await api("/api/session")
      if (result.status === 200) return
    } catch {
      // The application can still be compiling.
    }
    await delay(200)
  }
  throw Error("Workflow session endpoint did not become ready")
}

async function stored(id) {
  const { rows } = await pool.query("SELECT status, revision FROM service_requests WHERE id=$1", [id])
  return rows[0]
}

async function receipts(id) {
  const { rows } = await pool.query(
    "SELECT actor_id, operation_id, reviewed_revision, http_status, response FROM approval_receipts WHERE request_id=$1 ORDER BY actor_id, operation_id",
    [id],
  )
  return rows
}

async function verifyQueue() {
  const first = await expectApi(query(queuePath, route))
  equal(first.viewTotal, 25, "workspace-count: review view total")
  equal(first.total, 25, "workspace-count: filtered total")
  deepEqual(ids(first), cedarIds.slice(0, 20))
  ok(first.nextCursor)
  const second = await expectApi(query(queuePath, { ...route, after: first.nextCursor }))
  deepEqual(ids(second), cedarIds.slice(20, 25))
  equal(second.total, 25)
  equal(second.nextCursor, null)
  const descending = await expectApi(query(queuePath, { ...route, order: "desc" }))
  deepEqual(ids(descending), cedarIds.slice(0, 25).reverse().slice(0, 20))
  const day = await expectApi(query(queuePath, { ...route, to: "2030-01-12" }))
  equal(day.total, 24, "inclusive UTC day includes 23:00 and excludes next midnight")
  if (composed) {
    const dayEnd = await expectApi(query(queuePath, { ...route, to: "2030-01-12", after: day.nextCursor }))
    deepEqual([...ids(day), ...ids(dayEnd)], cedarIds.slice(0, 24))
    equal(day.requests[0].scheduledStart, "2030-01-12T00:00:00.000Z")
    equal(dayEnd.requests.at(-1).scheduledStart, "2030-01-12T23:00:00.000Z")
    const through = await expectApi(query(queuePath, { view: "review", to: "2030-01-12" }))
    equal(through.total, 24)
    deepEqual(ids(through), ids(day))
    const from = await expectApi(query(queuePath, { view: "review", from: "2030-01-13" }))
    deepEqual(ids(from), ["cedar-25"])
    equal(from.requests[0].scheduledStart, "2030-01-13T00:00:00.000Z")
  }
  const all = await expectApi(query(queuePath, { ...route, view: "all" }))
  equal(all.total, 48, "workspace-count: all view total")
  const allSecond = await expectApi(query(queuePath, { ...route, view: "all", after: all.nextCursor }))
  const allThird = await expectApi(query(queuePath, { ...route, view: "all", after: allSecond.nextCursor }))
  deepEqual([...ids(all), ...ids(allSecond), ...ids(allThird)], cedarIds)
  equal(allThird.nextCursor, null)
  const literal = await expectApi(query(queuePath, { ...route, q: "  gAlLeRy aCcEsS  " }))
  deepEqual(ids(literal), ["cedar-20"])
  equal(literal.total, 1)
  equal(literal.viewTotal, 25)
  equal((await expectApi(query(queuePath, { ...route, q: "%" }))).total, 0)
  const birch = await expectApi(queuePath, 200, "birch-coordinator")
  equal(birch.total, 8, "workspace-count: Birch total")
  ok(ids(birch).every(id => id.startsWith("birch-")))
  await expectApi(query(queuePath, { ...route, order: "desc", after: first.nextCursor }), 400)
  await expectApi(query(queuePath, { ...route, from: "2030-02-30" }), 400)
  await expectApi(query(queuePath, { ...route, from: "2030-01-14" }), 400)
  await expectApi(query(queuePath, { ...route, anchor: "birch-01" }), 404)
  deepEqual(ids(await expectApi(query(queuePath, { ...route, anchor: "cedar-21" }))), cedarIds.slice(20, 25))
  await expectApi(queuePath, 401, null)
  await expectApi(detailPath("birch-01"), 404)
  const detail = await expectApi(detailPath("cedar-20"), 200, "cedar-viewer")
  equal(detail.attendance, 24)
  match(detail.purpose, /wheelchair access/)
  equal(detail.approval, null)
  equal((await expectApi(detailPath("cedar-26"))).approval, null)
  console.log("Queue counts, bounded pages, tied order, UTC boundaries and scoped detail passed.")
}

async function verifyWrites() {
  const id = "cedar-02"
  const operationId = randomUUID()
  const body = { reviewedRevision: 1, operationId }
  await expectApi(approvalPath(id), 403, "cedar-viewer", body)
  await expectApi(approvalPath(id), 404, "birch-coordinator", body)
  await expectApi(approvalPath(id), 401, null, body)
  await expectApi(approvalPath(id), 400, coordinator, { reviewedRevision: 1 })
  deepEqual(await stored(id), { status: "submitted", revision: 1 })
  deepEqual(await receipts(id), [])
  const both = await Promise.all([api(approvalPath(id), coordinator, body), api(approvalPath(id), coordinator, body)])
  deepEqual(both.map(result => result.status), [200, 200])
  deepEqual(both[0].value, both[1].value, "same-key replay returns original receipt")
  deepEqual(await expectApi(receiptPath(id, operationId)), both[0].value)
  await expectApi(receiptPath(id, operationId), 404, "cedar-coordinator-two")
  await expectApi(receiptPath(id, operationId), 403, "cedar-viewer")
  await expectApi(receiptPath(id, operationId), 404, "birch-coordinator")
  await expectApi(approvalPath("cedar-03"), 409, coordinator, body)
  await expectApi(approvalPath(id), 409, coordinator, { ...body, reviewedRevision: 2 })
  equal((await receipts(id)).length, 1)
  deepEqual(await stored(id), { status: "approved", revision: 2 })
  equal((await expectApi(detailPath(id), 200, "cedar-viewer")).approval.actorId, coordinator)

  const raceId = "cedar-03"
  const race = await Promise.all([coordinator, "cedar-coordinator-two"].map(actor =>
    api(approvalPath(raceId), actor, { reviewedRevision: 1, operationId: randomUUID() })))
  deepEqual(race.map(result => result.status).sort(), [200, 409])
  equal((await receipts(raceId)).filter(row => row.http_status === 200).length, 1)
  equal((await receipts(raceId)).filter(row => row.http_status === 409).length, 1)
  deepEqual(await stored(raceId), { status: "approved", revision: 2 })
  equal((await expectApi(detailPath(raceId))).approval.actorId, race.find(result => result.status === 200).value.actorId)

  const staleId = "cedar-04"
  const seen = await expectApi(detailPath(staleId))
  await pool.query("UPDATE service_requests SET revision=revision+1 WHERE id=$1", [staleId])
  const staleBody = { reviewedRevision: seen.revision, operationId: randomUUID() }
  const response = await api(approvalPath(staleId), coordinator, staleBody)
  equal(response.status, 409, "reviewed-revision: stale review cannot approve")
  const stale = response.value
  equal(stale.outcome, "stale", "reviewed-revision: stale review cannot approve")
  deepEqual(await expectApi(approvalPath(staleId), 409, coordinator, staleBody), stale)
  deepEqual(await stored(staleId), { status: "submitted", revision: 2 })
  console.log("Permission, same-key replay, actor race, changed key inputs and reviewed revision passed.")
}

async function newPage(browser, actor = coordinator, width = 1280, mobile = false, timezoneId) {
  const context = await browser.newContext({
    viewport: { width, height: 844 }, hasTouch: mobile, reducedMotion: "reduce", serviceWorkers: "block", timezoneId,
  })
  await context.addCookies([{ name: "fixture_session", value: actor, url: origin }])
  await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
  const page = await context.newPage()
  page.setDefaultTimeout(5000)
  return { context, page }
}

async function capture(page, label, { atTop = false } = {}) {
  await page.evaluate(() => document.fonts.ready)
  if (atTop) await page.evaluate(() => window.scrollTo(0, 0))
  equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, label)
  await page.screenshot({ path: `/captures/${label}.png`, animations: "disabled" })
}

async function until(probe, reason) {
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    if (await probe()) return
    await delay(50)
  }
  throw Error(reason)
}

function named(page, name) {
  return page.getByRole("button", { name, exact: true }).or(page.getByRole("link", { name, exact: true }))
}

function detailHeading(page, name) {
  return page.getByRole("region", { name, exact: true }).getByRole("heading", { name, exact: true })
}

async function confirm(page, activate = control => control.click()) {
  await activate(named(page, "Review approval"))
  await page.getByRole("dialog").waitFor()
  await activate(named(page.getByRole("dialog"), "Approve request"))
}

async function openDates(page, activate = control => control.click()) {
  const button = page.getByRole("button", { name: /^Filters/ })
  await activate(button)
  const panel = page.getByRole("dialog", { name: /Scheduled dates.*UTC/ })
  await panel.getByRole("grid").waitFor()
  await until(() => panel.evaluate(node => node.querySelector(".rdp-day_button:focus") !== null),
    "Calendar did not put focus on a day")
  return { button, panel }
}

const dateField = (panel, name) => panel.getByRole("textbox", { name: new RegExp("^" + name) })

async function verifyCalendar(browser) {
  const { page, context } = await newPage(browser, coordinator, 1280, false, "Pacific/Honolulu")
  const reads = [], writes = []
  page.on("request", request => {
    const url = new URL(request.url())
    if (url.pathname === queuePath) reads.push(url)
    if (request.method() !== "GET") writes.push(url.pathname)
  })
  const dateURL = () => new URL(page.url()).searchParams
  const resultCount = value => page.getByText(new RegExp(`of ${value} requests`))
  try {
    await page.goto(origin + query("/", { view: route.view, q: route.q, order: route.order }))
    await resultCount(25).waitFor()
    const type = await page.locator(".row-title").first().evaluate(async row => {
      await document.fonts.ready
      const style = getComputedStyle(row)
      return [style.fontWeight, style.fontSize, style.lineHeight, style.letterSpacing,
        [...document.fonts].some(face => face.family.includes("Inter") && face.status === "loaded")]
    })
    deepEqual(type, ["500", "14px", "19.18px", "-0.168px", true])
    const searchBox = await page.getByRole("searchbox").boundingBox()
    equal(searchBox.height, 40)
    await named(page, "Next page").click()
    await named(page, "Previous page").waitFor()
    let { button, panel } = await openDates(page)
    const from = () => dateField(panel, "From")
    const to = () => dateField(panel, "To")
    const apply = () => named(panel, "Apply")
    const before = reads.length
    await from().fill("2030-02-29")
    await apply().click()
    await panel.getByRole("alert").waitFor()
    equal(await from().getAttribute("aria-invalid"), "true")
    equal(reads.length, before)
    await capture(page, "calendar-invalid-1280")
    await from().fill("2030-01-13")
    await to().fill("2030-01-12")
    await apply().click()
    await panel.getByText("Enter a date on or after From.").waitFor()
    await capture(page, "calendar-inverted-1280")
    await from().fill("2030-01-12")
    await to().fill("")
    await capture(page, "calendar-from-only-1280")
    equal(dateURL().get("from"), null)
    await page.keyboard.press("Escape")
    await panel.waitFor({ state: "hidden" })
    await until(() => button.evaluate(el => el === document.activeElement), "Escape did not restore Filters focus")
    equal(reads.length, before)
    ;({ button, panel } = await openDates(page))
    await to().fill("2030-01-12")
    await page.mouse.click(12, 100)
    await panel.waitFor({ state: "hidden" })
    await until(() => button.evaluate(el => el === document.activeElement), "Outside dismissal did not restore focus")
    equal(reads.length, before)
    ;({ button, panel } = await openDates(page))
    await from().fill("2030-01-12")
    await panel.getByRole("radio", { name: "To", exact: true }).check()
    await panel.locator('[data-day="2030-01-11"] button').focus()
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("Enter")
    equal(await to().inputValue(), "2030-01-12")
    await capture(page, "calendar-open-1280")
    const applied = page.waitForResponse(response => new URL(response.url()).pathname === queuePath
      && new URL(response.url()).searchParams.get("to") === "2030-01-12")
    await apply().click()
    await applied
    await resultCount(24).waitFor()
    equal(reads.length, before + 1)
    equal(dateURL().get("q"), route.q)
    equal(dateURL().get("view"), route.view)
    equal(await named(page, "Previous page").count(), 0)
    await capture(page, "calendar-applied-1280")
    ;({ button, panel } = await openDates(page))
    await named(panel, "Clear dates").click()
    equal(await from().inputValue(), "")
    equal(await to().inputValue(), "")
    await named(panel, "Cancel").click()
    await panel.waitFor({ state: "hidden" })
    equal(dateURL().get("to"), "2030-01-12")
    ;({ button, panel } = await openDates(page))
    await from().fill("2030-01-13")
    await page.goBack()
    await panel.waitFor({ state: "hidden" })
    await named(page, "Previous page").waitFor()
    await page.goForward()
    await resultCount(24).waitFor()
    await page.reload()
    await resultCount(24).waitFor()
    equal(dateURL().get("from"), "2030-01-12")
    equal(dateURL().get("to"), "2030-01-12")
    deepEqual(writes, [])
  } finally {
    await context.close()
  }

  const phone = await newPage(browser, coordinator, 390, true, "Pacific/Kiritimati")
  try {
    const tap = control => control.tap()
    await phone.page.goto(origin + "/?order=desc&view=review")
    await phone.page.getByText(/of 25 requests/).waitFor()
    const { panel, button } = await openDates(phone.page, tap)
    equal((await button.boundingBox()).height, 44)
    await panel.getByRole("radio", { name: "To", exact: true }).check()
    await panel.locator('[data-day="2030-01-12"] button').tap()
    equal(await dateField(panel, "From").inputValue(), "")
    equal(await dateField(panel, "To").inputValue(), "2030-01-12")
    await capture(phone.page, "calendar-to-only-390")
    await phone.page.setViewportSize({ width: 320, height: 620 })
    const apply = named(panel, "Apply")
    await apply.scrollIntoViewIfNeeded()
    await capture(phone.page, "calendar-open-320")
    await apply.tap()
    await phone.page.getByText(/of 24 requests/).waitFor()
    equal(new URL(phone.page.url()).searchParams.get("order"), "desc")
    equal(new URL(phone.page.url()).searchParams.get("from"), null)
    await phone.page.setViewportSize({ width: 390, height: 844 })
    await capture(phone.page, "calendar-applied-390")
  } finally {
    await phone.context.close()
  }
  console.log("Mounted calendar passed draft, Apply, validation, UTC in two timezones, paging, Back/reload and focus return.")
}

async function verifyQueueStates(browser) {
  const { page, context } = await newPage(browser)
  let unblock
  try {
    const queue = url => new URL(url).pathname === queuePath
    let seen
    const started = new Promise(resolve => { seen = resolve })
    const gate = new Promise(resolve => { unblock = resolve })
    await page.route(queue, async route => {
      seen()
      await gate
      await route.fulfill({ status: 503, json: { error: "Synthetic unavailable" } })
    }, { times: 1 })
    await page.goto(origin)
    await Promise.race([started, delay(5000).then(() => { throw Error("Queue did not request data") })])
    await page.getByText(/loading (?:requests|queue)|loading[.…]*$/i).first().waitFor()
    unblock()
    await page.getByText(/could(?: not|n’t|n't) load|unable to load|try again|failed to load/i).first().waitFor()
    await page.goto(origin + query("/", route))
    await named(page, title20).waitFor()
    const to = authoredDates ? dateField(page, "To") : page.getByLabel("To", { exact: true })
    if (!await to.isVisible()) {
      const filters = page.getByRole("button", { name: /^Filters/ })
      await filters.click()
    }
    const update = page.waitForResponse(response =>
      queue(response.url()) && new URL(response.url()).searchParams.get("to") === "2030-01-12")
    await to.fill("2030-01-12")
    if (authoredDates) await named(page, "Apply").click()
    else await to.press("Tab")
    await update
    await page.getByText(/of 24\b/).waitFor()
    if (authoredDates && !compactReview) await openDates(page)
    await page.getByRole("combobox", { name: /\bSchedule order\b/i }).selectOption({ label: "Latest first" })
    if (authoredDates && !compactReview) await named(page, "Apply").click()
    await named(page, title21).waitFor()
    equal(new URL(page.url()).searchParams.get("order"), "desc")
    await page.getByLabel("Search by title", { exact: true }).fill("No matching synthetic title")
    await page.getByText(/no (?:requests|matching requests|results)|nothing matches/i).first().waitFor()
    await capture(page, "empty-1280")
  } finally {
    unblock?.()
    await context.close()
  }
  console.log("Mounted queue distinguishes pending, failed and empty reads; date and order controls update the results.")
}

async function verifyFilterReturn(browser) {
  const { page, context } = await newPage(browser)
  try {
    await page.goto(origin + query("/", { view: route.view, q: route.q, order: route.order }))
    await named(page, title20).click()
    await detailHeading(page, title20).waitFor()
    const { panel } = await openDates(page)
    await dateField(panel, "To").fill("2030-01-12")
    await named(panel, "Apply").click()
    await panel.waitFor({ state: "hidden" })
    await page.getByText(/of 24 requests/).waitFor()
    await named(page, "Return to queue").click()
    const queryState = () => new URL(page.url()).searchParams
    await until(() => queryState().get("request") === null,
      "filter-return: Return to queue kept the record detail open")
    equal(queryState().get("to"), "2030-01-12", "filter-return: applied date was lost")
    equal(queryState().get("q"), route.q)
    equal(queryState().get("view"), route.view)
    await page.getByText(/of 24 requests/).waitFor()
    await until(() => named(page, title20).evaluate(node => node === document.activeElement),
      "filter-return: focus did not return to the selected row")
    await capture(page, "return-after-filter-1280")
    await page.goBack()
    await detailHeading(page, title20).waitFor()
    equal(queryState().get("to"), "2030-01-12")
    console.log("Applied dates stay in the queue on Return, with row focus and a usable Back entry.")
  } finally {
    await context.close()
  }
}

async function verifyReviewLayout(browser) {
  const { page, context } = await newPage(browser)
  try {
    await page.setViewportSize({ width: 1280, height: 640 })
    const path = origin + "/?request=cedar-20"
    const action = named(page, "Review approval")
    const purpose = page.getByText(/Review wheelchair access/)
    await page.goto(path)
    await purpose.waitFor()
    const facts = await purpose.boundingBox()
    const gap = (await action.boundingBox()).y - facts.y - facts.height
    await capture(page, "compact-short-review-1280")
    ok(gap >= 0 && gap <= 55, `review-layout: short request action gap ${gap}px`)
    await page.route(origin + "/api/requests/cedar-20", async request => {
      const response = await request.fetch()
      const data = await response.json()
      const arrivalPlan = [
        "The gallery team wants to test the arrival route before the doors open. Start at reception, then follow the marked path past the cloakroom to the gallery. Keep the corridor clear so people using mobility aids can pass without having to move furniture.",
        "The front desk will hold a short briefing at 18:30. Volunteers should agree who will meet guests at the entrance and who will stay with the group in the gallery. Post a printed copy of the route beside the sign-in sheet, with the quiet waiting area clearly marked.",
        "Confirm that the side entrance will be unlocked and that the portable ramp is in place. Leave two spaces beside the front row rather than moving visitors to the back. Check that people can reach the accessible toilet without crossing the queue for the workshop.",
        "The public session includes a short welcome followed by a seated activity. Set out the reading materials and reserve a table near the door for guests who arrive after the welcome. Keep the central aisle clear during setup and collect any spare chairs before opening.",
        "After the briefing, do one final walk-through with a volunteer from each station. Make a note of any obstacle that cannot be removed and share it with the front desk before admitting guests. The gallery lead will collect the signs and confirm the room is ready.",
      ]
      await request.fulfill({ response, json: { ...data, purpose: [data.purpose, ...arrivalPlan].join(" ") } })
    }, { times: 1 })
    await page.reload()
    await action.waitFor()
    const scroller = page.locator(".detail-scroll")
    const actionBounds = await action.boundingBox()
    ok(actionBounds.y + actionBounds.height <= 640, "review-layout: the long-request action must remain visible")
    ok(await scroller.evaluate(node => node.scrollHeight > node.clientHeight), "review-layout: long details need their own scroll")
    await capture(page, "compact-long-review-1280")
    await scroller.evaluate(node => { node.scrollTop = node.scrollHeight })
    equal(await page.evaluate(() => scrollY), 0)
    equal((await action.boundingBox()).y, actionBounds.y)
    await capture(page, "compact-long-review-end-1280")
    await action.focus()
    await page.keyboard.press("Enter")
    await page.getByRole("dialog").waitFor()
    await page.keyboard.press("Escape")
    await until(() => action.evaluate(node => document.activeElement === node), "review-layout: Cancel lost review focus")
  } finally {
    await context.close()
  }
  const phone = await newPage(browser, coordinator, 320, true)
  try {
    const { page } = phone
    await page.setViewportSize({ width: 320, height: 620 })
    await page.goto(origin)
    await named(page, title01).waitFor()
    const order = page.getByRole("combobox", { name: "Schedule order" })
    await order.selectOption("desc")
    await named(page, "Winter shelter volunteer handover").waitFor()
    let { button, panel } = await openDates(page, control => control.tap())
    equal(await panel.getByRole("combobox").count(), 0, "review-layout: Schedule order belongs to the toolbar")
    const apply = named(panel, "Apply")
    const box = await apply.boundingBox()
    ok(box && box.y >= 0 && box.y + box.height <= 620, "review-layout: Apply visible on short phone")
    await dateField(panel, "To").fill("2030-01-12")
    console.log(`Compact review geometry: phone panel ${Math.round((await panel.boundingBox()).height)}px at 320 × 620.`)
    await capture(page, "compact-dates-320")
    await apply.tap()
    await page.getByText(/of 24 requests/).waitFor()
    equal(new URL(page.url()).searchParams.get("order"), "desc")
    equal(new URL(page.url()).searchParams.get("to"), "2030-01-12")
    await until(() => button.evaluate(node => document.activeElement === node), "review-layout: Apply lost Filters focus")
    ;({ panel } = await openDates(page, control => control.tap()))
    await named(panel, "Cancel").tap()
    await panel.waitFor({ state: "hidden" })
    await capture(page, "compact-filtered-320")
  } finally {
    await phone.context.close()
  }
  console.log("Short review keeps the action near the facts. Long review scrolls with a visible action. Short phone separates dates and order.")
}

async function verifyBrowser(browser) {
  const { page, context } = await newPage(browser)
  await page.goto(origin + query("/", route))
  await named(page, title20).waitFor()
  await capture(page, "queue-1280")
  await named(page, title20).focus()
  await page.keyboard.press("Enter")
  await page.getByText(/review wheelchair access/i).waitFor()
  await page.getByText(/^24(?: (?:people|attendees))?$/i).first().waitFor()
  await capture(page, "detail-1280")
  await page.setViewportSize({ width: 680, height: 844 })
  await capture(page, "detail-680")
  await named(page, "Review approval").click()
  await page.getByRole("dialog").waitFor()
  await capture(page, "confirm-680")
  await page.keyboard.press("Escape")
  await page.getByRole("dialog").waitFor({ state: "hidden" })
  await page.setViewportSize({ width: 1280, height: 844 })
  await named(page, "Review approval").focus()
  await page.keyboard.press("Enter")
  await page.getByRole("dialog").waitFor()
  equal(await named(page.getByRole("dialog"), "Cancel").evaluate(node => node === document.activeElement), true)
  await page.keyboard.press("Escape")
  await page.getByRole("dialog").waitFor({ state: "hidden" })
  await until(() => named(page, "Review approval").evaluate(node => node === document.activeElement), "Escape did not restore focus")
  equal((await receipts("cedar-20")).length, 0)
  await named(page, "Review approval").press("Enter")
  await capture(page, "confirm-1280")
  await named(page.getByRole("dialog"), "Approve request").press("Enter")
  await named(page, "Next request").waitFor()
  deepEqual(await stored("cedar-20"), { status: "approved", revision: 2 })
  equal((await receipts("cedar-20")).length, 1)
  await capture(page, "approved-1280")
  await page.reload()
  await detailHeading(page, title20).waitFor()
  await page.getByRole("heading", { name: "Approval recorded" }).waitFor()
  equal((await receipts("cedar-20")).length, 1)
  await named(page, "Next request").waitFor()
  await named(page, "Next request").click()
  await detailHeading(page, title21).waitFor()
  equal(new URL(page.url()).searchParams.get("request"), "cedar-21")
  await page.goBack()
  await named(page, "Next page").waitFor()
  await until(() => page.getByRole("region", { name: "Request queue" })
    .evaluate(region => region.contains(document.activeElement)),
    "Back did not establish a queue focus target")
  equal(new URL(page.url()).searchParams.get("q"), route.q)
  await page.goForward()
  await detailHeading(page, title21).waitFor()
  await page.reload()
  await detailHeading(page, title21).waitFor()
  equal(await page.getByRole("dialog").count(), 0)
  await page.goto(origin)
  await named(page, "Resume last review").click()
  await detailHeading(page, title21).waitFor()
  equal(new URL(page.url()).searchParams.get("q"), route.q)
  equal(new URL(page.url()).searchParams.get("from"), route.from)
  equal(new URL(page.url()).searchParams.get("to"), route.to)
  await context.addCookies([{ name: "fixture_session", value: "cedar-viewer", url: origin }])
  await page.goto(origin)
  equal(await named(page, "Resume last review").count(), 0)
  await page.goto(origin + "/?request=cedar-21")
  await detailHeading(page, title21).waitFor()
  equal(await named(page, "Review approval").count(), 0)
  await context.addCookies([{ name: "fixture_session", value: "birch-coordinator", url: origin }])
  await page.goto(origin + "/?request=cedar-21")
  await page.getByText(/request (?:not found|unavailable|could not be found)|could not load.*request/i).first().waitFor()
  equal(await detailHeading(page, title21).count(), 0)
  await context.close()

  const phone = await newPage(browser, coordinator, 390, true)
  await phone.page.goto(origin + "/?request=cedar-21")
  await detailHeading(phone.page, title21).waitFor()
  await capture(phone.page, "detail-390")
  await named(phone.page, "Review approval").tap()
  await phone.page.getByRole("dialog").waitFor()
  await capture(phone.page, "confirm-390")
  await named(phone.page.getByRole("dialog"), "Cancel").tap()
  await named(phone.page, "Return to queue").tap()
  await detailHeading(phone.page, title21).waitFor({ state: "hidden" })
  equal(new URL(phone.page.url()).searchParams.has("request"), false)
  await capture(phone.page, "queue-390")
  const phoneFilters = named(phone.page, "Filters")
  equal(await phoneFilters.getAttribute("aria-expanded"), "false")
  await phoneFilters.tap()
  const panelControl = compactReview ? phone.page.getByRole("dialog").getByRole("grid")
    : phone.page.getByRole("combobox", { name: /Schedule order/i })
  await panelControl.waitFor()
  if (authoredDates) await named(phone.page, "Cancel").tap()
  else await phoneFilters.tap()
  await panelControl.waitFor({ state: "hidden" })
  await phone.page.setViewportSize({ width: 320, height: 844 })
  await capture(phone.page, "queue-320", { atTop: true })
  await named(phone.page, "First page").tap()
  await named(phone.page, title01).waitFor()
  await named(phone.page, "Next page").tap()
  await named(phone.page, "Previous page").waitFor()
  await named(phone.page, "Previous page").tap()
  await named(phone.page, title01).waitFor()
  await phone.context.close()
  console.log("Keyboard review, phone return, page-boundary Next, Back/Forward, reload and actor-scoped resume passed.")
}

async function verifyDistantNavigation(browser) {
  const failures = []
  const inspect = locator => locator.evaluate(node => {
    const { top, bottom } = node.getBoundingClientRect()
    const scroller = node.closest(".list-scroll")
    const clip = scroller?.getBoundingClientRect()
    return {
      visible: top >= Math.max(0, clip?.top ?? 0) && bottom <= Math.min(innerHeight, clip?.bottom ?? innerHeight),
      focused: document.activeElement === node,
    }
  })
  for (const [width, height] of [[1280, 844], [1280, 629], [941, 844], [940, 844], [390, 844]]) {
    const { page, context } = await newPage(browser, coordinator, width, width === 390)
    try {
      await page.setViewportSize({ width, height })
      const row = page.locator("#row-title-cedar-19")
      for (const input of ["pointer", "keyboard"]) {
        const label = `distant-${width}x${height}-${input}`
        await page.goto(origin + query("/", route))
        await row.waitFor()
        const original = page.url()
        await row.evaluate(node => node.scrollIntoView({ block: "center" }))
        const scrolled = await page.evaluate(() => ({ page: scrollY, list: document.querySelector(".list-scroll").scrollTop }))
        ok(scrolled.page > 0 || scrolled.list > 0, label + ": distant row must require scrolling")
        if (input === "keyboard") {
          await row.focus()
          await page.keyboard.press("Enter")
        } else if (width === 390) {
          await row.tap()
        } else {
          await row.click()
        }
        const heading = page.locator("#request-title")
        await page.getByText("Purpose", { exact: true }).waitFor()
        const back = named(page, "Return to queue")
        const open = { heading: await inspect(heading), back: await inspect(back) }
        await capture(page, label + "-open")
        if (width === 1280 && height === 844 && input === "pointer") {
          const other = page.locator("#row-title-cedar-18")
          const selectedStyle = await row.evaluate(node => getComputedStyle(node.closest("li")).backgroundColor)
          await other.hover()
          const hoveredStyle = await other.evaluate(node => getComputedStyle(node.closest("li")).backgroundColor)
          await page.keyboard.press("Shift+Tab")
          await other.focus()
          equal(await other.evaluate(node => getComputedStyle(node, "::after").outlineStyle), "solid")
          await capture(page, "queue-selected-hover-focus")
          console.log("Queue selected and hovered backgrounds:", selectedStyle, hoveredStyle)
          if (hoveredStyle !== "rgba(0, 0, 0, 0)") failures.push(label + ": competing hover fill")
          equal(await row.getAttribute("aria-current"), "true")
        }
        if (input === "keyboard") await page.goBack()
        else if (width === 390) await back.tap()
        else await back.click()
        await row.waitFor()
        await until(() => row.evaluate(node => document.activeElement === node), label + ": return focus")
        const restored = await inspect(row)
        equal(page.url(), original, label + ": return scope")
        await capture(page, label + "-return")
        console.log(label, JSON.stringify({ scrolled, open, restored }))
        if (!open.heading.visible || !open.heading.focused || !open.back.visible || !restored.visible) failures.push(label)
      }
    } finally {
      await context.close()
    }
  }
  deepEqual(failures, [], "Distant request context and current row")
}

async function verifyInterruption(browser, delivered, id) {
  const { page, context } = await newPage(browser, coordinator, 390, true)
  const path = origin + approvalPath(id)
  const posts = []
  const lookups = []
  page.on("request", request => {
    if (request.method() === "GET" && request.url().includes("/approvals/")) lookups.push(request.url())
  })
  let release, committed
  const held = new Promise(resolve => { committed = resolve })
  const gate = new Promise(resolve => { release = resolve })
  await page.route(path, async request => {
    posts.push(request.request().postDataJSON())
    if (posts.length !== 1) return request.continue()
    if (delivered) equal((await request.fetch({ maxRetries: 0 })).status(), 200)
    committed()
    await gate
    await request.abort("failed").catch(() => {})
  })
  try {
    await page.goto(origin + `/?request=${id}`)
    await confirm(page, control => control.tap())
    await Promise.race([held, delay(5000).then(() => { throw Error("Approval never reached the interruption point") })])
    await capture(page, delivered ? "committed-pending-390" : "pending-390")
    await page.reload({ waitUntil: "domcontentloaded" })
    release()
    const check = named(page, "Check status")
    await check.waitFor()
    await page.getByText("Purpose", { exact: true }).waitFor()
    equal(posts.length, 1, "reload-no-resubmit: restore cannot issue a write")
    equal(await named(page, "Review approval").isEnabled().catch(() => false), false, "reload-no-resubmit: new review is blocked")
    deepEqual(await stored(id), delivered ? { status: "approved", revision: 2 } : { status: "submitted", revision: 1 })
    equal((await receipts(id)).length, delivered ? 1 : 0)
    const lookup = origin + receiptPath(id, posts[0].operationId)
    const goodReceipt = delivered ? (await receipts(id))[0].response : undefined
    for (const [status, json] of [
      [403, { error: "forbidden" }],
      [200, goodReceipt ? { ...goodReceipt, actorId: "cedar-coordinator-two" }
        : { operationId: posts[0].operationId, outcome: "approved" }],
    ]) {
      await page.route(lookup, route => route.fulfill({ status, json }), { times: 1 })
      const returned = page.waitForResponse(response => response.url() === lookup)
      await check.tap()
      await returned
      await until(() => check.isEnabled(), "Status failure did not leave an available read-only retry")
      equal(await named(page, "Next request").count(), 0)
      equal(await page.getByRole("heading", { name: "Approval recorded" }).count(), 0)
    }
    equal(posts.length, 1, "status lookup is read-only")
    await capture(page, delivered ? "malformed-receipt-390" : "unresolved-390")
    if (authoredDates && delivered) {
      const journal = () => page.evaluate(() => Object.entries(localStorage).filter(([key]) => key.includes("approval")))
      const original = await journal()
      ok(original.some(([, value]) => value.includes(posts[0].operationId)), "The original operation is journaled")
      await named(page, "Return to queue").tap()
      const { panel } = await openDates(page, control => control.tap())
      await dateField(panel, "From").fill("2030-01-12")
      await named(panel, "Apply").tap()
      await panel.waitFor({ state: "hidden" })
      equal(new URL(page.url()).searchParams.get("from"), "2030-01-12")
      deepEqual(await journal(), original)
      equal(posts.length, 1, "Applying dates cannot retry approval")
      await page.getByRole("region", { name: "Request queue" }).waitFor()
      await named(page, "Check status").tap()
    } else {
      await check.tap()
    }
    if (!delivered) {
      await named(page, "Retry approval").waitFor()
      equal(posts.length, 1)
      await named(page, "Retry approval").tap()
      await until(() => posts.length >= 2, "Explicit retry did not send an approval request")
      deepEqual(posts[1], posts[0], "explicit retry uses the original operation and reviewed revision")
    }
    await named(page, "Next request").waitFor()
    deepEqual(await stored(id), { status: "approved", revision: 2 })
    const rows = await receipts(id)
    equal(rows.length, 1)
    equal(rows[0].operation_id, posts[0].operationId)
    equal(posts.length, delivered ? 1 : 2)
    ok(lookups.length >= 2 && lookups.every(url => url === origin + receiptPath(id, posts[0].operationId)),
      "restore and status lookup retain original operation identity")
    await capture(page, delivered ? "recovered-390" : "retried-390")
  } finally {
    release()
    await context.close()
  }
}

async function verifyInFlight(browser) {
  const { page, context } = await newPage(browser, coordinator, 390, true)
  const blocker = await pool.connect()
  const id = "cedar-07"
  const path = approvalPath(id)
  const posts = []
  let first
  const blocked = async () => Number((await pool.query(
    "SELECT count(*) AS n FROM pg_stat_activity WHERE usename='zoo_app' AND wait_event_type='Lock'",
  )).rows[0].n)
  try {
    await blocker.query("BEGIN")
    await blocker.query("SELECT id FROM service_requests WHERE id=$1 FOR NO KEY UPDATE", [id])
    await page.route(origin + path, async route => {
      posts.push(route.request().postDataJSON())
      if (posts.length !== 1) return route.continue()
      // Model a write that has reached the server and survives the page's network connection.
      first = api(path, coordinator, posts[0], 25_000).catch(error => ({ error }))
      await route.abort("failed").catch(() => {})
    })
    await page.goto(origin + `/?request=${id}`)
    await confirm(page, control => control.tap())
    await until(async () => await blocked() >= 1, "First write never reached the locked row")
    await page.reload({ waitUntil: "domcontentloaded" })
    await named(page, "Check status").tap()
    const retry = named(page, "Retry approval")
    await retry.waitFor()
    equal(posts.length, 1, "reload-no-resubmit: in-flight reload and status check")
    await retry.tap()
    await until(async () => await blocked() >= 2, "Same-key retry never overlapped the first transaction")
    deepEqual(posts, [posts[0], posts[0]])
    deepEqual(await stored(id), { status: "submitted", revision: 1 })
    deepEqual(await receipts(id), [])
    await blocker.query("COMMIT")
    equal((await first).status, 200)
    await named(page, "Next request").waitFor()
    deepEqual(await stored(id), { status: "approved", revision: 2 })
    equal((await receipts(id)).length, 1)
    console.log("Reload with a locked write and overlapping explicit same-key retry passed.")
  } finally {
    await blocker.query("ROLLBACK")
    blocker.release()
    await first
    await context.close()
  }
}

async function verifyReviewConflict(browser) {
  const { page, context } = await newPage(browser)
  const id = "cedar-08"
  try {
    await page.goto(origin + `/?request=${id}`)
    await named(page, "Review approval").click()
    const dialog = page.getByRole("dialog")
    await dialog.waitFor()
    await pool.query("UPDATE service_requests SET revision=revision+1 WHERE id=$1", [id])
    await named(dialog, "Approve request").click()
    await page.getByText(/changed|updated since|new version|current revision/i).first().waitFor()
    deepEqual(await stored(id), { status: "submitted", revision: 2 })
    const rejected = await receipts(id)
    equal(rejected.length, 1)
    equal(rejected[0].reviewed_revision, 1)
    equal(rejected[0].http_status, 409)
    equal(await page.getByRole("dialog").count(), 0)
    equal(new URL(page.url()).searchParams.get("request"), id)
    equal(await named(page, "Next request").count(), 0)
    await named(page, "Review approval").waitFor()
    await capture(page, "stale-review-1280")
    await confirm(page)
    await named(page, "Next request").waitFor()
    deepEqual(await stored(id), { status: "approved", revision: 3 })
    const storedReceipts = await receipts(id)
    equal(storedReceipts.length, 2)
    equal(storedReceipts.find(row => row.http_status === 200).reviewed_revision, 2)
    console.log("A stale confirmation left the record unchanged until a fresh review.")
  } finally {
    await context.close()
  }
}

async function verifyTransfer(browser) {
  const id = "cedar-02"
  const operationId = randomUUID()
  const accepted = await expectApi(approvalPath(id), 200, coordinator, { operationId, reviewedRevision: 1 })
  const approved = query(queuePath, { view: "approved", q: route.q })
  const result = await expectApi(approved, 200, "cedar-viewer")
  equal(result.total, 16)
  equal(result.viewTotal, 16)
  deepEqual(ids(result), [id, ...cedarIds.slice(25, 40)])
  const birchId = "birch-01"
  const birchActor = "birch-coordinator"
  await expectApi(approvalPath(birchId), 200, birchActor, { operationId: randomUUID(), reviewedRevision: 1 })
  const birch = await expectApi(approved, 200, birchActor)
  equal(birch.total, 1)
  equal(birch.viewTotal, 1)
  deepEqual(ids(birch), [birchId])
  equal((await expectApi(approved, 200, "cedar-viewer")).total, 16)
  await expectApi(detailPath(id), 404, "birch-coordinator")
  const { page, context } = await newPage(browser, "cedar-viewer", 390, true)
  await page.goto(origin + query("/", { ...route, view: "all", to: "2030-01-14" }))
  const approvedView = page.getByRole("button", { name: /^Approved(?: \d+)?$/ })
  await approvedView.tap()
  await until(() => approvedView.getAttribute("aria-pressed").then(value => value === "true"),
    "Approved view did not become selected")
  const filters = new URL(page.url()).searchParams
  equal(filters.get("view"), "approved")
  equal(filters.get("q"), route.q)
  equal(filters.get("from"), "2030-01-12")
  equal(filters.get("to"), "2030-01-14")
  await page.getByText(/of 16\b/).waitFor()
  await capture(page, "approved-view-390")
  await page.setViewportSize({ width: 320, height: 844 })
  await capture(page, "approved-view-320")
  await page.setViewportSize({ width: 390, height: 844 })
  const title = result.requests[0].title
  await named(page, title).tap()
  await detailHeading(page, title).waitFor()
  equal(new URL(page.url()).searchParams.get("request"), id)
  await page.getByText(/cedar[- ]coordinator/i).first().waitFor()
  await capture(page, "approved-view-detail-390")
  await page.reload()
  await detailHeading(page, title).waitFor()
  await page.getByText(/cedar[- ]coordinator/i).first().waitFor()
  equal(await named(page, "Review approval").count(), 0)
  equal(await named(page, "Next request").count(), 0)
  await page.goBack()
  await named(page, title).waitFor()
  equal(new URL(page.url()).searchParams.get("view"), "approved")
  equal(new URL(page.url()).searchParams.get("q"), route.q)
  await context.close()
  deepEqual(await expectApi(receiptPath(id, operationId)), accepted)
  equal((await receipts(id)).length, 1)
  const operator = await newPage(browser, coordinator, 390, true)
  const lostId = "cedar-09"
  const writes = []
  try {
    await operator.page.route(origin + approvalPath(lostId), async route => {
      writes.push(route.request().postDataJSON())
      equal((await route.fetch({ maxRetries: 0 })).status(), 200)
      await route.abort("failed")
    })
    await operator.page.goto(origin + `/?request=${lostId}`)
    await confirm(operator.page, control => control.tap())
    if (authoredDates) {
      await named(operator.page, "Check status").waitFor()
      await operator.page.getByRole("alert").filter({ hasText: /couldn.t confirm|still unconfirmed/i }).waitFor()
    } else {
      await operator.page.getByText("Approval could not be confirmed.", { exact: true }).waitFor()
    }
    await operator.page.goto(origin + "/?view=approved")
    const queue = operator.page.getByRole("region", { name: "Request queue" })
    await named(queue, composed ? "Community kitchen orientation" : "Workshop: Room orientation 09").waitFor()
    equal(await queue.getByRole("button", { name: /Check status for/ }).count(), 0)
    await named(operator.page, "Check status").tap()
    const recovered = operator.page.getByRole("heading", { name: "Approval recorded" })
    await recovered.waitFor()
    equal(new URL(operator.page.url()).searchParams.get("request"), lostId)
    const recoveryView = new URL(operator.page.url()).searchParams.get("view")
    if (recoveryView === "approved") equal(await named(operator.page, "Next request").count(), 0)
    else equal(recoveryView, "review", "Recovered approval may continue from the review view")
    equal(writes.length, 1)
    equal((await receipts(lostId))[0].operation_id, writes[0].operationId)
  } finally {
    await operator.context.close()
  }
  console.log("Read-only Approved view preserves scoped counts, real receipt, Back and reload.")
}

try {
  await ready()
  console.log("application-ready")
  if (!transfer) await verifyQueue()
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage"] })
  try {
    if (transfer) await verifyTransfer(browser)
    else {
      if (authoredDates) await verifyCalendar(browser)
      if (process.env.ZOO_CEDAR_FILTER_RETURN === "yes") await verifyFilterReturn(browser)
      if (compactReview) await verifyReviewLayout(browser)
      if (process.env.ZOO_CEDAR_DISTANT_NAVIGATION === "yes") await verifyDistantNavigation(browser)
      await verifyQueueStates(browser)
      await verifyBrowser(browser)
      await verifyInterruption(browser, false, "cedar-05")
      await verifyInterruption(browser, true, "cedar-06")
      await verifyInFlight(browser)
      await verifyWrites()
      await verifyReviewConflict(browser)
      console.log("Reload, malformed receipt, same-key retry and committed response loss passed.")
    }
  } finally {
    await browser.close()
  }
} finally {
  await pool.end()
}
