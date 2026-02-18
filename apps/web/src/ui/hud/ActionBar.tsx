import React, { useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useActionBarStore } from '../../store/actionBarStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { gameSocket } from '../../network/socket';
import { ItemRegistry } from '@into-the-void/items';
import { RARITY_COLORS } from '../constants';
import { ItemTooltip } from '../../components/ItemTooltip';
import './ActionBar.css';

const SLOT_COUNT = 8;

interface HotbarSlotProps {
  index: number;
  instanceId: string | null;
}

function HotbarSlot({ index, instanceId }: HotbarSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `hotbar-${index}` });
  const inventory = useInventoryStore((state) => state.inventory);

  const item = instanceId
    ? inventory?.items.find((i) => i.instanceId === instanceId) ?? null
    : null;

  const itemDef = item ? ItemRegistry.get(item.itemId) : null;

  const isEmpty = !item || !itemDef;
  const rarityColor = itemDef ? RARITY_COLORS[itemDef.rarity] : undefined;

  const slotContent = (
    <div
      ref={setNodeRef}
      className={`hotbar-slot ${isEmpty ? 'hotbar-slot--empty' : 'hotbar-slot--filled'} ${isOver ? 'hotbar-slot--over' : ''}`}
      style={rarityColor ? { borderColor: rarityColor } : undefined}
    >
      <span className="hotbar-key">{index + 1}</span>
      {itemDef && (
        <div
          className="hotbar-icon"
          style={{ backgroundColor: `#${itemDef.color.toString(16).padStart(6, '0')}` }}
        />
      )}
    </div>
  );

  if (itemDef) {
    return <ItemTooltip item={itemDef}>{slotContent}</ItemTooltip>;
  }

  return slotContent;
}

export const ActionBar: React.FC = () => {
  const slots = useActionBarStore((state) => state.slots);
  const inventory = useInventoryStore((state) => state.inventory);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Chat-focus guard: ignore keypresses when an input or textarea is focused
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      // Ignore repeated events (held key)
      if (e.repeat) return;

      const slotIndex = parseInt(e.key, 10) - 1;
      if (isNaN(slotIndex) || slotIndex < 0 || slotIndex > 7) return;

      const instanceId = slots[slotIndex];
      if (!instanceId) return;

      // Verify item is still in inventory
      const found = inventory?.items.find((i) => i.instanceId === instanceId);
      if (!found) return;

      gameSocket.emit('inventory:use', { instanceId });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [slots, inventory]);

  return (
    <div className="hotbar">
      {Array.from({ length: SLOT_COUNT }, (_, i) => (
        <HotbarSlot key={i} index={i} instanceId={slots[i]} />
      ))}
    </div>
  );
};
