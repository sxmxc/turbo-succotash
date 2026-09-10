# Changelog

Release notes use one entry per root package version. Changes under Unreleased are not published. Mark breaking HTTP/realtime changes and supported version combinations explicitly.

## [Unreleased]

Milestone 2 social completion adds saved avatar appearance, explicit friendship requests and acceptance, heartbeat-expiring presence, owner-only personal apartments, and persistent direct messages for online or offline friends. Advanced Chat now exposes room and DM conversations with mentions, emoji, links, message reactions, previews, typing, unread counts and DM-only delivery/read receipts. Application migrations `005` through `007` are required. New HTTP/internal routes and optional realtime message types are additive; coordinated protocol 2 clients remain compatible. The uploaded Bold Pixels font is used for headings and the top-bar product name.

## [0.2.5] - 2026-09-09

Milestone 2 adds persistent rooms with immutable IDs and public `F###-R###` addresses, concurrency-safe Floor 1+ allocation, server-enforced authenticated/private admission, reusable elevator and direct-door interactions, named destination spawns, a room directory/address navigator, and public/private room creation. Every floor lobby is R000 and user rooms allocate from R001 through R500. New Colyseus instances are partitioned by address and use the admitted room template. Application migrations `002` through `004` are required. Protocol 2 compatibility is retained through the existing `lobby` route, which remains a Floor 0 alias for coordinated 0.2.x clients.

## [0.2.4] - 2026-09-08

The lobby chat now uses the Advanced Chat v3 `Layout` and standalone `Chat` composition inside Panverse Plaza's existing draggable panel. A narrow Vue adapter projects live Colyseus events into the component while keeping transport, bounded in-memory delivery, authorization, message IDs, timestamps and speech bubbles under the existing owners. Unsupported files, formatting, links, reactions, replies, edits and history pagination remain disabled. The owner explicitly approved the exactly pinned `@advanced-chat/components` 3.0.0-rc.3 prerelease to adopt the documented v3 API directly and avoid a later v2 migration. No HTTP, realtime protocol, database or migration changes; coordinated protocol 2 compatibility is unchanged.

## [0.2.3] - 2026-09-08

The product is now named Panverse Plaza. User-facing copy, repository metadata, Compose project naming, local OCI image names, CI image export, and release tooling use the new name. The Colyseus client now tracks replicated player membership and nested changes with the supported callback API, and Phaser retains its active scene so late and rejoining players render reliably. Phaser movement keys are no longer globally captured, allowing focused chat and account fields to accept WASD and spaces while movement remains suspended. No HTTP, realtime protocol, dependency, database or migration changes; coordinated protocol 2 compatibility is unchanged.

## [0.2.2] - 2026-09-08

GHCR publication now retries transient pushes with bounded backoff and safely resumes partial releases only when existing version and commit tags exactly match the tested image config digest. Mismatched tags remain immutable and hard-fail. Publishing still promotes tested images without rebuilding and records registry-qualified immutable digests. No HTTP, realtime protocol, dependency or database migration changes; coordinated protocol 2 compatibility is unchanged.

## [0.2.1] - 2026-09-08

CI now resets the identity service’s transient in-memory signup limiter between smoke and browser acceptance. This preserves the production eight-signups-per-minute limit while preventing the independent verification stages from sharing rate-limit state. No HTTP, realtime protocol, dependency or database migration changes.

## [0.2.0] - 2026-09-08

Milestone 1 adds gated password accounts, atomic hashed single-use beta-key redemption, administrator gate/key controls, authenticated LPC avatar choice, one authoritative shared lobby, keyboard/click movement with environment collision, and live-only room chat/bubbles. Database migration `identity/002` is required. Realtime protocol 2 is coordinated across the 0.2.0 web and realtime builds; 0.1.x clients and services are not compatible.

## [0.1.0] - 2026-09-07

Initial development bootstrap: Vue/Phaser orthographic preview, draggable/docked UI panel, identity/API/realtime foundations, PostgreSQL migration workflow, containers, CI and immutable artifact deployment tooling. Accounts, multiplayer and chat remain unimplemented. Diagnostic protocol 1; only coordinated 0.1.x bootstrap services are currently tested together.
