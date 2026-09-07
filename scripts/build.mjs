import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
execFileSync("tsc", ["-p", "tsconfig.build.json"], { stdio: "inherit" });
mkdirSync("dist", { recursive: true });
copyFileSync("package.json", "dist/package.json");
execFileSync("vite", ["build", "--config", "apps/web/vite.config.ts"], {
  stdio: "inherit",
});
