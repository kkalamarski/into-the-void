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
import { RARITY_COLORS } from '../ui/constants';
import './ItemTooltip.css';

interface ItemTooltipProps {
  children: React.ReactNode;
  item: ItemDefinition;
  disabled?: boolean;
}

export const ItemTooltip: React.FC<ItemTooltipProps> = ({ children, item, disabled = false }) => {
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
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
