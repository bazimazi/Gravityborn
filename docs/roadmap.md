# Development gates

## Completed: first playable prototype

Section 103 scope: responsive movement, four gravity directions, one gravity well, three enemy archetypes, three object types, impact/explosion/projectile combat, feedback, and a testable arena. The repository also includes the specification and the necessary debug and automated verification tools.

## External validation remains open

Observe players without explaining optimal tactics. Record whether they independently flip gravity to dodge and attack, weaponize objects, redirect shots, and create chains. The authored chamber is intentionally short and can be solved quickly by experienced inputs. Tune handling, threat placement, causal feedback, and readability before adding content. A scripted win proves reachability, not fun or balanced difficulty.

Test on actual low/mid-range Android devices and an iPhone, in portrait and landscape. Check one-handed reach, simultaneous inputs, safe areas, audio resumption, thermal behavior, and 30/60 FPS targets. Browser emulation cannot establish these properties.

## Active implementation: full specification

The user has authorized continuing through the full plan while external player and device validation remain open. These checks are tracked separately and do not block repository implementation. `implementation-status.json` tracks all 113 numbered specification sections; partial entries are not completion claims.

Implemented beyond the first prototype: 100 authored physical powers and four primary-well stages; conditional/tagged modifiers and triggers; 22 additional enemy behaviors; 99 curated elite variants; authored multiwave rooms across nine biomes; seeded branching routes; physical XP and shards; 100 relics and twelve synergies; ten bosses; ten classes; versioned saves with backup recovery, export/import, and route checkpoints.

The game also includes 50 equipment designs in six slots, upgrades/affixes/sets, six research trees, nine mutations, ten events, 11 phenomena, four contracts, seven difficulties, and eleven run modes. All nine regions are accessible, with five story acts, a codex, ability mastery and 518 challenges. Shops implement seven purchase categories. Seven playable training lessons teach movement, direction changes, obstacle navigation, weaponized impact, object manipulation, wells and chain reactions. Hidden vaults, material fire/quenching/conduction, local diagnostics, authoring validation, accessibility, adaptive music, offline web delivery and native projects are present.

Local run/build/ghost sharing, bounded successful-run recordings and challenge cosmetics/titles are implemented. Region content has one validated catalog with expansion-aware routing and saves; endless milestones combine increasingly difficult rules. Control powers have achievable intervention-based mastery objectives, and acquisition offers require compatible learned construct sources. Responsive arena, intro and training layouts fit seven tested viewport sizes. Phone/tablet controls retain 44-pixel touch targets, four-sided safe-area padding passes simulated portrait/landscape checks, and temporary core effects show remaining durations. Compact power descriptions and the full current HUD-effect list remain available in a pause-aware dialog. Stale or duplicate upgrade offers refresh without spending banked upgrades or rerolls, including saved maximum-level well cards. Full-catalog builds retain every paired power level through archive reload and sharing. Endless route flags stay separate from permanent discoveries; migration recovers older large discovery lists and the currently revealed vault without resetting progression. Current verification covers 679 unit cases and 154 applicable browser cases (five platform-specific skips); the production offline test also passes. Native exports use the OS share sheet. The version and limitations of Android emulator validation are recorded in `native-delivery.md`; physical-device testing remains open.

Launch catalog breadth is implemented. Current work covers interaction audits, visual polish, balance, and release preparation. Room-flow tests use direct combat completion to verify transitions. A separate input-only bot reaches quick, standard and earned-progression campaign victories, but its fast decisions do not establish the specified human run duration. Neither establishes human win rates, fun, or difficulty balance. Equipment counts include eight six-piece families and two unique legendary items; these are not 50 independently playtested builds. Challenge counts include five milestones per power plus eighteen other challenges. See `release-review.md` for the current milestone evidence and open gates.

Sections 103 and 104 have playable implementations and regression coverage. The remaining work is tracked per requirement instead of repeating already-completed prototype phases.

## Vertical slice and native delivery

The one-biome vertical slice includes the required systems and runs offline. Evaluate its human fun and native physics/rendering performance against device requirements before claiming store readiness. Versioned progression saves and migration fixtures are present. The launch content counts are now implemented; the future online services and human/device outcomes in the specification remain separate gates.


