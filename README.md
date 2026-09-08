[![Bootstrap CI and release](https://github.com/sxmxc/turbo-succotash/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/sxmxc/turbo-succotash/actions/workflows/ci.yml)

# Social Room

Milestones 0 and 1 are complete; the project is implementing Milestone 2 rooms and social features on top of the one-room playable slice from the [working design](docs/SOCIAL_ROOM_DESIGN.md). Authenticated users can enter the Tiled lobby with layered LPC characters, move by arrows/WASD or click/tap, collide with the environment, see realtime presence, and use live-only room chat and speech bubbles. Vue owns DOM UI and Phaser owns the game surface. [LPC metadata/credits](docs/LPC_ASSETS.md), [Tiled authoring](docs/TILED_ROOMS.md), and [Phaser guardrails](docs/PHASER.md) describe those pipelines.

## Quick start

Prerequisites: Node **24.20.0** (`nvm install && nvm use`), npm **12.0.2** (`npm install -g npm@12.0.2`), Docker Engine with Compose v2+.

```sh
npm ci
npm run env:init
npm run rooms:build
npm run compose:build
npm run compose:up
npm run smoke
```

Open the exact `PUBLIC_ORIGIN` configured in `.env` (default **http://localhost:8080**). Identity validates browser origins deliberately; when accessing Compose at a hostname such as `http://docker01.example:8080`, set that single value as `PUBLIC_ORIGIN`, set `HOST=0.0.0.0` only when external binding is intended, rebuild/recreate the stack, and use the same URL for `SMOKE_URL` when running browser checks. Do not add a second Compose-specific public-origin variable.

`env:init` creates ignored local credentials without overwriting an existing `.env`. Stop with `npm run compose:down`; the database volume is retained.

## Tiled rooms

Source TMX/TSX/PNG files live under `assets/rooms/<template-id>/`. Install stable Tiled (verified with 1.12.2), then run `npm run rooms:build` whenever room sources change. The command embeds TSX data into Phaser-ready JSON, copies PNGs, and generates the matching authoritative server bounds/spawns/collision. Tile collision is authored as TSX tile objectgroup rectangles with class/type `collision`; map point objects with class/type `spawn` define entry locations. Commit the generated outputs.

## Fast iteration

```sh
npm run db:up
npm run db:migrate
npm run dev
```

Open **http://localhost:5173**. Development deliberately uses that origin; full Compose uses `PUBLIC_ORIGIN`. Both proxy identity/API/realtime under one browser origin.

## Boundaries

| Path                       | Responsibility                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `apps/web`                 | Vue DOM application and Phaser rendering/input/animation adapter                       |
| `services/identity`        | Better Auth accounts/sessions and atomic administrator-controlled beta gating          |
| `services/api`             | Persistent game-data owner; later room records/address allocation                      |
| `services/realtime`        | Authenticated Colyseus lobby, authoritative movement/collision, presence and live chat |
| `packages/contracts`       | Validated HTTP/realtime messages and protocol version                                  |
| `packages/room-data`       | Generated room dimensions, bounds, spawns and collision shared with realtime           |
| `packages/service-runtime` | Fastify/configuration/probes/database/shutdown utilities                               |
| `infra`                    | Images, common-origin proxy, database initialization and migrations                    |
| `scripts`, `tests`         | Build/deployment commands and unit/integration/browser verification                    |
| `agents`                   | Project continuity; start at root `AGENTS.md`                                          |

Identity and application use separate database credentials and schemas. Runtime roles access only their own schema; migration credentials are deployment-only. `/healthz` reports liveness and `/readyz` verifies required dependencies/migrations without exposing secrets. No wildcard credentialed CORS or sensitive logging is enabled.

## Checks and migrations

```sh
npm run check
npm run test:database
npm run test:dependencies
npx playwright install --with-deps chromium
SMOKE_URL="$PUBLIC_ORIGIN" npm run test:browser
npm run release:check
```

Database/browser checks require the full Compose stack. `test:dependencies` deliberately stops/restarts this project’s PostgreSQL container and is only for disposable local/CI environments. `check` rejects patch artifacts, checks formatting/lint/types, runs unit tests and builds production assets. `format` beautifies tracked source.

`db:migrate` applies sorted SQL files in `infra/migrations/{identity,application}` transactionally under an advisory lock and verifies checksums. Never edit an applied migration; add the next revision.

## Troubleshooting

- `INVALID_ORIGIN`: access the same scheme/host/port as `PUBLIC_ORIGIN`, then rebuild/recreate identity/realtime/web after changing it. This is a security check, not a second-origin configuration requirement.
- Port conflict: adjust `WEB_PORT` and `PUBLIC_ORIGIN` together. Do not run duplicate host dev services.
- Readiness 503: inspect Compose logs for migrate, API, identity and realtime.
- Password changes after volume creation do not rotate PostgreSQL roles. For disposable data only, bringing Compose down with `-v` deletes the database.
- Chromium dependencies: install them with the command above.
- Phaser currently produces a large-bundle warning; lazy route loading is later optimization, not a failed build.

See [dependency compatibility](docs/DEPENDENCIES.md), [release policy](docs/RELEASES.md), [verification](docs/VERIFICATION.md), and [active tasks](agents/tasks.md). Kubernetes is the eventual target; no production deployment is claimed.
