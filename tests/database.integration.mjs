import pg from "pg";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { cp, mkdtemp, writeFile, rm } from "node:fs/promises";
import { migrate } from "./dist/scripts/migrate.js";
const admin = new pg.Client({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
const name = "bootstrap_test_" + randomBytes(6).toString("hex");
const url = new URL(process.env.MIGRATION_DATABASE_URL);
url.pathname = "/" + name;
const dir = await mkdtemp("/tmp/social-migrations-");
await admin.connect();
let db;
try {
  await admin.query(`CREATE DATABASE ${name}`);
  db = new pg.Client({ connectionString: url.toString() });
  await db.connect();
  await db.query(
    "CREATE SCHEMA identity; CREATE SCHEMA application; GRANT USAGE ON SCHEMA identity TO identity; GRANT USAGE ON SCHEMA application TO application; ALTER DEFAULT PRIVILEGES IN SCHEMA identity GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO identity; ALTER DEFAULT PRIVILEGES IN SCHEMA application GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO application;",
  );
  await cp("infra/migrations", dir, { recursive: true });
  await Promise.all([
    migrate(url.toString(), dir),
    migrate(url.toString(), dir),
  ]);
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM identity.schema_migrations",
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM application.schema_migrations",
      )
    ).rows[0].n,
    1,
  );
  for (const [role, own, foreign] of [
    ["identity", 'identity."user"', "application.bootstrap"],
    ["application", "application.bootstrap", 'identity."user"'],
  ]) {
    await db.query(`SET ROLE ${role}`);
    await db.query(`SELECT * FROM ${own} LIMIT 1`);
    await assert.rejects(db.query(`SELECT * FROM ${foreign}`), {
      code: "42501",
    });
    await assert.rejects(
      db.query(
        `CREATE TABLE ${role === "identity" ? "identity" : "application"}.forbidden(id int)`,
      ),
      { code: "42501" },
    );
    await db.query("RESET ROLE");
  }
  await writeFile(
    `${dir}/application/002_upgrade.sql`,
    "ALTER TABLE bootstrap ADD COLUMN note text;",
  );
  await migrate(url.toString(), dir);
  await db.query(
    "UPDATE application.bootstrap SET note='upgrade preserved data'",
  );
  await migrate(url.toString(), dir);
  assert.equal(
    (await db.query("SELECT note FROM application.bootstrap")).rows[0].note,
    "upgrade preserved data",
  );
  await writeFile(
    `${dir}/application/003_failure.sql`,
    "CREATE TABLE rolled_back(id int); SELECT definitely_not_a_function();",
  );
  await assert.rejects(migrate(url.toString(), dir));
  assert.equal(
    (
      await db.query(
        "SELECT to_regclass('application.rolled_back') AS relation",
      )
    ).rows[0].relation,
    null,
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM application.schema_migrations",
      )
    ).rows[0].n,
    2,
  );
  await writeFile(`${dir}/application/001_bootstrap.sql`, "SELECT 1;");
  await assert.rejects(migrate(url.toString(), dir), /checksum mismatch/);
  console.log(
    "Database integration passed: concurrent fresh migration, repeat, upgrade, isolation, rollback, checksum rejection.",
  );
} finally {
  if (db) await db.end();
  await admin.query(`DROP DATABASE IF EXISTS ${name}`);
  await admin.end();
  await rm(dir, { recursive: true, force: true });
}
