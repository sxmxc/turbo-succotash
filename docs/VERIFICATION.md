# Bootstrap verification — 2026-09-07

Milestone 2 is complete. Final verification on 2026-09-10 passed `npm run check` (including formatting, lint, type checks, 14 unit tests and the production build), migration-007 database integration, a healthy rebuilt Compose stack, and focused two-session browser acceptance for rooms, friendship, presence, apartments and persistent online/offline direct messages. See [Milestone 2 completion](#milestone-2-completion--2026-09-10) for the exact evidence.

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

## Starter template source hierarchy — 2026-09-08

- `npm run rooms:build`: passed and built only `floor_0_lobby`; the five empty tracked template placeholders were ignored as intended.
- `npm run check`: passed repository/format/lint/type checks, all 14 tests, and production build. The added discovery regression covers a unique top-level map, an empty apartment placeholder, and a nested themed lobby template ID.
- No HTTP, realtime protocol, dependency, database, migration, or running-room behavior changed. This change establishes source discovery and confirmed creation rules only; instance creation and random theme selection remain future server work.

## Colyseus presence and Phaser entity synchronization — 2026-09-08

- Replaced the web client's coarse room-level state listener with the Colyseus 0.18 `Callbacks.get(room)` API: `onAdd` and `onRemove` track player membership, and per-player `onChange` publishes movement/property updates. The immediate `onAdd` behavior covers players already present when a client joins.
- Fixed the separate Phaser lifecycle race by retaining the active `LobbyScene`; later `setPlayers` calls can now create missing game objects instead of only updating or removing entities created during scene startup.
- Strengthened the two-session browser acceptance test to require `data-rendered-player-count="2"` on both Phaser hosts after both replicated online counts reach two, then reload/rejoin the first client and require symmetric state and rendering again.
- `npm run check`: passed repository/format/lint/type checks, all 14 unit tests and the production build. Vite retained the existing large-chunk warning (1,712.47 kB raw / 465.55 kB gzip).
- `npm run compose:build` and `npm run compose:up`: all five images built; migration completed; PostgreSQL and all four services became healthy.
- `SMOKE_URL=http://docker01.voidmoose.local:8080 npm run test:browser -- tests/browser/milestone1.spec.ts --project=desktop --grep "two authenticated sessions"`: final run passed in 17.0 seconds. This exercised two authenticated clients, symmetric replicated membership and rendering, first-client page reload/rejoin, movement, chat, and late join against the rebuilt Compose deployment.
- The client behavior and agent guardrails changed without changing realtime protocol 2, HTTP compatibility, dependencies, database schema or migrations.

## Release 0.2.3 focused-input regression — 2026-09-08

- Confirmed the chat defect was caused by Phaser's global key capture: movement polling was correctly suppressed for focused DOM controls, but the KeyboardManager had already prevented WASD and Space from reaching the input. Movement keys now remain registered for Phaser polling without browser capture; the selective unfocused-arrow handler still prevents page scrolling.
- Browser acceptance now types `wasd with spaces`, verifies the exact chat input value, and verifies that the avatar coordinates remain unchanged. It also follows the renamed server-status selector.
- `npm run check`: passed repository/format/lint/type checks, all 14 unit tests and the production build. Vite retained the existing large-chunk warning (1,712.78 kB raw / 465.67 kB gzip).
- `npm run compose:build` and `npm run compose:up`: rebuilt all five version 0.2.3 images; migration completed and all services became healthy.
- `npm run test:browser -- tests/browser/milestone1.spec.ts --project=desktop --grep "two authenticated sessions"`: passed 1/1 in 16.5 seconds against the rebuilt Compose stack. An initial run reached the app's connected state but failed because the renamed status text is CSS-capitalized; the assertion was corrected to be case-insensitive before the passing run.
- Version 0.2.3 changes no HTTP/realtime protocol, dependency, database or migration contract. Protocol 2 remains coordinated across the web and realtime services. No tag, publication or remote deployment was performed.

## Release 0.2.4 Advanced Chat UI — 2026-09-08

- Installed exactly pinned, owner-approved prerelease `@advanced-chat/components` 3.0.0-rc.3 with npm 12.0.2. The lockfile resolves its transitive tree with integrity hashes; npm audit reported zero known vulnerabilities. Package metadata declares MIT, Node `^20.19.0 || >=22.14.0`, and Vue peer `^3.5.0`, compatible with selected Node 24.20.0 and Vue 3.5.42.
- `npm run check`: passed repository/format/lint/type checks, all 14 unit tests, and production build. Advanced Chat emits a separate 37.64 kB raw / 13.42 kB gzip chunk; the existing Phaser-containing main bundle warning remains at 1,903.55 kB raw / 524.83 kB gzip.
- `npm run compose:build`: built all five 0.2.4 images. `npm run compose:up`: migration completed and all services became healthy after removing one exact stale, never-started migration container left by an interrupted Compose replacement. The database volume and all persistent data were preserved.
- `npm run smoke`: passed. `npm run test:dependencies`: passed service liveness, dependency failure/unready behavior and recovery. `npm run release:check -- v0.2.4`: passed. `git diff --check`: passed.
- Focused desktop two-session browser acceptance passed 1/1 in 16.5 seconds against the rebuilt Compose stack. It covered replicated presence/rendering, reload/rejoin, typing `wasd with spaces` without movement, Advanced Chat send/receive, speech bubbles, authoritative movement and late-join no-history behavior.
- A subsequent complete browser run passed six cases and both expected mobile skips, including the responsive panel/chat reachability case. Its first LPC screenshot timing assertion failed while another live user was concurrently testing the shared room; the aborted test left that user plus its own session visible, so the following exact two-user occupancy assertion also observed three. The owner confirmed concurrent manual testing caused the additional user. The relevant isolated two-session case had already passed from clean transient state; assertions were not weakened. No physical-device/software-keyboard run was performed.
- The Vue adapter disables files, markdown, linkification, reactions, replies, edits, selection and history pagination. Colyseus remains the only room transport/lifecycle owner and accepted messages remain bounded, live-only and cleared on logout/reload. No HTTP, realtime protocol, database or migration contract changed; coordinated protocol 2 compatibility remains. No tag, publication or remote deployment was performed.
- Follow-up: bare `npm run test:browser` now reads `PUBLIC_ORIGIN` from the script-loaded `.env`, with `SMOKE_URL` retaining highest-priority override and localhost remaining the final fallback. The milestone test's explicit origin header follows the same order. Previously, a non-local configured origin required manually repeating it as `SMOKE_URL`; otherwise requests received the expected `INVALID_ORIGIN`. The complete suite passed 8 tests with 2 intentional mobile skips against the same configured origin, and the origin-dependent beta-gate case then passed 1/1 through the corrected bare command. An immediate second full run exceeded the intentional one-minute shared authentication limit; back-to-back local runs still require the documented identity-service recreation or waiting for its window to expire.

## Tiled elevator interaction — 2026-09-08

- `npm run check`: passed repository guard, formatting, lint, TypeScript/Vue types, 14 unit tests and production build.
- `npm run compose:build` and `npm run compose:up`: rebuilt the local stack; migration completed and services became healthy.
- `npm run test:browser -- --grep='authored elevator'`: passed desktop and mobile (2/2). The regression click-moves through the authoritative server path to the elevator, confirms the local interaction state, opens the accessible dialog with E, and closes it.
- `npm run rooms:build` could not run in this environment: Tiled under Xvfb failed its Qt display/export initialization. Runtime falls back to Phaser's parsed object layers when the committed manifest lacks the newly generated interaction list, so the existing lobby/default-template elevator objects remain functional. No HTTP, realtime protocol, database, migration, or dependency contract changed.

## Release 0.2.5 room creation and navigation — 2026-09-09

- `npm run check`: passed repository/format/lint/type checks, all 14 unit tests and the production build. Vite retained the existing large main-chunk warning (1,910.13 kB raw / 526.75 kB gzip).
- `npm run compose:build` built all five 0.2.5 images. `npm run compose:up` applied application migrations 002 through 004 and all services became healthy. Migration 004 converted development data to the confirmed address convention: every floor lobby is R000 and user rooms begin at R001.
- `npm run smoke`: passed. `npm run test:database`: passed concurrent fresh/repeat migration, the F000-R000 seed invariant, forward upgrade, role isolation, transactional rollback and checksum rejection. `npm run release:check -- v0.2.5`: passed.
- `npm run test:browser -- tests/browser/interactions.spec.ts`: passed four applicable cases with two intentional mobile skips. It covered desktop/mobile authored elevator proximity and dialog behavior, room creation and navigation back to F000-R000, concurrent unique R001+ allocation, generated floor lobby F001-R000, and private-room password rejection/admission.
- The complete browser suite passed all nine desktop/applicable navigation cases before the intentional shared authentication limiter affected three later mobile logins. After recreating only identity to clear that transient window, two of those three mobile cases passed; the remaining pre-existing LPC animation screenshot assertion observed a frame change after its fixed 120 ms stop delay. The room/navigation suite itself remained green and no security limit or assertion was weakened.
- `npm run rooms:build` remains blocked on this workstation because Tiled under Xvfb cannot initialize its Qt display/export path. The owner previously exported the authored maps; committed generated data was aligned with named-spawn and interaction-property output. No dependency changed. Protocol 2 remains compatible via the legacy `lobby` route mapped to F000-R000; current clients use address-partitioned `room` joins. No tag, publication or remote deployment was performed.
- `git diff --check` reports carriage returns as trailing whitespace only in the two owner-authored Tiled TMX changes; those editor-owned files were not normalized. Prettier's repository-wide format check passed.

## Gameplay-shell presentation and camera — 2026-09-09

- `npm run typecheck`, `npm run lint` and `npm run format:check`: passed. `npm test`: passed all 14 unit tests when run with the local IPC permission required by `tsx`; the sandbox-only invocation cannot bind its `/tmp/tsx-*` pipe. The production web build completed as part of `npm run compose:build`; the existing Vite large-chunk warning remains.
- `npm run compose:build` and `npm run compose:up`: rebuilt the local images and restored PostgreSQL, migration, web, identity, API and realtime to healthy state. Identity was recreated only between focused browser runs to clear the intentional in-memory login rate limit; its production rate limit was not changed.
- Focused browser regressions passed against the rebuilt stack: desktop game-shell/camera/panel reachability (1/1), desktop camera-aware elevator interaction (1/1), and mobile game-shell/panel reachability (1/1). The initial complete suite exhausted the documented shared authentication limiter after earlier runs; focused verification was used after the normal test-service reset rather than weakening that limiter.
- The web client now has a fixed 720 × 480 Phaser logical viewport and uses Tiled dimensions only as camera bounds. The main camera follows the replicated local player with a deadzone; pointer regression helpers convert world targets through the camera scroll. This changes no HTTP/realtime protocol, dependency, database, migration or server-authoritative movement behavior. No tag, publication or remote deployment was performed.
- Refinement: TypeScript, lint and formatting checks passed after connecting a `ResizeObserver` to Phaser's FIT ScaleManager. The rebuilt Compose web service passed the focused desktop shell browser case, which now asserts that the canvas fills a desktop stage (>900px CSS width) and that the compact drag grip remains movable and keyboard-reachable. No contract behavior changed.

## Milestone 2 social/fullscreen follow-up — 2026-09-09

- `npm run typecheck` and `npm run build`: passed. `npm run test:database`: passed earlier in this change against migrations 001–006.
- Rebuilt/restarted Compose successfully; all services became healthy. Focused appearance persistence passed. The expanded two-session check then found Advanced Chat displaying the transported mention token literally; the adapter was corrected to transport readable `@Name` text. This pending rerun was completed successfully in the 2026-09-10 closeout below.
- Fullscreen now targets the outer Vue/Phaser play layout through Phaser ScaleManager. Room/DM reactions are live-only; receipt icons are omitted for room messages and retained for sent DMs.

## Milestone 2 completion — 2026-09-10

- `npm run check`: passed repository guard, formatting, lint, TypeScript/Vue types, all 14 unit tests and the production build. The existing Vite large-chunk warning remains.
- `npm run test:database`: passed fresh concurrent application through migration 007, repeat migration, forward upgrade preservation, role isolation, rollback and checksum rejection. Migration 007 adds durable direct messages, delivery/read timestamps and DM reactions.
- Compose rebuilt successfully, migration 007 applied, and PostgreSQL plus identity/API/realtime/web were healthy. The final presentation-only correction rebuilt/recreated only web, leaving persistent and realtime services running.
- Focused desktop two-session acceptance passed 1/1 in 32.4 seconds at the intended 1920 × 1080 layout. It covers mentions, room reactions through a normal pointer click, visible friendship request/accept controls, personal-apartment entry, cross-room typing/preview/unread state, DM-only read receipts, immediate offline presence, offline DM send, history after a new session and persisted unread/read behavior.
- The reaction picker initially exposed a real Advanced Chat overflow issue: an incoming message's menu opened left beneath the chat list. Incoming menus now open right into the message pane. Earlier receipt assertions incorrectly targeted the outer SVG rather than Advanced Chat's identified child path; the receipt event and graphic were present, and the corrected assertion passes.
- Presence is live when its API row was explicitly online and renewed within 40 seconds; realtime renews connected users every 15 seconds and records final-session leave immediately. This is resilient to unclean disconnects without adding a second browser connection.
- `BoldPixels.ttf` is served locally with `font-display: swap` and applied to headings and the top-bar brand. No dependency or lockfile changed.
- Compatibility: application migrations 005–007 are forward additions. Direct-message history uses new additive authenticated/internal HTTP routes, and typing/read events are additive protocol-2 message types. Existing coordinated 0.2.x room joins and server-authoritative simulation are unchanged; no tag, publication or remote deployment was performed.
