import { afterEach, expect, it, vi } from 'vitest';
import { GameAudio } from '../src/presentation/audio';
import { EventBus } from '../src/core/events';
import { defaults } from '../src/core/settings';

afterEach(() => vi.unstubAllGlobals());
it('layered cues honor mute, enforce the shared voice budget and release ended nodes', async () => {
  const nodes: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    onended?: () => void;
  }[] = [];
  const parameter = () => ({
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  });
  const context = {
    state: 'running',
    currentTime: 5,
    destination: {},
    createOscillator() {
      const node = {
        frequency: parameter(),
        connect: vi.fn((node) => node),
        start: vi.fn(),
        stop: vi.fn(),
        disconnect: vi.fn(),
        onended: undefined as (() => void) | undefined,
      };
      nodes.push(node);
      return node;
    },
    createGain: () => ({ gain: parameter(), connect: vi.fn((node) => node), disconnect: vi.fn() }),
  };
  vi.stubGlobal(
    'AudioContext',
    class {
      constructor() {
        return context;
      }
    },
  );
  const events = new EventBus();
  const settings = { ...defaults, volume: 0 };
  const audio = new GameAudio(events, settings);
  await audio.unlock();
  const cast = () =>
    events.emit('abilityUsed', {
      id: 'tether',
      tags: ['Control'],
      position: { x: 0, y: 0 },
      level: 1,
    });
  cast();
  expect(nodes).toHaveLength(0);
  settings.volume = 0.5;
  for (let index = 0; index < 20; index++) cast();
  expect(nodes).toHaveLength(12);
  expect(nodes[0].start).toHaveBeenCalledWith(5);
  expect(nodes[1].start).toHaveBeenCalledWith(5.06);
  nodes[0].onended?.();
  nodes[1].onended?.();
  expect(nodes[0].disconnect).toHaveBeenCalledOnce();
  cast();
  expect(nodes).toHaveLength(14);
});
it('audio creation failures leave gameplay events usable', async () => {
  vi.stubGlobal(
    'AudioContext',
    class {
      constructor() {
        throw new Error('Audio disabled');
      }
    },
  );
  const events = new EventBus();
  const audio = new GameAudio(events, { ...defaults });
  await expect(audio.unlock()).resolves.toBeUndefined();
  expect(() =>
    events.emit('abilityUsed', {
      id: 'black_hole',
      tags: ['Void'],
      position: { x: 0, y: 0 },
      level: 1,
    }),
  ).not.toThrow();
});
it('background interruption stops music and delayed effects, gates new voices, and frees the budget on return', async () => {
  const nodes: { stop: ReturnType<typeof vi.fn>; onended?: () => void }[] = [];
  const parameter = () => ({
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  });
  vi.stubGlobal(
    'AudioContext',
    class {
      state = 'running';
      currentTime = 5;
      destination = {};
      createOscillator() {
        const node = {
          frequency: parameter(),
          connect: vi.fn((node) => node),
          start: vi.fn(),
          stop: vi.fn(),
          disconnect: vi.fn(),
          onended: undefined as (() => void) | undefined,
        };
        nodes.push(node);
        return node;
      }
      createGain() {
        return { gain: parameter(), connect: vi.fn((node) => node), disconnect: vi.fn() };
      }
    },
  );
  const events = new EventBus();
  const audio = new GameAudio(events, { ...defaults });
  await audio.unlock();
  audio.soundtrack('combat');
  const cast = () =>
    events.emit('abilityUsed', {
      id: 'tether',
      tags: ['Control'],
      position: { x: 0, y: 0 },
      level: 1,
    });
  for (let index = 0; index < 10; index++) cast();
  expect(nodes).toHaveLength(12);
  const stopped = [...nodes];
  audio.setActive(false);
  for (const node of stopped) expect(node.stop).toHaveBeenCalledTimes(2);
  cast();
  audio.cue('level');
  audio.soundtrack('boss');
  await audio.unlock();
  expect(nodes).toHaveLength(12);
  audio.setActive(true);
  for (let index = 0; index < 6; index++) cast();
  expect(nodes).toHaveLength(24);
  // Late ended events from stopped nodes cannot reduce the new generation's budget.
  for (const node of stopped) node.onended?.();
  cast();
  expect(nodes).toHaveLength(24);
  nodes[12].onended?.();
  nodes[13].onended?.();
  cast();
  expect(nodes).toHaveLength(26);
});
