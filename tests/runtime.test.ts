import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildServer,
  dependencyReady,
} from "../packages/service-runtime/src/server.js";
import { configFor } from "../packages/service-runtime/src/config.js";
import { diagnosticSchema } from "../packages/contracts/src/index.js";
test("liveness survives dependency failure; readiness fails and recovers without exposing errors", async () => {
  let available = true;
  const app = buildServer("api", async () => {
    if (!available) throw new Error("secret-database-url");
  });
  try {
    assert.equal((await app.inject("/readyz")).statusCode, 200);
    available = false;
    assert.equal((await app.inject("/healthz")).statusCode, 200);
    const failed = await app.inject("/readyz");
    assert.equal(failed.statusCode, 503);
    assert.equal(diagnosticSchema.parse(failed.json()).status, "not_ready");
    assert.ok(!failed.body.includes("secret"));
    available = true;
    assert.equal((await app.inject("/readyz")).statusCode, 200);
  } finally {
    await app.close();
  }
});
test("configuration errors identify fields without echoing supplied secrets", () => {
  assert.throws(
    () =>
      configFor("identity", {
        BETTER_AUTH_SECRET: "private-value",
        IDENTITY_DATABASE_URL: "private-value",
      }),
    (error) =>
      error instanceof Error &&
      error.message.includes("IDENTITY_DATABASE_URL") &&
      !error.message.includes("private-value"),
  );
  assert.throws(
    () => configFor("api", { API_DATABASE_URL: "https://example.com" }),
    /PostgreSQL/,
  );
  assert.throws(
    () =>
      configFor("realtime", {
        API_INTERNAL_URL: "http://localhost/path",
        IDENTITY_INTERNAL_URL: "http://localhost",
      }),
    /origin/,
  );
});
test("dependency probe rejects wrong protocol, service, and unhealthy dependencies", async () => {
  let ready = true;
  const app = buildServer("identity", async () => {
    if (!ready) throw new Error("offline");
  });
  try {
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    assert.ok(address && typeof address !== "string");
    const url = `http://127.0.0.1:${address.port}`;
    await dependencyReady(url, "identity");
    await assert.rejects(dependencyReady(url, "api"));
    ready = false;
    await assert.rejects(dependencyReady(url, "identity"));
    assert.equal(
      diagnosticSchema.safeParse({
        service: "identity",
        status: "ready",
        version: "0.1.0",
        commit: "dev",
        protocol: 99,
      }).success,
      false,
    );
  } finally {
    await app.close();
  }
});
