import { z } from "zod";
const base = z.object({
  HOST: z.string().default("127.0.0.1"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});
const port = z.coerce.number().int().min(1).max(65535);
const database = z
  .string()
  .url()
  .refine(
    (v) =>
      URL.canParse(v) &&
      ["postgres:", "postgresql:"].includes(new URL(v).protocol),
    "Use a PostgreSQL connection URL",
  );
const origin = z
  .string()
  .url()
  .refine((v) => {
    if (!URL.canParse(v)) return false;
    const u = new URL(v);
    return (
      ["http:", "https:"].includes(u.protocol) &&
      u.pathname === "/" &&
      !u.search &&
      !u.hash &&
      !u.username &&
      !u.password
    );
  }, "Use an HTTP(S) origin without path or credentials");
const schemas = {
  api: base.extend({
    API_PORT: port.default(3002),
    API_DATABASE_URL: database,
    IDENTITY_INTERNAL_URL: origin,
  }),
  identity: base.extend({
    IDENTITY_PORT: port.default(3001),
    IDENTITY_DATABASE_URL: database,
    PUBLIC_ORIGIN: origin,
    BETTER_AUTH_SECRET: z
      .string()
      .min(32)
      .refine(
        (v) => !v.includes("REPLACE"),
        "Generate a random secret with npm run env:init",
      ),
    ADMIN_API_TOKEN: z
      .string()
      .min(32)
      .refine(
        (v) => !v.includes("REPLACE"),
        "Generate a random token with npm run env:init",
      ),
  }),
  realtime: base.extend({
    REALTIME_PORT: port.default(3003),
    PUBLIC_ORIGIN: origin,
    API_INTERNAL_URL: origin,
    IDENTITY_INTERNAL_URL: origin,
  }),
};
export function configFor<T extends keyof typeof schemas>(
  service: T,
  env: NodeJS.ProcessEnv = process.env,
): z.output<(typeof schemas)[T]> {
  const result = schemas[service].safeParse(env);
  if (!result.success)
    throw new Error(
      `Invalid ${service} configuration: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}. See .env.example.`,
    );
  return result.data as z.output<(typeof schemas)[T]>;
}
