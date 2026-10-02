import { isEndlessMode } from '../content/modes';
import type { RunArchive } from '../progression/archive';
import { replayRevision } from '../progression/archive';
import { abilityById } from '../content/abilities';
import { relicById } from '../content/relics';
import { challengeCode } from '../progression/challenge-code';
const escape = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
export function archiveView(archive: RunArchive, selected: string): string {
  const report = archive.reports.find((item) => item.id === selected) ?? archive.reports[0];
  const local = archive.reports.filter((item) => !item.imported && !item.assisted);
  return `<details id="run-archive"><summary>Run archive & ghosts · ${archive.reports.length} records</summary>
  <p class="dialog-copy">Keep the last 20 results and the latest complete victory ghost. Export a run to share its seed, rules, build and route. Imports never award progression. Local records cover only this archive.</p>
  <p class="mono">LOCAL BEST · SCORE ${Math.max(0, ...local.map((r) => r.score))} · CHAIN ${Math.max(0, ...local.map((r) => r.chain))} · DEPTH ${Math.max(0, ...local.filter((r) => isEndlessMode(r.recipe.mode)).map((r) => r.depth))}</p>
  <label class="setting-row">Show matching ghost <input id="ghost-enabled" type="checkbox" ${archive.enabled ? 'checked' : ''}></label>
  <p class="dialog-copy">Ghosts follow chamber time and never collide. Matching seed, rules, starting bonuses and game revision are required. New runs record up to 100 minutes; resumed or assisted runs have results only.</p>
  ${
    report
      ? `<label class="setting-row">Recorded run <select id="archive-selection">${archive.reports.map((item) => `<option value="${escape(item.id)}" ${item.id === report.id ? 'selected' : ''}>${escape(item.recipe.seed)} · ${item.outcome}${item.imported ? ' · imported / unverified' : item.assisted ? ' · assisted' : ''}</option>`).join('')}</select></label>
  <p class="mono">${escape(report.recipe.mode)} · ${escape(report.recipe.classId)} · DIFFICULTY ${report.recipe.difficulty} · ${escape(report.recipe.contract)} · REGION ${report.recipe.biome + 1}</p>
  <p>${report.rooms} rooms · ${report.elapsed.toFixed(1)} seconds · ${report.score} score · ${report.chain} best chain</p>
  <p>Level ${report.level} · Gravity Well ${report.wellLevel}<br>Build: ${report.powers.map((id, index) => `${escape(abilityById.get(id)!.name)} ${report.powerLevels[index]}`).join(' · ') || 'Core powers'}<br>Relics: ${report.relics.map((id) => escape(relicById.get(id)!.name)).join(' · ') || 'None'}<br>Bonuses: ${report.bonuses.map(escape).join(' · ') || 'None'}</p>
  <p class="dialog-copy">${report.ghost.length ? `${report.ghost.length} ghost chambers saved.` : 'No complete ghost saved.'} ${report.revision !== replayRevision ? 'Recorded in an older game revision; route playback is disabled.' : ''}</p>
  <div class="save-tools"><button class="text-button" data-run-action="archive-prepare">Use these run rules</button>
  <button class="text-button" data-run-action="archive-export">Export selected run</button></div>` +
        `<label class="challenge-code">Challenge code<textarea id="shared-challenge-code" rows="3" readonly spellcheck="false">${escape(challengeCode(report.recipe, report.revision))}</textarea></label><button class="text-button" data-run-action="archive-copy-code">Copy challenge code</button>`
      : '<p>No recorded runs yet.</p>'
  }
  <label class="challenge-code">Paste a challenge code<input id="challenge-code" type="text" maxlength="768" placeholder="GB1.…" autocomplete="off" spellcheck="false"></label>
  <p class="dialog-copy">Codes share a seed and run rules. Ordinary runs use your own equipment and research; daily/weekly challenges have fixed starting builds. Codes do not import scores, rewards or ghosts.</p>
  <button class="text-button" data-run-action="archive-code-prepare">Use challenge code</button>
  <div class="save-tools"><label class="text-button">Import shared run <input id="import-run" type="file" accept="application/json" hidden></label>
  <button class="text-button" data-run-action="archive-clear" ${archive.reports.length ? '' : 'disabled'}>Clear local archive</button>
  </div><p class="mono">ARCHIVE: ${archive.state.toUpperCase()}</p></details>`;
}
