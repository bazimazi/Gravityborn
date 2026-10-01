# Development gates

## Completed: first playable prototype

Section 103 scope: responsive movement, four gravity directions, one gravity well, three enemy archetypes, three object types, impact/explosion/projectile combat, feedback, and a testable arena. The repository also includes the specification and the necessary debug and automated verification tools.

## External validation remains open

Observe players without explaining optimal tactics. Record whether they independently flip gravity to dodge and attack, weaponize objects, redirect shots, and create chains. The authored chamber is intentionally short and can be solved quickly by experienced inputs. Tune handling, threat placement, causal feedback, and readability before adding content. A scripted win proves reachability, not fun or balanced difficulty.

Test on actual low/mid-range Android devices and an iPhone, in portrait and landscape. Check one-handed reach, simultaneous inputs, safe areas, audio resumption, thermal behavior, and 30/60 FPS targets. Browser emulation cannot establish these properties.

## Active implementation: full specification

The user has authorized continuing through the full plan while external player and device validation remain open. These checks are tracked separately and do not block repository implementation. `implementation-status.json` tracks all 113 numbered specification sections; partial entries are not completion claims.

Implemented beyond the first prototype: 60 authored physical powers and four primary-well stages; conditional/tagged modifiers and triggers; 22 additional enemy behaviors; 99 curated elite variants; authored multiwave rooms across eight biomes; seeded branching routes; physical XP and shards; 60 relics and twelve synergies; ten bosses; ten classes; versioned saves with backup recovery, export/import, and route checkpoints.

The game also includes 50 equipment designs in six slots, upgrades/affixes/sets, six research trees, nine mutations, ten events, 11 phenomena, four contracts, seven difficulties, and ten run modes. All eight regions are accessible, with five story acts, a codex, ability mastery and 318 challenges. Shops implement seven purchase categories. Seven playable training lessons teach movement, direction changes, obstacle navigation, weaponized impact, object manipulation, wells and chain reactions. Hidden vaults, material fire/quenching/conduction, local diagnostics, authoring validation, accessibility, adaptive music, offline web delivery and native projects are present.

Local run/build/ghost sharing, bounded successful-run recordings and challenge cosmetics/titles are implemented. Region content has one validated catalog with expansion-aware routing and saves; endless milestones combine increasingly difficult rules. The latest complete suites cover 543 unit cases and 71 applicable browser cases (four platform-specific skips); the production offline test also passes. Native exports now use the OS share sheet. The APK described in `native-delivery.md` passed the Android emulator smoke test including export cancellation, archive preferences and process-death save recovery; physical-device testing remains open.

Current work proceeds through full launch content breadth, interaction audits, visual polish, balance, and release preparation. Room-flow tests use direct combat completion to verify transitions. A separate input-only bot reaches real victories, but successful quick runs remain shorter than the intended duration. Neither establishes human win rates, fun, or difficulty balance. Equipment counts include eight six-piece families and two unique legendary items; these are not 50 independently playtested builds. Challenge counts include five milestones per power, not 128 separate game modes.

Sections 103 and 104 have playable implementations and regression coverage. The remaining work is tracked per requirement instead of repeating already-completed prototype phases.

## Vertical slice and native delivery

The one-biome vertical slice includes the required systems and runs offline. Evaluate its human fun and native physics/rendering performance against device requirements before claiming store readiness. Versioned progression saves and migration fixtures are present. Keep the long-term content targets in the design specification; they are not implemented claims.


