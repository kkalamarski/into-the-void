import React from 'react';
import { getItemSpriteStyle } from '../config/itemSpriteMap';

interface ItemIconProps {
  itemId: string;
  /** Fallback color hex number from item definition */
  fallbackColor: number;
  /** Display size in pixels (default 40) */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders an item sprite from the spritesheet, or falls back to a colored box.
 */
export const ItemIcon: React.FC<ItemIconProps> = ({
  itemId,
  fallbackColor,
  size = 40,
  className = '',
  style = {},
}) => {
  const spriteStyle = getItemSpriteStyle(itemId, size);

  if (spriteStyle) {
    return (
      <div
        className={`item-icon ${className}`}
        style={{
          ...spriteStyle,
          ...style,
          borderRadius: '2px',
        }}
      />
    );
  }

  // Fallback: colored box
  return (
    <div
      className={`item-icon ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: `#${fallbackColor.toString(16).padStart(6, '0')}`,
        borderRadius: '2px',
        ...style,
      }}
    />
  );
};
