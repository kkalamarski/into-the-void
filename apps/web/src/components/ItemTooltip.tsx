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
import { extractItemStats, computeEquipmentDelta, AbilityRegistry } from '@into-the-void/game-logic';
import { RARITY_COLORS } from '../ui/constants';
import './ItemTooltip.css';

const ABILITY_CATEGORY_COLORS: Record<string, string> = {
  offensive: '#cc4444',
  defensive: '#4488cc',
  utility: '#44cc88',
};

interface ItemTooltipProps {
  children: React.ReactNode;
  item: ItemDefinition;
  disabled?: boolean;
  equippedItem?: ItemDefinition; // Item currently equipped in same slot for comparison
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

  // Extract this item's stat bonuses to display
  const itemStatBonuses = extractItemStats(item);

  // Compute deltas only when hovering an equippable item AND there's an equipped item to compare against
  const statDeltas = item.equipSlot && equippedItem ? computeEquipmentDelta(item, equippedItem) : [];

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
            {Object.keys(itemStatBonuses).length > 0 && (
              <div className="tooltip-bonuses">
                {Object.entries(itemStatBonuses).map(([stat, value]) => (
                  <div key={stat} className="tooltip-bonus">
                    +{value} {stat}
                  </div>
                ))}
              </div>
            )}
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
            {item.grantedAbilities && item.grantedAbilities.length > 0 && (
              <div className="tooltip-abilities">
                <div className="tooltip-abilities-header">Granted Abilities</div>
                {item.grantedAbilities.map((abilityId) => {
                  const ability = AbilityRegistry.get(abilityId);
                  if (!ability) return null;
                  const color = ABILITY_CATEGORY_COLORS[ability.category] ?? '#888888';
                  return (
                    <div key={abilityId} className="tooltip-ability" style={{ color }}>
                      {ability.displayName}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
