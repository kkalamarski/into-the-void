import React, { useState } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react';
import type { ItemDefinition } from '@into-the-void/items';
import { resolveEffectsForTrigger } from '@into-the-void/game-logic';
import { RARITY_COLORS } from '../ui/constants';
import './ItemTooltip.css';

interface ItemTooltipProps {
  children: React.ReactNode;
  item: ItemDefinition;
  disabled?: boolean;
  equippedItem?: ItemDefinition; // Item currently equipped in same slot for comparison
}

function extractStatBonuses(item: ItemDefinition): Record<string, number> {
  const equipEffects = resolveEffectsForTrigger(item.effects, 'on_equip');
  const passiveEffects = resolveEffectsForTrigger(item.effects, 'passive');
  const bonuses: Record<string, number> = {};

  for (const result of [...equipEffects, ...passiveEffects]) {
    for (const [key, value] of Object.entries(result.applied)) {
      if (typeof value === 'number') {
        bonuses[key] = (bonuses[key] ?? 0) + value;
      }
    }
  }
  return bonuses;
}

function computeStatDeltas(
  hoveredItem: ItemDefinition,
  equippedItem: ItemDefinition | undefined
): Array<{ stat: string; delta: number }> {
  const hoveredBonuses = extractStatBonuses(hoveredItem);
  const equippedBonuses = equippedItem ? extractStatBonuses(equippedItem) : {};

  const allStats = new Set([...Object.keys(hoveredBonuses), ...Object.keys(equippedBonuses)]);
  const deltas: Array<{ stat: string; delta: number }> = [];

  for (const stat of allStats) {
    const hoveredVal = hoveredBonuses[stat] ?? 0;
    const equippedVal = equippedBonuses[stat] ?? 0;
    const delta = hoveredVal - equippedVal;
    if (delta !== 0) {
      deltas.push({ stat, delta });
    }
  }

  return deltas;
}

export const ItemTooltip: React.FC<ItemTooltipProps> = ({
  children,
  item,
  disabled = false,
  equippedItem,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen && !disabled,
    onOpenChange: setIsOpen,
    middleware: [offset(10), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, { move: false });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

  const rarityColor = RARITY_COLORS[item.rarity];

  // Compute deltas only when hovering an equippable item
  const statDeltas = item.equipSlot ? computeStatDeltas(item, equippedItem) : [];

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()}>
        {children}
      </div>
      {isOpen && !disabled && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="item-tooltip"
            {...getFloatingProps()}
          >
            <div className="tooltip-name" style={{ color: rarityColor }}>
              {item.displayName}
            </div>
            <div className="tooltip-meta">
              <span className="tooltip-category">{item.category}</span>
              <span className="tooltip-rarity" style={{ color: rarityColor }}>{item.rarity}</span>
            </div>
            <div className="tooltip-description">{item.description}</div>
            <div className="tooltip-stats">
              <span>Item Level: {item.ilvl}</span>
              {item.requiredLevel > 1 && (
                <span>Requires Level {item.requiredLevel}</span>
              )}
            </div>
            {statDeltas.length > 0 && (
              <div className="tooltip-comparison">
                <div className="tooltip-comparison-header">vs Equipped</div>
                {statDeltas.map(({ stat, delta }) => (
                  <div
                    key={stat}
                    className={`tooltip-delta ${delta > 0 ? 'tooltip-delta--positive' : 'tooltip-delta--negative'}`}
                  >
                    {delta > 0 ? '+' : ''}{delta} {stat}
                  </div>
                ))}
              </div>
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
