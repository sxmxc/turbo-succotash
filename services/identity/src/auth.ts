import { betterAuth } from "better-auth";
import type pg from "pg";

export function createAuth(pool: pg.Pool, origin: string, secret: string) {
  return betterAuth({
    database: pool,
    baseURL: origin,
    basePath: "/identity/auth",
    secret,
    trustedOrigins: [origin],
    // Signup is owned by the atomic beta-aware route. Better Auth owns login,
    // password verification, sessions, and logout.
    emailAndPassword: { enabled: true, disableSignUp: true },
    rateLimit: {
      customRules: {
        "/sign-in/email": { window: 60, max: 30 },
        "/identity/auth/sign-in/email": { window: 60, max: 30 },
      },
    },
    socialProviders: {},
    telemetry: { enabled: false },
  });
}
