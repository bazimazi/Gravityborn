# Development gates

## Completed: first playable prototype

Section 103 scope: responsive movement, four gravity directions, one gravity well, three enemy archetypes, three object types, impact/explosion/projectile combat, feedback, and a testable arena. The repository also includes the specification and the necessary debug and automated verification tools.

## External validation remains open

Observe players without explaining optimal tactics. Record whether they independently flip gravity to dodge and attack, weaponize objects, redirect shots, and create chains. The authored chamber is intentionally short and can be solved quickly by experienced inputs. Tune handling, threat placement, causal feedback, and readability before adding content. A scripted win proves reachability, not fun or balanced difficulty.

Test on actual low/mid-range Android devices and an iPhone, in portrait and landscape. Check one-handed reach, simultaneous inputs, safe areas, audio resumption, thermal behavior, and 30/60 FPS targets. Browser emulation cannot establish these properties.

## Active implementation: full specification

The user has authorized continuing through the full plan while external player and device validation remain open. These checks are tracked separately and do not block repository implementation. `implementation-status.json` tracks all 113 numbered specification sections; partial entries are not completion claims.

Implemented beyond the first prototype: 21 authored physical powers and four primary-well stages; tagged modifiers and triggers; 13 additional enemy behaviors; eight elite modifiers; authored multiwave rooms across eight biomes; seeded branching routes; physical XP and shards; 15 relics and four synergies; ten bosses; eight classes; versioned saves with backup recovery, export/import, and route checkpoints.

The game also includes 50 equipment designs in six slots, upgrades/affixes/sets, six research trees, seven mutations, six events, 11 phenomena, four contracts, seven difficulties, and ten run modes. All eight regions are accessible, with five story acts, a codex, ability mastery and 123 challenges. Shops implement seven purchase categories. Accessibility settings, adaptive music, offline web delivery and native projects are present. Current automated coverage: 226 unit cases, 30 applicable browser cases, and a production offline test. An Android debug APK passed an API 36 emulator smoke test including process-death save recovery; this is not physical-device validation.

Current work proceeds through full launch content breadth, tutorial/exploration depth, further physics interactions, local social/replay features, telemetry and authoring tools, balance, and release preparation. Room-flow tests use direct combat completion to verify transitions. A separate input-only bot reaches real victories, but successful quick runs remain shorter than the intended duration. Neither establishes human win rates, fun, or difficulty balance. Equipment counts include eight six-piece families and two unique legendary items; these are not 50 independently playtested builds. Challenge counts include five milestones per power, not 123 separate game modes.

Add the section 104 systems in order: modular ability definitions, enemy behaviors, procedural authored-room composition, XP and three-choice upgrades, one elite, one boss, and a complete run. Extend tests with seeded generation reachability and run-state persistence before introducing meta progression.

## Vertical slice and native delivery

Build section 101's one-biome vertical slice and continue the remaining scope. Evaluate native packaging and physics/rendering performance against measured device requirements before claiming store readiness. Add versioned progression saves and migration fixtures before persistent unlocks. Keep the long-term content targets in the design specification; they are not implemented claims.
