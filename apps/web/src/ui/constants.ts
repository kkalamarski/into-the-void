import type { ItemRarity, CharacterStats } from '@into-the-void/shared-types';

export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#9d9d9d',    // gray
  rare: '#0070dd',      // blue
  epic: '#a335ee',      // purple
  exotic: '#ff8000',    // orange
  legendary: '#e6cc80', // gold
};

export const STAT_DISPLAY_ORDER: Array<{ key: keyof CharacterStats; label: string }> = [
  { key: 'durability', label: 'Durability' },
  { key: 'toughness', label: 'Toughness' },
  { key: 'power', label: 'Power' },
  { key: 'haste', label: 'Haste' },
  { key: 'vigor', label: 'Vigor' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'perception', label: 'Perception' },
  { key: 'resilience', label: 'Resilience' },
];
