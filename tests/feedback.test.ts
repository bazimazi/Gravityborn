import { expect, it } from 'vitest';
import { EventBus } from '../src/core/events';
import { Feedback } from '../src/presentation/feedback';
import balance from '../src/data/balance.json';

it('impact reactions remain bounded and expire without retaining dead entities', () => {
  const events = new EventBus();
  const feedback = new Feedback(events);
  for (let id = 0; id < 1000; id++)
    events.emit('collisionOccurred', {
      a: id,
      b: id + 1000,
      speed: 100,
      position: { x: 10, y: 10 },
      normal: { x: 1, y: 0 },
    });
  expect(feedback.reactions.size).toBe(balance.presentation.maxReactions);
  expect([...feedback.reactions.values()].every((reaction) => reaction.strength <= 0.22)).toBe(
    true,
  );
  feedback.update(0.3);
  expect(feedback.reactions.size).toBe(0);
});
it('strong impacts pause briefly, rate limit repeat hits and respect reduced motion', () => {
  const events = new EventBus();
  const feedback = new Feedback(events);
  const impact = (force: number): void =>
    events.emit('impact', { force, position: { x: 0, y: 0 }, color: '#ffffff' });
  impact(4);
  expect(feedback.simulationElapsed(16, false)).toBe(16);
  impact(12);
  expect(feedback.simulationElapsed(16, false)).toBe(0);
  impact(12);
  expect(feedback.simulationElapsed(20, false)).toBe(4);
  impact(12);
  expect(feedback.simulationElapsed(16, false)).toBe(16);
  feedback.update(0.2);
  impact(12);
  expect(feedback.simulationElapsed(16, true)).toBe(16);
  expect(feedback.hitPause).toBe(0);
  feedback.clear();
  expect(feedback.reactions.size).toBe(0);
  expect(feedback.particles.length).toBe(0);
});
