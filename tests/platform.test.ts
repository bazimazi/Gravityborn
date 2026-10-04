import { expect, it, vi } from 'vitest';

const listeners = vi.hoisted(() => new Map<string, (...args: any[]) => void>());
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (name: string, listener: (...args: any[]) => void) => {
      listeners.set(name, listener);
    }),
  },
}));
import { installPlatform } from '../src/core/platform';

it('native activation restores foreground services without invoking suspend or back', async () => {
  const suspend = vi.fn();
  const back = vi.fn();
  const active = vi.fn();
  await installPlatform(suspend, back, active);
  listeners.get('appStateChange')!({ isActive: false });
  expect(suspend).toHaveBeenCalledOnce();
  expect(active).not.toHaveBeenCalled();
  listeners.get('appStateChange')!({ isActive: true });
  expect(active).toHaveBeenCalledOnce();
  expect(suspend).toHaveBeenCalledOnce();
  expect(back).not.toHaveBeenCalled();
  listeners.get('backButton')!();
  expect(back).toHaveBeenCalledOnce();
});
it('a short native pause suspends immediately even when no inactive state event arrives', async () => {
  const suspend = vi.fn();
  const back = vi.fn();
  const active = vi.fn();
  await installPlatform(suspend, back, active);
  listeners.get('pause')?.();
  expect(suspend).toHaveBeenCalledOnce();
  expect(active).not.toHaveBeenCalled();
  listeners.get('appStateChange')!({ isActive: true });
  expect(active).toHaveBeenCalledOnce();
  expect(suspend).toHaveBeenCalledOnce();
  expect(back).not.toHaveBeenCalled();
});
