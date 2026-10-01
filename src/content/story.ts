import { biomes } from './rooms';
import { bossDefinitions, regionGuardians } from './bosses';
export const story = [
  {
    act: 'I · Awakening',
    title: 'The first weight',
    intro:
      'You wake beneath a broken calibration ring. The machines call you an error. When you move, the dust chooses a new direction.',
    memory:
      'Memory 01: We did not give the core gravity. We taught it to remember where things belonged.',
  },
  {
    act: 'II · The Machines',
    title: 'A language in the crystal',
    intro:
      'Every crystal repeats the same mechanical pulse. The caverns were grown around a signal older than the facility.',
    memory: 'Memory 02: The first civilization built no roads. It changed where falling ended.',
  },
  {
    act: 'III · The Broken Worlds',
    title: 'The manufactured horizon',
    intro:
      'The planet is hollow. Under its dead surface, damaged engines still pull toward a center that no longer exists.',
    memory:
      'Memory 03: A world is a promise between its matter. Break the promise, and the pieces keep searching.',
  },
  {
    act: 'III · The Broken Worlds',
    title: 'The last station',
    intro:
      'A silent station circles an absent sun. Its navigation records show thousands of artificial planets moving away from something.',
    memory: 'Memory 04: Evacuation was not an escape through space. We moved the space itself.',
  },
  {
    act: 'IV · The Singularity',
    title: 'Inside the missing star',
    intro:
      'Light bends around your core. Beyond the horizon, an old intelligence asks why you still believe that gravity must pull.',
    memory:
      'Memory 05: A singularity is not a point. It is a decision that the universe refuses to undo.',
  },
  {
    act: 'IV · The Singularity',
    title: 'The unfinished experiment',
    intro:
      'The laboratory holds copies of your first chamber. Each copy ends differently. One recording contains your voice.',
    memory:
      'Memory 06: We made a mind that could choose its own center. Then we became afraid of what it might choose.',
  },
  {
    act: 'V · Beyond Weight',
    title: 'The unbound gardens',
    intro:
      'Islands drift without a planet beneath them. Life has learned to follow tiny, temporary centers instead of a single world.',
    memory:
      'Memory 07: Freedom was never the absence of gravity. It was the right to change what held you.',
  },
  {
    act: 'V · Beyond Weight',
    title: 'The open frontier',
    intro:
      'The final boundary is collapsing. You can restore its old center, or carry its fragments into a frontier that has no fixed shape.',
    memory: 'Memory 08: You are not the last Gravityborn. You are the first one who can leave.',
  },
] as const;
export const secretLore = [
  {
    name: 'The maintenance passage',
    text: 'Behind the foundry seal, a worker left a calibration mark: every locked door has a direction in which it is already open.',
  },
  {
    name: 'The first resonance',
    text: 'A crystal preserves an argument between two architects. One wanted a perfect center. The other wanted every traveler to carry one.',
  },
  {
    name: 'Weight of the survivors',
    text: 'The dead planet’s vault lists no kings or weapons. Its last inventory counts shelters, gardens, and the mass required to keep them together.',
  },
  {
    name: 'An unsent course',
    text: 'The station kept an evacuation route hidden from its own guardian. It leads toward the broken worlds, where the missing passengers chose to rebuild.',
  },
  {
    name: 'A horizon with a hinge',
    text: 'Inside the singularity, the sealed archive has two exits occupying the same point. The old intelligence calls this its first act of mercy.',
  },
  {
    name: 'Experiment zero',
    text: 'Your earliest recording contains no orders. A researcher asks what you want to hold, then waits while you learn to answer.',
  },
  {
    name: 'The gardener’s orbit',
    text: 'The drifting islands are connected by seeds. Each carries enough gravity to find another patch of earth, and enough freedom to leave it.',
  },
  {
    name: 'The unfinished map',
    text: 'The vault contains a map with its final boundary erased. The Gravityborn who drew it expected a future traveler to choose what came next.',
  },
] as const;
export const planets = biomes.map((biome, index) => ({
  id: `planet:${index}`,
  name: [
    'Aster Foundry',
    'Resonance',
    'Cinder Shell',
    'Kepler Remnant',
    'Umbra',
    'Palinode',
    'Zephyr Crown',
    'The Unfinished',
  ][index],
  biome: biome.name,
  mass: [1.1, 0.8, 3.2, 0.4, 8, 1.4, 0.25, 2][index],
  radius: [6200, 4100, 9000, 700, 2800, 5200, 1200, 3300][index],
  gravity: [1, 0.8, 1.4, 0.6, 2, 1.1, 0.4, 1.6][index],
  atmosphere: [
    'Thin nitrogen',
    'Crystal vapor',
    'Vacuum',
    'Artificial',
    'Ionized plasma',
    'Filtered oxygen',
    'Dense oxygen',
    'Unstable',
  ][index],
  property: [
    'Mechanical gravity machinery',
    'Natural attraction crystals',
    'Competing planetary fields',
    'Rotating structures',
    'Extreme local gravity',
    'Experimental zero-G chambers',
    'Vertical winds',
    'Shifting geometry',
  ][index],
  enemies: [...biome.enemies],
  resource: [
    'Alloy',
    'Gravity crystal',
    'Meteoric iron',
    'Circuit cores',
    'Void dust',
    'Research cores',
    'Spore glass',
    'Anomaly fragments',
  ][index],
  boss: bossDefinitions[regionGuardians[index]].name,
}));
