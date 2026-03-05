import type { ItemDefinition } from '../types';
import { computeIlvl } from '../utils';

// ============================================================
// DEPLOYABLE STRUCTURE ITEMS (4) — consumable category with 'deploy' effect
// Players use these from inventory to enter placement mode
// ============================================================

export const DEPLOYABLE_EXTRACTOR: ItemDefinition = {
  id: 'deployable_extractor',
  displayName: 'Portable Extractor',
  description:
    'A compact extraction unit that can be deployed on resource nodes. Automatically harvests resources when fueled. Limit: 2 per operator. Craftable via the Automation discipline.',
  category: 'consumable',
  rarity: 'common',
  maxStack: 5,
  weight: 5.0,
  baseValue: 500,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'common'),
  textureKey: 'item_deployable',
  color: 0x66bb66,
  effects: [{ trigger: 'on_use', effect: { type: 'deploy', deployableType: 'extractor' } }],
};

export const DEPLOYABLE_SURVEY_BEACON: ItemDefinition = {
  id: 'deployable_survey_beacon',
  displayName: 'Survey Beacon',
  description:
    'An advanced scanning beacon that marks a zone for passive resource caching. Expires after 24 hours. Limit: 1 per operator. Craftable via the Automation discipline.',
  category: 'consumable',
  rarity: 'rare',
  maxStack: 3,
  weight: 5.0,
  baseValue: 1500,
  requiredLevel: 20,
  ilvl: computeIlvl(3, 'rare'),
  textureKey: 'item_deployable',
  color: 0x4488ff,
  effects: [{ trigger: 'on_use', effect: { type: 'deploy', deployableType: 'survey_beacon' } }],
};

export const DEPLOYABLE_PLANETARY_EXTRACTOR: ItemDefinition = {
  id: 'deployable_planetary_extractor',
  displayName: 'Planetary Extractor',
  description:
    'A heavy-duty extraction platform for permanent deployment. Requires regular maintenance and degrades over time. Limit: 3 per operator. Craftable via the Automation discipline.',
  category: 'consumable',
  rarity: 'epic',
  maxStack: 3,
  weight: 5.0,
  baseValue: 5000,
  requiredLevel: 30,
  ilvl: computeIlvl(4, 'epic'),
  textureKey: 'item_deployable',
  color: 0xffcc00,
  effects: [{ trigger: 'on_use', effect: { type: 'deploy', deployableType: 'planetary_extractor' } }],
};

export const DEPLOYABLE_REFINERY: ItemDefinition = {
  id: 'deployable_refinery',
  displayName: 'Resource Refinery',
  description:
    'A sophisticated transmutation facility that converts raw resources into refined materials. Recipes are net-negative in value — the benefit is resource type conversion. Limit: 1 per operator. Craftable via the Automation discipline.',
  category: 'consumable',
  rarity: 'exotic',
  maxStack: 1,
  weight: 5.0,
  baseValue: 10000,
  requiredLevel: 40,
  ilvl: computeIlvl(5, 'exotic'),
  textureKey: 'item_deployable',
  color: 0xff6600,
  effects: [{ trigger: 'on_use', effect: { type: 'deploy', deployableType: 'refinery' } }],
};

export const ALL_DEPLOYABLE_ITEMS: readonly ItemDefinition[] = [
  DEPLOYABLE_EXTRACTOR,
  DEPLOYABLE_SURVEY_BEACON,
  DEPLOYABLE_PLANETARY_EXTRACTOR,
  DEPLOYABLE_REFINERY,
];
