import manifest from "../../public/assets/lpc/manifest.json" with { type: "json" };
export type Direction = "north" | "west" | "south" | "east";
export interface Appearance {
  body: string;
  head: string;
  hair: string;
  shirt: string;
  pants: string;
  shirtTint: number;
}
export const initialAppearance: Appearance = {
  body: "body",
  head: "head",
  hair: "hair",
  shirt: "shirt",
  pants: "pants",
  shirtTint: 0xefd6a2,
};
export const catalog = manifest.assets;
// World-space footprint is provisional for future authoritative movement; no physics yet.
export const characterGeometry = {
  displayScale: 1,
  collision: { width: 20, height: 10, offsetX: -10, offsetY: -10 },
};
export const walkFrameMs = 125;
export function frameFor(
  asset: (typeof catalog)[number],
  direction: Direction,
  walking: boolean,
  elapsed: number,
) {
  const column = walking
    ? asset.walkColumns[
        Math.floor(elapsed / walkFrameMs) % asset.walkColumns.length
      ]!
    : asset.standColumn;
  return asset.rows[direction] * asset.columns + column;
}
