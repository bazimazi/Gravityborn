export const coreCosmetics = [
  { id: 'core', name: 'Awakened Core', color: '#98f2e8', sides: 0, satellites: 0, challenge: '' },
  {
    id: 'forge',
    name: 'Forcewright Shell',
    color: '#efc77f',
    sides: 3,
    satellites: 0,
    challenge: 'first_hundred',
  },
  {
    id: 'cascade',
    name: 'Cascade Prism',
    color: '#c5a6ff',
    sides: 6,
    satellites: 0,
    challenge: 'chain_twenty',
  },
  {
    id: 'mirror',
    name: 'Return Prism',
    color: '#a8deff',
    sides: 4,
    satellites: 0,
    challenge: 'return_fire',
  },
  {
    id: 'guardian',
    name: 'Worldbreaker Halo',
    color: '#ffb4a2',
    sides: 0,
    satellites: 2,
    challenge: 'guardian',
  },
  {
    id: 'weightless',
    name: 'Weightless Core',
    color: '#e7e9ff',
    sides: 4,
    satellites: 2,
    challenge: 'weightless',
  },
  {
    id: 'cosmos',
    name: 'Little Cosmos',
    color: '#98f2e8',
    sides: 0,
    satellites: 3,
    challenge: 'orbital_victory',
  },
] as const;
export const cosmeticById = new Map<string, (typeof coreCosmetics)[number]>(
  coreCosmetics.map((item) => [item.id, item]),
);
export const challengeMemories = [
  {
    challenge: 'first_hundred',
    name: 'The forcewright',
    text: 'A foundry worker writes: force is a conversation between masses. You have learned to answer without a weapon.',
  },
  {
    challenge: 'chain_twenty',
    name: 'The long consequence',
    text: 'One small movement passed through twenty pieces of the world. The archive recognizes a Gravityborn by what continues after the first touch.',
  },
  {
    challenge: 'return_fire',
    name: 'An unanswered shot',
    text: 'The old defense machines were built to predict a straight line. No one taught them that the line could change its mind.',
  },
  {
    challenge: 'guardian',
    name: 'Five centers',
    text: 'Each guardian believed its world had one center. Your passage has left five worlds with a choice.',
  },
  {
    challenge: 'weightless',
    name: 'Between falling',
    text: 'The records describe weightlessness as absence. You remember it as a place where every direction was still possible.',
  },
  {
    challenge: 'orbital_victory',
    name: 'A portable sky',
    text: 'You carried a small sky through the ruins. Its moons returned to you without ever being told to stop.',
  },
] as const;
