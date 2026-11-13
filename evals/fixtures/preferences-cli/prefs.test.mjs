import { deepEqual, equal, rejects } from "node:assert/strict"
import { execFile } from "node:child_process"
import { lstat, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

const run = promisify(execFile)
const cli = fileURLToPath(new URL("prefs.mjs", import.meta.url))

test("missing preferences are unset and a write preserves other keys", async () => {
  const directory = await mkdtemp(join(tmpdir(), "zoo-preferences-"))
  const file = join(directory, "settings.json")
  try {
    const absent = await run(process.execPath, [cli, file, "get", "theme"])
    equal(absent.stdout.trim(), "unset")
    await writeFile(file, '{"locale":"en"}\n', { mode: 0o600 })
    await run(process.execPath, [cli, file, "set", "theme", "dark"])
    const set = await run(process.execPath, [cli, file, "get", "theme"])
    equal(set.stdout.trim(), "dark")
    deepEqual(JSON.parse(await readFile(file, "utf8")), { locale: "en", theme: "dark" })
    equal((await stat(file)).mode & 0o777, 0o600)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("a competing lock stays in place and a later retry preserves the file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "zoo-preferences-lock-"))
  const file = join(directory, "settings.json")
  const lock = file + ".lock"
  try {
    await writeFile(file, '{"locale":"en"}\n')
    await writeFile(lock, "other writer\n")
    await rejects(run(process.execPath, [cli, file, "set", "theme", "dark"]), /already has a writer/)
    equal(await readFile(lock, "utf8"), "other writer\n")
    equal(await readFile(file, "utf8"), '{"locale":"en"}\n')
    await rm(lock)
    await run(process.execPath, [cli, file, "set", "theme", "dark"])
    deepEqual(JSON.parse(await readFile(file, "utf8")), { locale: "en", theme: "dark" })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("a symlink or unsupported value is rejected without replacing its file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "zoo-preferences-invalid-"))
  const file = join(directory, "settings.json")
  const link = join(directory, "link.json")
  const original = '{"numeric":9007199254740993}\n'
  try {
    await writeFile(file, original)
    await symlink(file, link)
    await rejects(run(process.execPath, [cli, link, "set", "theme", "dark"]), /regular file/)
    equal((await lstat(link)).isSymbolicLink(), true)
    await rejects(run(process.execPath, [cli, file, "set", "theme", "dark"]), /string values/)
    equal(await readFile(file, "utf8"), original)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
