import Fastify from "fastify";
import pg from "pg";
import { readFileSync } from "node:fs";
import {
  diagnosticSchema,
  protocolVersion,
  type Diagnostic,
} from "../../contracts/src/index.js";
const version = JSON.parse(
  readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
).version as string;
export function diagnostic(
  service: Diagnostic["service"],
  status: Diagnostic["status"],
) {
  return diagnosticSchema.parse({
    service,
    status,
    version,
    commit: process.env.BUILD_COMMIT || "development",
    protocol: protocolVersion,
  });
}
export function buildServer(
  service: Diagnostic["service"],
  ready: () => Promise<void>,
  level = "silent",
) {
  const app = Fastify({
    logger: {
      level,
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers.x-admin-token",
        'res.headers["set-cookie"]',
      ],
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url?.split("?")[0],
          id: req.id,
        }),
      },
    },
    bodyLimit: 16384,
    requestTimeout: 10000,
    forceCloseConnections: "idle",
  });
  let closing = false;
  app.addHook("preClose", async () => {
    closing = true;
  });
  app.get("/healthz", async () => diagnostic(service, "ok"));
  app.get("/readyz", async (_req, reply) => {
    try {
      if (closing) throw new Error("closing");
      await ready();
      return diagnostic(service, "ready");
    } catch {
      return reply.code(503).send(diagnostic(service, "not_ready"));
    }
  });
  return app;
}
export function databasePool(url: string, schema: "identity" | "application") {
  const pool = new pg.Pool({
    connectionString: url,
    options: `-c search_path=${schema},public`,
    max: 5,
    connectionTimeoutMillis: 1500,
    query_timeout: 1500,
    statement_timeout: 1500,
  });
  pool.on("error", () => {
    console.error(
      "Database connection lost; readiness will report dependency state",
    );
  });
  return pool;
}
export async function databaseReady(pool: pg.Pool, requiredVersion = "001") {
  const result = await pool.query(
    "SELECT version FROM schema_migrations WHERE version = $1",
    [requiredVersion],
  );
  if (result.rowCount !== 1)
    throw new Error(`Required migration ${requiredVersion} missing`);
}
export async function dependencyReady(
  url: string,
  service: Diagnostic["service"],
) {
  const response = await fetch(`${url}/readyz`, {
    signal: AbortSignal.timeout(1800),
  });
  const diagnostic = diagnosticSchema.parse(await response.json());
  if (
    !response.ok ||
    diagnostic.status !== "ready" ||
    diagnostic.service !== service
  )
    throw new Error("Dependency not ready");
}
export function shutdown(close: () => Promise<unknown>) {
  let stopping = false;
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => {
      if (stopping) return;
      stopping = true;
      const timeout = setTimeout(() => process.exit(1), 10000);
      timeout.unref();
      void close().then(
        () => {
          clearTimeout(timeout);
          process.exit(0);
        },
        () => process.exit(1),
      );
    });
}
