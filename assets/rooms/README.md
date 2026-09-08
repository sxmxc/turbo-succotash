# Tiled room sources

Put each room in its own directory:

```text
assets/rooms/
  lobby/
    lobby.tmx
    interior.tsx
    interior.png
```

Each directory must contain exactly one finite, orthogonal `.tmx` map. External
`.tsx` tilesets are encouraged for authoring, but each tileset must use one PNG
spritesheet rather than a collection of per-tile images.

Add these standard Tiled objects to any object layer:

- at least one point object with class `spawn`;
- zero or more axis-aligned rectangle objects with class `collision`.

Run `npm run rooms:build`. The official Tiled CLI exports embedded-tileset JSON,
then the repository script validates and packages the JSON and PNGs for Phaser
and generates the matching authoritative collision/spawn data for realtime.
Generated files under `apps/web/public/assets/rooms` and
`packages/room-data/src/rooms.generated.ts` must be committed. Do not edit them
by hand.
