import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
let text = readFileSync(".env.example", "utf8");
for (const marker of [
  "REPLACE_WITH_RANDOM_ADMIN_PASSWORD",
  "REPLACE_WITH_RANDOM_IDENTITY_PASSWORD",
  "REPLACE_WITH_RANDOM_API_PASSWORD",
  "REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS",
  "REPLACE_WITH_RANDOM_ADMIN_API_TOKEN",
])
  text = text.replaceAll(marker, randomBytes(32).toString("hex"));
writeFileSync(".env", text, { flag: "wx", mode: 0o600 });
console.log(
  "Created .env with random local credentials. Existing files are never overwritten.",
);
