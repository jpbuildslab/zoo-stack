import { strictEqual } from "node:assert"
import { realpath } from "node:fs/promises"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const candidate = process.argv[2]
if (!candidate) throw new Error("Supply the path to a trusted request-notices fixture export")
const source = pathToFileURL(join(await realpath(candidate), "notices.ts"))
const { approvalNotice } = await import(source.href) as { approvalNotice: (name: string) => string }
strictEqual(approvalNotice("Maple Room"), "Approved for Maple Room.")
strictEqual(approvalNotice("Side Office"), "Approved for Side Office.")
console.log("The notice uses the requested wording and preserves the supplied name.")
