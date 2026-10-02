export const diagnosticEvents = [
  'TutorialCompleted',
  'RunStarted',
  'RunDuration',
  'RunEnded',
  'CauseOfDeath',
  'GravityChanges',
  'AbilityUsage',
  'AbilityChoices',
  'RelicChoices',
  'EnemyKills',
  'CollisionKills',
  'ChainLength',
  'LongestChain',
  'BossAttempts',
  'BossKills',
  'UpgradeRerolls',
  'RunAbandoned',
  'DifficultySelected',
  'RoomStarted',
  'RoomCleared',
  'RoomFailed',
  'RoomAbandoned',
  'RoomDamage',
] as const;
export type DiagnosticEvent = (typeof diagnosticEvents)[number];
export interface DiagnosticSample {
  event: DiagnosticEvent;
  subject?: string;
  value?: number;
}
export interface LocalDiagnostics {
  enabled: boolean;
  counts: Record<string, number>;
  totals: Record<string, number>;
  maxima: Record<string, number>;
  recent: DiagnosticSample[];
}
export function newDiagnostics(): LocalDiagnostics {
  return { enabled: true, counts: {}, totals: {}, maxima: {}, recent: [] };
}
const validSubject = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-zA-Z0-9_:+-]{1,64}$/.test(value);
export function recordDiagnostic(data: LocalDiagnostics, sample: DiagnosticSample): void {
  if (!data.enabled || !diagnosticEvents.includes(sample.event)) return;
  const subject = validSubject(sample.subject) ? sample.subject : undefined;
  const value = Number.isFinite(sample.value)
    ? Math.max(0, Math.min(1e9, sample.value!))
    : undefined;
  for (const key of [sample.event, ...(subject ? [`${sample.event}:${subject}`] : [])]) {
    if (!(key in data.counts) && Object.keys(data.counts).length >= 2000) continue;
    data.counts[key] = Math.min(1e9, (data.counts[key] ?? 0) + 1);
    if (value !== undefined) {
      data.totals[key] = Math.min(1e12, (data.totals[key] ?? 0) + value);
      data.maxima[key] = Math.max(data.maxima[key] ?? 0, value);
    }
  }
  data.recent.push({
    event: sample.event,
    ...(subject ? { subject } : {}),
    ...(value !== undefined ? { value } : {}),
  });
  if (data.recent.length > 300) data.recent.splice(0, data.recent.length - 300);
}
export function readDiagnostics(value: unknown): LocalDiagnostics {
  const output = newDiagnostics();
  if (!value || typeof value !== 'object') return output;
  const data = value as Record<string, unknown>;
  output.enabled = data.enabled !== false;
  for (const category of ['counts', 'totals', 'maxima'] as const) {
    const source = data[category];
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue;
    for (const [key, value] of Object.entries(source).slice(0, 2000)) {
      const split = key.indexOf(':');
      const event = split < 0 ? key : key.slice(0, split);
      const subject = split < 0 ? undefined : key.slice(split + 1);
      if (
        !diagnosticEvents.includes(event as DiagnosticEvent) ||
        (subject !== undefined && !validSubject(subject)) ||
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < 0
      )
        continue;
      output[category][key] = Math.min(category === 'totals' ? 1e12 : 1e9, value);
    }
  }
  if (Array.isArray(data.recent)) {
    const recentOnly = newDiagnostics();
    for (const sample of data.recent.slice(-300)) {
      if (sample && typeof sample === 'object') recordDiagnostic(recentOnly, sample);
    }
    output.recent = recentOnly.recent;
  }
  return output;
}
