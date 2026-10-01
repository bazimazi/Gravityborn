# Development gates

## Completed: first playable prototype

Section 103 scope: responsive movement, four gravity directions, one gravity well, three enemy archetypes, three object types, impact/explosion/projectile combat, feedback, and a testable arena. The repository also includes the specification and the necessary debug and automated verification tools.

## Next gate: external core-fun playtests

Observe players without explaining optimal tactics. Record whether they independently flip gravity to dodge and attack, weaponize objects, redirect shots, and create chains. The authored chamber is intentionally short and can be solved quickly by experienced inputs. Tune handling, threat placement, causal feedback, and readability before adding content. A scripted win proves reachability, not fun or balanced difficulty.

Test on actual low/mid-range Android devices and an iPhone, in portrait and landscape. Check one-handed reach, simultaneous inputs, safe areas, audio resumption, thermal behavior, and 30/60 FPS targets. Browser emulation cannot establish these properties.

## After that gate: second prototype

Add the section 104 systems in order: modular ability definitions, enemy behaviors, procedural authored-room composition, XP and three-choice upgrades, one elite, one boss, and a complete run. Extend tests with seeded generation reachability and run-state persistence before introducing meta progression.

## Vertical slice and native delivery

Reach section 101's one-biome vertical slice only after the core mechanic passes the player test. Evaluate native packaging and physics/rendering performance against measured device requirements before committing to store builds. Add versioned progression saves and migration fixtures before persistent unlocks. Keep the long-term content targets in the design specification; they are not implemented claims.
