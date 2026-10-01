import { expect, it } from 'vitest';
import { NativeStorage } from '../src/core/storage';

it('hydrates native saves before use and orders backup writes before new primary records', async () => {
  const writes: string[] = [];
  const adapter = new NativeStorage({
    get: async ({ key }) => ({
      value:
        key === 'gravityborn.save' ? 'prior' : key === 'gravityborn.archive' ? 'recordings' : null,
    }),
    set: async ({ key, value }) => {
      await Promise.resolve();
      writes.push(`${key}:${value}`);
    },
  });
  await adapter.load();
  expect(adapter.getItem('gravityborn.save')).toBe('prior');
  expect(adapter.getItem('gravityborn.archive')).toBe('recordings');
  adapter.setItem('gravityborn.save.backup', 'prior');
  adapter.setItem('gravityborn.save', 'new');
  adapter.setItem('gravityborn.save', 'new');
  expect(adapter.getItem('gravityborn.save')).toBe('new');
  expect(await adapter.flush()).toBe(true);
  expect(writes).toEqual(['gravityborn.save.backup:prior', 'gravityborn.save:new']);
});
it('reports failed native writes and refuses later records instead of replacing the good backup', async () => {
  let calls = 0;
  const adapter = new NativeStorage({
    get: async () => ({ value: null }),
    set: async () => {
      calls++;
      throw new Error('disk full');
    },
  });
  adapter.setItem('gravityborn.save.backup', 'backup');
  adapter.setItem('gravityborn.save', 'primary');
  expect(await adapter.flush()).toBe(false);
  expect(calls).toBe(1);
  expect(() => adapter.setItem('gravityborn.save', 'later')).toThrow();
});
