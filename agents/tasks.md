# Active tasks

## Milestone 0 — Bootstrap (complete)

Acceptance: mounted Vue/Phaser orthographic placeholder; draggable desktop/docked mobile panel; independent service foundations; validated diagnostics/config; PostgreSQL migrations and role isolation; reproducible dependency/container inputs; CI checks and immutable artifact deployment; accurate agent continuity.

- [x] Read supplied design fully and preserve existing files.
- [x] Resolve stable dependencies and explain compatibility tradeoff.
- [x] Implement shell, services, migrations, containers and release path.
- [x] Complete checks, browser/container/database verification and final diff review.
- [x] Update final handoff with exact results and limitations.
- [x] Commit the reproducible lockfile and deploy tested immutable images locally; remote publishing remains an explicit connection step.

## LPC integration — immediate follow-up to bootstrap

- [x] Record confirmed art change without reopening completed bootstrap.
- [x] Import minimal compatible body/head/hair/clothing with native dimensions, per-file provenance and accessible credits.
- [x] Adapt local preview with synchronized standing/four-direction walking and data-driven appearance.
- [x] Verify production rendering, alignment, loading, existing checks and update handoff. See docs/VERIFICATION.md for results.

## Operations

- [x] Make the Compose web bind address follow the existing `HOST` setting; keep the example loopback-safe and verify external host-address access.

## Milestone 1 — Shared lobby (complete)

Implement email/password signup/login and administrator-controlled beta-key gate in identity. Consume a hashed, single-use beta key atomically with account creation; gate-off permits signup, existing login is unaffected. Do not expose social signup until its first-account path obeys the same invariant.

Acceptance: integration tests prove concurrent redemption has exactly one winner, reuse/revoked keys fail, gate-off works, existing login works with gate enabled, and sessions work through common-origin proxy. Then build avatar selection, one authoritative room, keyboard/click movement, environment collision and live-only chat/bubbles; full M1 acceptance remains in the design.

- [x] Atomic gated password signup/login and administrator gate/key controls.
- [x] Authenticated avatar choice and one authoritative shared lobby.
- [x] Keyboard/click movement, environment collision, and non-colliding players.
- [x] Live-only room chat/log/bubbles and two-session browser acceptance.

## Phaser engine alignment — active

- [ ] Move keyboard intent polling/capture from Vue window listeners and timers into the Phaser Scene InputPlugin.
- [ ] Represent each layered player with Phaser Game Objects/Containers instead of a parallel custom entity layout.
- [ ] Replace the manual animation clock/frame loop with Phaser AnimationManager/AnimationState while keeping LPC layers synchronized.
- [ ] Use Phaser pointer/world-coordinate and ScaleManager facilities for click/tap movement.
- [ ] Keep realtime authoritative collision on the server; use Phaser physics only where it does not create a competing authority.
