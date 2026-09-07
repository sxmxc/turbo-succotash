import pg from "pg";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
export async function migrate(url: string, directory = "infra/migrations") {
  const client = new pg.Client({
    connectionString: url,
    connectionTimeoutMillis: 3000,
  });
  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock(73482001)");
    for (const schema of ["identity", "application"]) {
      await client.query(
        `CREATE TABLE IF NOT EXISTS ${schema}.schema_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`,
      );
      for (const file of (await readdir(`${directory}/${schema}`))
        .filter((f) => /^\d+.*\.sql$/.test(f))
        .sort()) {
        const sql = await readFile(`${directory}/${schema}/${file}`, "utf8");
        const version = file.split("_")[0];
        const checksum = createHash("sha256").update(sql).digest("hex");
        const prior = await client.query(
          `SELECT checksum FROM ${schema}.schema_migrations WHERE version=$1`,
          [version],
        );
        if (prior.rowCount) {
          if (prior.rows[0].checksum !== checksum)
            throw new Error(`Migration checksum mismatch: ${schema}/${file}`);
          continue;
        }
        await client.query("BEGIN");
        try {
          await client.query(`SET LOCAL search_path TO ${schema}, public`);
          await client.query(sql);
          await client.query(
            `INSERT INTO ${schema}.schema_migrations(version,checksum) VALUES ($1,$2)`,
            [version, checksum],
          );
          await client.query("COMMIT");
          console.log(`Applied ${schema}/${file}`);
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      }
    }
  } finally {
    await client.end();
  }
}
if (
  process.argv[1]?.endsWith("/migrate.ts") ||
  process.argv[1]?.endsWith("/migrate.js")
) {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url || !/^postgres(ql)?:\/\//.test(url))
    throw new Error(
      "MIGRATION_DATABASE_URL must be a PostgreSQL URL; see .env.example",
    );
  await migrate(url);
}
