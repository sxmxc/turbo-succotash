import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error The production publisher is intentionally plain Node.js.
import { ensurePublishedTag } from "../scripts/publish.mjs";
const imageId = `sha256:${"1".repeat(64)}`;
const registryDigest = `sha256:${"2".repeat(64)}`;
const tag = "ghcr.io/example/repo-api:0.2.1";
test("push retries use bounded backoff", async () => {
  const waits: number[] = [];
  let pushes = 0;
  let published = false;
  const result = await ensurePublishedTag({
    tag,
    imageId,
    run: (_c: string, args: string[]) => {
      if (args[0] === "push" && ++pushes < 3) throw new Error("unknown blob");
      if (args[0] === "push") published = true;
      return "";
    },
    inspect: () =>
      published ? { configDigest: imageId, registryDigest } : null,
    sleep: async (ms: number) => {
      waits.push(ms);
    },
    backoff: [10, 20],
  });
  assert.equal(result, registryDigest);
  assert.equal(pushes, 3);
  assert.deepEqual(waits, [10, 20]);
});
test("matching existing tag resumes without pushing", async () => {
  let commands = 0;
  const result = await ensurePublishedTag({
    tag,
    imageId,
    run: () => {
      commands += 1;
      return "";
    },
    inspect: () => ({ configDigest: imageId, registryDigest }),
  });
  assert.equal(result, registryDigest);
  assert.equal(commands, 0);
});
test("mismatched existing tag hard-fails without pushing", async () => {
  let commands = 0;
  await assert.rejects(
    ensurePublishedTag({
      tag,
      imageId,
      run: () => {
        commands += 1;
        return "";
      },
      inspect: () => ({
        configDigest: `sha256:${"3".repeat(64)}`,
        registryDigest,
      }),
    }),
    /Refusing to overwrite.*does not match tested image/,
  );
  assert.equal(commands, 0);
});
