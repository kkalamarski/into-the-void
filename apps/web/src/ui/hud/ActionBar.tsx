import React, { useEffect, useState, useMemo } from 'react';
import { useAbilityStore, getEquippedAbilities } from '../../store/abilityStore';
import { useCombatStore } from '../../store/combatStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useActionBarStore } from '../../store/actionBarStore';
import { useGameStore } from '../../store/gameStore';
import { useUiSettingsStore } from '../../store/uiSettingsStore';
import { gameSocket } from '../../network/socket';
import type { AbilityDefinition } from '@into-the-void/shared-types';
import { SortableContext, useSortable, rectSwappingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AbilityTooltip } from '../../components/AbilityTooltip';
import { getAbilityIconStyle } from '../../utils/abilityIcons';
import './ActionBar.css';

const SLOT_COUNT = 8;

interface AbilitySlotContentProps {
  index: number;
  ability: AbilityDefinition | null;
  barIndex: 0 | 1;
}

function AbilitySlotContent({ index, ability, barIndex }: AbilitySlotContentProps) {
  const { isOnCooldown, getRemainingCooldown } = useAbilityStore();
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

  const onCooldown = ability ? isOnCooldown(ability.id) : false;
  const insufficientEnergy = ability && player ? player.energy < ability.energyCost : false;

  // Key label: primary bar shows "1"-"8", secondary bar shows "S1"-"S8"
  const keyLabel = barIndex === 0 ? `${index + 1}` : `S${index + 1}`;

  return (
    <>
      <span className="ability-key">{keyLabel}</span>
      {ability && (
        <>
          <div
            className="ability-icon"
            style={getAbilityIconStyle(ability.id, 48)}
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
  barIndex: 0 | 1;
}

function SortableAbilitySlot({ index, ability, slotId, barIndex }: SortableAbilitySlotProps) {
  const { isOnCooldown } = useAbilityStore();
  const player = useGameStore((state) => state.player);
  const selectedTarget = useCombatStore((state) => state.selectedTarget);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: slotId,
    data: { type: 'action-bar-ability', slotIndex: index, abilityId: ability?.id, barIndex }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : undefined,
  };

  const isCasting = useAbilityStore((s) => s.isCasting);

  const handleClick = () => {
    if (isDragging) return; // CRITICAL: prevents click during drag release
    if (!ability) return;
    if (isCasting()) return; // Block while casting
    if (isOnCooldown(ability.id)) return;
    if (!player || player.energy < ability.energyCost) return;

    gameSocket.emit('ability:use', {
      abilityId: ability.id,
      targetEntityId: ability.requiresTarget ? selectedTarget ?? undefined : undefined,
    });
  };

  const isEmpty = !ability;
  const onCooldown = ability ? isOnCooldown(ability.id) : false;
  const insufficientEnergy = ability && player ? player.energy < ability.energyCost : false;
  const disabled = onCooldown || insufficientEnergy;

  const slotContent = (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`ability-slot ${isEmpty ? 'ability-slot--empty' : ''} ${disabled ? 'ability-slot--disabled' : ''} ${isDragging ? 'ability-slot--dragging' : ''} ${isOver ? 'ability-slot--drop-target' : ''}`}
      onClick={handleClick}
    >
      <AbilitySlotContent index={index} ability={ability} barIndex={barIndex} />
    </div>
  );

  if (ability) {
    return (
      <AbilityTooltip ability={ability}>
        {slotContent}
      </AbilityTooltip>
    );
  }

  return slotContent;
}

interface ActionBarProps {
  barIndex: 0 | 1;
}

export const ActionBar: React.FC<ActionBarProps> = ({ barIndex }) => {
  const {
    abilityOrder,
    secondaryAbilityOrder,
    setAbilityOrder,
    setSecondaryAbilityOrder,
  } = useActionBarStore();

  const { showSecondaryBar } = useUiSettingsStore();

  // Hide secondary bar when toggled off in settings
  if (barIndex === 1 && !showSecondaryBar) return null;

  // Select correct state based on barIndex
  const currentOrder = barIndex === 0 ? abilityOrder : secondaryAbilityOrder;
  const setCurrentOrder = barIndex === 0 ? setAbilityOrder : setSecondaryAbilityOrder;

  const inventory = useInventoryStore((state) => state.inventory);
  const selectedTarget = useCombatStore((state) => state.selectedTarget);
  const player = useGameStore((state) => state.player);
  const { isOnCooldown } = useAbilityStore();

  // Derive abilities from equipment (re-renders when inventory changes)
  const equippedAbilities = inventory ? getEquippedAbilities() : [];

  // Build ordered slots based on currentOrder + equipped abilities
  const slots = useMemo(() => {
    const ordered: (AbilityDefinition | null)[] = Array(SLOT_COUNT).fill(null);
    const usedAbilityIds = new Set<string>();

    // First, place abilities in their stored positions
    currentOrder.forEach((abilityId, index) => {
      if (index >= SLOT_COUNT) return;
      if (!abilityId) return;
      const ability = equippedAbilities.find(a => a.id === abilityId);
      if (ability) {
        ordered[index] = ability;
        usedAbilityIds.add(abilityId);
      }
    });

    // Primary bar auto-fills remaining slots with unplaced abilities.
    // Secondary bar only shows explicitly assigned abilities.
    if (barIndex === 0) {
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
    }

    return ordered;
  }, [equippedAbilities, currentOrder, barIndex]);

  // Auto-sync stored order when slots change (e.g., new abilities equipped).
  // Only applies to primary bar - secondary is fully manual.
  useEffect(() => {
    if (barIndex !== 0) return;
    const currentOrderSnapshot = slots.map(s => s?.id ?? null);
    if (JSON.stringify(currentOrderSnapshot) !== JSON.stringify(currentOrder)) {
      setCurrentOrder(currentOrderSnapshot);
    }
  }, [slots, currentOrder, setCurrentOrder, barIndex]);

  // Use bar-prefixed slot IDs to prevent DnD ID collisions between the two bars
  const slotIds = useMemo(() =>
    Array.from({ length: SLOT_COUNT }, (_, i) => `bar-${barIndex}-slot-${i}`),
    [barIndex]
  );

  // Keyboard shortcuts: bar 0 responds to 1-8, bar 1 responds to Shift+1-8
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Chat-focus guard
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.repeat) return;

      const slotIndex = parseInt(e.key, 10) - 1;
      if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= SLOT_COUNT) return;

      // Bar 0 responds to 1-8 (no Shift), Bar 1 responds to Shift+1-8
      const targetBarIndex = e.shiftKey ? 1 : 0;
      if (targetBarIndex !== barIndex) return;

      const ability = slots[slotIndex];
      if (!ability) return;
      if (useAbilityStore.getState().isCasting()) return; // Block while casting
      if (isOnCooldown(ability.id)) return;
      if (!player || player.energy < ability.energyCost) return;

      gameSocket.emit('ability:use', {
        abilityId: ability.id,
        targetEntityId: ability.requiresTarget ? selectedTarget ?? undefined : undefined,
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [slots, selectedTarget, player, isOnCooldown, barIndex]);

  return (
    <SortableContext items={slotIds} strategy={rectSwappingStrategy}>
      <div className="action-bar">
        {slots.map((ability, i) => (
          <SortableAbilitySlot
            key={slotIds[i]}
            index={i}
            ability={ability}
            slotId={slotIds[i]}
            barIndex={barIndex}
          />
        ))}
      </div>
    </SortableContext>
  );
};
