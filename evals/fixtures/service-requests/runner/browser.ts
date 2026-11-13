import { chromium } from "playwright"

export function launchFixtureBrowser() {
  return chromium.launch({ executablePath: process.env.ZOO_BROWSER_EXECUTABLE })
}
