import { deepEqual, equal } from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { copyFile, mkdtemp, rm, symlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { fileURLToPath, pathToFileURL } from "node:url"
import { launchFixtureBrowser } from "../fixtures/service-requests/runner/browser.ts"
import type { requestHandler } from "../fixtures/service-requests/src/server/http.ts"
import { runReference } from "../reference/server.ts"

const repository = fileURLToPath(new URL("../../", import.meta.url))
const baseline = execFileSync("git", ["-C", repository, "rev-parse", "--verify", "HEAD"], {
  encoding: "utf8",
}).trim()
const evaluator = new URL("../", import.meta.url)
const dependencies = fileURLToPath(new URL("fixtures/service-requests/node_modules", evaluator))
const oldStart = "2030-01-12T10:00:00.000Z"
const newStart = "2030-01-12T14:30:00.000Z"

test("the mounted reference keeps the original key after a lost response and failed recovery", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "zoo-reference-ui-"))
  const project = join(scratch, "fixture")
  try {
    execFileSync("python3", [fileURLToPath(new URL("export-fixture.py", evaluator)), baseline, "service-requests", project])
    await copyFile(new URL("reference/reschedule-page.tsx", evaluator), join(project, "src/client/main.tsx"))
    await symlink(dependencies, join(project, "node_modules"), "dir")
    execFileSync(process.execPath, [join(dependencies, "typescript/bin/tsc"), "--noEmit"], { cwd: project })
    execFileSync(process.execPath, [join(dependencies, "vite/bin/vite.js"), "build"], { cwd: project })
    const serverFile = pathToFileURL(join(project, "src/server/http.ts"))
    const { requestHandler: mount } = await import(serverFile.href) as { requestHandler: typeof requestHandler }
    await runReference({}, async (pool, origin) => {
      const browser = await launchFixtureBrowser()
      try {
        const context = await browser.newContext({
          viewport: { width: 390, height: 844 }, serviceWorkers: "block",
        })
        await context.addCookies([{ name: "fixture_session", value: "cedar-coordinator", url: origin }])
        await context.route("**/*", (route) =>
          new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
        const page = await context.newPage()
        page.setDefaultTimeout(8_000)
        const confirmations: unknown[] = []
        page.on("request", (request) => {
          if (new URL(request.url()).pathname.endsWith("/reschedule/confirm")) {
            confirmations.push(request.postDataJSON().operationKey)
          }
        })
        let lostKey: string | undefined
        const confirmStatuses: number[] = []
        await page.route(origin + "/api/requests/cedar-approved/reschedule/confirm", async (route) => {
          const response = await route.fetch({ maxRedirects: 0, maxRetries: 0 })
          confirmStatuses.push(response.status())
          lostKey = route.request().postDataJSON().operationKey
          await route.abort()
        })
        const recoveries: string[] = []
        await page.route(origin + "/api/requests/cedar-approved/reschedule/operations/*", async (route) => {
          recoveries.push(new URL(route.request().url()).pathname.split("/").at(-1)!)
          if (recoveries.length === 1) await route.abort()
          else await route.continue()
        })
        await page.route(origin + "/api/requests", (route) =>
          recoveries.length >= 2 ? route.fulfill({ status: 503, body: "refresh unavailable" }) : route.continue())

        await page.goto(origin)
        await page.getByRole("heading", { name: "Reschedule North Hall" }).waitFor()
        const field = page.getByRole("textbox", { name: "New UTC start" })
        await field.fill(oldStart)
        await field.press("Enter")
        await page.getByRole("alert").filter({ hasText: "Choose a different valid UTC start time." }).waitFor()
        equal(await field.inputValue(), oldStart)
        await field.fill(newStart)
        await field.press("Enter")
        const dialog = page.getByRole("dialog", { name: "Review new time for North Hall" })
        await dialog.waitFor()
        await dialog.getByText(`Previous start ${oldStart}`).waitFor()
        await dialog.getByText(`Proposed start ${newStart}`).waitFor()
        await dialog.getByRole("button", { name: "Confirm new time" }).press("Enter")
        await dialog.getByRole("alert").filter({ hasText: "The outcome is unresolved." }).waitFor()
        const recover = dialog.getByRole("button", { name: "Recover original result" })
        await recover.press("Enter")
        await dialog.getByRole("alert").filter({ hasText: "The outcome is unresolved." }).waitFor()
        await recover.press("Enter")
        await page.getByRole("status").filter({ hasText: `Confirmed ${newStart}` }).waitFor()
        await page.getByRole("alert").filter({ hasText: "Confirmed. The request list could not refresh." }).waitFor()
        equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
        deepEqual(confirmStatuses, [200])
        deepEqual(confirmations, [lostKey])
        deepEqual(recoveries, [lostKey, lostKey])

        const stored = await pool.query(
          "SELECT scheduled_start, revision FROM service_requests WHERE id = $1", ["cedar-approved"],
        )
        deepEqual(stored.rows.map((row) => [row.scheduled_start.toISOString(), row.revision]), [[newStart, 3]])
        const operations = await pool.query("SELECT operation_key FROM schedule_operations")
        deepEqual(operations.rows, [{ operation_key: lostKey }])
      } finally {
        await browser.close()
      }
    }, mount)
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
})
