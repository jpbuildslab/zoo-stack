import { readFile } from "node:fs/promises"
import type { IncomingMessage, RequestListener, ServerResponse } from "node:http"
import type { Pool } from "pg"
import { startLocalServer } from "../../runner/listener.ts"
import { approveRequest, listRequests } from "./requests.ts"
import { readActor } from "./session.ts"

const dist = new URL("../../dist/", import.meta.url)
const assetTypes: Record<string, string> = {
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  response.end(JSON.stringify(body))
}

async function serveAsset(path: string, response: ServerResponse): Promise<void> {
  const asset = /^\/assets\/[A-Za-z0-9_-]+\.(css|js)$/.exec(path)
  if (path !== "/" && !asset) {
    json(response, 404, { error: "not_found" })
    return
  }
  const file = new URL(path === "/" ? "index.html" : path.slice(1), dist)
  const body = await readFile(file)
  response.writeHead(200, {
    "Content-Type": asset ? assetTypes[asset[1]] : "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  })
  response.end(body)
}

async function handle(pool: Pool, request: IncomingMessage, response: ServerResponse): Promise<void> {
  const { pathname } = new URL(request.url ?? "/", "http://127.0.0.1")
  if (!pathname.startsWith("/api/") && request.method === "GET") {
    await serveAsset(pathname, response)
    return
  }

  const actor = readActor(request)
  if (!actor) {
    json(response, 401, { error: "session_required" })
    return
  }

  if (pathname === "/api/requests" && request.method === "GET") {
    json(response, 200, {
      workspace: actor.workspace,
      canApprove: actor.canApprove,
      requests: await listRequests(pool, actor),
    })
    return
  }

  const approval = /^\/api\/requests\/([a-z0-9-]+)\/approve$/.exec(pathname)
  if (approval && request.method === "POST") {
    const result = await approveRequest(pool, actor, approval[1])
    if (result.outcome === "approved") {
      json(response, 200, result.request)
    } else {
      const status = { forbidden: 403, not_found: 404, not_submitted: 409 }[result.outcome]
      json(response, status, { error: result.outcome })
    }
    return
  }

  json(response, 404, { error: "not_found" })
}

export function requestHandler(pool: Pool): RequestListener {
  return (request, response) => {
    handle(pool, request, response).catch(() => {
      if (!response.headersSent) {
        json(response, 500, { error: "fixture_error" })
      } else {
        response.destroy()
      }
    })
  }
}

export function startServer(pool: Pool) {
  return startLocalServer(requestHandler(pool))
}
