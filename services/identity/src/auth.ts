import { betterAuth } from "better-auth";
import type pg from "pg";
export function createAuth(pool: pg.Pool, origin: string, secret: string) {
  return betterAuth({
    database: pool,
    baseURL: origin,
    basePath: "/identity/auth",
    secret,
    trustedOrigins: [origin],
    emailAndPassword: { enabled: false },
    socialProviders: {},
    telemetry: { enabled: false },
  });
}
