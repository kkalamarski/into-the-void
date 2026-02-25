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
import type { AbilityDefinition, AbilityEffect } from '@into-the-void/shared-types';
import { getAbilityIconStyle } from '../utils/abilityIcons';
import './AbilityTooltip.css';

interface AbilityTooltipProps {
  children: React.ReactNode;
  ability: AbilityDefinition;
  disabled?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  offensive: '#cc4444',
  defensive: '#4488cc',
  utility: '#44cc88',
};

const CATEGORY_LABELS: Record<string, string> = {
  offensive: 'Offensive',
  defensive: 'Defensive',
  utility: 'Utility',
};

function formatEffect(effect: AbilityEffect): string {
  switch (effect.type) {
    case 'damage':
      return `Deals ${effect.baseDamage} base damage (${(effect.scaling * 100).toFixed(0)}% scaling)`;
    case 'heal':
      return `Heals ${effect.baseHeal} HP (${(effect.scaling * 100).toFixed(0)}% scaling)`;
    case 'buff':
      return `+${effect.amount} ${effect.stat} for ${(effect.duration / 1000).toFixed(0)}s`;
    case 'dot':
      return `${effect.damagePerTick} damage every ${(effect.tickInterval / 1000).toFixed(1)}s for ${(effect.duration / 1000).toFixed(0)}s`;
    case 'hot':
      return `${effect.healPerTick} heal every ${(effect.tickInterval / 1000).toFixed(1)}s for ${(effect.duration / 1000).toFixed(0)}s`;
    default:
      return '';
  }
}

export const AbilityTooltip: React.FC<AbilityTooltipProps> = ({
  children,
  ability,
  disabled = false,
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

  const categoryColor = CATEGORY_COLORS[ability.category] ?? '#888888';
  const categoryLabel = CATEGORY_LABELS[ability.category] ?? ability.category;

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
            className="ability-tooltip"
            {...getFloatingProps()}
          >
            <div className="ability-tooltip-header">
              <div
                className="ability-tooltip-icon"
                style={getAbilityIconStyle(ability.id, 32)}
              />
              <div className="ability-tooltip-title">
                <div className="ability-tooltip-name" style={{ color: categoryColor }}>
                  {ability.displayName}
                </div>
                <span
                  className="ability-tooltip-category"
                  style={{ backgroundColor: categoryColor }}
                >
                  {categoryLabel}
                </span>
              </div>
            </div>
            <div className="ability-tooltip-description">{ability.description}</div>
            <div className="ability-tooltip-stats">
              <div className="ability-tooltip-stat">
                <span className="ability-tooltip-stat-label">Energy Cost</span>
                <span className="ability-tooltip-stat-value">{ability.energyCost}</span>
              </div>
              <div className="ability-tooltip-stat">
                <span className="ability-tooltip-stat-label">Cooldown</span>
                <span className="ability-tooltip-stat-value">{(ability.cooldownMs / 1000).toFixed(1)}s</span>
              </div>
              {ability.range > 0 && (
                <div className="ability-tooltip-stat">
                  <span className="ability-tooltip-stat-label">Range</span>
                  <span className="ability-tooltip-stat-value">{ability.range} tiles</span>
                </div>
              )}
              {ability.range === 0 && (
                <div className="ability-tooltip-stat">
                  <span className="ability-tooltip-stat-label">Range</span>
                  <span className="ability-tooltip-stat-value">Self</span>
                </div>
              )}
            </div>
            {ability.effects.length > 0 && (
              <div className="ability-tooltip-effects">
                <div className="ability-tooltip-effects-header">Effects</div>
                {ability.effects.map((effect, index) => (
                  <div key={index} className="ability-tooltip-effect">
                    {formatEffect(effect)}
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
