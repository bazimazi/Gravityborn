import { expect, it } from 'vitest';
import { Game } from '../src/gameplay/game';
import { Tutorial } from '../src/gameplay/tutorial';

it('completes all seven lessons through movement, gravity and well inputs', () => {
  const game = new Game(false);
  let finished = 0;
  const tutorial = new Tutorial(game, () => finished++);
  tutorial.start();
  for (let lesson = 0; lesson < 7; lesson++) {
    expect(tutorial.index).toBe(lesson);
    expect(tutorial.advance()).toBe(false);
    for (let step = 0; step < 3000 && !tutorial.complete; step++) {
      const p = game.player.body.position;
      if (lesson === 0) game.move = { x: 1, y: 0 };
      else if (lesson === 2) {
        const direction =
          p.x < 500 && p.y > 180 ? { x: 0, y: -1 } : p.x < 950 ? { x: 1, y: 0 } : { x: 0, y: 1 };
        if (step % 30 === 0) game.flip(direction);
        game.move = p.x >= 950 ? { x: -0.3, y: 1 } : { x: p.y < 200 ? 1 : 0, y: 0 };
      } else if (lesson === 6 || lesson === 4 || lesson === 3 || lesson === 1) {
        if (step === 0) game.flip({ x: 1, y: 0 });
        game.move = { x: 0, y: 0 };
      } else if (lesson === 5 && step === 0) game.createWell({ x: 840, y: 400 });
      game.step();
      tutorial.tick();
    }
    expect(
      tutorial.complete,
      `lesson ${lesson + 1} at ${JSON.stringify(game.player.body.position)}`,
    ).toBe(true);
    expect(game.state).toBe('playing');
    expect(tutorial.advance()).toBe(true);
  }
  expect(finished).toBe(1);
  expect(tutorial.active).toBe(false);
  expect(tutorial.advance()).toBe(false);
});
