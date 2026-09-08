import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { composeArgs, docker, services } from "./compose.mjs";

const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();

export function validateTag(tag, expectedVersion, changelog) {
  if (!/^\d+\.\d+\.\d+$/.test(expectedVersion) || tag !== `v${expectedVersion}`)
    throw new Error("Release tag must match package.json version");
  if (!changelog.includes(`## [${expectedVersion}]`))
    throw new Error("Missing versioned changelog entry");
}

const command = process.argv[2];
if (command === "validate") {
  validateTag(
    process.env.RELEASE_TAG || process.argv[3] || `v${version}`,
    version,
    readFileSync("CHANGELOG.md", "utf8"),
  );
  console.log(`Release v${version} valid`);
} else if (command === "manifest") {
  const images = Object.fromEntries(
    services.map((service) => {
      const name =
        process.env[`${service.toUpperCase()}_IMAGE`] ||
        `panverse-plaza-${service}:dev`;
      const info = JSON.parse(
        execFileSync("docker", ["image", "inspect", name], {
          encoding: "utf8",
        }),
      )[0];
      if (
        info.Config.Labels["org.opencontainers.image.revision"] !== commit ||
        info.Config.Labels["org.opencontainers.image.version"] !== version
      )
        throw new Error(`Image metadata mismatch: ${name}`);
      return [
        service,
        { id: info.Id, ref: name.includes("@sha256:") ? name : info.Id },
      ];
    }),
  );
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(
    "artifacts/release.json",
    JSON.stringify({ version, commit, images }, null, 2) + "\n",
  );
  console.log("Wrote artifacts/release.json");
} else if (command === "deploy") {
  const manifest = JSON.parse(
    readFileSync(process.argv[3] || "artifacts/release.json", "utf8"),
  );
  if (
    !/^\d+\.\d+\.\d+$/.test(manifest.version) ||
    !/^[a-f0-9]{40}$/.test(manifest.commit)
  )
    throw new Error("Invalid release metadata");
  const env = { ...process.env };
  for (const service of services) {
    const image = manifest.images[service];
    if (!/^(?:[^\s]+@)?sha256:[a-f0-9]{64}$/.test(image.ref))
      throw new Error(`Expected immutable image reference: ${service}`);
    if (!image.ref.startsWith("sha256:")) docker(["pull", image.ref]);
    const info = JSON.parse(
      execFileSync("docker", ["image", "inspect", image.ref], {
        encoding: "utf8",
      }),
    )[0];
    if (
      info.Id !== image.id ||
      info.Config.Labels["org.opencontainers.image.revision"] !==
        manifest.commit ||
      info.Config.Labels["org.opencontainers.image.version"] !==
        manifest.version
    )
      throw new Error(`Manifest/image mismatch: ${service}`);
    env[`${service.toUpperCase()}_IMAGE`] = image.ref;
  }
  docker([...composeArgs, "up", "-d", "--no-build", "--wait", "postgres"], env);
  docker([...composeArgs, "run", "--rm", "--no-deps", "migrate"], env);
  docker(
    [
      ...composeArgs,
      "up",
      "-d",
      "--no-deps",
      "--no-build",
      "--wait",
      "--wait-timeout",
      "120",
      ...services.filter((s) => s !== "migrate"),
    ],
    env,
  );
  execFileSync(process.execPath, ["--import", "tsx", "scripts/smoke.ts"], {
    stdio: "inherit",
    env: { ...env, EXPECT_COMMIT: manifest.commit },
  });
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(
    "artifacts/deployment.json",
    JSON.stringify(
      {
        version: manifest.version,
        commit: manifest.commit,
        migrations: "completed",
        readiness: "passed",
        smoke: "passed",
        at: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
}
