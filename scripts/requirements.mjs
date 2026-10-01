import fs from 'node:fs';

const path = 'docs/implementation-status.json';
const prior = fs.existsSync(path)
  ? JSON.parse(fs.readFileSync(path, 'utf8'))
  : { requirements: [] };
const requirements = [
  ...fs.readFileSync('docs/design-specification.md', 'utf8').matchAll(/^# (\d+)\. (.+)$/gm),
].map((match) => {
  const id = Number(match[1]);
  return (
    prior.requirements.find((entry) => entry.section === id) ?? {
      section: id,
      title: match[2].trim(),
      status: id === 103 ? 'implemented' : 'pending',
      evidence:
        id === 103
          ? ['src/gameplay/game.ts', 'tests/gameplay.test.ts', 'docs/prototype-review.md']
          : [],
      remaining:
        id === 103
          ? 'External player fun validation remains separate.'
          : 'Implement and verify against the specification.',
    }
  );
});
fs.writeFileSync(
  path,
  JSON.stringify(
    {
      updated: new Date().toISOString().slice(0, 10),
      scope:
        'Full specification; future/example targets are distinguished from shipped implementation.',
      requirements,
    },
    null,
    2,
  ) + '\n',
);
console.log(`${requirements.length} specification sections tracked.`);
