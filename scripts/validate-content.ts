import { validateContent } from '../src/content/validate';
import { abilities } from '../src/content/abilities';
import { relics } from '../src/content/relics';
import { equipment } from '../src/content/equipment';
import { challenges } from '../src/content/challenges';
const issues = validateContent();
for (const issue of issues) console.error(`${issue.path}: ${issue.message}`);
console.log(
  JSON.stringify({
    abilities: abilities.length,
    relics: relics.length,
    equipment: equipment.length,
    challenges: challenges.length,
    issues: issues.length,
  }),
);
if (issues.length) process.exitCode = 1;
