# Physics prototype architecture

The first milestone implements the specification's section 103. The browser is the initial test surface; native Android/iOS packaging is a later milestone.

`GravitySystem` owns all gravitational acceleration. A normalized global vector combines with radius-indexed local fields, then response and safety caps apply. Matter.js's built-in gravity is disabled. Acceleration multiplied by body mass becomes force, so mass changes collisions without changing free-fall acceleration. Definitions specify material, mass, gravity response, faction, tags, health, and breakability.

`PhysicsWorld` owns the Matter.js engine, body lifecycle, projectile pool, collision facts, and finite-value/velocity limits. It advances at 120 Hz. Incoming velocities are recorded before collision resolution. Physics callbacks record collision facts; gameplay consumes them after the solver finishes. Local fields are indexed by covered spatial cells. Matter.js handles collision broad-phase and rigid body resolution. Both new and sustained contacts produce facts, allowing contact damage to repeat after the player's immunity window.

Balance and entity content live in `src/data`. Renderers and audio subscribe to typed gameplay events; presentation never determines damage. Seeded procedural runs, progression, and save data are deliberately deferred until the physics fun test succeeds.

Reference APIs: [Matter.Engine](https://brm.io/matter-js/docs/classes/Engine.html), [Matter.Body](https://brm.io/matter-js/docs/classes/Body.html).

## Gameplay and causality

`Game` owns state transitions, AI, ability cooldowns, damage, death, explosions, and run statistics. A gravity change or well creates a chain ID. Impacts propagate that cause to affected bodies. Wells retain their original cause for objects that enter later. Impact damage uses incoming normal speed, interacting mass, and a configurable coefficient; tangential sliding does not count as a high-speed impact. Ordinary unmanipulated settling causes no impact damage, avoiding automatic victories before the player acts. Enemy contact, shots, and explosions remain dangerous.

Explosions are drained from a bounded causal queue after collision processing. Objects are removed before their explosion is processed, so a barrel cannot explode twice. Chain IDs expire, repeated effects are deduplicated, and causal depth is capped. Selecting the already-active gravity direction does not create a new cause. The HUD shows the strongest currently active chain.

The field evaluator supports constant/linear/inverse-square falloff and radial/tangential/directional fields; only directional gravity and a radial well are exposed to players. Add abilities through this authority rather than another force implementation.

## Presentation and input

`Renderer`, `Feedback`, and `GameAudio` consume simulation state or typed events. They never determine damage. The Canvas renderer uses distinct silhouettes and symbols, a capped pixel ratio, short trails, and bounded pools. Audio is synthesized after a user gesture and voice-limited. The browser loop uses an accumulator, a fixed physics step, and a maximum catch-up interval.

`main.ts` connects semantic DOM controls to the simulation. Keyboard movement uses screen coordinates, which remain stable as gravity changes. Pointer capture supports joystick drags. Gravity buttons handle pointer presses so a second simultaneous touch works; keyboard activation remains available. Blur, visibility loss, and pointer cancellation clear movement. Dialogs pause simulation and remember whether it should resume. Portrait presentation follows the player horizontally; short landscape presentation follows vertically. Neither changes world coordinates. Normal desktop aspect ratios show the centered complete room.

`settings.ts` validates, migrates, and stores only settings. Storage failure falls back to defaults without stopping play. Future-version records are never overwritten by this build. No progression schema exists yet.

## Safety budgets and limits

- 120 Hz solver; maximum linear velocity 18 Matter units (1080 px/s), angular velocity 0.3 rad/base-frame.
- Maximum acceleration 0.009 px/ms², maximum impulse delta 16 Matter units.
- 220 live bodies, 50 indexed fields, 36 fired projectiles, 200 particle slots.
- Player wells have their own stricter limit and cooldown.
- Fixed substeps, bounded speeds, and thick arena geometry mitigate tunneling. Matter.js does not provide general continuous collision detection here; future thinner geometry or faster objects require new regression tests or a swept collision solution.
- Physics reproducibility is suitable for local tests, not cross-platform lockstep determinism.

The benchmark isolates simulation cost on the host CPU. It does not establish phone GPU/frame-time performance. See the milestone review for measured results.
