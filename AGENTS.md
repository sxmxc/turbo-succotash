# Panverse Plaza

Read [agents/README.md](agents/README.md), the current handoff and active tasks first. Inspect actual code and scripts: memory can be stale. Product authority is [the working design](docs/PANVERSE_PLAZA_DESIGN.md); confirmed requirements, proposals and open decisions are distinct. Memory creates no new requirements.

- Preserve user edits, keep changes scoped, avoid unrelated rewrites. Never weaken security or tests to obtain a passing result.
- Use stable dependencies; verify official release/peer/runtime metadata before updates, pin exact versions and maintain the lockfile. See [dependency evidence](docs/DEPENDENCIES.md).
- Follow [version/release policy](docs/RELEASES.md); document HTTP/realtime compatibility impact.
- Vue owns UI; Phaser owns rendering. Identity owns accounts/beta redemption; API owns persistent game data; realtime owns live state. No service writes another service's tables.
- For Phaser work, consult the applicable official [Phaser AI skills](https://github.com/phaserjs/phaser/tree/master/skills) (mirrored as local skills) before implementation. Prefer Phaser scene lifecycle, InputPlugin, AnimationManager/AnimationState, Game Objects/Containers, cameras, ScaleManager, tweens and physics where applicable; do not recreate engine facilities with window listeners, manual frame clocks, DOM rendering loops or parallel object-management systems without a documented technical reason. Before implementing a substantial subsystem, evaluate Phaser core first and then maintained, license-compatible plugins such as [Rex plugins](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/plugin-list/); pin any adopted plugin and record compatibility evidence and the reason for adopting or declining it. Server-authoritative simulation remains in realtime and must not be moved into the browser merely to use Phaser.
- Accounts are required for gameplay; prototype rendering is not guest gameplay. Keep placeholders explicit. Never expose signup without atomic beta gating. Do not log secrets, session cookies or message content.
- Run meaningful checks and record actual results, including blocked checks. Update tasks/handoff before ending; update durable context/decisions only when facts change. No private reasoning transcripts, copied conversations, secrets or repetitive activity logs in memory.

Navigation: `apps/web`, `services/{identity,api,realtime}`, `packages/{contracts,service-runtime}`, `infra/{compose,migrations}`, `scripts`, `tests`. Commands and setup are in [README](README.md), verified results in [docs/VERIFICATION.md](docs/VERIFICATION.md).

Core workflow: `npm ci`, `npm run check`, `npm run compose:build`, `npm run compose:up`, `npm run smoke`, `npm run test:database`, `npm run test:browser`. Read prerequisites before running database or container checks. Use `npm run dev` for hot reload. Keep document revisions separate from the root `package.json` software version.
