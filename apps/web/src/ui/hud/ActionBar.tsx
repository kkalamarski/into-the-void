import React, { useEffect, useState, useMemo } from 'react';
import { useAbilityStore, getEquippedAbilities } from '../../store/abilityStore';
import { useCombatStore } from '../../store/combatStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useActionBarStore } from '../../store/actionBarStore';
import { useGameStore } from '../../store/gameStore';
import { gameSocket } from '../../network/socket';
import type { AbilityDefinition } from '@into-the-void/shared-types';
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSwappingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './ActionBar.css';

const SLOT_COUNT = 8;

interface AbilitySlotContentProps {
  index: number;
  ability: AbilityDefinition | null;
}

function AbilitySlotContent({ index, ability }: AbilitySlotContentProps) {
  const { isOnCooldown, getRemainingCooldown } = useAbilityStore();
  const targetEntityId = useCombatStore((state) => state.targetEntityId);
  const player = useGameStore((state) => state.player);

  const [cooldownProgress, setCooldownProgress] = useState(0);

  // Update cooldown progress for radial display
  useEffect(() => {
    if (!ability) return;

    const updateProgress = () => {
      const remaining = getRemainingCooldown(ability.id);
      if (remaining > 0) {
        const progress = remaining / ability.cooldownMs;
        setCooldownProgress(Math.min(1, progress));
      } else {
        setCooldownProgress(0);
      }
    };

    updateProgress();
    const interval = setInterval(updateProgress, 50);
    return () => clearInterval(interval);
  }, [ability, getRemainingCooldown]);

  const handleClick = () => {
    if (!ability) return;
    if (isOnCooldown(ability.id)) return;
    if (!player || player.energy < ability.energyCost) return;

    gameSocket.emit('ability:use', {
      abilityId: ability.id,
      targetEntityId: ability.requiresTarget ? targetEntityId ?? undefined : undefined,
    });
  };

  const isEmpty = !ability;
  const onCooldown = ability ? isOnCooldown(ability.id) : false;
  const insufficientEnergy = ability && player ? player.energy < ability.energyCost : false;

  return (
    <>
      <span className="ability-key">{index + 1}</span>
      {ability && (
        <>
          <div
            className="ability-icon"
            style={{ backgroundColor: `#${ability.iconColor.toString(16).padStart(6, '0')}` }}
          />
          {cooldownProgress > 0 && (
            <div
              className="ability-cooldown-overlay"
              style={{
                background: `conic-gradient(rgba(0,0,0,0.7) ${cooldownProgress * 360}deg, transparent 0deg)`,
              }}
            />
          )}
          {insufficientEnergy && !onCooldown && (
            <div className="ability-no-energy" />
          )}
        </>
      )}
    </>
  );
}

interface SortableAbilitySlotProps {
  index: number;
  ability: AbilityDefinition | null;
  slotId: string;
}

function SortableAbilitySlot({ index, ability, slotId }: SortableAbilitySlotProps) {
  const { isOnCooldown } = useAbilityStore();
  const player = useGameStore((state) => state.player);
  const targetEntityId = useCombatStore((state) => state.targetEntityId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slotId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : undefined,
  };

  const handleClick = () => {
    if (!ability) return;
    if (isOnCooldown(ability.id)) return;
    if (!player || player.energy < ability.energyCost) return;

    gameSocket.emit('ability:use', {
      abilityId: ability.id,
      targetEntityId: ability.requiresTarget ? targetEntityId ?? undefined : undefined,
    });
  };

  const isEmpty = !ability;
  const onCooldown = ability ? isOnCooldown(ability.id) : false;
  const insufficientEnergy = ability && player ? player.energy < ability.energyCost : false;
  const disabled = onCooldown || insufficientEnergy;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`ability-slot ${isEmpty ? 'ability-slot--empty' : ''} ${disabled ? 'ability-slot--disabled' : ''}`}
      onClick={handleClick}
      title={ability ? `${ability.displayName}\n${ability.description}\nEnergy: ${ability.energyCost}\nCooldown: ${ability.cooldownMs / 1000}s` : undefined}
    >
      <AbilitySlotContent index={index} ability={ability} />
    </div>
  );
}

export const ActionBar: React.FC = () => {
  const { abilityOrder, swapAbilitySlots, setAbilityOrder } = useActionBarStore();
  const inventory = useInventoryStore((state) => state.inventory);
  const targetEntityId = useCombatStore((state) => state.targetEntityId);
  const player = useGameStore((state) => state.player);
  const { isOnCooldown } = useAbilityStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Derive abilities from equipment (re-renders when inventory changes)
  const equippedAbilities = inventory ? getEquippedAbilities() : [];

  // Build ordered slots based on abilityOrder + equipped abilities
  const slots = useMemo(() => {
    const ordered: (AbilityDefinition | null)[] = Array(SLOT_COUNT).fill(null);
    const usedAbilityIds = new Set<string>();

    // First, place abilities in their stored positions
    abilityOrder.forEach((abilityId, index) => {
      if (index >= SLOT_COUNT) return;
      if (!abilityId) return;
      const ability = equippedAbilities.find(a => a.id === abilityId);
      if (ability) {
        ordered[index] = ability;
        usedAbilityIds.add(abilityId);
      }
    });

    // Then, fill remaining slots with unplaced abilities
    let nextSlot = 0;
    for (const ability of equippedAbilities) {
      if (usedAbilityIds.has(ability.id)) continue;
      while (nextSlot < SLOT_COUNT && ordered[nextSlot] !== null) {
        nextSlot++;
      }
      if (nextSlot < SLOT_COUNT) {
        ordered[nextSlot] = ability;
        usedAbilityIds.add(ability.id);
      }
    }

    return ordered;
  }, [equippedAbilities, abilityOrder]);

  // Update stored order when slots change (e.g., new abilities from equipment)
  useEffect(() => {
    const currentOrder = slots.map(s => s?.id ?? null);
    // Only update if different to avoid loops
    if (JSON.stringify(currentOrder) !== JSON.stringify(abilityOrder)) {
      setAbilityOrder(currentOrder);
    }
  }, [slots, abilityOrder, setAbilityOrder]);

  const slotIds = useMemo(() =>
    Array.from({ length: SLOT_COUNT }, (_, i) => `slot-${i}`),
    []
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const fromIndex = slotIds.indexOf(active.id as string);
      const toIndex = slotIds.indexOf(over.id as string);
      swapAbilitySlots(fromIndex, toIndex);
    }
    setActiveId(null);
  };

  const activeSlotIndex = activeId ? slotIds.indexOf(activeId) : -1;
  const activeAbility = activeSlotIndex >= 0 ? slots[activeSlotIndex] : null;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Chat-focus guard
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.repeat) return;

      const slotIndex = parseInt(e.key, 10) - 1;
      if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= SLOT_COUNT) return;

      const ability = slots[slotIndex];
      if (!ability) return;
      if (isOnCooldown(ability.id)) return;
      if (!player || player.energy < ability.energyCost) return;

      gameSocket.emit('ability:use', {
        abilityId: ability.id,
        targetEntityId: ability.requiresTarget ? targetEntityId ?? undefined : undefined,
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [slots, targetEntityId, player, isOnCooldown]);

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={slotIds} strategy={rectSwappingStrategy}>
        <div className="action-bar">
          {slots.map((ability, i) => (
            <SortableAbilitySlot
              key={slotIds[i]}
              index={i}
              ability={ability}
              slotId={slotIds[i]}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeAbility && (
          <div className="ability-slot ability-slot--drag-overlay">
            <AbilitySlotContent index={activeSlotIndex} ability={activeAbility} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
