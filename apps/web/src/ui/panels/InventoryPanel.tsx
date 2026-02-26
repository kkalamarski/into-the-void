import React, { useState, useEffect } from 'react';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useInventoryStore } from '../../store/inventoryStore';
import { useGameStore } from '../../store/gameStore';
import { useModalStack } from '../../hooks/useModalStack';
import { gameSocket } from '../../network/socket';
import { ItemRegistry } from '@into-the-void/items';
import type { InventoryEquipment } from '@into-the-void/shared-types';
import { RARITY_COLORS } from '../constants';
import { ItemTooltip } from '../../components/ItemTooltip';
import { ItemIcon } from '../../components/ItemIcon';
import { useDraggablePanel } from '../../hooks/useDraggablePanel';
import './InventoryPanel.css';

interface SortableSlotProps {
  instanceId: string;
  itemId: string;
  quantity: number;
  onContextMenu: (e: React.MouseEvent, instanceId: string, itemId: string) => void;
  equipment: InventoryEquipment | undefined;
}

function getEquippedForSlot(slot: string | undefined, eq: InventoryEquipment | undefined): string | undefined {
  if (!slot || !eq) return undefined;

  switch (slot) {
    case 'exosuit':
      return eq.exosuit?.itemId;
    case 'tool':
      return eq.tool?.itemId;
    case 'accessory':
      // Compare against accessory1 by default
      return eq.accessory1?.itemId;
    case 'module':
      // Compare against first equipped module
      return eq.modules?.[0]?.itemId;
    default:
      return undefined;
  }
}

function SortableSlot({ instanceId, itemId, quantity, onContextMenu, equipment }: SortableSlotProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: instanceId,
  });
  const itemDef = ItemRegistry.get(itemId);
  const playerLevel = useGameStore(state => state.player?.level ?? 1);
  const isLevelLocked = itemDef.requiredLevel > playerLevel;
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : isLevelLocked ? 0.5 : 1,
    borderColor: RARITY_COLORS[itemDef.rarity],
  };

  const equippedItemId = getEquippedForSlot(itemDef?.equipSlot, equipment);
  const equippedItemDef = equippedItemId ? ItemRegistry.get(equippedItemId) : undefined;

  return (
    <ItemTooltip item={itemDef} disabled={isDragging} equippedItem={equippedItemDef}>
      <div
        ref={setNodeRef}
        className={`inventory-slot inventory-slot--filled ${isLevelLocked ? 'inventory-slot--locked' : ''}`}
        style={style}
        {...attributes}
        {...listeners}
        onContextMenu={(e) => onContextMenu(e, instanceId, itemId)}
      >
        <ItemIcon itemId={itemId} fallbackColor={itemDef.color} size={40} className="slot-icon" />
        {quantity > 1 && <span className="slot-quantity">{quantity}</span>}
      </div>
    </ItemTooltip>
  );
}

function InventoryDropZone({ children, pendingReorder }: { children: React.ReactNode; pendingReorder: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'inventory-drop-zone',
    disabled: pendingReorder,
  });

  return (
    <div
      ref={setNodeRef}
      className={`inventory-drop-zone ${isOver ? 'inventory-drop-zone--over' : ''}`}
    >
      {children}
    </div>
  );
}

export const InventoryPanel: React.FC = () => {
  const { inventory, pendingReorder } = useInventoryStore();
  const { toggleInventory } = useGameStore();
  const { position, isDragging, handleMouseDown } = useDraggablePanel();

  useModalStack('inventory', toggleInventory);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    instanceId: string;
    itemId: string;
  } | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu]);

  // Disable Phaser keyboard when inventory is open
  useEffect(() => {
    const game = useGameStore.getState().game;
    const worldScene = game?.getWorldScene();
    if (worldScene) {
      worldScene.setKeyboardEnabled(false);
    }

    return () => {
      const game = useGameStore.getState().game;
      const worldScene = game?.getWorldScene();
      if (worldScene) {
        worldScene.setKeyboardEnabled(true);
      }
    };
  }, []);

  if (!inventory) return null;

  const maxSlots = inventory.maxSlots || 20; // Default to 20 slots
  const sortedItems = [...inventory.items].sort((a, b) => a.slot - b.slot);

  const slots: (typeof sortedItems[number] | null)[] = Array.from(
    { length: maxSlots },
    (_, i) => sortedItems.find((item) => item.slot === i) ?? null
  );

  const sortableIds = sortedItems.map((i) => i.instanceId);

  const handleContextMenu = (e: React.MouseEvent, instanceId: string, itemId: string) => {
    e.preventDefault();
    // Calculate position relative to panel
    const panelRect = panelRef.current?.getBoundingClientRect();
    const x = panelRect ? e.clientX - panelRect.left : e.clientX;
    const y = panelRect ? e.clientY - panelRect.top : e.clientY;
    setContextMenu({ x, y, instanceId, itemId });
  };

  const handleDrop = () => {
    if (!contextMenu) return;
    gameSocket.emit('inventory:drop', { instanceId: contextMenu.instanceId, quantity: 1 });
    setContextMenu(null);
  };

  const handleUse = () => {
    if (!contextMenu) return;
    const itemDef = ItemRegistry.get(contextMenu.itemId);
    // For equippable items, use equipment:change; for consumables, use inventory:use
    if (itemDef?.equipSlot) {
      gameSocket.emit('equipment:change', { instanceId: contextMenu.instanceId });
    } else {
      gameSocket.emit('inventory:use', { instanceId: contextMenu.instanceId });
    }
    setContextMenu(null);
  };

  return (
    <div
      ref={panelRef}
      className="inventory-panel ui-panel"
      style={{ transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))` }}
    >
      <div
        className={`inventory-header ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <span>Inventory ({inventory.items.length}/{maxSlots})</span>
        <button className="close-btn" onClick={toggleInventory}>&times;</button>
      </div>
      <InventoryDropZone pendingReorder={pendingReorder}>
        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
          <div className="inventory-grid" style={{ pointerEvents: pendingReorder ? 'none' : 'auto' }}>
            {slots.map((item, i) =>
              item ? (
                <SortableSlot
                  key={item.instanceId}
                  instanceId={item.instanceId}
                  itemId={item.itemId}
                  quantity={item.quantity}
                  onContextMenu={handleContextMenu}
                  equipment={inventory.equipment}
                />
              ) : (
                <div key={`empty-${i}`} className="inventory-slot inventory-slot--empty" />
              )
            )}
          </div>
        </SortableContext>
      </InventoryDropZone>
      {contextMenu && (() => {
        const itemDef = ItemRegistry.get(contextMenu.itemId);
        const isEquippable = !!itemDef?.equipSlot;
        return (
          <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button onClick={handleUse}>{isEquippable ? 'Equip' : 'Use'}</button>
            <button onClick={handleDrop}>Drop</button>
          </div>
        );
      })()}
    </div>
  );
};
