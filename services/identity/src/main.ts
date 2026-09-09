import { timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { makeSignature } from "better-auth/crypto";
import { fromNodeHeaders } from "better-auth/node";
import { z } from "zod";
import { configFor } from "../../../packages/service-runtime/src/config.js";
import {
  buildServer,
  databasePool,
  databaseReady,
  shutdown,
} from "../../../packages/service-runtime/src/server.js";
import {
  createPasswordAccount,
  issueBetaKey,
  registrationStatus,
  revokeBetaKey,
  setBetaGate,
  SignupError,
} from "./accounts.js";
import { createAuth } from "./auth.js";

const config = configFor("identity");
const pool = databasePool(config.IDENTITY_DATABASE_URL, "identity");
const auth = createAuth(pool, config.PUBLIC_ORIGIN, config.BETTER_AUTH_SECRET);
const app = buildServer(
  "identity",
  () => databaseReady(pool, "002"),
  config.LOG_LEVEL,
);
app.addHook("onClose", () => pool.end());

const signupSchema = z.object({
  email: z.email().max(254),
  name: z.string().trim().min(1).max(40),
  password: z.string().min(8).max(128),
  betaKey: z.string().max(128).optional(),
});
const attempts = new Map<string, { count: number; resetAt: number }>();
function rateLimited(key: string, limit = 30) {
  const now = Date.now();
  const existing = attempts.get(key);
  const item =
    !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + 60_000 }
      : existing;
  item.count++;
  attempts.set(key, item);
  return item.count > limit;
}
function clientIp(req: { ip: string; headers: IncomingHttpHeaders }) {
  const forwarded = req.headers["x-forwarded-for"];
  return typeof forwarded === "string"
    ? forwarded
    : Array.isArray(forwarded)
      ? (forwarded[0] ?? req.ip)
      : req.ip;
}
function isAdmin(header: string | string[] | undefined) {
  const supplied = Array.isArray(header) ? header[0] : header;
  if (!supplied) return false;
  const actual = Buffer.from(config.ADMIN_API_TOKEN);
  const candidate = Buffer.from(supplied);
  return (
    actual.length === candidate.length && timingSafeEqual(actual, candidate)
  );
}
async function relayAuth(
  req: {
    method: string;
    url: string;
    headers: IncomingHttpHeaders;
    body?: unknown;
  },
  reply: {
    code(status: number): unknown;
    header(name: string, value: string | string[]): unknown;
    send(body: string): unknown;
  },
  override?: { path: string; body: unknown },
) {
  const headers = fromNodeHeaders(req.headers);
  headers.delete("content-length");
  headers.delete("host");
  let body: string | undefined;
  if (override) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(override.body);
  } else if (!["GET", "HEAD"].includes(req.method) && req.body !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(req.body);
  }
  const response = await auth.handler(
    new Request(new URL(override?.path ?? req.url, config.PUBLIC_ORIGIN), {
      method: override ? "POST" : req.method,
      headers,
      body,
    }),
  );
  reply.code(response.status);
  response.headers.forEach((value, key) => {
    if (key !== "set-cookie") reply.header(key, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) reply.header("set-cookie", cookies);
  return reply.send(await response.text());
}

app.get("/identity/registration", async () => registrationStatus(pool));

app.post("/identity/auth/sign-up/email", async (req, reply) => {
  if (rateLimited(`signup:${clientIp(req)}`))
    return reply.code(429).send({ code: "RATE_LIMITED" });
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success)
    return reply.code(400).send({
      code: "INVALID_SIGNUP",
      message: parsed.error.issues[0]?.message,
    });
  try {
    const created = await createPasswordAccount(pool, parsed.data);
    const signature = await makeSignature(
      created.sessionToken,
      config.BETTER_AUTH_SECRET,
    );
    const secure = config.PUBLIC_ORIGIN.startsWith("https://")
      ? "; Secure"
      : "";
    reply.header(
      "set-cookie",
      `better-auth.session_token=${created.sessionToken}.${signature}; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax${secure}`,
    );
    return reply.send({ user: created.user });
  } catch (error) {
    if (error instanceof SignupError) {
      const status = error.code === "EMAIL_IN_USE" ? 409 : 403;
      return reply.code(status).send({ code: error.code });
    }
    throw error;
  }
});

app.post("/identity/admin/beta-keys", async (req, reply) => {
  if (!isAdmin(req.headers["x-admin-token"]))
    return reply.code(403).send({ code: "ADMIN_REQUIRED" });
  return reply.code(201).send(await issueBetaKey(pool));
});
app.delete<{ Params: { id: string } }>(
  "/identity/admin/beta-keys/:id",
  async (req, reply) => {
    if (!isAdmin(req.headers["x-admin-token"]))
      return reply.code(403).send({ code: "ADMIN_REQUIRED" });
    return (await revokeBetaKey(pool, req.params.id))
      ? reply.code(204).send()
      : reply.code(404).send({ code: "KEY_NOT_AVAILABLE" });
  },
);
app.patch("/identity/admin/registration", async (req, reply) => {
  if (!isAdmin(req.headers["x-admin-token"]))
    return reply.code(403).send({ code: "ADMIN_REQUIRED" });
  const parsed = z.object({ betaGateEnabled: z.boolean() }).safeParse(req.body);
  if (!parsed.success)
    return reply.code(400).send({ code: "INVALID_GATE_SETTING" });
  await setBetaGate(pool, parsed.data.betaGateEnabled);
  return registrationStatus(pool);
});

app.all("/identity/auth/*", async (req, reply) => {
  if (
    req.url.endsWith("/sign-in/email") &&
    rateLimited(`login:${clientIp(req)}`, 30)
  )
    return reply.code(429).send({ code: "RATE_LIMITED" });
  return relayAuth(req, reply);
});

shutdown(() => app.close());
await app.listen({ host: config.HOST, port: config.IDENTITY_PORT });
