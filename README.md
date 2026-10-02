# Gravityborn

Turn the entire room into a weapon. Gravityborn is a mobile-first physics action roguelite in development.

This repository contains a playable roguelite built with TypeScript, Matter.js, and Canvas 2D. It supports complete expeditions, branching routes, upgrades, relics, bosses, equipment, classes, persistent progression, and a campaign route. Work continues against all 113 sections of the [design specification](docs/design-specification.md); the [implementation ledger](docs/implementation-status.json) distinguishes partial systems from completed requirements. Android has an emulator-tested debug package; physical-device validation, iOS builds and store delivery remain unfinished.

## Play locally

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5180**. For phone testing, open the network address printed by Vite from a device on the same network. The dev server listens on all network interfaces. Its fixed port avoids interfering with another project's default Vite server.

To test the production bundle:

```sh
npm run build
npm run preview
```

Open http://127.0.0.1:4180. All art and sound are generated locally; gameplay makes no external network requests. The production web app installs an offline cache after its first online load. Native projects bundle the assets for offline startup; see [native delivery](docs/native-delivery.md).

The Observatory's **Run archive & ghosts** saves recent results and a complete victory route. Export/import run files to share seeds, builds and ghosts; choose **Use these run rules** to prepare a repeat, including historical daily challenges. Matching runs show an optional visual ghost. Imported scores are unverified and do not award progression. Earned challenge shells and titles are selectable under **Core appearance & titles**.

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move | W A S D | Drag joystick |
| Change global gravity | Arrow keys | Four arrow buttons or optional arena swipe |
| Place gravity well | Click arena; Space at cursor or ahead | Tap arena; well button shows targeting hint |
| Cast selected power | Q or Cast button | Select a power and tap Cast |
| Progression / saved route | Observatory button (star) | Observatory button |
| Pause / resume | Escape or pause button | Pause button |
| Restart after a result | R or result button | Result button |
| Physics inspector | Backtick or sidebar button | Sidebar on larger screens |

Choose **Learn by playing** for seven training lessons, **Enter the chamber** for the original six-hostile laboratory, or **Begin expedition** for a run. The observatory provides class selection, equipment, research, mutations, run modes, difficulty, contracts, the codex, local diagnostic export, and saved-route recovery. Health, immunity, cooldowns, and fields advance only while the simulation runs. Focus loss automatically pauses the game.

## Implemented scope

- One authored arena with walls, floor, ceiling, and internal structures.
- Physics player, health, keyboard movement, simultaneous touch controls, and four gravity directions.
- One authoritative vector-field system with local attraction, field combination, spatial queries, and bounded acceleration.
- Chaser, projectile shooter with a firing tell, and heavy enemy.
- Movable barrels, crates, and rocks; mass/speed-based impact damage, chained explosions, and projectile redirection.
- Causal chain tracking, victory/death, pause, and quick restart.
- Pooled particles/projectiles, trails, impact feedback, synthesized sound, and optional camera shake.
- Portrait camera, landscape layout, left-handed controls, volume, reduced motion, low-power rendering, and versioned settings storage.
- Inspector with spawning, health restoration, gravity strength, wells, frame stepping, collision bounds, velocity/gravity vectors, mass, chain IDs, and performance data.

Beyond the original laboratory, the current implementation includes:

- 91 physical powers with levels/evolutions and traveling fields, a four-stage primary well, 91 relics, conditional/tagged modifiers, triggers, and twelve build synergies.
- 22 additional enemy behaviors, eight elite modifiers forming 99 curated variants, ten bosses, and nine biome definitions.
- Seeded authored-room composition, branching routes, puzzles, hazards, shops, six events, and three-choice XP upgrades.
- Ten classes, 50 equipment designs, upgrades/affixes/sets, six research trees, and nine mutations.
- Quick, standard, long, campaign, endless, challenge, boss-rush, gauntlet, daily, and weekly modes; seven difficulties and four contracts.
- Five story acts, nine collectible planet records, hidden vaults with nine additional lore entries, a discovery codex, causal ability mastery, and 393 reward-bearing challenges.
- Physical XP/shard pickups, nine material definitions, contact fire/quenching, conductive discharge, magnetic and gravity objects, mines, energy cells, sustained crush damage, and telegraphed enemy waves.
- Seven shop purchase categories with build-aware power selection, equipment replacement, and persistent sold inventory.
- Adaptive synthesized music, separate audio sliders, scalable text, reduced flashing, high contrast, adjustable joystick, optional haptics, and 30/60 FPS rendering.
- Installable offline web build and generated Android/iOS native projects with platform lifecycle and native preferences storage. See [native delivery](docs/native-delivery.md).
- Versioned local progression, backup recovery, future-version protection, save export/import, and checkpoints at room boundaries. A reload restarts from the last saved route rather than restoring every moving body.

Content counts describe implemented definitions, not independently balanced or externally playtested content. Full launch breadth, interaction audits, run pacing, visual polish, and native/release validation remain in progress.

## Verify

```sh
npm run format:check
npm run build
npm run validate:content
npm test
npx playwright install chromium webkit
npm run test:browser
npm run test:offline
npm run benchmark
```

Browser tests launch their own server at 127.0.0.1:5187 and cover Chromium desktop, Android emulation, and WebKit phone emulation. Real Android/iPhone performance and touch ergonomics still require physical device testing.

With the dev server running, `npm run playtest` performs a longer input-driven browser attempt and saves screenshots to `artifacts/`. Tests and screenshots never ship in the production bundle. Read-only development diagnostics are stripped from production builds.

See [architecture](docs/architecture.md), [milestone review](docs/prototype-review.md), and the [roadmap](docs/roadmap.md) for implementation boundaries and the next validation gate.

Compact challenge sharing is available in **Observatory → Run archive & ghosts**. Copy a recorded run's challenge code or paste someone else's code to select its seed and rules. Ordinary runs use your own progression; daily/weekly challenges use their fixed starting build. Full JSON exports also include build/results and any saved ghost. Native JSON exports open the OS share sheet.
