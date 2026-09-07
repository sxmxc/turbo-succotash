# Social Room bootstrap

Milestone 0 foundation for the [social game design](docs/SOCIAL_ROOM_DESIGN.md). The working title is provisional. The UI shows an orthographic room with a generated 16×16 placeholder person and a draggable panel; on mobile the panel docks into document flow. Tint selection demonstrates the Vue/Phaser interface. Accounts, movement, saved avatars, chat and multiplayer are **not implemented**.

## Quick start

Prerequisites: Node **24.20.0** (`nvm install && nvm use`), npm **12.0.2** (`npm install -g npm@12.0.2`), Docker Engine with Compose v2+.

```sh
npm ci
npm run env:init
npm run compose:build
npm run compose:up
npm run smoke
```

Open **http://localhost:8080**. `env:init` creates ignored `.env` with random local secrets, refusing to overwrite an existing file. `.env.example` documents every value. Local ports bind to loopback. Stop with `npm run compose:down`; the database volume is retained.

## Fast iteration

```sh
npm run db:up
npm run db:migrate
npm run dev
```

Open **http://localhost:5173**; Vite and `tsx watch` reload changed code. This uses the same database as the full Compose environment. Stop full application containers first if you want only host services, while keeping the volume. Services use host ports 3001/3002/3003; PostgreSQL uses 5432 only with the development override. Full Compose uses internal container ports and web port 8080. Both web servers proxy service calls under one origin.

## Boundaries

| Path                       | Responsibility                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `apps/web`                 | Vue application/DOM panels; Phaser rendering via `src/game/mount.ts` lifecycle/command adapter |
| `services/identity`        | Better Auth instance, restricted session-read adapter, future atomic beta/account ownership    |
| `services/api`             | Persistent game-data foundation; `GET /v1/bootstrap` explicitly reports unfinished features    |
| `services/realtime`        | Colyseus WebSocket transport; no joinable rooms before authenticated admission                 |
| `packages/contracts`       | Zod-validated service diagnostics/protocol version, no speculative gameplay messages           |
| `packages/service-runtime` | Fastify factory, configuration validation, probes, database pools, graceful shutdown           |
| `infra`                    | Multi-target Dockerfile, common-origin proxy, database initialization and SQL migrations       |
| `scripts`, `tests`         | Reusable dev/build/deployment commands and verification                                        |
| `agents`                   | Concise project continuity; start at root `AGENTS.md`                                          |

Identity and application use distinct database credentials and schemas. Runtime roles have data access only in their own schema; migration credentials are reserved for deployment. `/healthz` reports process liveness; `/readyz` checks required migration 001 for API/identity, and both dependencies plus listening transport for realtime. Failure returns 503 without database details. SIGTERM/SIGINT drain services with a bounded shutdown. No CORS wildcard or credential logging is enabled.

## Checks and migrations

```sh
npm run check
npm run test:database
npm run test:dependencies
npx playwright install --with-deps chromium
npm run test:browser
npm run release:check
npm run release:manifest
npm run deploy
```

Database/browser checks require the full Compose stack. `test:dependencies` deliberately stops/restarts this Compose project’s PostgreSQL container; run it only against the disposable local/CI environment. The database integration check uses temporary schemas inside an isolated temporary database and cleans it up. `check` runs formatting, ESLint, service/Vue type checks, unit tests and production builds. `format` applies formatting. [Verification evidence](docs/VERIFICATION.md) distinguishes actual results from pending remote CI.

`db:migrate` applies sorted SQL files in `infra/migrations/{identity,application}` once, checks stored SHA-256 checksums, and holds a PostgreSQL advisory lock. Each revision is transactional. Never edit an applied file; add the next numbered migration. Fresh database initialization creates roles/schemas; migration execution creates tables. Better Auth schema updates must be generated/reviewed as SQL, not run automatically at service startup.

## Troubleshooting

- `Invalid … configuration`: fix named fields in `.env`; do not paste credentials into issues. `env:init` intentionally fails if `.env` exists.
- Port conflict: stop the conflicting local process or adjust `WEB_PORT`; development DB uses 5432. Do not run two host dev processes.
- Readiness 503: inspect `docker compose --env-file .env -f infra/compose/compose.yml logs migrate api identity realtime`; check database readiness, migration success and internal URLs.
- Password changes after volume creation do not update PostgreSQL roles. Rotate the role password and matching env values deliberately. For disposable local data only, `docker compose --env-file .env -f infra/compose/compose.yml down -v` deletes the database and permits fresh initialization.
- `npm ci` engine error: use `.nvmrc` and the pinned npm; the preinstalled Node 25 is outside this project's tested LTS runtime.
- Chromium dependencies: run the Playwright install command above. Canvas/browser verification needs a browser with Canvas or WebGL support.
- Phaser creates a sizeable production bundle; bootstrap has no lazy-loaded game routes yet.

See [versions and compatibility](docs/DEPENDENCIES.md), [release/deployment](docs/RELEASES.md), and [next task](agents/tasks.md). Kubernetes is the eventual target; no production deployment is configured or claimed.
