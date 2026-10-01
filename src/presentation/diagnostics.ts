import type { LocalDiagnostics } from '../core/diagnostics';
export function diagnosticsView(data: LocalDiagnostics): string {
  const completed = data.counts.RunEnded ?? 0;
  const endedSeconds =
    (data.totals['RunDuration:victory'] ?? 0) + (data.totals['RunDuration:defeat'] ?? 0);
  const choices = Object.entries(data.counts)
    .filter(([id]) => id.startsWith('AbilityChoices:'))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  return `<details><summary>Local play diagnostics · ${data.enabled ? 'recording' : 'disabled'}</summary>
    <p class="dialog-copy">Stored on this device. Export includes gameplay counters and the most recent 300 events, without run seeds or account information.</p>
    <p class="dialog-copy">${data.counts.RunStarted ?? 0} starts · ${completed} endings · ${data.counts.RunAbandoned ?? 0} abandoned · ${Math.round(completed ? endedSeconds / completed : 0)}s average completed duration · ${data.maxima.LongestChain ?? 0} longest chain</p>
    <p class="dialog-copy">Most selected powers: ${choices.map(([id, count]) => `${id.slice(15)} (${count})`).join(', ') || 'No choices recorded yet.'}</p>
    <div class="save-tools"><button class="text-button" data-run-action="diagnostics-toggle">${data.enabled ? 'Disable recording' : 'Enable recording'}</button><button class="text-button" data-run-action="diagnostics-export">Export diagnostics</button><button class="text-button" data-run-action="diagnostics-clear">Clear diagnostics</button></div>
  </details>`;
}
