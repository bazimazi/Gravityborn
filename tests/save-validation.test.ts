import { expect, it } from 'vitest';
import { SaveStore, checksum, finite, record } from '../src/core/save';

const envelope = (payload: unknown) =>
  JSON.stringify({ version: 2, checksum: checksum(JSON.stringify(payload)), payload });
function memory() {
  const values = new Map<string, string>();
  const writes: string[] = [];
  return {
    values,
    writes,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
      writes.push(key);
    },
  };
}
const validate = (value: unknown) => {
  const data = record(value);
  finite(data.shards, 0, 100000000);
  return data;
};

it('rejects structurally invalid imports even when their checksum is correct', () => {
  const storage = memory();
  const store = new SaveStore(storage, validate);
  expect(store.save({ shards: 42 })).toBe(true);
  const primary = storage.getItem('gravityborn.save');
  expect(store.import(envelope({ shards: -1 }))).toBeUndefined();
  expect(store.import(envelope({ shards: '42' }))).toBeUndefined();
  expect(storage.getItem('gravityborn.save')).toBe(primary);
  expect(store.state).toBe('loaded');
});

it('recovers a valid backup when the primary checksum is valid but its data is invalid', () => {
  const storage = memory();
  storage.values.set('gravityborn.save', envelope({ shards: -1 }));
  storage.values.set('gravityborn.save.backup', envelope({ shards: 42 }));
  const store = new SaveStore(storage, validate);
  expect(store.load()).toEqual({ shards: 42 });
  expect(store.state).toBe('recovered');
});

it('keeps future backups protected when the primary is damaged', () => {
  const storage = memory();
  const primary = 'damaged';
  const backup = JSON.stringify({ version: 99, payload: { future: true } });
  storage.values.set('gravityborn.save', primary);
  storage.values.set('gravityborn.save.backup', backup);
  const store = new SaveStore(storage, validate);
  expect(store.load()).toBeNull();
  expect(store.state).toBe('future');
  expect(store.save({ shards: 42 })).toBe(false);
  expect(storage.getItem('gravityborn.save')).toBe(primary);
  expect(storage.getItem('gravityborn.save.backup')).toBe(backup);
  expect(storage.writes).toEqual([]);
});

it('validates and bounds a new save before touching either existing record', () => {
  const storage = memory();
  const store = new SaveStore(storage, validate);
  expect(store.save({ shards: 42 })).toBe(true);
  expect(store.save({ shards: 43 })).toBe(true);
  const before = [...storage.values];
  const writes = storage.writes.length;
  expect(store.save({ shards: -1 })).toBe(false);
  expect(store.save({ shards: 44, padding: 'x'.repeat(1000001) })).toBe(false);
  expect([...storage.values]).toEqual(before);
  expect(storage.writes).toHaveLength(writes);
  expect(store.state).toBe('loaded');
});

it('recovers or protects a surviving backup when the primary record is missing', () => {
  const storage = memory();
  storage.values.set('gravityborn.save.backup', envelope({ shards: 42 }));
  const store = new SaveStore(storage, validate);
  expect(store.load()).toEqual({ shards: 42 });
  expect(store.state).toBe('recovered');
  const future = JSON.stringify({ version: 99, payload: { future: true } });
  storage.values.set('gravityborn.save.backup', future);
  expect(store.load()).toBeNull();
  expect(store.readOnly).toBe(true);
  expect(store.save({ shards: 43 })).toBe(false);
  expect(storage.getItem('gravityborn.save')).toBeNull();
  expect(storage.getItem('gravityborn.save.backup')).toBe(future);
});
