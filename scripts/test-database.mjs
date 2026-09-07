import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { composeArgs } from "./compose.mjs";
execFileSync(
  "docker",
  [
    ...composeArgs,
    "run",
    "--rm",
    "--no-deps",
    "-T",
    "migrate",
    "node",
    "--input-type=module",
  ],
  {
    input: readFileSync("tests/database.integration.mjs"),
    stdio: ["pipe", "inherit", "inherit"],
  },
);
