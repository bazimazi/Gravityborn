import { abilities, type AbilityDefinition } from './abilities';
import { relics, synergies } from './relics';
import { classes } from './classes';
import { equipment, equipmentSets, equipmentSlots } from './equipment';
import { researchNodes, mutations } from './research';
import { encounters } from './events';
import { challenges } from './challenges';
import { entityDefinitions } from './enemies';
import { biomes } from './rooms';
import { regionGuardians, bossDefinitions } from './bosses';
import { planets, story, secretLore } from './story';
import limits from '../data/stat-limits.json';
import {
  conditionStats,
  type Modifier,
  type TriggerRule,
  type ModifierCondition,
} from '../progression/modifiers';
import { enemyVariants, eliteCompatibility } from './variants';
import { eliteModifiers } from './enemies';
import { phenomena } from './phenomena';
import { coreCosmetics, challengeMemories } from './cosmetics';
import { regions, type RegionDefinition } from './regions';

export interface ContentIssue {
  path: string;
  message: string;
}
const effects = [
  'field',
  'impulse',
  'lock',
  'dash',
  'theft',
  'transfer',
  'beam',
  'collapse',
  'burst',
  'planet',
  'chain',
  'reverse',
  'rotate',
  'reflect',
];
const isNumber = (value: number, min: number, max: number): boolean =>
  Number.isFinite(value) && value >= min && value <= max;
function identities(items: readonly { id: string }[], category: string): ContentIssue[] {
  const seen = new Set<string>();
  const issues: ContentIssue[] = [];
  for (const item of items) {
    if (!/^[a-z][a-z0-9_]*$/.test(item.id) || seen.has(item.id))
      issues.push({
        path: `${category}.${item.id}`,
        message: 'ID must be unique and use lowercase letters, digits or underscores.',
      });
    seen.add(item.id);
  }
  return issues;
}
export function validateRegions(catalog: readonly RegionDefinition[]): ContentIssue[] {
  const issues = identities(catalog, 'regions');
  const check = (valid: boolean, path: string, message: string): void => {
    if (!valid) issues.push({ path, message });
  };
  check(catalog.length > 0 && catalog.length <= 100, 'regions', 'Use one to 100 regions.');
  for (const region of catalog) {
    const path = `regions.${region.id}`;
    check(
      /^#[0-9a-f]{6}$/i.test(region.color) && /^#[0-9a-f]{6}$/i.test(region.accent),
      path,
      'Use six-digit region colors.',
    );
    check(region.guardian in bossDefinitions, `${path}.guardian`, 'Unknown guardian.');
    check(
      region.enemies.length > 0 && region.enemies.every((id) => id in eliteCompatibility),
      `${path}.enemies`,
      'Choose enemies with registered elite compatibility.',
    );
    check(
      [region.prop, region.secondaryProp].every(
        (id) => id in entityDefinitions && entityDefinitions[id].faction === 'neutral',
      ),
      `${path}.props`,
      'Region props must be physical objects.',
    );
    check(
      ['spikes', 'laser', 'wind', 'crusher'].includes(region.hazard),
      `${path}.hazard`,
      'Unknown hazard.',
    );
    check(
      [region.name, ...Object.values(region.story), ...Object.values(region.secret)].every(
        (value) => typeof value === 'string' && value.length > 0 && value.length <= 1000,
      ),
      path,
      'Region narrative text must be nonempty and bounded.',
    );
    check(
      isNumber(region.planet.mass, 0.001, 1000) &&
        isNumber(region.planet.radius, 1, 1000000) &&
        isNumber(region.planet.gravity, 0, 100),
      `${path}.planet`,
      'Invalid planetary properties.',
    );
    check(
      region.planet.anomalies.length > 0 &&
        region.planet.anomalies.every((id) => phenomena.some((item) => item.id === id)),
      `${path}.anomalies`,
      'Unknown planetary anomaly.',
    );
    check(
      region.fields.length <= 20 && region.hazards.length <= 20,
      path,
      'Region environment exceeds its field/hazard budget.',
    );
    for (const field of region.fields) {
      check(
        ['radial', 'vortex', 'zero', 'directional'].includes(field.mode) &&
          ['linear', 'constant', 'inverseSquare'].includes(field.falloff) &&
          field.source === 'environment',
        `${path}.fields`,
        'Invalid field kind, falloff or owner.',
      );
      check(
        isNumber(field.radius, 1, 2400) &&
          isNumber(field.strength, -1, 1) &&
          isNumber(field.remaining, 0.1, 86400) &&
          [field.position.x, field.position.y, field.direction.x, field.direction.y].every(
            (value) => isNumber(value, -2400, 2400),
          ),
        `${path}.fields`,
        'Invalid field parameters.',
      );
    }
    for (const hazard of region.hazards)
      check(
        ['spikes', 'laser', 'wind', 'crusher'].includes(hazard.kind) &&
          isNumber(hazard.width, 1, 1200) &&
          isNumber(hazard.height, 1, 800) &&
          isNumber(hazard.x, 0, 1200) &&
          isNumber(hazard.y, 0, 800) &&
          isNumber(hazard.period, 0.1, 60) &&
          isNumber(hazard.phase, 0, 60),
        `${path}.hazards`,
        'Invalid environmental hazard.',
      );
  }
  return issues;
}
export function validateAbilities(catalog: readonly AbilityDefinition[]): ContentIssue[] {
  const issues = identities(catalog, 'abilities');
  const byId = new Map(catalog.map((item) => [item.id, item]));
  for (const item of catalog) {
    const check = (valid: boolean, key: string, message: string): void => {
      if (!valid) issues.push({ path: `abilities.${item.id}.${key}`, message });
    };
    check(
      item.name.trim().length > 0 && item.description.trim().length > 0,
      'text',
      'Name and description are required.',
    );
    check(effects.includes(item.effect), 'effect', 'Unknown effect.');
    check(
      item.tags.length > 0 && new Set(item.tags).size === item.tags.length,
      'tags',
      'Provide distinct synergy tags.',
    );
    check(
      ['common', 'rare', 'epic', 'legendary'].includes(item.rarity),
      'rarity',
      'Unknown rarity.',
    );
    for (const [key, min, max] of [
      ['energy', 0, 500],
      ['cooldown', 0.25, 120],
      ['radius', 0, 600],
      ['strength', -32, 32],
      ['duration', 0, 20],
      ['maxLevel', 1, 10],
    ] as const)
      check(isNumber(item[key], min, max), key, `Value must be finite and within ${min}–${max}.`);
    check(Number.isInteger(item.maxLevel), 'maxLevel', 'Maximum level must be an integer.');
    if (['field', 'collapse', 'planet', 'reflect'].includes(item.effect))
      check(
        item.duration > 0 && item.radius > 0,
        'duration',
        'Persistent fields require positive radius and duration.',
      );
    if (item.effect === 'field')
      check(
        ['radial', 'vortex', 'directional', 'zero'].includes(item.mode ?? ''),
        'mode',
        'Field requires a valid gravity mode.',
      );
    if (item.effect === 'theft')
      check(
        item.strength > 0 && item.strength <= 1,
        'strength',
        'Theft response must be in (0, 1].',
      );
    const chain = new Set([item.id]);
    let parent = item;
    while (parent.evolution) {
      const next = byId.get(parent.evolution);
      if (!next || chain.has(next.id)) {
        check(false, 'evolution', 'Evolution references must exist and cannot form cycles.');
        break;
      }
      chain.add(next.id);
      parent = next;
    }
    const p = item.parameters;
    if (p?.travelSpeed !== undefined)
      check(
        item.effect === 'field' && isNumber(p.travelSpeed, 1, 800),
        'parameters.travelSpeed',
        'Traveling fields require a speed from 1–800 world units per second.',
      );
    if (p?.planetCount !== undefined)
      check(
        Number.isInteger(p.planetCount) && isNumber(p.planetCount, 1, 4),
        'parameters.planetCount',
        'Use one to four physical planets.',
      );
    if (p?.momentumScale !== undefined)
      check(
        isNumber(p.momentumScale, -2, 2),
        'parameters.momentumScale',
        'Momentum multiplier must be finite and bounded.',
      );
    if (p?.collapseMultiplier !== undefined)
      check(
        isNumber(p.collapseMultiplier, 0, 8),
        'parameters.collapseMultiplier',
        'Compression multiplier must be within 0–8.',
      );
    if (p?.chainTargets !== undefined)
      check(
        Number.isInteger(p.chainTargets) && isNumber(p.chainTargets, 1, 12),
        'parameters.chainTargets',
        'Chain targets must be an integer from 1–12.',
      );
    if (p?.affects)
      check(
        p.affects.length > 0 &&
          p.affects.every((tag) =>
            Object.values(entityDefinitions).some(
              (entity) => entity.material === tag || entity.tags.includes(tag),
            ),
          ),
        'parameters.affects',
        'Filters must match an existing material or tag.',
      );
    if (item.feedback?.color)
      check(
        /^#[0-9a-f]{6}$/i.test(item.feedback.color),
        'feedback.color',
        'Use a six-digit hex color.',
      );
    for (const key of ['startFrequency', 'endFrequency'] as const)
      if (item.feedback?.[key] !== undefined)
        check(
          isNumber(item.feedback[key]!, 20, 2000),
          `feedback.${key}`,
          'Frequency must be within 20–2000 Hz.',
        );
    if (item.feedback?.soundDuration !== undefined)
      check(
        isNumber(item.feedback.soundDuration, 0.03, 2),
        'feedback.soundDuration',
        'Sound must last 0.03–2 seconds.',
      );
  }
  return issues;
}
export function validateContent(): ContentIssue[] {
  const issues = validateAbilities(abilities);
  issues.push(...validateRegions(regions));
  issues.push(...identities(enemyVariants, 'variants'));
  const check = (valid: boolean, path: string, message: string): void => {
    if (!valid) issues.push({ path, message });
  };
  const powerIds = new Set(abilities.map((item) => item.id));
  issues.push(...identities(coreCosmetics, 'cosmetics'));
  for (const reward of [...coreCosmetics, ...challengeMemories])
    check(
      !reward.challenge || challenges.some((challenge) => challenge.id === reward.challenge),
      'challengeRewards',
      'Unknown challenge reward requirement.',
    );
  for (const variant of enemyVariants)
    check(
      variant.kind in entityDefinitions && eliteModifiers.includes(variant.elite),
      `variants.${variant.id}`,
      'Unknown archetype or elite behavior.',
    );
  const itemIds = new Set(equipment.map((item) => item.id));
  for (const [name, catalog] of [
    ['relics', relics],
    ['classes', classes],
    ['equipment', equipment],
    ['research', researchNodes],
    ['mutations', mutations],
    ['encounters', encounters],
    ['challenges', challenges],
    ['synergies', synergies],
  ] as const)
    issues.push(...identities(catalog, name));
  const modifiers = (
    path: string,
    values: readonly Omit<Modifier, 'id'>[] = [],
    triggers: readonly Omit<TriggerRule, 'id'>[] = [],
  ): void => {
    const conditions = (values: readonly ModifierCondition[] | undefined): void => {
      if (!values) return;
      check(values.length > 0 && values.length <= 8, path, 'Use one to eight conditions.');
      for (const condition of values) {
        check(conditionStats.includes(condition.stat), path, 'Unknown condition context.');
        check(
          ['lt', 'lte', 'gt', 'gte', 'eq'].includes(condition.comparison),
          path,
          'Unknown condition comparison.',
        );
        check(
          isNumber(condition.value, 0, condition.stat.endsWith('Ratio') ? 1 : 1000),
          path,
          'Invalid condition threshold.',
        );
      }
    };
    for (const value of values) {
      conditions(value.conditions);
      check(
        !value.conditions ||
          !['maxHealth', 'maxEnergy', 'mass', 'gravityResponse', 'randomGravity'].includes(
            value.stat,
          ),
        path,
        'Resource ceilings and persistent body properties must be unconditional.',
      );
      check(
        value.stat in limits || value.stat === 'randomGravity',
        path,
        `Unknown stat ${value.stat}.`,
      );
      check(Number.isFinite(value.value), path, 'Modifier values must be finite.');
      check(
        ['add', 'multiply', 'override'].includes(value.operation),
        path,
        'Unknown modifier operation.',
      );
    }
    for (const rule of triggers) {
      conditions(rule.conditions);
      check(
        [
          'heal',
          'energy',
          'store',
          'shield',
          'revive',
          'echo',
          'orbit',
          'personal',
          'afterimage',
          'horizon',
        ].includes(rule.effect),
        path,
        `Unknown trigger effect ${rule.effect}.`,
      );
      check(
        Number.isFinite(rule.value) && isNumber(rule.cooldown, 0.01, 36000),
        path,
        'Triggers require a finite value and positive cooldown.',
      );
    }
  };
  for (const relic of relics) modifiers(`relics.${relic.id}`, relic.modifiers, relic.triggers);
  for (const item of equipment) {
    modifiers(`equipment.${item.id}`, item.modifiers, item.triggers);
    check(
      equipmentSlots.includes(item.slot) &&
        (equipmentSets.has(item.set) || (item.set === 'unique' && item.rarity === 'legendary')),
      `equipment.${item.id}`,
      'Unknown equipment slot or set.',
    );
  }
  for (const item of classes) {
    modifiers(`classes.${item.id}`, item.modifiers);
    check(
      item.powers.every((id) => powerIds.has(id)),
      `classes.${item.id}`,
      'Unknown starting power.',
    );
  }
  for (const item of mutations) modifiers(`mutations.${item.id}`, item.modifiers, item.triggers);
  for (const item of researchNodes) {
    modifiers(`research.${item.id}`, item.modifier ? [item.modifier] : []);
    const seen = new Set([item.id]);
    let node = item;
    while (node.requires) {
      const parent = researchNodes.find((item) => item.id === node.requires);
      if (!parent || seen.has(parent.id)) {
        check(false, `research.${item.id}`, 'Prerequisites must exist and cannot cycle.');
        break;
      }
      seen.add(parent.id);
      node = parent;
    }
  }
  const buildTags = new Set([...abilities, ...relics].flatMap((item) => item.tags));
  for (const item of synergies) {
    modifiers(`synergies.${item.id}`, item.modifiers, item.triggers);
    check(
      Boolean(item.requires?.length || item.requiresTags?.length),
      `synergies.${item.id}`,
      'A synergy needs a power or tag requirement.',
    );
    check(
      Boolean(item.modifiers?.length || item.triggers?.length),
      `synergies.${item.id}`,
      'A synergy needs an effect.',
    );
    check(
      (item.requires ?? []).every((id) => powerIds.has(id)) &&
        (item.requiresTags ?? []).every((tag) => buildTags.has(tag)),
      `synergies.${item.id}`,
      'Unknown synergy power or tag.',
    );
  }
  for (const item of encounters)
    for (const choice of item.choices) {
      check(
        !choice.power || powerIds.has(choice.power),
        `encounters.${item.id}.${choice.id}`,
        'Unknown power reward.',
      );
      check(
        !choice.mutation || mutations.some((item) => item.id === choice.mutation),
        `encounters.${item.id}.${choice.id}`,
        'Unknown mutation reward.',
      );
    }
  for (const item of challenges) {
    check(
      !item.equipment || itemIds.has(item.equipment),
      `challenges.${item.id}`,
      'Unknown equipment reward.',
    );
    check(
      !item.ability || ['well', 'flip'].includes(item.ability) || powerIds.has(item.ability),
      `challenges.${item.id}`,
      'Unknown mastery power.',
    );
    check(
      isNumber(item.target, 1, 1e9),
      `challenges.${item.id}`,
      'Challenge target must be positive and finite.',
    );
  }
  check(
    [planets, story, secretLore, regionGuardians].every((items) => items.length === biomes.length),
    'biomes',
    'Every biome needs a planet, story, hidden lore and guardian.',
  );
  for (const [index, biome] of biomes.entries()) {
    check(
      planets[index].anomalies.every((id) => phenomena.some((item) => item.id === id)),
      `planets.${index}.anomalies`,
      'Unknown planetary anomaly.',
    );
    check(
      biome.enemies.every((id) => id in entityDefinitions),
      `biomes.${index}`,
      'Unknown enemy.',
    );
    check(regionGuardians[index] in bossDefinitions, `biomes.${index}`, 'Unknown guardian.');
  }
  return issues;
}
