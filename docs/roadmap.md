# Development gates

## Completed: first playable prototype

Section 103 scope: responsive movement, four gravity directions, one gravity well, three enemy archetypes, three object types, impact/explosion/projectile combat, feedback, and a testable arena. The repository also includes the specification and the necessary debug and automated verification tools.

## External validation remains open

Observe players without explaining optimal tactics. Record whether they independently flip gravity to dodge and attack, weaponize objects, redirect shots, and create chains. The authored chamber is intentionally short and can be solved quickly by experienced inputs. Tune handling, threat placement, causal feedback, and readability before adding content. A scripted win proves reachability, not fun or balanced difficulty.

Test on actual low/mid-range Android devices and an iPhone, in portrait and landscape. Check one-handed reach, simultaneous inputs, safe areas, audio resumption, thermal behavior, and 30/60 FPS targets. Browser emulation cannot establish these properties.

## Active implementation: full specification

The user has authorized continuing through the full plan while external player and device validation remain open. These checks are tracked separately and do not block repository implementation. `implementation-status.json` tracks all 113 numbered specification sections; partial entries are not completion claims.

Implemented beyond the first prototype: 21 authored physical powers; tagged modifiers and triggers; 13 additional enemy behaviors; eight elite modifiers; authored room composition across eight biome definitions; seeded branching routes; XP choices; 15 relics and four synergies; five bosses; a complete three-region expedition; eight unlockable classes; versioned local progression saves with backup recovery, export/import, and route checkpoints. Automated checks currently cover 106 unit cases and 24 applicable browser cases. The default expedition currently visits the first three biomes; remaining biome access and campaign modes are still in progress.

The next milestone adds 50 craftable equipment designs in six slots, upgrades/affixes/sets, six research trees, seven physics mutations, six authored events, 11 room-wide phenomena, four risk/reward contracts, seven difficulties, and quick/standard/long/campaign/endless/challenge/boss-rush/gauntlet/daily/weekly modes. All eight regions can now be visited through the campaign route or navigation research. The campaign's narrative content is still pending. Unit coverage is now 194 cases; browser coverage is 27 applicable cases.

Current work proceeds through story, codex, mastery/challenges, expanded content, accessibility, offline/native delivery, and release preparation. Existing room-flow tests use direct combat completion to verify transitions; they do not establish player win rates, advertised run durations, or difficulty balance. Equipment counts include eight coherent six-piece families and two unique legendary items; these are not 50 independently playtested builds.

Add the section 104 systems in order: modular ability definitions, enemy behaviors, procedural authored-room composition, XP and three-choice upgrades, one elite, one boss, and a complete run. Extend tests with seeded generation reachability and run-state persistence before introducing meta progression.

## Vertical slice and native delivery

Build section 101's one-biome vertical slice and continue the remaining scope. Evaluate native packaging and physics/rendering performance against measured device requirements before claiming store readiness. Add versioned progression saves and migration fixtures before persistent unlocks. Keep the long-term content targets in the design specification; they are not implemented claims.
