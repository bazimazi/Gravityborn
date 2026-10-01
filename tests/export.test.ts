import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ native: vi.fn(() => true), write: vi.fn(), share: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: mocks.native } }));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: mocks.write },
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
}));
vi.mock('@capacitor/share', () => ({ Share: { share: mocks.share } }));
import { exportJson } from '../src/core/export';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.write.mockResolvedValue({ uri: 'file:///cache/gravityborn-run.json' });
  mocks.share.mockResolvedValue({});
});
it('writes Unicode JSON to app cache before offering a file through the native share sheet', async () => {
  const data = JSON.stringify({ seed: 'جهان', title: 'Gravityborn' });
  expect(await exportJson('gravityborn-run.json', data)).toBe('exported');
  expect(mocks.write).toHaveBeenCalledWith({
    path: 'gravityborn-run.json',
    data,
    directory: 'CACHE',
    encoding: 'utf8',
  });
  expect(mocks.share).toHaveBeenCalledWith(
    expect.objectContaining({ files: ['file:///cache/gravityborn-run.json'] }),
  );
});
it('reports write failures, treats chooser cancellation as normal, and permits a later retry', async () => {
  mocks.write.mockRejectedValueOnce(new Error('disk full'));
  await expect(exportJson('gravityborn-save.json', '{}')).rejects.toThrow('disk full');
  expect(mocks.share).not.toHaveBeenCalled();
  mocks.share.mockRejectedValueOnce(new Error('Share canceled'));
  expect(await exportJson('gravityborn-save.json', '{}')).toBe('cancelled');
  expect(await exportJson('gravityborn-save.json', '{}')).toBe('exported');
});
it('rejects unexpected paths and overlapping exports before touching another file', async () => {
  await expect(exportJson('../save.json', '{}')).rejects.toThrow('Invalid');
  let finish!: (value: unknown) => void;
  mocks.share.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const first = exportJson('gravityborn-run.json', '{}');
  await vi.waitFor(() => expect(mocks.share).toHaveBeenCalled());
  await expect(exportJson('gravityborn-run.json', '{}')).rejects.toThrow('already open');
  expect(mocks.write).toHaveBeenCalledTimes(1);
  finish({});
  await first;
});
