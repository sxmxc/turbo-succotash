# Dependency evidence — checked 2026-09-07

Resolved official npm registry `/latest` metadata before installation; the captured direct-package metadata is in [dependency-metadata.json](dependency-metadata.json). Root/workspace package manifests pin exact selections; `package-lock.json` pins the complete resolved tree with integrity hashes. Use `npm ci`, never floating dependency resolution during deployment.

| Component                             | Selected stable release              |
| ------------------------------------- | ------------------------------------ |
| Node                                  | 24.20.0 LTS (latest current: 26.8.1) |
| npm                                   | 12.0.2                               |
| Vue / Phaser                          | 3.5.42 / 4.2.1                       |
| Vite / Vue plugin                     | 8.2.2 / 6.0.8                        |
| TypeScript / vue-tsc                  | 6.0.3 / 3.3.11                       |
| Fastify / Better Auth                 | 5.12.3 / 1.7.3                       |
| Colyseus core / ws transport / schema | 0.18.11 / 0.18.2 / 5.0.27            |
| PostgreSQL / pg                       | 18.6 / 8.23.0                        |
| Zod / tsx                             | 4.5.4 / 4.23.13                      |
| ESLint / typescript-eslint / Vue lint | 10.10.0 / 8.69.0 / 10.11.0           |
| Prettier / Playwright                 | 3.9.6 / 1.63.0                       |
| Node types / pg types                 | 24.13.3 / 8.23.1                     |
| nginx                                 | 1.30.4 stable alpine                 |

Runtime selection uses the current LTS line per [Node release policy](https://nodejs.org/en/about/previous-releases) and [official distribution metadata](https://nodejs.org/dist/index.json). The host initially had Node 25.8.1, so verification uses downloaded Node 24.20.0 checked against official SHASUMS256. npm 12 requires `^22.22.2 || ^24.15.0 || >=26`; Vite/plugin require `^20.19.0 || >=22.12.0`; Colyseus requires Node >=22. Project runtime is deliberately Node >=24.20.0 <25 with matching Node 24 types.

Concrete compatibility exception: stable TypeScript latest is 7.0.2, but typescript-eslint 8.69.0 explicitly supports `>=4.8.4 <6.1.0` in both registry peers and [official documentation](https://typescript-eslint.io/users/dependency-versions/). Selected newest stable compatible 6.0.3, not a prerelease or forced install. Vue plugin peers accept Vue ^3.2.25 and Vite 8. Colyseus core and ws transport peers accept the selected 0.18 versions; schema 5 satisfies ^5.0.8. Using modular core/ws packages avoids umbrella Colyseus's unused Redis/uWebSockets dependencies.

Node's built-in test runner avoids a further optional-peer conflict: current Vitest 5 is outside Better Auth's declared optional Vitest 2/3/4 support. No Vitest is installed. Better Auth's PostgreSQL peer is satisfied by pg 8; unused optional ORM/framework integrations are not installed. npm 12 blocks unapproved install scripts by default; optional native optimizations are not required by the tested bootstrap.

Official integration references: [Vue changelog](https://github.com/vuejs/core/blob/main/CHANGELOG.md), [Phaser stable list](https://phaser.io/download/phaser4), [Vite guide](https://vite.dev/guide/), [Better Auth Fastify](https://better-auth.com/docs/integrations/fastify), [Colyseus WebSocket](https://docs.colyseus.io/server/transport/ws), [PostgreSQL 18.6 release](https://www.postgresql.org/docs/release/18.6/). Container references in Dockerfile/Compose include exact tags and immutable multiarchitecture digests verified with `docker buildx imagetools inspect`. GitHub Action releases were checked against each official repository's latest release/ref API and pinned to commit SHAs.

When upgrading, recheck current stable metadata, engine/peer compatibility, regenerate lockfile deliberately, run all checks and update this evidence. Document revisions are independent of software versions.

Runtime evidence: `@colyseus/ws-transport` 0.18.2 declares Express optional but unconditionally imports it in `build/WebSocketTransport.mjs`; selected stable Express 5.2.1 explicitly. Colyseus 0.18 owns its HTTP router, so realtime uses `createRouter`/`createEndpoint` instead of attaching a competing Fastify request listener. API/identity retain Fastify. `eslint-config-prettier` disables only overlapping style rules; Prettier enforces formatting while ESLint retains correctness checks.
