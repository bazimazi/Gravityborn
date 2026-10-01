import type { Modifier } from '../progression/modifiers';
export const wellEvolutions: {
  name: string;
  description: string;
  modifiers: Omit<Modifier, 'id'>[];
}[] = [
  { name: 'Gravity Well', description: 'Pull nearby matter toward a chosen point.', modifiers: [] },
  {
    name: 'Improved Gravity Well',
    description: 'Wells reach 20% farther and pull 20% harder.',
    modifiers: [
      { stat: 'radius', operation: 'multiply', value: 1.2, tags: ['Well'] },
      { stat: 'strength', operation: 'multiply', value: 1.2, tags: ['Well'] },
    ],
  },
  {
    name: 'Dual Gravity Well',
    description: 'Each cast creates two wells, with room for four active wells.',
    modifiers: [
      { stat: 'wellCopies', operation: 'override', value: 2 },
      { stat: 'maxWells', operation: 'add', value: 2 },
    ],
  },
  {
    name: 'Twin Black Holes',
    description:
      'The two wells compress enemies caught near their centers and last two seconds longer.',
    modifiers: [
      { stat: 'wellCompression', operation: 'add', value: 16 },
      { stat: 'duration', operation: 'add', value: 2, tags: ['Well'] },
    ],
  },
];
