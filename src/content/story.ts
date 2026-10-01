import { regions } from './regions';
import { bossDefinitions } from './bosses';

export const story = regions.map((region) => region.story);
export const secretLore = regions.map((region) => region.secret);
export const planets = regions.map((region, index) => ({
  id: `planet:${index}`,
  ...region.planet,
  biome: region.name,
  enemies: [...region.enemies],
  boss: bossDefinitions[region.guardian].name,
}));
