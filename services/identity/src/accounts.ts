import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type pg from "pg";

export type SignupInput = {
  email: string;
  name: string;
  password: string;
  betaKey?: string;
};

export class SignupError extends Error {
  constructor(
    public readonly code:
      "BETA_KEY_REQUIRED" | "BETA_KEY_INVALID" | "EMAIL_IN_USE",
  ) {
    super(code);
  }
}

export function betaKeyHash(raw: string) {
  return createHash("sha256").update(raw.normalize("NFKC")).digest();
}

export async function registrationStatus(pool: pg.Pool) {
  const result = await pool.query<{ beta_gate_enabled: boolean }>(
    "SELECT beta_gate_enabled FROM registration_settings WHERE singleton = true",
  );
  return { betaGateEnabled: result.rows[0]?.beta_gate_enabled ?? true };
}

export async function createPasswordAccount(pool: pg.Pool, input: SignupInput) {
  const passwordHash = await hashPassword(input.password);
  const client = await pool.connect();
  const userId = randomUUID();
  const now = new Date();
  const sessionToken = randomBytes(32).toString("base64url");
  const sessionExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  try {
    await client.query("BEGIN");
    const settings = await client.query<{ beta_gate_enabled: boolean }>(
      "SELECT beta_gate_enabled FROM registration_settings WHERE singleton = true FOR UPDATE",
    );
    let betaKeyId: string | undefined;
    if (settings.rows[0]?.beta_gate_enabled) {
      if (!input.betaKey) throw new SignupError("BETA_KEY_REQUIRED");
      const available = await client.query<{ id: string }>(
        `SELECT id FROM beta_key
         WHERE key_hash = $1 AND revoked_at IS NULL AND redeemed_at IS NULL
         FOR UPDATE`,
        [betaKeyHash(input.betaKey)],
      );
      betaKeyId = available.rows[0]?.id;
      if (!betaKeyId) throw new SignupError("BETA_KEY_INVALID");
    }
    await client.query(
      `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, false, $4, $4)`,
      [userId, input.name, input.email.toLowerCase(), now],
    );
    if (betaKeyId)
      await client.query(
        `UPDATE beta_key SET redeemed_at = $1, redeemed_by = $2
         WHERE id = $3`,
        [now, userId, betaKeyId],
      );
    await client.query(
      `INSERT INTO account
         (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       VALUES ($1, $2, 'credential', $2, $3, $4, $4)`,
      [randomUUID(), userId, passwordHash, now],
    );
    await client.query(
      `INSERT INTO session
         (id, "expiresAt", token, "createdAt", "updatedAt", "userId")
       VALUES ($1, $2, $3, $4, $4, $5)`,
      [randomUUID(), sessionExpiresAt, sessionToken, now, userId],
    );
    await client.query("COMMIT");
    return {
      user: { id: userId, email: input.email.toLowerCase(), name: input.name },
      sessionToken,
    };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    )
      throw new SignupError("EMAIL_IN_USE");
    throw error;
  } finally {
    client.release();
  }
}

export async function issueBetaKey(pool: pg.Pool) {
  const raw = `beta_${randomBytes(24).toString("base64url")}`;
  const id = randomUUID();
  await pool.query("INSERT INTO beta_key (id, key_hash) VALUES ($1, $2)", [
    id,
    betaKeyHash(raw),
  ]);
  return { id, key: raw };
}

export async function revokeBetaKey(pool: pg.Pool, id: string) {
  const result = await pool.query(
    "UPDATE beta_key SET revoked_at = now() WHERE id = $1 AND redeemed_at IS NULL AND revoked_at IS NULL",
    [id],
  );
  return result.rowCount === 1;
}

export async function setBetaGate(pool: pg.Pool, enabled: boolean) {
  await pool.query(
    "UPDATE registration_settings SET beta_gate_enabled = $1, updated_at = now() WHERE singleton = true",
    [enabled],
  );
}
