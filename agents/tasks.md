# Active tasks

## Milestone 0 — Bootstrap (verification in progress)

Acceptance: mounted Vue/Phaser orthographic placeholder; draggable desktop/docked mobile panel; independent service foundations; validated diagnostics/config; PostgreSQL migrations and role isolation; reproducible dependency/container inputs; CI checks and immutable artifact deployment; accurate agent continuity.

- [x] Read supplied design fully and preserve existing files.
- [x] Resolve stable dependencies and explain compatibility tradeoff.
- [x] Implement shell, services, migrations, containers and release path.
- [ ] Complete checks, browser/container/database verification and final diff review.
- [ ] Update final handoff with exact results and limitations.

## Next — Milestone 1 identity slice

Implement email/password signup/login and administrator-controlled beta-key gate in identity. Consume a hashed, single-use beta key atomically with account creation; gate-off permits signup, existing login is unaffected. Do not expose social signup until its first-account path obeys the same invariant.

Acceptance: integration tests prove concurrent redemption has exactly one winner, reuse/revoked keys fail, gate-off works, existing login works with gate enabled, and sessions work through common-origin proxy. Then build avatar selection, one authoritative room, keyboard/click movement, environment collision and live-only chat/bubbles; full M1 acceptance remains in the design.
