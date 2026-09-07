import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
const env = {
  ...process.env,
  BUILD_COMMIT:
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() +
    "-dev",
};
const children = [
  spawn("vite", ["--config", "apps/web/vite.config.ts"], {
    stdio: "inherit",
    env,
  }),
  ...["identity", "api", "realtime"].map((s) =>
    spawn("tsx", ["watch", `services/${s}/src/main.ts`], {
      stdio: "inherit",
      env,
    }),
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((c) => c.kill("SIGTERM"));
  process.exitCode = code;
}
children.forEach((c) => {
  c.on("error", (e) => {
    console.error(e.message);
    stop(1);
  });
  c.on("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
});
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
