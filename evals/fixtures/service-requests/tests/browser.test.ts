import { equal, match } from "node:assert/strict"
import { test } from "node:test"
import { launchFixtureBrowser } from "../runner/browser.ts"
import { prepareSchema, withOwnedDatabase } from "../runner/database.ts"
import { startServer } from "../src/server/http.ts"

test("a coordinator can review and approve at phone width with the keyboard", async () => {
  await withOwnedDatabase(async (pool, identity) => {
    await prepareSchema(pool, identity)
    const server = await startServer(pool)
    try {
      const browser = await launchFixtureBrowser()
      try {
        const context = await browser.newContext({
          viewport: { width: 390, height: 844 }, serviceWorkers: "block",
        })
        await context.addCookies([{ name: "fixture_session", value: "cedar-coordinator", url: server.origin }])
        const page = await context.newPage()
        const foreignRequests: string[] = []
        await context.route("**/*", (route) => {
          if (new URL(route.request().url()).origin === server.origin) return route.continue()
          foreignRequests.push(route.request().url())
          return route.abort()
        })
        await page.goto(server.origin)
        const review = page.getByRole("button", { name: "Review approval for Maple Room" })
        await review.waitFor()
        equal(await page.getByRole("heading", { name: "Garden Room" }).count(), 0)
        await page.keyboard.press("Tab")
        equal(await review.evaluate((element) => element === document.activeElement), true)
        await page.keyboard.press("Enter")
        const dialog = page.getByRole("dialog", { name: "Approve Maple Room?" })
        await dialog.waitFor()
        const time = dialog.getByRole("time")
        equal(await time.getAttribute("datetime"), "2030-01-12T09:00:00.000Z")
        match((await time.textContent()) ?? "", /Jan 12, 2030.*9:00 AM UTC$/)
        await page.keyboard.press("Escape")
        await dialog.waitFor({ state: "hidden" })
        equal(await review.evaluate((element) => element === document.activeElement), true)
        await page.keyboard.press("Enter")
        await dialog.waitFor()
        await page.keyboard.press("Tab")
        const approve = dialog.getByRole("button", { name: "Approve request" })
        equal(await approve.evaluate((element) => element === document.activeElement), true)
        await page.keyboard.press("Enter")
        await page.getByRole("status").filter({ hasText: "Approved Maple Room." }).waitFor()
        equal(await review.count(), 0)
        equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
        equal(foreignRequests.length, 0)
        const row = await pool.query("SELECT status, revision FROM service_requests WHERE id = $1", ["cedar-submitted"])
        equal(row.rows[0].status, "approved")
        equal(row.rows[0].revision, 2)
      } finally {
        await browser.close()
      }
    } finally {
      await server.close()
    }
  })
})
