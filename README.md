# Gravityborn

Turn the entire room into a weapon. Gravityborn is a mobile-first physics action roguelite in development.

This repository currently delivers the **first playable physics/combat prototype**, following section 103 of the [design specification](docs/design-specification.md). It is a browser game built with TypeScript, Matter.js, and Canvas 2D. The larger roguelite and native Android/iOS releases remain later milestones.

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

Open http://127.0.0.1:4180. All art and sound are generated locally; gameplay makes no external network requests. A web server is required to load the bundle. Installable offline/native packages are not included yet.

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move | W A S D | Drag joystick |
| Change global gravity | Arrow keys | Four arrow buttons |
| Place gravity well | Click arena; Space at cursor or ahead | Tap arena; well button shows targeting hint |
| Pause / resume | Escape or pause button | Pause button |
| Restart after a result | R or result button | Result button |
| Physics inspector | Backtick or sidebar button | Sidebar on larger screens |

Clear six hostiles using momentum, heavy objects, exploding barrels, and redirected shots. There is no attack button. Health, damage immunity, cooldowns, and field lifetimes advance only while the simulation runs. Focus loss automatically pauses the game.

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

XP, relics, bosses, procedural runs, meta progression, equipment, classes, and run saves are deliberately deferred until player testing validates the core mechanic. Settings are the only persisted data in this prototype.

## Verify

```sh
npm run format:check
npm run build
npm test
npx playwright install chromium webkit
npm run test:browser
npm run benchmark
```

Browser tests launch their own server at 127.0.0.1:5187 and cover Chromium desktop, Android emulation, and WebKit phone emulation. Real Android/iPhone performance and touch ergonomics still require physical device testing.

With the dev server running, `npm run playtest` performs a longer input-driven browser attempt and saves screenshots to `artifacts/`. Tests and screenshots never ship in the production bundle. Read-only development diagnostics are stripped from production builds.

See [architecture](docs/architecture.md), [milestone review](docs/prototype-review.md), and the [roadmap](docs/roadmap.md) for implementation boundaries and the next validation gate.
