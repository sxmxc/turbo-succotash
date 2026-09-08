# Active tasks

## Milestone 0 — Bootstrap (complete)

Acceptance: mounted Vue/Phaser orthographic shell; responsive floating/docked panel; independent service foundations; validated diagnostics/configuration; PostgreSQL migrations and role isolation; reproducible dependency/container inputs; CI checks and immutable artifact deployment; accurate agent continuity.

- [x] Preserve the supplied design and establish repository/service boundaries.
- [x] Resolve and pin stable dependencies with compatibility evidence.
- [x] Implement shell, services, migrations, containers and release path.
- [x] Verify checks, browser/container/database behavior and final diff.
- [x] Import the confirmed LPC selection with native metadata, provenance and accessible credits.
- [x] Make Compose external binding use the single configured public origin.

## Milestone 1 — First playable experience (complete)

Acceptance remains: two authenticated browser sessions join the same room, see movement and exchange live-only messages; walls block movement; players do not block one another; typing never moves the avatar; late joiners see no earlier chat; beta-key reuse/revocation fails; disabling the gate permits signup without a key.

### Completed implementation

- [x] Atomic gated password signup/login and administrator gate/key controls.
- [x] Authenticated avatar choice using maintained LPC layers and inspected native frame metadata.
- [x] One server-authoritative Colyseus lobby with replicated presence.
- [x] Phaser Scene input for arrows/WASD and pointer/tap world coordinates; movement is suppressed while DOM controls have focus.
- [x] Phaser Containers/Game Objects and AnimationManager/AnimationState for synchronized LPC layers.
- [x] Server-authoritative environment collision with non-colliding players.
- [x] Live-only room chat/log/speech bubbles and secure browser-compatible request IDs.
- [x] Tiled TMX/TSX/PNG build pipeline producing Phaser JSON/assets and shared server bounds/spawns/collision.
- [x] Render the `floor_0_lobby` Tiled map instead of the graphics fallback.
- [x] Import tile-attached objectgroup collision shapes with class/type `collision`.
- [x] Restore Tiled regression coverage and add prototype-backed Colyseus movement coverage.
- [x] Browser regression proves the replicated spawn, keyboard movement and click-to-move using authoritative coordinates.
- [x] Add repository guard against `.orig` and `.rej` patch artifacts.

### Current verification and remaining acceptance

- [x] Run `npm run check` on the final formatted tree.
- [x] Rebuild/restart Compose, then run smoke and database integration checks.
- [x] Run the complete desktop/mobile browser suite, including two-session chat, typing suppression, no history and collision.
- [x] Owner-facing external-origin play check and Milestone 1 sign-off.

## Milestone 2 — Rooms and social features (started)

- [ ] Add persistent room records with immutable IDs and separate public floor/room addresses.
- [ ] Add concurrency-safe automatic Floor 1+ allocation with at most 500 addresses per floor.
- [ ] Add authenticated room creation, navigator basics and private-room entry enforcement.
- [ ] Add friends/presence, online cross-room whispers and saved appearance.
- [ ] Add the selected social provider after the provider decision is made.

## Future roadmap — record now, implement when required

- [ ] Milestone 3: useful Floor 0 destinations, apartment/navigation foundations, discovery/bookmarks/events, blocks/reports, layered moderation, administrator controls, visible system bots and level permissions.
- [ ] Milestone 4: apartment customization, official store/entitlements, reconnect and capacity validation, multi-realtime coordination.
- [ ] Milestone 5: curated creator submissions, provenance/licensing, moderation, marketplace transactions and payouts.

Do not add speculative schemas or empty services for future milestones. Add the smallest working boundary when its milestone begins.
