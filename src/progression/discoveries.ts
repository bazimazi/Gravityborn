import { strings } from '../core/save';

/** Hidden-route flags belong to one region/depth, not the permanent collection. */
export const isRouteDiscovery = (id: string): boolean => /^secret:\d+:\d+$/.test(id);

export function readDiscoveries(value: unknown, max: number, currentSecret?: string): string[] {
  // Migrate older long runs before applying the permanent collection budget.
  // SaveStore also bounds the encoded record; text and raw list bounds still apply here.
  const values = strings(value, 100000);
  return strings(
    [...new Set(values.filter((id) => !isRouteDiscovery(id) || id === currentSecret))],
    max,
  );
}
