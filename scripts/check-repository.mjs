import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const ignoredDirectories = new Set([
  ".git",
  ".npm",
  "artifacts",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const badSuffixes = [".orig", ".rej"];
const artifacts = [];

function inspect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) inspect(path);
    else if (badSuffixes.some((suffix) => entry.name.endsWith(suffix)))
      artifacts.push(path.slice(root.length + 1));
  }
}

inspect(root);
if (artifacts.length) {
  console.error(
    `Patch artifacts are not allowed:\n${artifacts.map((file) => `- ${file}`).join("\n")}`,
  );
  process.exitCode = 1;
}
