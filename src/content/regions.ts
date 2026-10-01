import data from '../data/regions.json' with { type: 'json' };
import type { EntityKind } from '../physics/world';
import type { GravityField } from '../physics/gravity';
import type { BossKind } from './bosses';
import type { Hazard } from './rooms';
import type { Phenomenon } from './phenomena';

export interface RegionDefinition {
  id: string;
  name: string;
  color: string;
  accent: string;
  enemies: EntityKind[];
  guardian: BossKind;
  prop: EntityKind;
  secondaryProp: EntityKind;
  hazard: Hazard['kind'];
  fields: Omit<GravityField, 'id'>[];
  hazards: Hazard[];
  movingWalls: boolean;
  story: { act: string; title: string; intro: string; memory: string };
  secret: { name: string; text: string };
  planet: {
    name: string;
    mass: number;
    radius: number;
    gravity: number;
    atmosphere: string;
    property: string;
    anomalies: Phenomenon[];
    resource: string;
  };
}
/** Append-only order preserves region indexes in existing saves and seeded routes. */
export const regions = data as RegionDefinition[];
