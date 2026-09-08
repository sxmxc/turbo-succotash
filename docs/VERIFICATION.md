# Bootstrap verification — 2026-09-07

Environment: Linux amd64, Docker 29.8.0, Compose 5.5.1. Commands use Node 24.20.0 and npm 12.0.2. This host initially had Node 25, so the verified LTS distribution was extracted into `/tmp/social-node` and npm installed into `/tmp/social-npm` (outside the repository). For this session, commands used `PATH=/tmp/social-npm/bin:/tmp/social-node/node-v24.20.0-linux-x64/bin:$PATH`; normal setup uses `.nvmrc`.

| Command                                                            | Observed result                                                                                                                                                             |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                           | Passed; 335 installed packages, 342 audited, zero reported vulnerabilities. Lockfile has no prerelease resolutions.                                                         |
| `npm run env:init`                                                 | Passed; generated ignored random local credentials without overwriting existing files.                                                                                      |
| `npm run db:up` and `npm run db:migrate`                           | Passed on fresh PostgreSQL 18.6; separate roles/schemas, generated Better Auth SQL and application bootstrap revision applied.                                              |
| `npm run check`                                                    | Formatting, ESLint, service/Vue types, four tests and production builds passed.                                                                                             |
| `npm run dev` then `SMOKE_URL=http://127.0.0.1:5173 npm run smoke` | Host services and Vite loaded; session inspection returned null; account mutation returned 501.                                                                             |
| `SMOKE_URL=http://127.0.0.1:5173 npm run test:browser`             | Desktop and mobile passed.                                                                                                                                                  |
| `npm run compose:build` and `npm run compose:up`                   | All five application/migration image targets built; PostgreSQL and four services healthy; migration job exited 0.                                                           |
| `npm run smoke`                                                    | Passed against nginx on localhost:8080, API/realtime diagnostics and Better Auth adapter.                                                                                   |
| `npm run test:database`                                            | Passed: concurrent fresh migrations, repeat application, upgrade preserving data, role isolation, failed-revision rollback, checksum rejection; temporary database removed. |
| `npm run test:dependencies`                                        | Passed: PostgreSQL stopped; identity/API/realtime remained live and returned readiness 503; all recovered after restart.                                                    |
| `npm run test:browser`                                             | Two production browser tests passed: canvas, tint changes, drag, keyboard repositioning, resize bounds and mobile docking.                                                  |
| Browser tool inspection                                            | Inspected desktop screenshot and mobile layout; one visible canvas, explicit placeholder labels, panel moved 300px horizontally and docked within 390px viewport.           |
| `git diff --check`                                                 | Passed; supplied design preserved.                                                                                                                                          |

Final image source: **7440d89506fa55634efa5f5b411e49d2e0f8e994** (software 0.1.0). Rebuilt all five targets from the clean committed tree, then reran `npm run compose:up`, `npm run smoke` (including identity/API/realtime diagnostics), and `npm run test:browser`: all passed. The desktop browser test additionally verifies the panel stays within a 900×300 viewport with reachable controls. Manual inspection confirmed panel height 284px at y=8 in that viewport and footer commit `7440d89506fa`.

`npm run release:check` passed. `npm run release:manifest` generated `artifacts/release.json` containing five immutable local image references and verified version/source labels. `npm run deploy` then reused those image IDs without rebuilding, executed the migration job, waited for all service readiness checks, and passed post-deployment smoke with exact commit assertions. `artifacts/deployment.json` records migration/readiness/smoke success. The final documentation commit follows the image source commit; existing artifacts deliberately retain the source identity they were built from.

Final review: `git diff --check` and staged diff checks passed; reviewed tracked/generated-file boundaries and confirmed `.env`, dependencies, browser outputs and deployment artifacts remain ignored. The supplied design document was preserved and included in the bootstrap commit. Host development/temporary preview processes were stopped; the final Compose deployment remains available at **http://localhost:8080**.

Resolved during verification: Phaser 4 removed the old texture generation helper; use its canvas texture API. Invalid URL refinement could throw outside configuration validation; guarded with `URL.canParse`. Colyseus transport requires its supposedly optional Express peer at runtime and must own its HTTP router. Formatting rules are integrated with Prettier. An early browser run raced Chromium extraction (ETXTBSY); rerun after installation passed. An early Compose startup preceded completion of the migration image; rerun after all targets built passed.

Known non-failures: Vite reports a ~1.44 MB raw / 384 KB gzip Phaser-containing bundle. npm 12 blocks unapproved optional install scripts; required builds/tests work without them. The browser tool's software WebGL emits ReadPixels performance warnings; no application exceptions were observed. A missing favicon request was fixed. A final short-desktop-viewport regression was fixed with bounded panel scrolling, while mobile keeps document-flow docking. Production dependency layers are cached separately from source builds.

Remote GitHub Actions execution, GHCR publishing, production deployment and Kubernetes have not been run. Mobile verification is Chromium device emulation, not a physical phone or software-keyboard test (no chat input yet). No authentication flows, gameplay, multiplayer capacity or chat behavior are claimed.

## LPC integration — 2026-09-07

Preserved completed bootstrap; applied design revision 5. Checks used the same pinned Node 24.20.0/npm 12.0.2 runtime. No dependencies, lockfile, service contracts, migrations or CI workflow changed.

- `npm run check`: passed formatting, lint (no warnings), service/Vue types, all five unit tests and production build. Added import SHA-256/native PNG-grid/frame-cycle/credit checks.
- `npm run compose:build`: all five targets passed. `npm run compose:up`: migration exited 0 and PostgreSQL/web/identity/API/realtime healthy, preserving the existing database.
- `npm run smoke`: passed against the final nginx build at localhost:8080, including session adapter and closed signup.
- `npm run test:browser`: all six cases passed in 8.2 seconds on desktop/mobile Chromium. Existing tint/panel/short-viewport checks remain; new cases verify five local PNG responses, four-direction walking differs from standing, stopping restores the exact standing capture, navigable credits with five downloads, and failed asset loading never reports ready.
- Visual inspection: inspected a native composite of all 36 frames, then production captures of north/west/south/east standing and walking. Head/hair/shirt/pants remain aligned with the body and foot anchor; pixels retain hard edges. Captures are temporary inspection artifacts in `/tmp/lpc-*.png`, not golden test fixtures.
- `npm run release:check`: passed for the unchanged 0.1.0 root version. Feature notes remain Unreleased with 0.2.0 planned under existing policy. HTTP/realtime protocol 1 is unchanged.
- `git diff --check`: passed. Final documentation formatting check passed.

Resolved during this change: NodeNext required a JSON import attribute and explicit test import extension. The first browser run caught a missing footer link to the already-served credits page; added the link and reran the full production browser suite successfully. The shell sandbox initially failed to initialize its loopback namespace; authorized escalated commands completed the work, so no check remained blocked.

The local Compose deployment now runs the uncommitted LPC working tree (dirty source label). Previous ignored immutable release/deployment manifests still identify the original bootstrap images, not this update; no new release manifest, tag, publication or remote CI run is claimed. Database isolation/outage tests and clean install were not repeated for this client-only change; their bootstrap evidence above remains historical. The existing Phaser bundle-size warning remains (~1.45 MB raw / 387 KB gzip). Mobile coverage is emulation. Walking is a local in-place art preview, not gameplay; collision footprint is provisional metadata and full customization remains deferred.

## Remote development port exposure — 2026-09-07

Compose now uses the existing `HOST` setting for the published nginx address while retaining `127.0.0.1` in `.env.example`. This local ignored `.env` sets `HOST=0.0.0.0`; only nginx is published by Compose, while backend containers remain internal. `docker compose config --quiet` passed and resolved the web mapping to `0.0.0.0:8080->80`. `npm run compose:up` recreated web healthy; `npm run smoke` passed; `ss` showed `0.0.0.0:8080`; HTTP returned 200 through both loopback and host address `172.30.0.101`. `git diff --check` passed. No image rebuild, dependency, contract, database, HTTP protocol or realtime protocol change was required.

## Milestone 1 final verification — 2026-09-08

- `npm run check`: passed repository guard, formatting, lint, TypeScript/Vue type checks, 10 unit tests and production build. The existing Phaser bundle-size warning remains.
- `npm run compose:build` and `npm run compose:up`: all application images built; migration completed; PostgreSQL and all services became healthy.
- `npm run test:database`: passed concurrent fresh migration, repeat, upgrade preservation, role isolation, rollback and checksum rejection.
- `npm run smoke`: passed after service readiness against the Compose deployment.
- `SMOKE_URL=http://docker01.voidmoose.local:8080 npm run test:browser`: 8 passed and 2 intentional mobile skips. The restored desktop acceptance case covered two authenticated sessions, presence, authoritative movement, typing suppression, live-only chat and late-join no-history behavior; beta gating covered concurrent redemption, reuse, revocation and winner login.
- Browser verification must use the configured `PUBLIC_ORIGIN`; localhost is rejected as `INVALID_ORIGIN` when the deployment trusts the external hostname. Smoke and the browser suite are separate rate-limited stages because together they intentionally exceed the eight-signups-per-minute per-IP production limit. CI force-recreates only the identity container and waits for health before browser acceptance, resetting transient in-memory limiter state without weakening the production limit.

## GHCR publication recovery — 2026-09-08

- Focused `node --import tsx --test tests/publish.test.ts`: 3 passed. Coverage proves bounded retry/backoff after `unknown blob`-style push failures, no push for an exact existing config-digest match, and hard failure without push for mismatched existing content.
- `npm run release:check -- v0.2.1`: passed; package version, tag spelling and changelog entry match.
- `npm run check`: passed repository/format/lint/type checks, all 13 tests and the production build. Vite retained the existing large-chunk warning (1,705.33 kB raw / 463.85 kB gzip).
- No Docker build, image publication, Git tag creation/movement, or GHCR mutation was performed. The publication implementation invokes only manifest inspection, local tagging and push operations.
- Recovery assessment: rerunning the tagged `v0.2.1` workflow checks out its old publisher and cannot use this fix. The safest immutable recovery is a new patch release containing the fix after owner approval; do not move `v0.2.1` or overwrite any mismatched version/commit tag.
- The required `apply_patch` helper was attempted but its nested filesystem sandbox failed before reading the workspace (`bwrap: loopback: Failed RTM_NEWADDR`). Changes were applied as unified diffs with the system `patch` fallback and then fully checked.
- After owner approval to prepare the recovery release, root `package.json` and the lockfile were bumped to `0.2.2` and the changelog records the publication-only compatibility impact. Focused publication tests again passed 3/3; `npm run release:check -- v0.2.2` passed; final `npm run check` passed all stages and 13 tests with the same Vite large-chunk warning. No tag or publication was performed.

Owner-facing external-origin play sign-off was accepted. Release 0.2.0 marked Milestone 1 completion; patch release 0.2.1 adds only CI rate-limit isolation. Protocol 2 remains the coordinated realtime contract; dependencies did not change.

## Panverse Plaza product rename — 2026-09-08

- Cleanup follow-up: `docker compose -p social-room ... down --remove-orphans` removed all six old-project containers and `social-room_default`. `docker compose ls --all`, filtered container, and filtered network checks show no remaining `social-room` stack. `social-room_pgdata` and cached old image tags were intentionally preserved because stack cleanup does not imply deleting database data or recoverable images.

- `npm run check`: passed repository/format/lint/type checks, all 13 tests, and production build. The generated web output uses Panverse Plaza; the existing Vite large-chunk warning remains.
- `npm run compose:build`: built all five renamed local images: `panverse-plaza-{identity,api,realtime,web,migrate}:dev`. Image inspection confirmed software version 0.2.2 and the current dirty source revision labels.
- `docker compose ... config --images`: resolved only the five `panverse-plaza-*` application images plus the unchanged pinned PostgreSQL image.
- A full source/generated-output scan found the former name only in migration-history notes that explain what Panverse Plaza replaced. The authoritative design was renamed to `docs/PANVERSE_PLAZA_DESIGN.md`.
- This changes local Compose resource and OCI image names. It does not change HTTP, realtime protocol 2, dependencies, database schemas, migrations, or persistent room identifiers. Existing ignored release/deployment manifests remain historical and were not rewritten to claim verification against the new uncommitted source.
