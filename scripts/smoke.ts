import assert from "node:assert/strict";
import { diagnosticSchema } from "../packages/contracts/src/index.js";
const base = process.env.SMOKE_URL || "http://localhost:8080";
async function request(path: string, method = "GET") {
  return fetch(base + path, { method, signal: AbortSignal.timeout(5000) });
}
assert.equal((await request("/")).status, 200);
assert.match(await (await request("/")).text(), /<script[^>]+src=/);
for (const [prefix, service] of [
  ["/identity", "identity"],
  ["/api", "api"],
  ["/realtime", "realtime"],
] as const) {
  for (const endpoint of ["/healthz", "/readyz"]) {
    const response = await request(prefix + endpoint);
    assert.equal(response.status, 200);
    const body = diagnosticSchema.parse(await response.json());
    assert.equal(body.service, service);
    if (process.env.EXPECT_COMMIT)
      assert.equal(body.commit, process.env.EXPECT_COMMIT);
  }
}
const session = await request("/identity/auth/get-session");
assert.equal(session.status, 200);
assert.equal(await session.json(), null);
const registration = await request("/identity/registration");
assert.equal(registration.status, 200);
assert.equal(typeof (await registration.json()).betaGateEnabled, "boolean");
assert.equal(
  (await request("/identity/auth/sign-up/email", "POST")).status,
  400,
);
console.log(
  "Compose smoke passed: web, service readiness, anonymous session, and beta registration status.",
);
