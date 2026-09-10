import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
export const services = ["identity", "api", "realtime", "web", "migrate"];
export const composeArgs = [
  "compose",
  "--env-file",
  ".env",
  "-f",
  "infra/compose/compose.yml",
];
export function docker(args, env = process.env) {
  return execFileSync("docker", args, { stdio: "inherit", env });
}
if (process.argv[1]?.endsWith("/compose.mjs")) {
  const command = process.argv[2];
  const dirty =
    execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()
      .length > 0;
  const env = {
    ...process.env,
    BUILD_COMMIT:
      execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim() + (dirty ? "-dirty" : ""),
    PRODUCT_VERSION: JSON.parse(readFileSync("package.json", "utf8")).version,
  };
  if (command === "build") docker([...composeArgs, "build"], env);
  else if (command === "up")
    docker(
      [
        ...composeArgs,
        "up",
        "-d",
        "--no-build",
        "--wait",
        "--wait-timeout",
        "120",
        "--scale",
        "migrate=0",
      ],
      env,
    );
  else if (command === "down") docker([...composeArgs, "down"], env);
  else throw new Error("Expected build, up, or down");
}
