import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  catalog,
  frameFor,
  type Direction,
} from "../apps/web/src/game/appearance.js";

test("LPC imports match provenance and frames stay within each native PNG grid", () => {
  for (const asset of catalog) {
    const png = readFileSync(`apps/web/public${asset.url}`);
    assert.equal(createHash("sha256").update(png).digest("hex"), asset.sha256);
    assert.equal(png.readUInt32BE(16), asset.width);
    assert.equal(png.readUInt32BE(20), asset.height);
    assert.equal(asset.width / asset.frameWidth, asset.columns);
    for (const direction of ["north", "west", "south", "east"] as Direction[]) {
      assert.equal(
        frameFor(asset, direction, false, 900),
        asset.rows[direction] * 9,
      );
      const frames = Array.from({ length: 8 }, (_, i) =>
        frameFor(asset, direction, true, i * 125),
      );
      assert.equal(new Set(frames).size, 8);
      assert.ok(
        frames.every(
          (frame) =>
            frame > asset.rows[direction] * 9 &&
            frame < (asset.rows[direction] + 1) * 9,
        ),
      );
      assert.equal(frameFor(asset, direction, true, 1000), frames[0]);
    }
    assert.ok(asset.credits.authors.trim());
    assert.ok(asset.credits.licenses.includes("CC-BY-SA 3.0"));
  }
});
