# Changelog

Release notes use one entry per root package version. Changes under Unreleased are not published. Mark breaking HTTP/realtime changes and supported version combinations explicitly.

## [Unreleased]

Milestone 1 adds gated password accounts, atomic hashed single-use beta-key redemption, administrator gate/key controls, authenticated LPC avatar choice, one authoritative shared lobby, keyboard/click movement with environment collision, and live-only room chat/bubbles. Database migration `identity/002` is required and realtime protocol 2 is coordinated across web/realtime; 0.1.x clients/services are not compatible with this working tree. Planned release remains 0.2.0; the root version stays 0.1.0 until release preparation.

## [0.1.0] - 2026-09-07

Initial development bootstrap: Vue/Phaser orthographic preview, draggable/docked UI panel, identity/API/realtime foundations, PostgreSQL migration workflow, containers, CI and immutable artifact deployment tooling. Accounts, multiplayer and chat remain unimplemented. Diagnostic protocol 1; only coordinated 0.1.x bootstrap services are currently tested together.
