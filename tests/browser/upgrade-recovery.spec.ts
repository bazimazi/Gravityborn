import { expect, test } from '@playwright/test';
import { abilityById } from '../../src/content/abilities';
import { relicById } from '../../src/content/relics';
import { wellEvolutions } from '../../src/content/well';

test('saved exhausted upgrades recover as usable choices without spending the pending upgrade', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Progression hub' }).click();
  await page.getByRole('button', { name: 'Start selected class', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
  const power = abilityById.get('void_step')!;
  const relic = relicById.get('heavy_heart')!;
  await page.evaluate(
    ({ power, relic, well }) => {
      const data = JSON.parse(localStorage.getItem('gravityborn.save')!).payload;
      data.checkpoint.powers.levels[power.id] = power.maxLevel;
      Object.assign(data.checkpoint.build, {
        wellLevel: well.levels,
        relics: [relic.id],
        pending: 1,
        currency: 75,
        choices: [
          {
            id: `ability:${power.id}`,
            kind: 'ability',
            target: power.id,
            name: power.name,
            description: power.description,
          },
          {
            id: `relic:${relic.id}`,
            kind: 'relic',
            target: relic.id,
            name: relic.name,
            description: relic.description,
          },
          {
            id: 'well:well',
            kind: 'well',
            target: 'well',
            name: well.name,
            description: well.description,
          },
        ],
      });
      data.checkpoint.metrics.assisted = 1;
      localStorage.setItem('gravityborn.save', JSON.stringify({ version: 1, ...data }));
    },
    {
      power,
      relic,
      well: {
        levels: wellEvolutions.length,
        name: wellEvolutions[1].name,
        description: wellEvolutions[1].description,
      },
    },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub' }).click();
  await page.getByRole('button', { name: 'Resume saved route' }).click();
  const state = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            __gravityborn: () => { expedition: { pending: number; currency: number } };
          }
        ).__gravityborn().expedition,
    );
  await expect(page.getByRole('heading', { name: 'Choose your next power' })).toBeVisible();
  const cards = page.locator('[data-upgrade]');
  await expect(cards).toHaveCount(3);
  for (const id of ['ability:void_step', 'relic:heavy_heart', 'well:well'])
    await expect(page.locator(`[data-upgrade="${id}"]`)).toHaveCount(0);
  expect(await state()).toMatchObject({ pending: 1, currency: 75 });
  await cards.first().click();
  await expect(page.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
  expect(await state()).toMatchObject({ pending: 0, currency: 75 });
  await page.reload();
  await page.getByRole('button', { name: 'Progression hub' }).click();
  await page.getByRole('button', { name: 'Resume saved route' }).click();
  await expect(page.getByRole('heading', { name: 'Choose your route' })).toBeVisible();
  expect(await state()).toMatchObject({ pending: 0, currency: 75 });
});
