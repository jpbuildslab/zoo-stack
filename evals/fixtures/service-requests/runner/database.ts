import { execFileSync, spawnSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { readFile } from "node:fs/promises"
import { setTimeout as delay } from "node:timers/promises"
import pg, { type ClientBase, type Pool, type PoolConfig } from "pg"
export type { Pool, PoolClient } from "pg"

const image = "postgres@sha256:97ff59a4e30e08d1c11bdcd9455e7832368c0572b576c9092cde2df4ae5552a3"
const ownerLabel = "io.zoo.fixture.run"
const portKey = "5432/tcp"
const database = "zoo_fixture"
const user = "zoo_fixture"

export interface DatabaseIdentity {
  database: string
  username: string
  cluster: string
}

interface ContainerReceipt {
  id: string
  name: string
  owner: string
  ports: Record<string, Array<{ HostIp: string; HostPort: string }> | null>
}

function docker(args: string[], env = process.env): string {
  return execFileSync("docker", args, { env, encoding: "utf8", timeout: 20_000 }).trim()
}

function ownedDockerContext(): string {
  const context = docker(["context", "show"])
  const endpoint = docker(["context", "inspect", context, "--format", "{{.Endpoints.docker.Host}}"])
  if (!endpoint.startsWith("unix:///") || process.env.DOCKER_HOST) {
    throw new Error("The fixture needs a local Docker Unix socket and does not accept DOCKER_HOST")
  }
  const engine = docker(["--context", context, "version", "--format", "{{.Server.Version}}"])
  if (!(Number.parseInt(engine, 10) >= 28)) {
    throw new Error("Docker Engine 28 or newer is required for the fixture's loopback-only port")
  }
  return context
}

function inspect(context: string, id: string): ContainerReceipt {
  const format = '{"id":{{json .Id}},"name":{{json .Name}},"owner":{{json (index .Config.Labels "' +
    ownerLabel + '")}},"ports":{{json .NetworkSettings.Ports}}}'
  return JSON.parse(docker(["--context", context, "container", "inspect", id, "--format", format]))
}

function assertOwnedContainer(receipt: ContainerReceipt, id: string, run: string): void {
  if (receipt.id !== id || receipt.name !== `/${run}` || receipt.owner !== run) {
    throw new Error("Docker container does not match this fixture run")
  }
}

function boundPort(receipt: ContainerReceipt): number {
  const bindings = receipt.ports?.[portKey] ?? []
  const port = Number(bindings[0]?.HostPort)
  if (bindings.length !== 1 || bindings[0]?.HostIp !== "127.0.0.1" ||
      !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Fixture database is missing its single loopback port")
  }
  return port
}

export function assertDatabaseIdentity(actual: DatabaseIdentity | undefined, expected: DatabaseIdentity): void {
  if (!actual || actual.database !== expected.database || actual.username !== expected.username ||
      actual.cluster !== expected.cluster) {
    throw new Error("PostgreSQL target does not belong to this fixture run")
  }
}

async function assertOwnedConnection(client: ClientBase, expected: DatabaseIdentity): Promise<void> {
  const result = await client.query<DatabaseIdentity>(
    "SELECT current_database() AS database, current_user AS username, current_setting('cluster_name') AS cluster",
  )
  assertDatabaseIdentity(result.rows[0], expected)
}

export function createBoundPool(config: PoolConfig, identity: DatabaseIdentity): Pool {
  const pool = new pg.Pool({
    ...config,
    onConnect: async (client) => assertOwnedConnection(client, identity),
  })
  pool.on("error", () => {
    // pg has removed the idle client. A replacement must pass the identity check.
    console.error("An idle fixture database connection dropped.")
  })
  return pool
}

async function waitForPostgres(context: string, container: string): Promise<void> {
  const deadline = Date.now() + 30_000
  while (true) {
    const result = spawnSync("docker", [
      "--context", context, "container", "exec", container,
      "pg_isready", "-q", "-h", "127.0.0.1", "-U", user, "-d", database,
    ], { encoding: "utf8", timeout: 5_000 })
    if (result.status === 0) return
    if (result.error) throw result.error
    if (Date.now() >= deadline || ![1, 2].includes(result.status ?? -1)) {
      throw new Error(`The owned PostgreSQL container did not become ready: ${result.stderr.trim()}`)
    }
    await delay(150)
  }
}

export async function withOwnedDatabase<T>(runChecks: (pool: Pool, identity: DatabaseIdentity) => Promise<T>): Promise<T> {
  const context = ownedDockerContext()
  const run = `zoo-fixture-${randomBytes(12).toString("hex")}`
  const password = randomBytes(24).toString("hex")
  const identity = { database, username: user, cluster: run }
  let container: string | undefined
  let pool: Pool | undefined

  try {
    container = docker([
      "--context", context, "container", "create", "--pull=never", "--name", run,
      "--label", `${ownerLabel}=${run}`, "--publish", "127.0.0.1::5432",
      "--tmpfs", "/var/lib/postgresql/data",
      "--env", "POSTGRES_DB", "--env", "POSTGRES_USER", "--env", "POSTGRES_PASSWORD",
      image, "postgres", "-c", `cluster_name=${run}`,
    ], {
      ...process.env,
      POSTGRES_DB: database,
      POSTGRES_USER: user,
      POSTGRES_PASSWORD: password,
    })
    assertOwnedContainer(inspect(context, container), container, run)
    docker(["--context", context, "container", "start", container])
    const receipt = inspect(context, container)
    assertOwnedContainer(receipt, container, run)
    const port = boundPort(receipt)
    await waitForPostgres(context, container)
    pool = createBoundPool({
      database, user, password, host: "127.0.0.1", port, ssl: false,
      connectionTimeoutMillis: 1_500, query_timeout: 4_000, max: 4,
    }, identity)
    const client = await pool.connect()
    client.release()
    return await runChecks(pool, identity)
  } finally {
    try {
      await pool?.end()
    } finally {
      // A timed-out create can leave a container even if its ID never reached the caller.
      const ownedIds = container ? [container] : docker([
        "--context", context, "container", "ls", "--all", "--no-trunc",
        "--filter", `label=${ownerLabel}=${run}`, "--format", "{{.ID}}",
      ]).split("\n").filter(Boolean)
      if (ownedIds.length > 1) throw new Error("More than one container claimed this fixture run")
      const owned = ownedIds[0]
      if (owned) {
        assertOwnedContainer(inspect(context, owned), owned, run)
        docker(["--context", context, "container", "rm", "--force", "--volumes", owned])
      }
    }
  }
}

export async function prepareSchema(pool: Pool, identity: DatabaseIdentity): Promise<void> {
  const client = await pool.connect()
  try {
    await assertOwnedConnection(client, identity)
    await client.query("BEGIN")
    try {
      await client.query(await readFile(new URL("schema.sql", import.meta.url), "utf8"))
      await client.query("COMMIT")
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }
  } finally {
    client.release()
  }
}
