# Initial LPC character selection

Source: Universal LPC Character Generator, commit `d44ea7d6904891aab8627b80ff4de1560d63bdff`. The authoritative import record is [manifest.json](../apps/web/public/assets/lpc/manifest.json): each file has its original path, SHA-256, dimensions, frame layout and complete upstream credit row. Original PNG bytes are served unchanged from `/assets/lpc/`; no generator code or dependency is imported.

Five compatible adult male-base layers are currently used: body, separate human head, pants, long-sleeve shirt and shorthawk hair. This is an implementation starting point, not a future catalog restriction. Each PNG was inspected individually: 576 × 256, nine columns and four rows of native 64 × 64 frames. Rows are north, west, south and east. Column 0 stands; columns 1–8 walk at 8 fps. Other LPC sheets must be inspected rather than assumed to share this layout.

Each layer carries its own frame, row, anchor and source metadata. Phaser loads each sheet with its native frame dimensions, places the layers in one Container at a shared foot position and uses AnimationManager/AnimationState for synchronized directional walking. Native foot anchor `(32,62)` follows the inspected body alpha bounds; display scale and the provisional 20 × 10 world-unit collision footprint are separate values. Nearest-neighbor rendering and pixelated canvas scaling preserve hard edges.

The current Milestone 1 lobby uses these maintained sheets for authenticated players. Vue passes selected appearance and replicated state; Phaser owns the sprites, animation and rendering. Realtime owns the foot position and environment collision. Full saved customization remains later work.

All five files offer CC-BY-SA 3.0; this integration selects that common license. Per-file alternatives and contributor/source details remain in the manifest and credits CSV. A visible footer link opens keyboard-accessible `/credits.html`, including license/source links and unchanged downloads.

To add an asset, inspect its real PNG grid and compatible base, preserve per-file credits/license, pin revision/hash, record anchor/layout and verify all directions and standing transitions. Never reintroduce a blanket 16 × 16 or universal LPC-grid assumption.
