import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useGameStore } from '../store/gameStore';
import { useInventoryStore } from '../store/inventoryStore';
import '../store/statsStore'; // Side-effect: registers stats:update socket handler
import '../store/questStore'; // Side-effect: registers quest socket handlers
import '../store/loreStore'; // Side-effect: registers lore socket handlers
import '../store/zoneMasteryStore'; // Side-effect: registers mastery socket handlers
import '../store/chatStore'; // Side-effect: registers chat:message socket handler
import '../store/moderationStore'; // Side-effect: auto-loads mute/block lists when player authenticates
import '../store/automationStore'; // Side-effect: registers automation socket handlers
import { useActionBarStore } from '../store/actionBarStore';
import { useNpcStore } from '../store/npcStore';
import { useAutomationStore } from '../store/automationStore';
import { useModalStackStore } from '../store/modalStackStore';
import { useCombatStore } from '../store/combatStore';
import { useAbilityStore } from '../store/abilityStore';
import { gameSocket } from '../network/socket';
import { HUD } from './hud/HUD';
import { GameMenu } from './modals/GameMenu';
import { ChatPanel } from './panels/ChatPanel';
import { InventoryPanel } from './panels/InventoryPanel';
import { EquipmentPanel } from './panels/EquipmentPanel';
import { AbilitiesPanel } from './panels/AbilitiesPanel';
import { QuestLogPanel } from './panels/QuestLogPanel';
import { NpcInteractionModal } from './panels/NpcInteractionModal';
import { QuestTracker } from './hud/QuestTracker';
import { AutomationPanel } from './panels/AutomationPanel';
import { LootWindow } from './panels/LootWindow';
import { DeathScreen } from './DeathScreen';
import { AlertNotification } from './AlertNotification';
import { LevelUpNotification } from '../components/LevelUpNotification';
import { QuestCompleteModal } from './modals/QuestCompleteModal';
import { LoreCodex } from '../components/LoreCodex';
import { ZoneMasteryHUD } from '../components/ZoneMasteryHUD';
import './GameUI.css';

export const GameUI: React.FC = () => {
  const { showInventory, showEquipment, showAbilities, showAutomation, showDeathScreen, isQuestLogOpen, player } = useGameStore();
  const { interactingNpc } = useNpcStore();
  const { lootWindow } = useAutomationStore();
  const [shiftHeld, setShiftHeld] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      e.preventDefault();

      // Priority 1: Pop topmost modal from stack
      const topModal = useModalStackStore.getState().peek();
      if (topModal) {
        useModalStackStore.getState().pop();
        topModal.onClose();
        return;
      }

      // Priority 2: Clear in-game state one action per press
      // 2a. Cancel active cast
      if (useAbilityStore.getState().isCasting()) {
        gameSocket.emit('cast:cancel', {});
        return;
      }

      // 2b. Cancel active pathfinding
      const game = useGameStore.getState().game;
      const pathfindingController = game?.getWorldScene()?.getPathfindingController();
      if (pathfindingController?.isPathActive()) {
        pathfindingController.cancelPath();
        return;
      }

      // 2c. Clear selected combat target
      if (useCombatStore.getState().selectedTarget !== null) {
        useCombatStore.getState().selectTarget(null);
        return;
      }

      // Priority 3: Nothing to clear — open the game menu
      setIsMenuOpen(true);
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const activatorEvent = event.activatorEvent as MouseEvent | TouchEvent | undefined;
    if (activatorEvent && 'shiftKey' in activatorEvent) {
      setShiftHeld(activatorEvent.shiftKey);
    } else {
      setShiftHeld(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    // NOTE: Using getState() snapshot is intentional here.
    // Event handlers don't need reactive subscriptions - they read
    // current state at invocation time. This matches existing
    // InventoryPanel patterns and avoids unnecessary re-renders.
    const pendingReorder = useInventoryStore.getState().pendingReorder;
    if (pendingReorder) {
      setShiftHeld(false);
      return;
    }

    const { active, over } = event;
    const dragData = active.data.current;

    // Handle drop-outside-to-remove for action bar abilities.
    // Since ActionBar no longer has its own DndContext, we handle it here.
    if (!over) {
      if (dragData?.type === 'action-bar-ability') {
        const slotIndex = dragData.slotIndex;
        const slotId = String(active.id);
        const barMatch = slotId.match(/bar-(\d+)-slot-/);
        if (barMatch && typeof slotIndex === 'number' && slotIndex >= 0 && slotIndex < 8) {
          const barIndex = parseInt(barMatch[1], 10);
          const store = useActionBarStore.getState();
          if (barIndex === 0) {
            store.removeAbilityFromSlot(slotIndex);
          } else {
            store.removeSecondaryAbilityFromSlot(slotIndex);
          }
        }
      }
      setShiftHeld(false);
      return;
    }

    const overId = String(over.id);
    const activeId = String(active.id);

    // Handle Shift+drag to swap slots within same action bar
    if (shiftHeld && dragData?.type === 'action-bar-ability') {
      const fromId = String(active.id);
      const toId = String(over.id);
      const fromMatch = fromId.match(/bar-(\d+)-slot-(\d+)/);
      const toMatch = toId.match(/bar-(\d+)-slot-(\d+)/);

      if (fromMatch && toMatch && fromMatch[1] === toMatch[1]) {
        const barIndex = parseInt(fromMatch[1], 10);
        const fromIndex = parseInt(fromMatch[2], 10);
        const toIndex = parseInt(toMatch[2], 10);

        if (fromIndex !== toIndex) {
          const store = useActionBarStore.getState();
          if (barIndex === 0) {
            store.swapAbilitySlots(fromIndex, toIndex);
          } else {
            store.swapSecondaryAbilitySlots(fromIndex, toIndex);
          }
        }
      }
      setShiftHeld(false);
      return;
    }

    // Ability from panel to action bar slot (supports both bars via bar-N-slot-N pattern)
    if (dragData?.type === 'ability' && overId.includes('-slot-')) {
      const match = overId.match(/bar-(\d+)-slot-(\d+)/);
      if (match) {
        const barIndex = parseInt(match[1], 10);
        const slotIndex = parseInt(match[2], 10);
        const abilityId = dragData.abilityId;

        if (!isNaN(slotIndex) && slotIndex >= 0 && slotIndex < 8) {
          const store = useActionBarStore.getState();
          if (barIndex === 0) {
            store.assignAbility(slotIndex, abilityId);
          } else {
            store.assignSecondaryAbility(slotIndex, abilityId);
          }
        }
      }
      setShiftHeld(false);
      return;
    }

    // Dropped on hotbar slot — assign to action bar
    if (overId.startsWith('hotbar-')) {
      const slotIndex = parseInt(overId.replace('hotbar-', ''), 10);
      if (!isNaN(slotIndex) && slotIndex >= 0 && slotIndex < 8) {
        useActionBarStore.getState().assign(slotIndex, activeId);
      }
      setShiftHeld(false);
      return;
    }

    // Dropped on equipment slot — emit equip
    if (overId.startsWith('equip-')) {
      gameSocket.emit('equipment:change', { instanceId: activeId });
      setShiftHeld(false);
      return;
    }

    // Dropped on inventory drop zone — unequip if it's an equipped item
    if (overId === 'inventory-drop-zone') {
      // Check if the dragged item is from equipment (has 'equipped' data type)
      if (dragData?.type === 'equipped') {
        gameSocket.emit('inventory:unequip', { instanceId: activeId });
      }
      setShiftHeld(false);
      return;
    }

    // Dropped on inventory slot (reorder) — only if both are inventory items
    const inventory = useInventoryStore.getState().inventory;
    if (!inventory) {
      setShiftHeld(false);
      return;
    }
    const fromItem = inventory.items.find(i => i.instanceId === activeId);
    const toItem = inventory.items.find(i => i.instanceId === overId);
    if (fromItem && toItem && activeId !== overId) {
      useInventoryStore.getState().setPendingReorder(true);
      gameSocket.emit('inventory:reorder', { fromSlot: fromItem.slot, toSlot: toItem.slot });
    }

    setShiftHeld(false);
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
    <>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="game-ui">
        <HUD onMenuOpen={() => setIsMenuOpen(true)} />
        <QuestTracker />
        <ZoneMasteryHUD />
        <ChatPanel />
        {showInventory && <InventoryPanel />}
        {showEquipment && <EquipmentPanel />}
        {showAbilities && <AbilitiesPanel />}
        {isQuestLogOpen && <QuestLogPanel />}
        {showAutomation && <AutomationPanel />}
        {lootWindow && <LootWindow />}
        <LoreCodex />
        <LevelUpNotification />
        <QuestCompleteModal />
        <AlertNotification />
        {showDeathScreen && <DeathScreen />}
        {interactingNpc && <NpcInteractionModal />}
        <div className="minimap-border" />
      </div>
    </DndContext>
    {isMenuOpen && <GameMenu onClose={() => setIsMenuOpen(false)} />}
    </>
  );
};
