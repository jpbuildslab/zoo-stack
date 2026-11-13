import type { IncomingMessage } from "node:http"

export interface Actor {
  id: string
  workspace: string
  canApprove: boolean
}

const sessions = new Map<string, Actor>([
  ["cedar-coordinator", { id: "cedar-coordinator", workspace: "cedar", canApprove: true }],
  ["cedar-viewer", { id: "cedar-viewer", workspace: "cedar", canApprove: false }],
  ["birch-coordinator", { id: "birch-coordinator", workspace: "birch", canApprove: true }],
])

export function readActor(request: IncomingMessage): Actor | undefined {
  const session = request.headers.cookie
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("fixture_session="))
  return sessions.get(session?.slice("fixture_session=".length) ?? "")
}
