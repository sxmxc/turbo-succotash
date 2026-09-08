import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const defaultBackoff = [1000, 2000, 4000];
const isMissing = (error) =>
  /manifest unknown|no such manifest/i.test(
    `${error?.stdout || ""}\n${error?.stderr || ""}`,
  );
export function inspectRemoteTag(tag, run = execFileSync) {
  try {
    const data = JSON.parse(
      run("docker", ["manifest", "inspect", "--verbose", tag], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    );
    const configDigest = data.SchemaV2Manifest?.config?.digest;
    const registryDigest = data.Descriptor?.digest;
    if (
      !/^sha256:[a-f0-9]{64}$/.test(configDigest || "") ||
      !/^sha256:[a-f0-9]{64}$/.test(registryDigest || "")
    )
      throw new Error(`Invalid remote manifest: ${tag}`);
    return { configDigest, registryDigest };
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}
function assertMatch(tag, id, remote) {
  if (remote.configDigest !== id)
    throw new Error(
      `Refusing to overwrite ${tag}: remote config ${remote.configDigest} does not match tested image ${id}`,
    );
}
export async function ensurePublishedTag({
  tag,
  imageId,
  run = execFileSync,
  inspect = (value) => inspectRemoteTag(value, run),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  backoff = defaultBackoff,
}) {
  let remote = inspect(tag);
  if (remote) {
    assertMatch(tag, imageId, remote);
    return remote.registryDigest;
  }
  run("docker", ["tag", imageId, tag], { stdio: "inherit" });
  for (let attempt = 0; ; attempt += 1) {
    try {
      run("docker", ["push", tag], { stdio: "inherit" });
    } catch (error) {
      remote = inspect(tag);
      if (remote) {
        assertMatch(tag, imageId, remote);
        return remote.registryDigest;
      }
      if (attempt >= backoff.length) throw error;
      await sleep(backoff[attempt]);
      continue;
    }
    remote = inspect(tag);
    if (!remote) throw new Error(`Published tag is not visible: ${tag}`);
    assertMatch(tag, imageId, remote);
    return remote.registryDigest;
  }
}
export async function publishManifest({ manifest, repository, ...options }) {
  if (!repository || !/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(repository))
    throw new Error("GITHUB_REPOSITORY required");
  for (const [service, image] of Object.entries(manifest.images)) {
    if (!/^sha256:[a-f0-9]{64}$/.test(image.id || ""))
      throw new Error(`Invalid tested image ID: ${service}`);
    const base = `ghcr.io/${repository}-${service}`;
    let registryDigest;
    for (const tag of [
      `${base}:${manifest.version}`,
      `${base}:sha-${manifest.commit}`,
    ]) {
      const digest = await ensurePublishedTag({
        tag,
        imageId: image.id,
        ...options,
      });
      if (registryDigest && registryDigest !== digest)
        throw new Error(`Published tags differ: ${service}`);
      registryDigest = digest;
    }
    image.ref = `${base}@${registryDigest}`;
  }
}
async function main() {
  const path = "artifacts/release.json";
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  await publishManifest({
    manifest,
    repository: process.env.GITHUB_REPOSITORY?.toLowerCase(),
  });
  writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
