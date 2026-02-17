import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useInventoryStore } from '../../store/inventoryStore';
import { useGameStore } from '../../store/gameStore';
import { gameSocket } from '../../network/socket';
import { ItemRegistry } from '@into-the-void/items';
import { RARITY_COLORS } from '../constants';
import './InventoryPanel.css';

interface SortableSlotProps {
  instanceId: string;
  itemId: string;
  quantity: number;
  onContextMenu: (e: React.MouseEvent, instanceId: string) => void;
}

function SortableSlot({ instanceId, itemId, quantity, onContextMenu }: SortableSlotProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: instanceId,
  });
  const itemDef = ItemRegistry.get(itemId);
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderColor: RARITY_COLORS[itemDef.rarity],
  };

  return (
    <div
      ref={setNodeRef}
      className="inventory-slot inventory-slot--filled"
      style={style}
      {...attributes}
      {...listeners}
      onContextMenu={(e) => onContextMenu(e, instanceId)}
    >
      <div
        className="slot-icon"
        style={{ backgroundColor: `#${itemDef.color.toString(16).padStart(6, '0')}` }}
      />
      {quantity > 1 && <span className="slot-quantity">{quantity}</span>}
    </div>
  );
}

export const InventoryPanel: React.FC = () => {
  const { inventory, pendingReorder } = useInventoryStore();
  const { toggleInventory } = useGameStore();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    instanceId: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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

  const sortedItems = [...inventory.items].sort((a, b) => a.slot - b.slot);

  const slots: (typeof sortedItems[number] | null)[] = Array.from(
    { length: inventory.maxSlots },
    (_, i) => sortedItems.find((item) => item.slot === i) ?? null
  );

  const sortableIds = sortedItems.map((i) => i.instanceId);

  const handleDragEnd = (event: DragEndEvent) => {
    if (pendingReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromItem = sortedItems.find((i) => i.instanceId === active.id);
    const toItem = sortedItems.find((i) => i.instanceId === over.id);
    if (!fromItem || !toItem) return;

    useInventoryStore.getState().setPendingReorder(true);
    gameSocket.emit('inventory:reorder', { fromSlot: fromItem.slot, toSlot: toItem.slot });
  };

  const handleContextMenu = (e: React.MouseEvent, instanceId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, instanceId });
  };

  const handleDrop = () => {
    if (!contextMenu) return;
    gameSocket.emit('inventory:drop', { instanceId: contextMenu.instanceId, quantity: 1 });
    setContextMenu(null);
  };

  const handleUse = () => {
    if (!contextMenu) return;
    gameSocket.emit('inventory:use', { instanceId: contextMenu.instanceId });
    setContextMenu(null);
  };

  return (
    <div className="inventory-panel ui-panel">
      <div className="inventory-header">
        <span>Inventory ({inventory.items.length}/{inventory.maxSlots})</span>
        <button className="close-btn" onClick={toggleInventory}>&times;</button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                />
              ) : (
                <div key={`empty-${i}`} className="inventory-slot inventory-slot--empty" />
              )
            )}
          </div>
        </SortableContext>
      </DndContext>
      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button onClick={handleUse}>Use</button>
          <button onClick={handleDrop}>Drop</button>
        </div>
      )}
    </div>
  );
};
