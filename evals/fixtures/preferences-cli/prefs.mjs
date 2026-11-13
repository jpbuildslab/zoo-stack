import { constants } from "node:fs"
import { chmod, open, rename, rm, writeFile } from "node:fs/promises"
import { randomUUID } from "node:crypto"

async function readSettings(file) {
  let handle
  try {
    handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
    const stat = await handle.stat()
    if (!stat.isFile()) throw new Error("The settings path must be a regular file")
    const value = JSON.parse((await handle.readFile("utf8")) || "{}")
    if (typeof value !== "object" || !value || Array.isArray(value)) {
      throw new Error("The settings file must contain a JSON object")
    }
    if (Object.values(value).some((item) => typeof item !== "string")) {
      throw new Error("Preferences must contain string values")
    }
    return { value, mode: stat.mode & 0o777 }
  } catch (error) {
    if (error.code === "ENOENT") return { value: {}, mode: 0o600 }
    if (error.code === "ELOOP") throw new Error("The settings path must be a regular file")
    throw error
  } finally {
    await handle?.close()
  }
}

async function setPreference(file, key, value) {
  const lockPath = `${file}.lock`
  const lock = await open(lockPath, "wx", 0o600).catch((error) => {
    if (error.code === "EEXIST") throw new Error("The settings file already has a writer. Retry after it finishes.")
    throw error
  })
  const temporary = `${file}.${randomUUID()}.tmp`
  try {
    const settings = await readSettings(file)
    await writeFile(temporary, JSON.stringify({ ...settings.value, [key]: value }, null, 2) + "\n",
      { flag: "wx", mode: 0o600 })
    await chmod(temporary, settings.mode)
    await rename(temporary, file)
  } finally {
    try {
      await rm(temporary, { force: true })
    } finally {
      await lock.close()
      await rm(lockPath)
    }
  }
}

async function main([file, action, key, value]) {
  if (!file || !key || (action !== "get" && action !== "set") || (action === "set" && value === undefined)) {
    throw new Error("Use prefs.mjs <file> get <key> or prefs.mjs <file> set <key> <value>")
  }
  if (action === "get") {
    const settings = (await readSettings(file)).value
    console.log(Object.hasOwn(settings, key) ? settings[key] : "unset")
    return
  }
  await setPreference(file, key, value)
}

await main(process.argv.slice(2)).catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
