# Gravityborn
## Comprehensive Game Design & Implementation Specification

**Working title:** Gravityborn  
**Genre:** Physics Action Roguelite / Arena Combat / Exploration  
**Platform:** Mobile-first, Android + iOS  
**Core fantasy:** *Control gravity itself and turn the entire battlefield into a weapon.*

---

# 1. Product Vision

Build **Gravityborn**, a mobile-first physics action roguelite where the player's primary ability is manipulating gravity.

The player controls a small physics-based character inside arenas and environments populated by enemies, projectiles, hazards, objects, environmental structures, and gravitational phenomena.

There is deliberately no conventional separation between:

- movement
- attacking
- dodging
- crowd control
- traversal
- environmental interaction
- puzzle solving

All of these should emerge from **gravity manipulation**.

The core fantasy is:

> **"I don't attack enemies. I manipulate the battlefield until physics kills them for me."**

A successful player should eventually perform chains such as:

```text
Reverse gravity
    ↓
Enemy rises
    ↓
Enemy collides with explosive barrel
    ↓
Explosion launches barrel
    ↓
Barrel hits another enemy
    ↓
Enemy projectile gets redirected
    ↓
Projectile destroys a gravity crystal
    ↓
Crystal creates a gravity well
    ↓
Entire enemy group gets pulled together
    ↓
Player collapses the well
    ↓
Massive gravitational explosion
```

The game should constantly create moments where the player thinks:

> "I didn't know I could do that."

---

# 2. Design Pillars

Everything implemented must reinforce these pillars.

## Pillar 1 — Gravity Is the Weapon

Gravity manipulation must remain the defining mechanic.

Do not gradually turn the game into a conventional shooter with gravity as a secondary gimmick.

Every major combat system should interact with gravity.

---

## Pillar 2 — Physics Creates Emergent Combat

Prefer systems that interact naturally over heavily scripted attacks.

Examples:

- enemies collide with each other
- projectiles have mass
- objects can be pushed
- objects can be pulled
- explosive objects can be redirected
- enemies can be crushed
- enemies can be launched
- gravity wells can bend trajectories
- objects can orbit planets
- environmental hazards can become weapons

The player should be able to discover combinations that were not explicitly authored as individual attacks.

---

## Pillar 3 — Easy Controls, Deep Mastery

The controls must be extremely easy to understand.

The depth should come from:

- timing
- positioning
- gravity direction
- gravity strength
- ability combinations
- environmental awareness
- build construction
- physics manipulation

Not from having 20 buttons.

---

## Pillar 4 — Every Run Should Create a Story

A run should not feel like:

> enter arena → kill enemies → receive XP → repeat

Instead:

> enter environment → discover a dangerous physics situation → improvise → manipulate gravity → create a chain reaction → become stronger → encounter increasingly strange gravitational phenomena → die or complete the expedition → bring discoveries home

---

## Pillar 5 — Extremely Long Progression

The game must be designed from the beginning to support years of content expansion.

Systems must support adding:

- new gravity powers
- new relics
- new classes
- new enemies
- new planets
- new environments
- new bosses
- new modifiers
- new challenges
- new gravitational phenomena
- new progression branches
- new discoveries
- new build archetypes

without rewriting the core architecture.

---

# 3. Core Gameplay Loop

The fundamental loop:

```text
Prepare
 ↓
Enter Expedition
 ↓
Explore
 ↓
Fight
 ↓
Manipulate Gravity
 ↓
Collect Resources
 ↓
Level Up
 ↓
Choose Upgrades
 ↓
Build Synergy
 ↓
Encounter Events
 ↓
Fight Elite
 ↓
Discover New Physics
 ↓
Boss
 ↓
Extract / Die
 ↓
Permanent Progression
 ↓
Unlock New Content
 ↓
Prepare Again
```

The game should have three simultaneous progression scales.

## Micro loop

Seconds:

```text
Move
→ manipulate gravity
→ dodge
→ collide
→ launch
→ destroy
→ collect
→ reposition
```

## Run loop

5–30+ minutes:

```text
Explore
→ acquire powers
→ construct build
→ overcome encounters
→ discover events
→ fight elites
→ defeat boss
```

## Meta loop

Days/weeks/months:

```text
Unlock
→ experiment
→ master
→ discover
→ upgrade
→ complete challenges
→ unlock new systems
→ create new builds
```

---

# 4. Player Controller

The player is a small physics-driven entity.

Possible visual forms:

- energy orb
- tiny astronaut
- artificial lifeform
- gravitational creature
- armored core

The exact appearance should remain simple enough that physics remains visually readable.

The player must feel:

- responsive
- lightweight
- controllable
- physical
- predictable

Avoid sluggish physics that make controls feel unreliable.

---

# 5. Primary Controls

Mobile controls should use a minimal interface.

## Recommended control scheme

### Movement

Virtual joystick.

The joystick controls movement relative to the current gravitational environment.

### Gravity Direction

Four primary buttons:

```text
        ↑

←               →

        ↓
```

Pressing one immediately changes the player's gravity direction.

Alternative gesture:

- swipe direction to rotate gravity

Support both eventually.

---

# 6. Gravity System Architecture

Do NOT hard-code gravity as four special cases.

Implement gravity as a generalized vector field.

Example conceptual model:

```text
GravityField
{
    Vector2 direction;
    float strength;
    float radius;
    FalloffType falloff;
    SourceType source;
}
```

Gravity sources may include:

- global gravity
- directional gravity
- gravity wells
- planets
- black holes
- gravity crystals
- enemies
- projectiles
- equipment
- player abilities
- temporary effects

The physics system should be capable of combining multiple gravitational influences.

---

# 7. Gravity Modes

Start with:

### Directional Gravity

```text
↑
↓
←
→
```

Then introduce:

### Rotational Gravity

Gravity continuously rotates.

Example:

```text
↑ → ↓ → ← → ↑
```

### Radial Gravity

Objects are attracted toward a point.

### Repulsive Gravity

Objects are pushed away from a point.

### Orbital Gravity

Objects naturally orbit a gravitational source.

### Zero Gravity

Gravity becomes zero.

### Reversed Gravity

Gravity becomes opposite to the normal field.

### Gravity Wells

Localized high-strength gravitational regions.

### Gravity Vortex

Rotating gravitational field.

### Gravity Wave

A moving gravitational pulse.

### Gravity Anchor

Locks objects to a gravitational point.

### Gravity Chain

Transfers gravity from one object to another.

---

# 8. Advanced Gravity Abilities

Implement abilities as modular systems.

Initial abilities:

## Gravity Flip

Instantly rotate global gravity.

## Gravity Pulse

Create a short radial gravitational shockwave.

## Gravity Well

Create a temporary attraction point.

## Gravity Repulsor

Push everything away from a point.

## Gravity Lock

Freeze an object's gravitational state.

## Gravity Vacuum

Pull nearby objects toward the player.

## Gravity Slingshot

Launch the player using a gravity source.

## Gravity Theft

Steal gravitational force from an enemy and temporarily gain it.

## Gravity Transfer

Move gravity from one target to another.

## Gravity Beam

Create a directional gravitational force.

## Gravity Collapse

Compress objects toward a central point.

## Gravity Burst

Release stored gravitational energy.

## Micro Planet

Spawn a miniature planet with its own gravitational field.

## Black Hole

Create an extremely powerful temporary gravitational source.

## Gravity Rift

Create a region where gravity behaves differently.

---

# 9. Physics Interaction System

Every important physics object should expose common properties.

```text
Mass
Velocity
AngularVelocity
Material
GravityResponse
CollisionResponse
DamageResponse
Breakability
Explosive
Pushable
Pullable
Orbitable
Magnetic
Element
Faction
```

Objects should be composable.

Examples:

```text
Explosive Barrel
+ high mass
+ breakable
+ explosive
```

```text
Gravity Crystal
+ massive
+ gravity source
+ destructible
```

```text
Metal Projectile
+ low mass
+ high velocity
+ redirectable
```

This allows emergent combinations without creating thousands of bespoke systems.

---

# 10. Combat Philosophy

Combat should be based around **force manipulation**, not conventional attacks.

The player can defeat an enemy by:

- crushing it
- launching it
- slamming it into walls
- throwing objects at it
- causing enemies to collide
- redirecting projectiles
- dropping objects on it
- pulling it into hazards
- throwing it into gravity wells
- forcing it into orbit
- removing gravity beneath it
- stealing its gravity
- reflecting its own attacks

---

# 11. Damage Types

Introduce several damage concepts.

### Impact

Physical collision.

### Crush

Extreme force against an obstacle.

### Velocity

Damage proportional to collision speed.

### Gravity

Damage caused directly by gravitational manipulation.

### Environmental

Lava, spikes, electricity, explosions, etc.

### Orbital

Damage caused by high-speed circular movement.

### Compression

Damage caused by gravitational collapse.

### Void

Damage caused by black holes / gravity rifts.

This creates different build archetypes.

---

# 12. Physics-Based Damage

Do not simply use:

```text
damage = weaponDamage
```

Use contextual formulas.

Conceptually:

```text
impactDamage =
    mass
    × velocity
    × collisionCoefficient
    × attackerModifiers
    × targetModifiers
```

This makes:

> "How hard can I launch this enemy?"

a meaningful gameplay question.

---

# 13. Enemy Design

Enemies must be designed around physics interactions.

Do not create generic enemies that merely walk toward the player.

Examples:

## Gravity Slime

Creates localized gravity wells.

## Anchor

Cannot move but generates extreme gravity.

## Floaters

Become dangerous when gravity changes.

## Bomb Carrier

Carries an explosive object.

## Projectile Drone

Fires projectiles that can be redirected.

## Gravity Leech

Steals the player's current gravity strength.

## Mass Golem

Extremely heavy and difficult to move.

## Orbiter

Circles gravity sources.

## Repulsor

Pushes objects away.

## Swarm

Weak individually but dangerous collectively.

## Phase Enemy

Temporarily ignores gravity.

## Singularity

Creates a miniature black hole.

## Mirror

Reflects gravity effects.

## Gravity Parasite

Attaches to other enemies and changes their gravitational behavior.

---

# 14. Enemy Archetypes

Build enemies around behaviors rather than raw stats.

Categories:

- Chaser
- Shooter
- Tank
- Swarm
- Controller
- Gravity Manipulator
- Environmental
- Explosive
- Support
- Summoner
- Assassin
- Physics-resistant
- Physics-amplifying

Every category should have enemies with distinct interactions with the gravity system.

---

# 15. Elite Enemies

Elite enemies modify the physics rules.

Examples:

### Heavy

Mass ×5.

### Inverted

Affected by opposite gravity.

### Orbital

Automatically circles the player.

### Unstable

Explodes when thrown.

### Gravity Vampire

Absorbs nearby gravity wells.

### Reflector

Reflects gravitational abilities.

### Anchor

Cannot be displaced but generates gravity.

### Singularity Core

Attracts everything nearby.

Elite modifiers should create new tactical problems rather than simply increasing HP.

---

# 16. Boss Philosophy

Bosses should fundamentally alter the gravity system.

Avoid:

> giant enemy with 10× HP.

Instead:

## Boss Example — The Planet Eater

Creates multiple gravitational bodies.

The arena contains:

```text
Planet A
Planet B
Planet C
Boss
Player
```

The player must navigate changing gravitational fields.

---

## Boss Example — The Inverter

Continuously changes gravity direction.

---

## Boss Example — The Singularity

Gradually collapses the arena toward itself.

---

## Boss Example — The Architect

Builds temporary walls and gravity structures.

---

## Boss Example — The Star

Constantly emits gravitational waves.

---

# 17. Arena Design

Arenas are gameplay systems, not backgrounds.

Every arena should contain combinations of:

- walls
- platforms
- hazards
- breakable objects
- gravity sources
- explosive objects
- movable objects
- environmental traps
- resources
- shortcuts
- secret areas

---

# 18. Arena Types

## Ruined Facility

Mechanical objects and gravity machinery.

## Crystal Caverns

Natural gravity crystals.

## Dead Planet

Planetary gravitational fields.

## Orbital Station

Rotating environments.

## Black Hole Interior

Extreme gravity.

## Gravity Laboratory

Experimental physics.

## Floating Islands

Separated gravitational platforms.

## Collapsing Dimension

Arena geometry changes during the run.

---

# 19. Procedural Level Generation

Use modular generation.

A run should consist of interconnected rooms.

Possible room types:

```text
Combat
Elite
Treasure
Shop
Event
Challenge
Puzzle
Rest
Boss
Secret
```

Generate:

```text
Start
 ↓
Combat
 ↓
Combat / Event
 ↓
Choice
 ↙       ↘
Elite     Treasure
 ↓          ↓
Combat     Combat
 ↘        ↙
Boss
```

Do not make procedural generation completely random.

Use authored room templates with procedural composition.

This provides controlled quality.

---

# 20. Exploration

Exploration should matter.

Allow players to discover:

- hidden rooms
- alternate paths
- secret gravity chambers
- rare relics
- lore
- challenges
- powerful optional enemies
- gravitational anomalies

The player should sometimes choose:

> safe route

versus

> dangerous route with potentially enormous reward.

---

# 21. Run Structure

Target initial run duration:

### Early game

10–15 minutes.

### Established game

15–25 minutes.

### Advanced/endgame

20–40+ minutes.

Do not force every run to have the same duration.

Eventually unlock:

- Quick Run
- Standard Expedition
- Long Expedition
- Endless
- Challenge
- Boss Rush
- Gauntlet

---

# 22. Run Progression

During a run, players acquire:

- XP
- temporary abilities
- relics
- equipment
- currencies
- mutations
- gravitational energy
- discoveries

At level-up:

```text
Choose 1 of 3
```

Possible choices:

- new ability
- ability upgrade
- passive
- stat modification
- relic
- mutation
- gravity modification

---

# 23. Build System

Builds should create recognizable archetypes.

Examples:

### Singularity Build

Gravity wells + black holes + compression.

### Momentum Build

Velocity + impact + slingshots.

### Orbital Build

Planets + orbit + rotational gravity.

### Void Build

Zero gravity + gravity rifts + black holes.

### Crush Build

Mass + gravity strength + collision damage.

### Control Build

Pull + push + immobilization.

### Projectile Build

Redirected projectiles + velocity + reflection.

### Chaos Build

Random gravity changes + unstable objects + chain reactions.

---

# 24. Ability Evolution

Abilities should evolve.

Example:

```text
Gravity Well
    ↓
Improved Gravity Well
    ↓
Dual Gravity Well
    ↓
Black Hole
```

Another:

```text
Gravity Pulse
    ↓
Wide Pulse
    ↓
Repulsive Pulse
    ↓
Gravity Nova
```

Another:

```text
Micro Planet
    ↓
Twin Planets
    ↓
Binary System
    ↓
Miniature Solar System
```

Evolutions should produce dramatic gameplay changes.

---

# 25. Ability Synergies

Implement a generic synergy system.

Example:

```text
Gravity Well + Explosive Objects
= Explosion Vacuum
```

```text
Gravity Well + Lightning
= Lightning Orbital Field
```

```text
Zero Gravity + Projectile
= Projectile Storm
```

```text
Micro Planet + Enemy
= Orbital Prison
```

```text
Gravity Theft + Gravity Pulse
= Gravitational Overload
```

The system should allow future content to define new synergies through data.

---

# 26. Relic System

Relics modify rules rather than simply adding +10% damage.

Examples:

### Heavy Heart

Increase mass dramatically.

### Feather Core

Reduce mass to almost zero.

### Hungry Singularity

Gravity wells last longer.

### Broken Compass

Gravity directions are randomized, but gravity abilities become stronger.

### Orbital Crown

Objects near the player begin orbiting.

### Gravity Battery

Store unused gravitational force.

### Echo Core

Gravity abilities trigger twice.

### Newton's Revenge

High-speed collisions deal enormous damage.

---

# 27. Equipment

Equipment provides longer-term build identity.

Suggested slots:

```text
Core
Shell
Gravity Module
Movement Module
Artifact
Utility
```

Equipment should have:

- rarity
- stats
- special effects
- upgrade levels
- possible affixes
- set interactions

Avoid making equipment purely vertical power.

Create meaningful trade-offs.

Example:

```text
+100% gravity strength
-40% movement acceleration
```

---

# 28. Character Classes

Classes should fundamentally alter how gravity works.

## The Manipulator

General-purpose gravity specialist.

## The Massborn

Extremely heavy.

Focus:

- crushing
- collision
- impact

## The Voidwalker

Low mass and zero-gravity mechanics.

## The Orbiter

Uses planets and orbital mechanics.

## The Singularity

Creates powerful gravity wells but has limited mobility.

## The Trickster

Randomized gravity effects with enormous upside.

## The Engineer

Deploys gravity machines.

## The Parasite

Steals gravity from enemies.

Classes should create radically different runs.

---

# 29. Permanent Progression

Death should never feel completely wasted.

Possible permanent currencies:

### Gravity Shards

General progression.

### Cores

Ability unlocks.

### Research

Unlocks systems.

### Relic Dust

Equipment upgrades.

### Knowledge

Unlocks new discoveries.

Avoid excessive currency fragmentation early.

Start with 2–3 currencies and introduce more only when they have a clear purpose.

---

# 30. Meta Progression Trees

Create several long-term progression categories.

## Gravity Mastery

Unlock new gravity mechanics.

## Survivor

Health, mobility and defensive options.

## Research

Unlock new content pools.

## Technology

Equipment and utility.

## Discovery

New planets, anomalies and environments.

## Mastery

Challenge-based unlocks.

Permanent upgrades should not simply make the player overwhelmingly stronger.

Prioritize:

- new mechanics
- new choices
- new build possibilities
- quality-of-life improvements
- modest numerical progression

This keeps player skill relevant.

---

# 31. Mutation System

Introduce permanent mutations later in progression.

Mutations alter fundamental physics.

Examples:

### Dense Core

Higher mass.

### Light Core

Lower mass.

### Dual Gravity

Two gravity sources can coexist.

### Instability

Gravity abilities become stronger but less predictable.

### Echo Gravity

Gravity changes leave temporary afterimages.

### Gravitational Metabolism

Taking damage generates gravity energy.

### Event Horizon

Low-health state creates a gravity field.

Mutations should create new playstyles.

---

# 32. Planet System

Eventually unlock collectible planets.

Each planet has:

- mass
- radius
- gravity
- atmosphere
- special property
- biome
- enemies
- resources
- anomalies
- boss

Planets can become part of the player's long-term collection.

---

# 33. Gravitational Phenomena

Create rare world events.

Examples:

### Gravity Storm

Gravity direction changes rapidly.

### Planetary Collision

Two planets approach each other.

### Singularity

A temporary black hole appears.

### Gravity Rain

Gravity pulses fall across the arena.

### Zero-G Zone

A region loses gravity.

### Reverse World

Everything is inverted.

### Orbital Collapse

All nearby objects begin orbiting one point.

### Gravity Rift

Two conflicting gravity fields overlap.

These events create memorable runs.

---

# 34. Environmental Objects

Build a reusable object framework.

Object categories:

- explosive
- heavy
- fragile
- magnetic
- elastic
- conductive
- flammable
- gravitational
- bouncy
- breakable
- movable
- orbitable

Examples:

```text
Barrel
Crate
Rock
Crystal
Mine
Generator
Gravity Core
Metal Plate
Explosive Container
Energy Cell
Planet Fragment
```

---

# 35. Physics Materials

Materials should affect interaction.

Examples:

### Metal

Heavy, durable.

### Rubber

Highly elastic.

### Crystal

Generates gravity.

### Plasma

High energy.

### Ice

Low friction.

### Stone

Heavy and stable.

### Void Matter

Almost massless.

### Gravity Matter

Strong gravitational response.

---

# 36. Resource Collection

Resources should be affected by gravity too.

Instead of simply walking over XP:

```text
Gravity Vacuum
```

could pull resources toward the player.

A player might manipulate gravity to collect resources across dangerous terrain.

This makes even the economy participate in the core mechanic.

---

# 37. Shops

During runs, shops can appear.

Possible purchases:

- ability
- relic
- equipment
- healing
- reroll
- gravity charge
- temporary mutation

Shop inventory should interact with the current build.

---

# 38. Risk / Reward

Introduce optional gravitational contracts.

Examples:

```text
+50% rewards
Gravity strength changes every 10 seconds.
```

```text
+100% rewards
No directional gravity control.
```

```text
+200% rewards
Enemies become extremely heavy.
```

```text
+300% rewards
Every collision creates a gravity pulse.
```

This produces high-level challenge content.

---

# 39. Challenge System

Permanent challenges should encourage experimentation.

Examples:

- Kill 100 enemies using collisions.
- Defeat a boss without direct damage.
- Kill 10 enemies with one gravity well.
- Survive 5 minutes in zero gravity.
- Destroy an elite using its own projectile.
- Finish a run using only orbital damage.
- Kill a boss using environmental objects.
- Create a chain reaction involving 20 objects.

Rewards:

- cosmetics
- relics
- mutations
- abilities
- lore
- titles

---

# 40. Mastery System

Every ability should have mastery objectives.

Example:

## Gravity Well Mastery

```text
Level 1
Create 50 gravity wells.

Level 2
Kill 100 enemies using gravity wells.

Level 3
Kill an elite with a gravity well.

Level 4
Kill 10 enemies with one well.

Level 5
Complete a run using gravity wells as primary damage.
```

Mastery should encourage learning rather than grinding meaningless numbers.

---

# 41. Endless Mode

Endless should eventually become a major endgame system.

Difficulty continuously escalates.

Introduce increasingly absurd physics:

```text
Stage 1
Normal gravity

Stage 10
Multiple gravity fields

Stage 20
Rotating gravity

Stage 30
Gravity inversion

Stage 40
Zero-G zones

Stage 50
Black holes

Stage 100
Multiple planets

Stage 200
Gravity storms

Stage 500
Reality instability
```

The objective becomes:

> How far can your build survive?

---

# 42. Infinite Build Scaling

The endgame must continue beyond completing the main content.

Implement systems such as:

- difficulty tiers
- ascension levels
- challenge modifiers
- endless scaling
- randomized anomalies
- mastery
- procedural expeditions
- leaderboards
- seasonal challenges

Do not make the endgame dependent only on:

```text
Enemy HP × 2
```

Add new rules.

---

# 43. Difficulty System

Create multiple difficulty layers.

Example:

```text
Normal
Veteran
Expert
Master
Chaos
Singularity
Infinite
```

Higher levels introduce:

- new enemy behaviors
- environmental modifiers
- gravity instability
- stronger elites
- additional hazards
- reduced resources
- new boss mechanics

---

# 44. Camera

Use a top-down or slightly angled 2D/2.5D camera.

The camera must clearly communicate:

- gravity direction
- player position
- enemy positions
- projectile trajectories
- gravity wells
- dangerous zones
- interactive objects

Avoid visual clutter.

Physics readability is more important than visual complexity.

---

# 45. Visual Direction

Simple graphics are acceptable.

Prioritize:

- excellent animation
- strong particles
- readable silhouettes
- satisfying impacts
- gravitational distortion
- trails
- screen shake
- hit reactions
- squash/stretch
- motion blur where appropriate
- clean UI

A simple object moving beautifully can feel better than a detailed object with weak animation.

---

# 46. Gravity Visual Language

Every gravity effect must have a clear visual identity.

Directional gravity:

- directional particles
- subtle arrows
- environmental debris movement

Gravity well:

- curved particles
- distortion
- orbital trails

Black hole:

- dark core
- gravitational lensing
- orbiting particles

Gravity pulse:

- expanding ring

Gravity inversion:

- brief screen/environmental flip

Zero gravity:

- floating debris

The player should understand physics states almost instantly.

---

# 47. Animation

Prioritize animation quality over polygon/detail count.

Player:

- movement
- acceleration
- gravity flip
- landing
- launch
- impact
- damage
- death
- ability activation

Enemies:

- hit reaction
- launch
- crush
- spin
- explosion
- death
- gravity resistance

Environmental objects:

- wobble
- break
- bounce
- spin
- accelerate
- orbit

---

# 48. Juice System

Create a centralized feedback system.

Every significant action can trigger combinations of:

- particles
- sound
- camera shake
- hit pause
- trails
- screen effects
- floating numbers
- physics reactions
- controller vibration

Example:

```text
High velocity collision
→ impact sound
→ particles
→ short hit pause
→ camera shake
→ target deformation
→ debris
→ secondary collision
```

Chain reactions should become increasingly spectacular.

---

# 49. Chain Reaction System

This is one of the game's signature systems.

Track causal chains.

Example:

```text
Player
 ↓
Gravity Pulse
 ↓
Enemy A
 ↓
Barrel
 ↓
Explosion
 ↓
Enemy B
 ↓
Projectile
 ↓
Enemy C
```

Display a subtle chain indicator.

Longer chains should provide:

- bonus score
- bonus resources
- temporary buffs
- achievements
- mastery progress

This rewards creative physics.

---

# 50. "Impossible Kill" Moments

The game should deliberately create opportunities for absurd kills.

Examples:

- projectile → wall → enemy
- enemy → enemy → explosion
- gravity well → barrel → boss
- planet → enemy → asteroid
- boss projectile → gravity well → boss
- enemy → orbit → enemy swarm
- falling object → gravity reversal → second falling object

These moments should be memorable and shareable.

---

# 51. Run Events

Random events:

### Strange Merchant

Offers bizarre gravity relics.

### Gravity Scientist

Allows experimental modifications.

### Lost Explorer

Offers a choice between reward and danger.

### Ancient Machine

Changes the rules of gravity.

### Black Hole

Consume a resource for a powerful permanent run modifier.

### Broken Planet

Explore for rare materials.

### Gravity Arena

Optional combat challenge.

---

# 52. Narrative

The story should explain why gravity is manipulable.

Possible premise:

The universe contains an ancient gravitational force called:

**The Weight.**

Civilizations discovered how to manipulate it.

The player is a newly awakened Gravityborn.

The deeper story should reveal:

- ancient civilizations
- failed experiments
- artificial planets
- gravitational weapons
- cosmic anomalies
- the origin of gravity manipulation
- what exists beyond the universe

Avoid dumping lore through walls of text.

Use:

- environmental storytelling
- short conversations
- discoveries
- journals
- visual events
- boss introductions
- collectible memories

---

# 53. Story Structure

Organize story into major arcs.

Example:

## Act I — Awakening

Learn basic gravity manipulation.

## Act II — The Machines

Discover civilizations that engineered gravity.

## Act III — The Broken Worlds

Discover artificial planets.

## Act IV — The Singularity

Discover black-hole technology.

## Act V — Beyond Weight

Discover the fundamental origin of gravity.

## Endgame

The story does not simply stop.

Instead, the player discovers an infinite gravitational frontier.

---

# 54. Codex

Create a comprehensive in-game Codex.

Sections:

- Enemies
- Bosses
- Abilities
- Relics
- Equipment
- Planets
- Materials
- Gravity Phenomena
- Discoveries
- Lore
- Challenges

Every discovered object should be recorded.

---

# 55. Collection

Players should have a long-term collection.

Track:

```text
Abilities discovered
Relics discovered
Equipment discovered
Enemies discovered
Bosses defeated
Planets discovered
Phenomena discovered
Challenges completed
Masteries completed
Lore discovered
```

Collection should unlock additional gameplay, not merely function as a checklist.

---

# 56. Daily / Rotating Content

Eventually add:

## Daily Gravity Challenge

Everyone receives the same:

- character
- gravity rules
- seed
- modifiers

Players compete for score.

## Weekly Anomaly

A special physics rule.

Examples:

```text
Gravity constantly rotates.
```

```text
All objects have 10× mass.
```

```text
Everything bounces.
```

```text
Zero gravity except near planets.
```

---

# 57. Leaderboards

Potential leaderboard categories:

- highest endless depth
- highest chain
- fastest boss kill
- highest score
- longest survival
- challenge completion

Leaderboards should be introduced only after the core game is stable.

---

# 58. Social Features

Potential future features:

- share builds
- share runs
- challenge codes
- ghost replays
- leaderboard replays
- daily challenges

Avoid requiring multiplayer for the core game.

---

# 59. Ghost System

Later, allow players to record successful runs.

Ghosts can be used for:

- competing against previous runs
- learning routes
- challenge sharing
- speedrunning

---

# 60. Seeded Runs

Allow deterministic run seeds.

Example:

```text
GRAVITY-8F4A2C
```

Same seed produces:

- same rooms
- same enemy distribution
- same relic offers
- same events

This enables:

- community challenges
- competitive runs
- debugging
- reproducible bug reports

---

# 61. Procedural Content Architecture

Do not hard-code procedural content.

Use data-driven definitions.

Example conceptual structure:

```text
AbilityDefinition
{
    id
    name
    description
    rarity
    tags[]
    parameters
    effects[]
    synergies[]
}
```

Likewise:

```text
EnemyDefinition
RoomDefinition
RelicDefinition
EquipmentDefinition
BossDefinition
EventDefinition
PlanetDefinition
ChallengeDefinition
```

This allows the game to expand without modifying core systems.

---

# 62. Tag System

Implement a universal tag system.

Examples:

```text
Gravity
Void
Impact
Orbit
Mass
Projectile
Explosion
Control
Movement
Defense
Environmental
Collision
Velocity
```

Abilities, relics, equipment, enemies and mutations can all use tags.

This enables automatic synergy logic.

Example:

```text
Relic:
+50% effectiveness of [Orbit] effects
```

This is much more scalable than hard-coded references.

---

# 63. Modifier Framework

Create generic modifiers.

Examples:

```text
Add
Multiply
Override
Trigger
Conditional
Periodic
OnCollision
OnKill
OnGravityChange
OnAbilityCast
OnDamage
OnDeath
```

This allows content designers to build effects without programming every item manually.

---

# 64. Event Bus

Implement an internal event system.

Important events:

```text
RunStarted
RunEnded
PlayerDamaged
EnemyKilled
EnemyLaunched
CollisionOccurred
GravityChanged
GravityWellCreated
AbilityUsed
AbilityUpgraded
ItemCollected
EliteSpawned
BossStarted
BossDefeated
ChainStarted
ChainExtended
ChainEnded
```

This will make future systems significantly easier to implement.

---

# 65. Physics Architecture

Separate:

```text
Physics simulation
Gameplay logic
Visual effects
Audio
UI
```

Do not put gameplay decisions directly inside physics callbacks.

Use events to communicate.

Example:

```text
Physics detects collision
        ↓
Collision event
        ↓
Gameplay evaluates collision
        ↓
Damage system
        ↓
Chain system
        ↓
Rewards
        ↓
VFX / SFX
```

---

# 66. Performance Requirements

Mobile performance is critical.

Target:

```text
60 FPS
```

on mainstream modern devices.

Support:

```text
30 FPS fallback
```

for weaker devices.

The game may eventually contain:

- hundreds of enemies
- hundreds of projectiles
- many physics objects
- particles
- gravity fields

Therefore:

### Required optimizations

- object pooling
- spatial partitioning
- collision layers
- physics update throttling for distant objects
- pooled VFX
- pooled projectiles
- capped particle counts
- batched rendering
- deterministic or semi-deterministic simulation where useful
- efficient gravity field queries

---

# 67. Physics Optimization

Do not calculate every gravity source against every object.

Use spatial queries.

Conceptually:

```text
GravityManager
 ↓
SpatialGrid
 ↓
NearbyGravitySources
 ↓
CalculateInfluence
```

Objects outside relevant ranges should not perform expensive calculations.

---

# 68. Physics Stability

The game must remain deterministic enough that extreme situations do not explode numerically.

Handle:

- extremely high velocity
- extremely high mass
- overlapping gravity wells
- objects trapped in wells
- tunneling
- NaN/Infinity values
- object stacking
- physics explosions
- infinite acceleration

Implement safety limits.

Examples:

```text
MaxVelocity
MaxAcceleration
MaxGravityStrength
MaxImpulse
MaxChainDepth
MaxActivePhysicsObjects
```

These limits should be invisible to the player whenever possible.

---

# 69. Save System

Persist:

- unlocked abilities
- characters
- equipment
- relics
- currencies
- discoveries
- achievements
- mastery
- story progress
- settings
- statistics

Use versioned save data.

Example:

```text
SaveVersion = 1
```

Future versions must support migrations.

---

# 70. Offline-First

The core game should work without network connectivity.

Online features should be optional.

Do not make basic progression dependent on a server.

---

# 71. Mobile UX

The UI must be designed for phones first.

Prioritize:

- large touch targets
- readable text
- minimal clutter
- one-handed usability where possible
- fast menus
- quick restart
- clear upgrade choices

Avoid desktop-style tiny controls.

---

# 72. Combat HUD

Display:

- health
- gravity energy
- current gravity direction
- active abilities
- cooldowns
- XP
- current level
- run timer
- temporary buffs
- chain indicator

Do not display unnecessary information during combat.

---

# 73. Gravity Direction Indicator

Always make the current gravity state obvious.

Possible solution:

```text
large subtle directional indicator
+
environmental particles
+
character animation
```

Never force the player to infer gravity solely from physics.

---

# 74. Upgrade UI

When leveling:

Pause or greatly slow the game.

Present:

```text
┌─────────────────────────┐
│      GRAVITY WELL       │
│                         │
│ Pull nearby objects     │
│ toward a central point. │
│                         │
│ [ TAKE ]                │
└─────────────────────────┘
```

Three choices should usually be enough.

Each option must communicate:

- name
- effect
- rarity
- current level
- synergy tags

---

# 75. First-Time User Experience

The first 5 minutes are critical.

Teach:

### Step 1

Move.

### Step 2

Flip gravity.

### Step 3

Use gravity to avoid an obstacle.

### Step 4

Use gravity to hit an enemy.

### Step 5

Manipulate an object.

### Step 6

Create a gravity well.

### Step 7

Cause a chain reaction.

The player should discover the game's fundamental promise immediately.

---

# 76. Tutorial Philosophy

Do not use long instructional screens.

Teach through playable scenarios.

Bad:

> "Gravity wells attract nearby objects."

Better:

```text
Player enters room.

Enemy approaches.

Gravity Well button highlights.

Player activates it.

Enemy gets pulled into explosive barrel.

Explosion occurs.

```

Then:

> "You didn't attack it. You changed the battlefield."

---

# 77. Audio Design

Audio should reinforce physics.

Important sounds:

- gravity flip
- gravity pulse
- gravity well
- black hole
- collision
- launch
- crush
- explosion
- enemy death
- level-up
- relic acquisition
- boss arrival

Pitch and intensity can scale with force.

A tiny collision should sound tiny.

A massive collision should sound enormous.

---

# 78. Music

Music should evolve during runs.

States:

```text
Exploration
Combat
High Danger
Elite
Boss
Critical
Victory
```

Gravity anomalies should alter the soundtrack.

---

# 79. Accessibility

Implement:

- colorblind-safe indicators
- scalable UI
- reduced screen shake
- reduced flashing
- vibration toggle
- audio sliders
- visual indicators for important sounds
- left-handed controls
- adjustable joystick
- aim/control sensitivity where relevant

Never rely solely on color.

---

# 80. Monetization

Do not compromise the core gameplay.

Potential model:

### Premium

Paid game.

OR

### Free + ethical monetization

Possible:

- cosmetics
- optional ads for bonus/retry
- cosmetic bundles
- expansion packs

Avoid:

- energy timers
- mandatory grinding
- pay-to-win
- aggressive ads
- loot boxes as core progression

The gravity system should remain enjoyable without payment pressure.

---

# 81. Content Roadmap

## Version 0.1 — Physics Prototype

Implement only:

- player
- movement
- gravity directions
- physics objects
- collisions
- one enemy
- one arena

Success criterion:

> Changing gravity feels amazing.

---

## Version 0.2 — Gravity Combat

Add:

- gravity pulse
- gravity well
- projectile
- explosive object
- basic enemy types
- chain reactions

Success criterion:

> Players can kill enemies creatively using physics.

---

## Version 0.3 — Roguelite Core

Add:

- XP
- level-ups
- 20+ abilities
- 20+ relics
- temporary upgrades
- run generation
- death/restart
- basic meta progression

---

## Version 0.4 — Vertical Slice

Create:

- 1 complete biome
- 1 boss
- 10+ enemies
- 30+ upgrades
- 10+ relics
- shops
- events
- progression
- polished UI
- audio
- VFX

This should already feel like a commercial game.

---

# 82. Alpha

Target:

```text
3 biomes
3 bosses
25+ enemies
50+ abilities
50+ relics
5 classes
100+ challenges
```

Focus on balance and replayability.

---

# 83. Beta

Expand:

```text
5–7 biomes
8+ bosses
50+ enemy variants
100+ abilities/relics
10+ classes
equipment
mutations
endless mode
daily challenges
```

---

# 84. Launch Version

Target approximately:

```text
6–8 major environments
10+ bosses
50+ enemy archetypes/variants
100+ abilities
100+ relics
50+ equipment pieces
8+ classes
multiple difficulty tiers
endless mode
large challenge system
story campaign
codex
mastery
daily/weekly content
```

Numbers are targets, not reasons to add filler.

Quality matters more than quantity.

---

# 85. Post-Launch Content Architecture

Every expansion should be capable of adding:

```text
Biome
+
Boss
+
Enemies
+
Gravity mechanic
+
Abilities
+
Relics
+
Events
+
Story
+
Challenges
```

without changing the core engine.

---

# 86. Example Expansion

## Expansion: Planetfall

Adds:

### Mechanic

Planetary gravity.

### Biome

Broken planetary colonies.

### Enemies

Planetary parasites.

### Boss

The Planet Eater.

### Abilities

- Micro Planet
- Planet Split
- Orbital Strike
- Gravity Sling
- Binary Orbit

### Relics

- Planetary Core
- Stable Orbit
- Moon Fragment

### Endgame

Planetary Endless mode.

---

# 87. Analytics

Track anonymous gameplay metrics where appropriate.

Important events:

```text
TutorialCompleted
RunStarted
RunDuration
RunEnded
CauseOfDeath
GravityChanges
AbilityUsage
AbilityChoices
RelicChoices
EnemyKills
CollisionKills
ChainLength
LongestChain
BossAttempts
BossKills
UpgradeRerolls
RunAbandoned
DifficultySelected
```

Use these metrics to identify:

- confusing mechanics
- weak abilities
- overpowered builds
- boring sections
- difficulty spikes
- unused content

Do not use analytics to manipulate players into unhealthy play patterns.

---

# 88. Balance Philosophy

Avoid balancing everything toward identical efficiency.

Different builds should have different strengths.

For example:

```text
Impact build
Excellent against heavy enemies.

Void build
Excellent against groups.

Orbital build
Excellent at sustained area control.

Projectile build
Excellent against ranged enemies.

Control build
Excellent against elites.
```

Build identity is more important than perfect numerical equality.

---

# 89. Build Diversity

Every run should generate meaningful choices.

Avoid:

```text
+5% damage
+5% damage
+5% damage
```

Prefer:

```text
Gravity strength +30%
BUT
movement acceleration -15%
```

or:

```text
Every gravity flip creates a pulse.
```

or:

```text
Projectiles near you orbit for 2 seconds.
```

Mechanics create more interesting build decisions than generic percentage bonuses.

---

# 90. Anti-Degenerate Design

The game must detect and manage broken physics interactions.

Potential problems:

### Infinite orbit

Object permanently orbits without resolution.

Solution:

- orbital decay
- maximum orbit duration
- collision opportunities

### Infinite chain

One interaction triggers itself forever.

Solution:

- chain IDs
- recursion limits
- diminishing effects

### Infinite acceleration

Gravity wells accelerate objects indefinitely.

Solution:

- velocity caps
- energy cost
- field limits

### Permanent stun

Gravity control prevents enemies from acting.

Solution:

- resistance
- diminishing returns
- elite immunity windows

---

# 91. Debug Tools

Create an internal developer/debug menu.

Must include:

```text
Spawn enemy
Spawn object
Spawn boss
Change gravity
Set gravity strength
Create gravity well
Set player stats
Give ability
Give relic
Give currency
Kill all enemies
Pause physics
Step physics frame
Show collision bounds
Show gravity fields
Show velocity vectors
Show object mass
Show chain IDs
Show performance metrics
```

A physics-heavy game cannot be efficiently developed without this.

---

# 92. Physics Visualization Mode

Add an optional debug overlay:

```text
Gravity vector
Velocity vector
Mass
Acceleration
Collision normal
Gravity source
Gravity strength
```

This will dramatically simplify balancing and debugging.

---

# 93. Testing Strategy

Implement automated tests for:

### Gravity

- directional gravity
- inversion
- wells
- multiple fields
- zero gravity

### Physics

- collision
- mass
- velocity
- impulses
- object destruction

### Combat

- damage
- death
- chain reactions

### Progression

- level-up
- unlock
- save/load
- upgrades

### Procedural generation

- valid room paths
- reachable exits
- boss accessibility
- reward distribution

---

# 94. Performance Testing

Create stress tests.

Examples:

```text
100 enemies
500 enemies
1000 projectiles
100 physics objects
50 gravity sources
maximum particles
multiple simultaneous explosions
```

The game should remain stable.

---

# 95. Device Testing

Test at minimum:

### Low-end Android

Prioritize performance.

### Mid-range Android

Primary target.

### High-end Android

Maximum visual quality.

### iPhone/iPad

Touch and performance.

Implement scalable quality settings.

---

# 96. Save Compatibility

Never allow a content update to corrupt existing saves.

Implement:

```text
Save migration layer
```

Example:

```text
Save v1
 ↓
Migration v2
 ↓
Migration v3
 ↓
Current Save
```

---

# 97. Architecture

Use modular architecture.

Suggested conceptual modules:

```text
Core
 ├── GameState
 ├── EventBus
 ├── Time
 └── Configuration

Physics
 ├── GravitySystem
 ├── PhysicsObject
 ├── CollisionSystem
 └── SpatialPartition

Gameplay
 ├── Player
 ├── Enemy
 ├── Combat
 ├── Abilities
 └── ChainReaction

Progression
 ├── RunProgression
 ├── MetaProgression
 ├── Equipment
 ├── Relics
 ├── Mutations
 └── Mastery

World
 ├── Rooms
 ├── Arenas
 ├── Biomes
 ├── Events
 └── ProceduralGeneration

Presentation
 ├── VFX
 ├── Animation
 ├── Audio
 ├── Camera
 └── UI

Persistence
 ├── Save
 ├── Load
 └── Migration

Debug
 ├── PhysicsDebugger
 ├── SpawnTools
 └── PerformanceProfiler
```

Keep these responsibilities separate.

---

# 98. Data-Driven Content

Prefer configuration/data assets over hard-coded values.

For example:

```text
gravity_well.json
black_hole.json
micro_planet.json
gravity_pulse.json
```

or the equivalent data system supported by the chosen engine.

The AI agent must avoid embedding balance values throughout source code.

---

# 99. Content Authoring Workflow

Adding a new ability should ideally require:

```text
Create definition
↓
Assign tags
↓
Configure parameters
↓
Configure effects
↓
Configure VFX/SFX
↓
Add upgrade levels
↓
Add synergies
↓
Add mastery objectives
```

rather than modifying multiple unrelated systems.

---

# 100. Recommended Development Order

The AI agent must follow this order.

## Phase 1

Project setup.

## Phase 2

Player movement.

## Phase 3

Gravity vector system.

## Phase 4

Physics objects.

## Phase 5

Collision and force system.

## Phase 6

One enemy.

## Phase 7

Gravity-based combat.

## Phase 8

Chain reactions.

## Phase 9

Gravity abilities.

## Phase 10

Enemy variety.

## Phase 11

Arena system.

## Phase 12

Run generation.

## Phase 13

XP and level-up.

## Phase 14

Abilities/relics.

## Phase 15

Boss.

## Phase 16

Meta progression.

## Phase 17

Equipment.

## Phase 18

Classes.

## Phase 19

Events.

## Phase 20

Story.

## Phase 21

Endless mode.

## Phase 22

Polish.

## Phase 23

Optimization.

## Phase 24

Testing.

## Phase 25

Release preparation.

Do not jump directly into content production.

The physics foundation must be extremely solid first.

---

# 101. Vertical Slice Requirement

Before producing large amounts of content, create one complete playable vertical slice.

It must contain:

```text
1 biome
5–8 enemy types
1 elite
1 boss
15–20 abilities
10–15 relics
1 shop
1 event system
1 procedural map
1 complete run
meta progression
save/load
tutorial
sound
VFX
polished UI
```

The vertical slice must answer one question:

> **Is manipulating gravity so much fun that the player wants to immediately start another run?**

If the answer is no, stop content production and improve the core loop.

---

# 102. Core Fun Test

The prototype should be considered successful only if players naturally perform these actions:

```text
Flip gravity to dodge.
```

```text
Flip gravity to attack.
```

```text
Use an object as a weapon.
```

```text
Redirect a projectile.
```

```text
Create a chain reaction.
```

```text
Experiment with gravity.
```

```text
Try something intentionally crazy.
```

If players instead simply:

> move around and wait for enemies to die,

the design has failed.

---

# 103. First Playable Prototype

The first prototype should be extremely small.

Implement exactly:

### Player

- movement
- four gravity directions
- basic health

### Arena

- walls
- floor
- ceiling
- movable objects

### Enemies

- basic chaser
- shooter
- heavy

### Gravity

- directional gravity
- gravity well

### Objects

- barrel
- crate
- rock

### Combat

- collision damage
- explosion
- projectile redirection

### Feedback

- particles
- impact
- camera shake
- basic audio

Nothing else.

The prototype is successful when:

> A player can kill an enemy without pressing an attack button.

---

# 104. Second Prototype

Add:

- 10 gravity abilities
- 10 enemies
- XP
- level-up
- 20 upgrades
- procedural rooms
- elite
- boss
- run completion
- death
- restart

This becomes the first true roguelite prototype.

---

# 105. Third Prototype

Add:

- relics
- classes
- equipment
- meta progression
- challenges
- codex
- multiple biomes
- multiple bosses
- story
- endless mode

This becomes the foundation for the commercial game.

---

# 106. AI Agent Rules

The AI coding agent must follow these rules throughout development.

### Rule 1

Do not implement large systems before validating the core mechanic.

### Rule 2

Do not duplicate gravity logic.

There must be one authoritative gravity system.

### Rule 3

Do not hard-code content where data-driven systems are appropriate.

### Rule 4

Do not use arbitrary magic numbers throughout gameplay code.

### Rule 5

Every new mechanic must work with the existing physics architecture.

### Rule 6

Every new gameplay system must have tests.

### Rule 7

Every new content category must support future expansion.

### Rule 8

Never sacrifice physics responsiveness for visual effects.

### Rule 9

Never add content simply to increase quantity.

### Rule 10

Always prioritize:

```text
Game feel
>
Physics reliability
>
Gameplay depth
>
Readability
>
Performance
>
Content quantity
```

---

# 107. AI Agent Development Loop

For every implementation phase:

```text
1. Inspect existing architecture.
2. Identify affected systems.
3. Design the smallest clean implementation.
4. Implement.
5. Compile/build.
6. Run automated tests.
7. Run the game.
8. Test the feature manually.
9. Check performance.
10. Fix discovered issues.
11. Refactor if necessary.
12. Document the system.
13. Commit the completed phase.
```

Never stack many untested features together.

---

# 108. Review Loop

After each major phase, perform a structured review.

Check:

### Gameplay

- Is it fun?
- Is it understandable?
- Does it reinforce gravity?

### Architecture

- Is it reusable?
- Is it extensible?
- Is logic duplicated?

### Performance

- Any unnecessary allocations?
- Any excessive physics queries?
- Any pooling opportunities?

### UX

- Is the mechanic obvious?
- Is the UI readable?

### Balance

- Is there an obvious dominant strategy?
- Are there useless choices?

### Mobile

- Does it work comfortably on touch?

---

# 109. Ten-Round Quality Review

At the end of each major milestone, run up to 10 review passes.

### Pass 1

Gameplay correctness.

### Pass 2

Physics correctness.

### Pass 3

Architecture.

### Pass 4

Performance.

### Pass 5

UX.

### Pass 6

Accessibility.

### Pass 7

Balance.

### Pass 8

Content extensibility.

### Pass 9

Mobile optimization.

### Pass 10

Final polish.

Stop early only when another pass finds no meaningful issues.

---

# 110. Definition of Done

A feature is not complete merely because it compiles.

A feature is complete when:

```text
Implemented
+
Tested
+
Playable
+
Readable
+
Performant
+
Integrated
+
Save-safe
+
Extensible
+
Polished
```

---

# 111. Most Important Design Principle

Do not allow Gravityborn to become:

> "A normal roguelite where the player has gravity-themed abilities."

It must remain:

> **"A physics sandbox disguised as an action roguelite."**

The player should constantly manipulate:

```text
direction
+
force
+
mass
+
velocity
+
position
+
environment
+
gravity sources
```

and those interactions should produce the combat.

---

# 112. Final Target Experience

A mature Gravityborn run should look something like:

```text
Player enters a ruined orbital station.

Gravity points right.

A swarm approaches.

Player flips gravity upward.

Enemies fly toward the ceiling.

Player creates a gravity well.

Enemies begin orbiting.

A drone fires missiles.

Player redirects the missiles using the gravity well.

Missile hits an explosive container.

Explosion launches debris.

Debris hits an elite.

Elite gets pulled into the orbital field.

Player activates Gravity Collapse.

Everything converges.

The entire enemy group is crushed.

A rare relic drops.

The relic modifies gravity flips.

Now every gravity flip creates a miniature pulse.

The next room becomes completely different.

The player finds a gravity anomaly.

Entering it changes gravity behavior for the rest of the run.

A boss appears.

The boss creates its own planet.

The player creates a second planet.

The two planets begin orbiting.

The boss gets caught between them.

The player manipulates their orbit.

The boss is slingshotted into its own projectile.

The projectile kills the boss.

The run ends.

The player returns to the hub.

A new mutation unlocks.

A new gravity ability becomes available.

A new planet is discovered.

The player immediately starts another run.
```

That is the experience the implementation should be optimized toward.

---

# 113. Ultimate Success Criteria

Gravityborn succeeds if players can describe their run with stories such as:

> "I killed the boss with its own projectile."

> "I accidentally created a miniature solar system."

> "I made 37 enemies orbit a black hole."

> "I survived by stealing gravity from enemies."

> "I turned the entire room into a weapon."

> "My build became completely ridiculous."

That is the core identity.

**Build the physics system first. Build the roguelite around it. Build the progression around experimentation. Build the content around increasingly strange ways of manipulating gravity.**