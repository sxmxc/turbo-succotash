import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
test("release validation accepts matching tag and rejects mismatches", () => {
  const run = (tag: string) =>
    execFileSync(process.execPath, ["scripts/release.mjs", "validate", tag], {
      stdio: "pipe",
    });
  const version = JSON.parse(readFileSync("package.json", "utf8")).version;
  assert.match(run("v" + version).toString(), /valid/);
  assert.throws(() => run("v999999.0.0"));
  assert.throws(() => run(version));
});
