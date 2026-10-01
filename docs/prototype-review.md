# First playable milestone review

Reviewed on 2026-10-01. Scope is the specification's first playable prototype, not the full commercial game or vertical slice.

## Verification

- TypeScript strict checking and Vite production build pass.
- 30 simulation, combat, camera, and settings tests pass.
- 15 browser checks pass across Chromium desktop, Android emulation, and WebKit phone emulation: movement, flips, wells, cooldown UI, pause/restart, settings, keyboard activation, focus loss, inspector stepping, and portrait/landscape layout. Three inapplicable cases are skipped: CDP multitouch on desktop/WebKit and the phone landscape test on desktop.
- An input-only browser attempt cleared all six enemies in 9.88 seconds with eight flips, one well, and about 62 health remaining. The result/replay screen displayed correctly and no browser errors were recorded. This demonstrates an accessible completion path, not a difficulty or fun benchmark.
- A production smoke check confirmed the bundled game remains playable after network access is disabled following load, has no browser errors, and omits development diagnostics. Offline reload/installation is not implemented.
- Screenshots were visually inspected for desktop, portrait, landscape, action, and completion states. Generated screenshots and traces are in the ignored `artifacts/` and `test-results/` directories.

## Simulation stress test

Windows host, Node.js 24.18.0; 1,500 fixed updates per scenario with the first 100 excluded from timing. Figures below are from a run alongside browser checks, so they include host load variation. These are CPU simulation measurements, not mobile frame-rate claims.

| Live bodies | Local fields | Mean step | 95th percentile |
| --- | --- | --- | --- |
| 15 | 1 | 0.024 ms | 0.043 ms |
| 100 | 12 | 0.435 ms | 0.578 ms |
| 220 | 50 | 1.364 ms | 2.184 ms |

The fixed-step budget is 8.333 ms. States remained finite. Separate tests verify body/source budgets, velocity limits, projectile reuse, and recovery from deliberately corrupted geometry. Future higher content budgets require another performance pass.

## Ten review passes

| Pass | Findings and outcome |
| --- | --- |
| 1 — Gameplay | Verified object kills, wall impacts, explosions, redirected projectile kills, health, death, and restart. Corrected sustained enemy contact so immunity cannot become permanent. |
| 2 — Physics | Verified combined vector fields, inversion, zero gravity, impulses, mass, and wall containment. Added pre-integration velocity limiting, combined acceleration limiting, angular limits, and geometry reconstruction for non-finite states. |
| 3 — Architecture | One gravity authority, collision facts consumed after solving, typed events, presentation separate from damage. Wells retain causal attribution for late entrants. |
| 4 — Performance | Projectile and particle reuse, field spatial indexing, Matter broad-phase, capped body/field/VFX counts, bounded catch-up, and capped render resolution. Stress results recorded above. |
| 5 — UX | Persistent direction indicator, cooldowns, silhouettes, short instructions, pause, and quick retry. Strongest active chain remains visible rather than being replaced by a smaller one. |
| 6 — Accessibility | Native labeled buttons, keyboard activation, adjustable sound, reduced shake/drift, left-handed layout, and shape cues. Fixed Space interception and immediate control enablement at start. Canvas gameplay does not provide a nonvisual equivalent. |
| 7 — Balance | Increased enemy durability and reduced collision coefficient after an early scripted route cleared too quickly. The prototype remains a short sandbox; external playtests must evaluate threat and dominant strategies. |
| 8 — Extensibility | Entity properties, enemy/ability tuning, safety limits, and arena geometry are data-driven. Only settings persist; newer schema records are preserved. No premature progression framework. |
| 9 — Mobile | Fixed suppressed secondary-touch clicks using pointer presses, verified cancellation, enlarged touch arrows, and corrected the landscape camera. Actual device ergonomics, safe areas, audio behavior, and thermals remain unverified. |
| 10 — Polish | Visual inspection of all supported layouts, synthesized feedback, restrained trails/glow, complete result screen, documentation, repeatable commands, and CI workflow. |

## Remaining gate

Run observed player tests against section 102's core-fun criteria before producing roguelite content. Native builds, store release preparation, progression saves, and the later specification milestones are not part of this delivery. General continuous collision detection and cross-platform deterministic replays are not claimed. The CI workflow is provided; a hosted GitHub run has not been observed in this session.
