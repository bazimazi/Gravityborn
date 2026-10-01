export interface EventChoice {
  id: string;
  name: string;
  description: string;
  healthCost?: number;
  currencyCost?: number;
  heal?: number;
  currency?: number;
  xp?: number;
  relic?: 'any' | 'rare';
  power?: string;
  mutation?: string;
}
export const encounters: { id: string; name: string; text: string; choices: EventChoice[] }[] = [
  {
    id: 'fracture',
    name: 'The fractured core',
    text: 'A research core whispers through its cracked shell: “I remember how to hold a world together.”',
    choices: [
      {
        id: 'risk',
        name: 'Overload the core',
        description: 'Lose 25 integrity. Gain a rare or legendary relic.',
        healthCost: 25,
        relic: 'rare',
      },
      { id: 'repair', name: 'Salvage its shell', description: 'Restore 18 integrity.', heal: 18 },
      { id: 'leave', name: 'Leave it intact', description: 'Continue without changing your core.' },
    ],
  },
  {
    id: 'cartographer',
    name: 'The weightless cartographer',
    text: 'An old survey drone maps the space between fallen planets. It offers a route that does not exist yet.',
    choices: [
      {
        id: 'chart',
        name: 'Buy the impossible chart',
        description: 'Pay 20 shards. Gain 90 XP.',
        currencyCost: 20,
        xp: 90,
      },
      {
        id: 'guide',
        name: 'Help calibrate the drone',
        description: 'Learn Gravity Rift.',
        power: 'rift',
      },
      { id: 'leave', name: 'Follow your own route', description: 'Continue onward.' },
    ],
  },
  {
    id: 'echo',
    name: 'A voice ahead of you',
    text: 'You hear your next movement before you make it. A second core moves behind the glass, perfectly in time.',
    choices: [
      {
        id: 'merge',
        name: 'Merge the echoes',
        description: 'Lose 15 integrity. Adopt Echo Gravity for this run.',
        healthCost: 15,
        mutation: 'afterimage',
      },
      { id: 'listen', name: 'Listen to the pattern', description: 'Gain 50 XP.', xp: 50 },
      { id: 'leave', name: 'Break the rhythm', description: 'Continue unchanged.' },
    ],
  },
  {
    id: 'smuggler',
    name: 'The gravity smuggler',
    text: 'A sealed crate floats between two opposing fields. The trader refuses to explain what is inside.',
    choices: [
      {
        id: 'buy',
        name: 'Buy the sealed crate',
        description: 'Pay 30 shards. Gain a relic.',
        currencyCost: 30,
        relic: 'any',
      },
      { id: 'work', name: 'Repair the stabilizer', description: 'Gain 18 shards.', currency: 18 },
      { id: 'leave', name: 'Decline the offer', description: 'Keep your resources.' },
    ],
  },
  {
    id: 'garden',
    name: 'The inverted garden',
    text: 'Roots grow into the ceiling. Their fruit falls upward, slowing just before it touches your core.',
    choices: [
      {
        id: 'taste',
        name: 'Taste the hollow fruit',
        description: 'Restore 25 integrity and learn Zero-G Chamber.',
        heal: 25,
        power: 'zero',
      },
      { id: 'harvest', name: 'Harvest research spores', description: 'Gain 70 XP.', xp: 70 },
      { id: 'leave', name: 'Leave the garden alive', description: 'Continue onward.' },
    ],
  },
  {
    id: 'engine',
    name: 'The sleeping engine',
    text: 'A machine beneath the floor still holds a moon in orbit. Its control panel recognizes your core.',
    choices: [
      {
        id: 'wake',
        name: 'Wake the engine',
        description: 'Lose 20 integrity. Learn Micro Planet.',
        healthCost: 20,
        power: 'planet',
      },
      { id: 'drain', name: 'Drain the reserve', description: 'Gain 25 shards.', currency: 25 },
      { id: 'leave', name: 'Let it keep dreaming', description: 'Leave the orbit intact.' },
    ],
  },
];
