import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { useGameStore } from '../store/gameStore';
import { useInventoryStore } from '../store/inventoryStore';
import '../store/statsStore'; // Side-effect: registers stats:update socket handler
import { useActionBarStore } from '../store/actionBarStore';
import { useNpcStore } from '../store/npcStore';
import { gameSocket } from '../network/socket';
import { HUD } from './hud/HUD';
import { ChatPanel } from './panels/ChatPanel';
import { InventoryPanel } from './panels/InventoryPanel';
import { EquipmentPanel } from './panels/EquipmentPanel';
import { NpcInteractionModal } from './panels/NpcInteractionModal';
import { TradingPanel } from './panels/TradingPanel';
import { DeathScreen } from './DeathScreen';
import { AlertNotification } from './AlertNotification';
import { LevelUpNotification } from '../components/LevelUpNotification';
import './GameUI.css';

export const GameUI: React.FC = () => {
  const { showChat, showInventory, showEquipment, showDeathScreen, player } = useGameStore();
  const { interactingNpc, showTrading } = useNpcStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    // NOTE: Using getState() snapshot is intentional here.
    // Event handlers don't need reactive subscriptions - they read
    // current state at invocation time. This matches existing
    // InventoryPanel patterns and avoids unnecessary re-renders.
    const pendingReorder = useInventoryStore.getState().pendingReorder;
    if (pendingReorder) return;
    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    const activeId = String(active.id);

    // Dropped on hotbar slot — assign to action bar
    if (overId.startsWith('hotbar-')) {
      const slotIndex = parseInt(overId.replace('hotbar-', ''), 10);
      if (!isNaN(slotIndex) && slotIndex >= 0 && slotIndex < 8) {
        useActionBarStore.getState().assign(slotIndex, activeId);
      }
      return;
    }

    // Dropped on equipment slot — emit equip
    if (overId.startsWith('equip-')) {
      gameSocket.emit('equipment:change', { instanceId: activeId });
      return;
    }

    // Dropped on inventory slot (reorder) — only if both are inventory items
    const inventory = useInventoryStore.getState().inventory;
    if (!inventory) return;
    const fromItem = inventory.items.find(i => i.instanceId === activeId);
    const toItem = inventory.items.find(i => i.instanceId === overId);
    if (fromItem && toItem && activeId !== overId) {
      useInventoryStore.getState().setPendingReorder(true);
      gameSocket.emit('inventory:reorder', { fromSlot: fromItem.slot, toSlot: toItem.slot });
    }
  };

  if (!player) {
    // Show login/character select UI
    return (
      <div className="game-ui">
        <div className="main-menu">
          <h1>Into the Void</h1>
          <p>Press any key to continue...</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="game-ui">
        <HUD />
        {showChat && <ChatPanel />}
        {showInventory && <InventoryPanel />}
        {showEquipment && <EquipmentPanel />}
        <LevelUpNotification />
        <AlertNotification />
        {showDeathScreen && <DeathScreen />}
        {interactingNpc && <NpcInteractionModal />}
        {showTrading && <TradingPanel />}
        <div className="minimap-border" />
      </div>
    </DndContext>
  );
};
