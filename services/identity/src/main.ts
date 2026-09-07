import { fromNodeHeaders } from "better-auth/node";
import { configFor } from "../../../packages/service-runtime/src/config.js";
import {
  buildServer,
  databasePool,
  databaseReady,
  shutdown,
} from "../../../packages/service-runtime/src/server.js";
import { createAuth } from "./auth.js";
const config = configFor("identity");
const pool = databasePool(config.IDENTITY_DATABASE_URL, "identity");
const auth = createAuth(pool, config.PUBLIC_ORIGIN, config.BETTER_AUTH_SECRET);
const app = buildServer(
  "identity",
  () => databaseReady(pool),
  config.LOG_LEVEL,
);
app.addHook("onClose", () => pool.end());
// Only session inspection is exposed until atomic beta-gated signup exists.
app.get("/identity/auth/get-session", async (req, reply) => {
  const response = await auth.handler(
    new Request(new URL(req.url, config.PUBLIC_ORIGIN), {
      headers: fromNodeHeaders(req.headers),
    }),
  );
  reply.code(response.status);
  response.headers.forEach((value, key) => {
    if (key !== "set-cookie") reply.header(key, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) reply.header("set-cookie", cookies);
  return reply.send(await response.text());
});
app.all("/identity/auth/*", async (_req, reply) =>
  reply.code(501).send({
    code: "AUTH_NOT_IMPLEMENTED",
    message: "Account flows arrive in Milestone 1.",
  }),
);
shutdown(() => app.close());
await app.listen({ host: config.HOST, port: config.IDENTITY_PORT });
