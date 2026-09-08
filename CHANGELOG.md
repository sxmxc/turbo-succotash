# Changelog

Release notes use one entry per root package version. Changes under Unreleased are not published. Mark breaking HTTP/realtime changes and supported version combinations explicitly.

## [Unreleased]

The product is now named Panverse Plaza. User-facing copy, repository metadata, Compose project naming, local OCI image names, CI image export, and release tooling use the new name. Existing `social-room-*` local image tags and Compose resources are not reused; rebuild under the `panverse-plaza-*` names. No HTTP, realtime protocol, dependency or database migration changes.

## [0.2.2] - 2026-09-08

GHCR publication now retries transient pushes with bounded backoff and safely resumes partial releases only when existing version and commit tags exactly match the tested image config digest. Mismatched tags remain immutable and hard-fail. Publishing still promotes tested images without rebuilding and records registry-qualified immutable digests. No HTTP, realtime protocol, dependency or database migration changes; coordinated protocol 2 compatibility is unchanged.

## [0.2.1] - 2026-09-08

CI now resets the identity service’s transient in-memory signup limiter between smoke and browser acceptance. This preserves the production eight-signups-per-minute limit while preventing the independent verification stages from sharing rate-limit state. No HTTP, realtime protocol, dependency or database migration changes.

## [0.2.0] - 2026-09-08

Milestone 1 adds gated password accounts, atomic hashed single-use beta-key redemption, administrator gate/key controls, authenticated LPC avatar choice, one authoritative shared lobby, keyboard/click movement with environment collision, and live-only room chat/bubbles. Database migration `identity/002` is required. Realtime protocol 2 is coordinated across the 0.2.0 web and realtime builds; 0.1.x clients and services are not compatible.

## [0.1.0] - 2026-09-07

Initial development bootstrap: Vue/Phaser orthographic preview, draggable/docked UI panel, identity/API/realtime foundations, PostgreSQL migration workflow, containers, CI and immutable artifact deployment tooling. Accounts, multiplayer and chat remain unimplemented. Diagnostic protocol 1; only coordinated 0.1.x bootstrap services are currently tested together.
