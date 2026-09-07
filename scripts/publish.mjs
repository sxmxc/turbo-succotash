import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const manifest = JSON.parse(readFileSync("artifacts/release.json", "utf8"));
const repository = process.env.GITHUB_REPOSITORY?.toLowerCase();
if (!repository || !/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(repository))
  throw new Error("GITHUB_REPOSITORY required");
for (const [service, image] of Object.entries(manifest.images)) {
  const base = `ghcr.io/${repository}-${service}`;
  const tag = `${base}:${manifest.version}`;
  // Refuse to overwrite a release. Network/auth failures must not be mistaken for missing tags.
  try {
    execFileSync("docker", ["manifest", "inspect", tag], { stdio: "pipe" });
    throw new Error(`Release already exists: ${tag}`);
  } catch (error) {
    if (
      !String(error.stderr).includes("manifest unknown") &&
      !String(error.stderr).includes("no such manifest")
    )
      throw error;
  }
  execFileSync("docker", ["tag", image.id, tag], { stdio: "inherit" });
  execFileSync("docker", ["push", tag], { stdio: "inherit" });
  const shaTag = `${base}:sha-${manifest.commit}`;
  execFileSync("docker", ["tag", image.id, shaTag], { stdio: "inherit" });
  execFileSync("docker", ["push", shaTag], { stdio: "inherit" });
  const info = JSON.parse(
    execFileSync("docker", ["image", "inspect", tag], { encoding: "utf8" }),
  )[0];
  image.ref = info.RepoDigests.find((ref) => ref.startsWith(base + "@sha256:"));
  if (!image.ref) throw new Error(`Missing registry digest: ${service}`);
}
writeFileSync(
  "artifacts/release.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
