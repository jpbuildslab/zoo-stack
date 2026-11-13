import { rejects } from "node:assert/strict"
import { execFile } from "node:child_process"
import { lstat, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

const run = promisify(execFile)
const cli = fileURLToPath(new URL("../fixtures/preferences-cli/prefs.mjs", import.meta.url))

test("a named pipe rejects promptly and leaves no writer lock", async () => {
  const directory = await mkdtemp(join(tmpdir(), "zoo-preferences-pipe-"))
  const file = join(directory, "settings.pipe")
  try {
    await run("mkfifo", [file])
    await rejects(run(process.execPath, [cli, file, "get", "theme"], { timeout: 2_000 }), /regular file/)
    await rejects(run(process.execPath, [cli, file, "set", "theme", "dark"], { timeout: 2_000 }), /regular file/)
    await rejects(lstat(file + ".lock"), { code: "ENOENT" })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
