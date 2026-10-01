# Gravityborn architecture

The TypeScript simulation runs in the browser and in Capacitor Android/iOS projects. The browser is the primary automated interaction surface. Android has an emulator-verified debug build; physical-device, iOS build and store-release gates remain external. See `native-delivery.md` and the section-by-section `implementation-status.json` ledger.

`GravitySystem` owns all gravitational acceleration. A normalized global vector combines with radius-indexed local fields, then response and safety caps apply. Matter.js's built-in gravity is disabled. Acceleration multiplied by body mass becomes force, so mass changes collisions without changing free-fall acceleration. Definitions specify material, mass, gravity response, faction, tags, health, and breakability.

Entity gravity response combines a base scale with independent named factors. Phasing contributes zero, each parasite owns a separate factor, and theft removes only its own factor on expiry. This prevents out-of-order restoration from erasing another live effect. Recycled projectiles receive a new generation and reset body properties; timed statuses and lock resistance verify generation before changing them.

`PhysicsWorld` owns the Matter.js engine, body lifecycle, projectile pool, collision facts, and finite-value/velocity limits. It advances at 120 Hz. Incoming velocities are recorded before collision resolution. Physics callbacks record collision facts; gameplay consumes them after the solver finishes. Local fields are indexed by covered spatial cells. Matter.js handles collision broad-phase and rigid body resolution. Both new and sustained contacts produce facts, allowing contact damage to repeat after the player's immunity window.

Balance, entity definitions and derived-stat limits live in `src/data`; enemy and boss behaviors, environment hazards, physical-object fields and run anomalies have separate JSON tuning catalogs. Authored abilities, relics, equipment, classes, rooms and progression content live in `src/content`. Renderers and audio subscribe to typed gameplay events; presentation never determines damage. Seeded runs compose authored chambers, multiwave encounters and branching maps.

Reference APIs: [Matter.Engine](https://brm.io/matter-js/docs/classes/Engine.html), [Matter.Body](https://brm.io/matter-js/docs/classes/Body.html).

## Gameplay and causality

`Game` owns state transitions, AI, ability cooldowns, damage, death, explosions, and run statistics. A gravity change or well creates a chain ID. Impacts propagate that cause to affected bodies. Wells retain their original cause for objects that enter later. Impact damage uses incoming normal speed, interacting mass, and a configurable coefficient; tangential sliding does not count as a high-speed impact. Ordinary unmanipulated settling causes no impact damage, avoiding automatic victories before the player acts. Enemy contact, shots, and explosions remain dangerous.

Explosions are drained from a bounded causal queue after collision processing. Objects are removed before their explosion is processed, so a barrel cannot explode twice. Chain IDs expire, repeated effects are deduplicated, and causal depth is capped. Selecting the already-active gravity direction does not create a new cause. The HUD shows the strongest currently active chain.

The typed event bus also exposes run start/end (including abandonment), power upgrades/evolutions, elite application, boss activation/defeat, resolved collision facts, enemy launches and chain start/extension/end. A launch is recorded once per enemy and causal chain when it exceeds the impact-speed threshold. Chain extensions emit only for distinct accepted effects; expiration and room resets report separate ending reasons. Events persist across world resets without recreating presentation subscriptions.

Player-caused chains of 5, 10 and 20 effects grant a bounded 4–6 second energy-regeneration bonus. Temporary modifiers use simulation-time expiry, survive a same-room build recalculation, and clear on a room reset. Smaller subsequent chains cannot weaken or shorten an active stronger bonus. Environmental/enemy chains do not grant this bonus. The effect strip shows its remaining time; level and XP remain visible in the combat health panel.

The field evaluator supports constant/linear/inverse-square falloff and radial/vortex/directional/zero fields. Powers, bosses, environmental objects and anomalies all use this authority. Field filters match material or entity tags. Burning bodies spread heat through contact; ice quenches them. Broken energy cells and generators discharge through conductive bodies, interrupted by insulating gaps and walls. Material reactions retain causal IDs and have per-frame and depth limits.

`Expedition` owns seeded route transitions, encounters, rewards and run metrics. `RunBuild` owns XP choices, equipped powers, primary-well evolution, relics, equipment, mutations and derived modifiers. `Profile` retains discoveries, research, equipment, classes, challenges and mastery. Breaking a physical rift seal reveals a hidden map route; clearing its optional elite encounter awards rare loot and regional lore. `Tutorial` runs seven manually completed training chambers without altering expedition progression.

`ModifierSet` composes additive, multiplicative and priority override values, tag filters and cooldown-limited event/periodic triggers. Both values and triggers accept conjunctive conditions on health/energy ratios, core speed, stored charge and hostile proximity (240 world units). Missing or nonfinite context fails closed. Unsatisfied conditions do not consume trigger cooldowns. Casts snapshot their conditions before paying energy. Resource ceilings and persistent body properties stay unconditional to avoid recursive thresholds or stale physics properties; the authoring validator enforces this. Conditional relics expose their current conditions in the effect strip alongside shield time and stored charge.

## Presentation and input

`Renderer`, `Feedback`, and `GameAudio` consume simulation state or typed events. They never determine damage. The Canvas renderer uses distinct silhouettes and symbols, a capped pixel ratio, short trails, and bounded pools. Audio is synthesized after a user gesture and voice-limited. The browser loop uses an accumulator, a fixed physics step, and a maximum catch-up interval.

Impact reactions retain at most 64 short-lived deformation records. Entity outlines squash along the collision normal and stretch with speed without modifying rigid-body geometry. Strong collisions can pause the simulation clock for 32 ms, rate-limited to once per 180 ms; the frame accumulator discards paused time instead of catching it up. Reduced motion disables deformation and hit pause; reduced flashing also suppresses core activation/flip pulses. Debug outlines always retain true physics geometry.

`main.ts` connects semantic DOM controls to the simulation. Keyboard movement uses screen coordinates, which remain stable as gravity changes. Pointer capture supports joystick drags. Gravity buttons handle pointer presses so a second simultaneous touch works; keyboard activation remains available. Blur, visibility loss, and pointer cancellation clear movement. Dialogs pause simulation and remember whether it should resume. Portrait presentation follows the player horizontally; short landscape presentation follows vertically. Neither changes world coordinates. Normal desktop aspect ratios show the centered complete room.

`settings.ts` validates and migrates settings. `SaveStore` uses a versioned checksum envelope and backup recovery, with validated profile and route checkpoint readers. Checkpoints resume from room boundaries, not a serialized rigid-body solver. Browser storage and preloaded Capacitor Preferences share a synchronous cache interface; native writes drain in order. Storage failure is reported without preventing play, and future-version records are not overwritten. The generated service worker caches the production shell atomically for offline browser startup.

Local diagnostics record bounded counts, totals, maxima and the latest 300 gameplay events inside the profile save. Players can disable recording, clear it or export a JSON report. Diagnostic exports omit run seeds and account information; no analytics network service is used. Inspector mutations mark expeditions as assisted.

## Content authoring

Add an `AbilityDefinition` to `src/content/abilities.ts` with a stable ID, name, description, rarity, synergy tags, effect, energy/cooldown, radius/strength/duration, target and maximum level. The effect implementation is shared across definitions. Optional parameters configure material/tag filtering, falloff, momentum scaling, planet count, compression, chain length, or field travel speed. Traveling fields update the spatial index and retain one cause across everything they encounter. Optional feedback settings override color, tone frequencies and duration; otherwise tags choose defaults. Field colors inherit the power's feedback color, and directional fields show oriented chevrons. Evolution references point to another authored definition. Mastery objectives, codex entries, inspector selectors and eligible upgrade/shop pools derive from the catalog automatically. Add compatible combinations in the synergy catalog when the mechanic needs one.

Use `npm run validate:content` to check unique IDs, numeric limits, evolution/prerequisite cycles, modifiers/triggers, rewards, equipment sets and biome references. A new effect kind needs a focused gameplay test; a new definition using an existing effect is covered by catalog validation and the per-power finite-simulation test. Use the inspector for interactive review, the seeded expedition bot for input-only reachability, and `npm run benchmark` for host simulation budgets. These checks do not establish human enjoyment or mobile-device performance.

## Safety budgets and limits

- 120 Hz solver; maximum linear velocity 18 Matter units (1080 px/s), angular velocity 0.3 rad/base-frame.
- Maximum acceleration 0.009 px/ms², maximum impulse delta 16 Matter units.
- 220 live bodies, 50 indexed fields, 36 fired projectiles, 200 particle slots.
- Player wells have their own stricter limit and cooldown.
- Fixed substeps, bounded speeds, and thick arena geometry mitigate tunneling. Matter.js does not provide general continuous collision detection here; future thinner geometry or faster objects require new regression tests or a swept collision solution.
- Physics reproducibility is suitable for local tests, not cross-platform lockstep determinism.

The benchmark isolates simulation cost on the host CPU. It does not establish phone GPU/frame-time performance. See the milestone review for measured results.
