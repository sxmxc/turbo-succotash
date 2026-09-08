# Decisions

## 2026-09-07 — Bootstrap implementation

- Accepted: npm workspaces and coordinated root package version 0.1.0, GitHub Actions matching detected remote. No framework autoload layer for a handful of explicit routes.
- Accepted: Node 24.20.0 LTS, npm 12.0.2, TypeScript 6.0.3. Latest TS 7.0.2 exceeds typescript-eslint's `<6.1.0` peer range; use newest compatible stable TS, no force/legacy-peer install. [Evidence](../docs/DEPENDENCIES.md).
- Accepted: Colyseus core/ws packages instead of umbrella package, avoiding unused Redis/auth/uWebSockets integrations. No Redis dependency for a single foundation process. Runtime testing found ws-transport unconditionally imports its optional Express peer; pin Express 5.2.1. Realtime uses the native Colyseus HTTP router to avoid dual request handling.
- Accepted: separate restricted PostgreSQL roles/schemas, admin migration connection only in migration job. Append-only SQL revisions with checksums, transaction per revision, advisory lock. Auth SQL generated from installed Better Auth schema.
- Accepted: only Better Auth session inspection wired publicly; account mutation returns explicit not-implemented until atomic beta gating. No joinable realtime room. These are milestone scaffolds, not new product restrictions.
- Historical bootstrap decision (character superseded by LPC below): Phaser-generated code-native 16×16 placeholder person and top-down room, DOM panel with pointer/keyboard dragging and mobile document-flow docking. No persistent avatar editor or gameplay claimed.
- Accepted: minimal shared diagnostics contract at protocol 1; shared runtime for config/probes/shutdown. Walkability contracts deferred until first real use.
- Accepted: multi-target Dockerfile produces independently runnable service images. Ephemeral Compose is initial deployment; promote tested images by immutable ID locally and registry digest after publishing. Production/Kubernetes connection remains open.

## 2026-09-07 — Confirmed LPC character-art change

- Owner selected Universal LPC as initial character source, superseding 16×16 characters and placeholder character art. Orthographic projection and all other requirements remain.
- Insert integration immediately after completed bootstrap and before identity; retain bootstrap completion. Native dimensions/layouts are per asset, distinct from display scale and provisional foot collision footprint.
- Import five unchanged compatible walk sheets at pinned commit d44ea7d6904891aab8627b80ff4de1560d63bdff. Select their common CC-BY-SA 3.0 option; expose per-file credits, sources and downloads. Runtime artwork composition/tints use the same license.
- One shared frame clock drives all layers. Vue controls only local preview state; no guest gameplay or persistence. Full editor and authoritative movement remain Milestone 1 work.
