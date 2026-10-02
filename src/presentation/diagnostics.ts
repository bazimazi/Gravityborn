import type { LocalDiagnostics } from '../core/diagnostics';
import { modes } from '../content/modes';
import { regions } from '../content/regions';
const roomNames: Record<string, string> = {
  combat: 'Combat',
  elite: 'Elite',
  challenge: 'Challenge',
  boss: 'Guardian',
  puzzle: 'Puzzle',
  secret: 'Hidden vault',
};
export function diagnosticsView(data: LocalDiagnostics): string {
  const completed = data.counts.RunEnded ?? 0;
  const endedSeconds =
    (data.totals['RunDuration:victory'] ?? 0) + (data.totals['RunDuration:defeat'] ?? 0);
  const choices = Object.entries(data.counts)
    .filter(([id]) => id.startsWith('AbilityChoices:'))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const chambers = Object.entries(data.counts)
    .filter(([id]) => id.startsWith('RoomStarted:'))
    .flatMap(([id, attempts]) => {
      const [modeId, regionId, roomType, extra] = id.slice('RoomStarted:'.length).split(':');
      const mode = modes.find((mode) => mode.id === modeId);
      const region = regions.find((region) => region.id === regionId);
      if (
        !mode ||
        !region ||
        !Object.hasOwn(roomNames, roomType) ||
        extra !== undefined ||
        !attempts
      )
        return [];
      const subject = `${modeId}:${regionId}:${roomType}`;
      const cleared = data.counts[`RoomCleared:${subject}`] ?? 0;
      const failed = data.counts[`RoomFailed:${subject}`] ?? 0;
      const abandoned = data.counts[`RoomAbandoned:${subject}`] ?? 0;
      const seconds = data.totals[`RoomCleared:${subject}`] ?? 0;
      const damage = data.totals[`RoomDamage:${subject}`] ?? 0;
      return [
        {
          mode,
          region,
          name: roomNames[roomType],
          attempts,
          cleared,
          failed,
          abandoned,
          seconds,
          damage,
        },
      ];
    })
    .sort(
      (a, b) =>
        b.failed - a.failed || b.attempts - a.attempts || a.region.id.localeCompare(b.region.id),
    )
    .slice(0, 6);
  return `<details><summary>Local play diagnostics · ${data.enabled ? 'recording' : 'disabled'}</summary>
    <p class="dialog-copy">Stored on this device. Export includes gameplay counters and the most recent 300 events, without run seeds or account information.</p>
    <p class="dialog-copy">${data.counts.RunStarted ?? 0} starts · ${completed} endings · ${data.counts.RunAbandoned ?? 0} abandoned · ${Math.round(completed ? endedSeconds / completed : 0)}s average completed duration · ${data.maxima.LongestChain ?? 0} longest chain</p>
    <p class="dialog-copy">Most selected powers: ${choices.map(([id, count]) => `${id.slice(15)} (${count})`).join(', ') || 'No choices recorded yet.'}</p>
    <h3>Chamber outcomes</h3>
    <p class="dialog-copy">Up to six chamber groups, ordered by defeats. Average damage includes all attempts; clear time includes victories only. An interrupted attempt may have no recorded outcome.</p>
    ${chambers.length ? `<div class="codex-grid">${chambers.map((room) => `<article class="codex-entry"><h3>${room.region.name} · ${room.name}</h3><p>${room.mode.name}<br>${room.attempts} attempts · ${room.cleared} cleared · ${room.failed} defeated · ${room.abandoned} abandoned<br>${Math.round(room.damage / room.attempts)} average damage received · ${room.cleared ? `${Math.round(room.seconds / room.cleared)}s average clear` : 'No clears yet'}</p></article>`).join('')}</div>` : '<p class="dialog-copy">No chamber outcomes recorded yet.</p>'}
    <div class="save-tools"><button class="text-button" data-run-action="diagnostics-toggle">${data.enabled ? 'Disable recording' : 'Enable recording'}</button><button class="text-button" data-run-action="diagnostics-export">Export diagnostics</button><button class="text-button" data-run-action="diagnostics-clear">Clear diagnostics</button></div>
  </details>`;
}
