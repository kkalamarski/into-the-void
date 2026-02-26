import type { CSSProperties } from 'react';

/**
 * Maps ability IDs to their sprite positions in the ability icon spritesheets.
 * Each spritesheet is a 4x4 grid (16 icons) of 64x64px icons.
 */
export const ABILITY_ICON_MAP: Record<string, { sheet: number; row: number; col: number }> = {
  // Basic abilities
  basic_strike: { sheet: 3, row: 0, col: 0 },
  shield_bash: { sheet: 2, row: 0, col: 0 },
  energy_pulse: { sheet: 2, row: 2, col: 0 },

  // Offensive abilities
  electrocute: { sheet: 1, row: 0, col: 1 },
  plasma_burst: { sheet: 2, row: 1, col: 0 },
  concussive_strike: { sheet: 2, row: 3, col: 0 },
  thermal_lance: { sheet: 2, row: 0, col: 1 },
  void_drain: { sheet: 3, row: 1, col: 1 },
  cryo_blast: { sheet: 2, row: 3, col: 1 },
  overload_pulse: { sheet: 1, row: 1, col: 0 },
  precision_shot: { sheet: 1, row: 0, col: 3 },

  // Defensive abilities
  nano_repair: { sheet: 2, row: 3, col: 2 },
  magnetic_field: { sheet: 1, row: 1, col: 2 },
  emergency_shield: { sheet: 3, row: 2, col: 2 },
  regeneration_protocol: { sheet: 3, row: 2, col: 0 },
  fortify_systems: { sheet: 3, row: 1, col: 0 },
  energy_barrier: { sheet: 3, row: 3, col: 3 },

  // Utility abilities
  resource_scan: { sheet: 1, row: 2, col: 0 },
  overclock: { sheet: 1, row: 2, col: 1 },
  power_surge: { sheet: 2, row: 2, col: 2 },
  analyze_specimen: { sheet: 2, row: 0, col: 3 },

  // Utility - recall
  home_recall: { sheet: 1, row: 2, col: 1 },

  // Gathering abilities
  gather: { sheet: 3, row: 3, col: 2 },
  mine: { sheet: 1, row: 3, col: 0 },
  harvest: { sheet: 3, row: 3, col: 2 },
  basic_mine: { sheet: 1, row: 3, col: 0 },
  basic_harvest: { sheet: 3, row: 3, col: 2 },
};

export const ICON_SIZE = 64;
export const SHEET_SIZE = 256;

/**
 * Returns CSS properties to display a specific ability's icon from its spritesheet.
 * Returns empty object if no mapping exists for the ability.
 *
 * @param abilityId - The ability ID to get the icon for
 * @param targetSize - The desired display size in pixels (default: 64, original size)
 */
export function getAbilityIconStyle(abilityId: string, targetSize: number = ICON_SIZE): CSSProperties {
  const mapping = ABILITY_ICON_MAP[abilityId];
  if (!mapping) {
    return {};
  }

  const scale = targetSize / ICON_SIZE;
  const sheetUrl = `/assets/sprites/abilities/abilities-${mapping.sheet}.png`;
  const x = mapping.col * ICON_SIZE * scale;
  const y = mapping.row * ICON_SIZE * scale;
  const scaledSheetSize = SHEET_SIZE * scale;

  return {
    backgroundImage: `url(${sheetUrl})`,
    backgroundPosition: `-${x}px -${y}px`,
    backgroundSize: `${scaledSheetSize}px ${scaledSheetSize}px`,
  };
}
