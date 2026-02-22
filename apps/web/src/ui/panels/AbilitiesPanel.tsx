import React, { useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useGameStore } from '../../store/gameStore';
import { getEquippedAbilities } from '../../store/abilityStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { AbilityTooltip } from '../../components/AbilityTooltip';
import { useDraggablePanel } from '../../hooks/useDraggablePanel';
import type { AbilityDefinition } from '@into-the-void/shared-types';
import './AbilitiesPanel.css';

interface DraggableAbilitySlotProps {
  ability: AbilityDefinition;
}

function DraggableAbilitySlot({ ability }: DraggableAbilitySlotProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `ability-${ability.id}`,
    data: { type: 'ability', abilityId: ability.id },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  const iconColorHex = `#${ability.iconColor.toString(16).padStart(6, '0')}`;

  return (
    <AbilityTooltip ability={ability} disabled={isDragging}>
      <div
        ref={setNodeRef}
        className="abilities-slot"
        style={style}
        {...attributes}
        {...listeners}
      >
        <div
          className="abilities-slot-icon"
          style={{ backgroundColor: iconColorHex }}
        />
        <div className="abilities-slot-name">{ability.displayName}</div>
      </div>
    </AbilityTooltip>
  );
}

export const AbilitiesPanel: React.FC = () => {
  const { toggleAbilities } = useGameStore();
  const inventory = useInventoryStore((state) => state.inventory);
  const { position, isDragging, handleMouseDown } = useDraggablePanel();

  // Derive abilities from equipment
  const equippedAbilities = inventory ? getEquippedAbilities() : [];

  // Group by category
  const offensiveAbilities = equippedAbilities.filter(a => a.category === 'offensive');
  const defensiveAbilities = equippedAbilities.filter(a => a.category === 'defensive');
  const utilityAbilities = equippedAbilities.filter(a => a.category === 'utility');

  // Disable Phaser keyboard when panel is open
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

  return (
    <div
      className="abilities-panel ui-panel"
      style={{ transform: `translateY(-50%) translate(${position.x}px, ${position.y}px)` }}
    >
      <div
        className="abilities-header"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <span>Abilities</span>
        <button className="close-btn" onClick={toggleAbilities}>&times;</button>
      </div>

      <div className="abilities-content">
        <p className="abilities-hint">Drag abilities to action bar slots</p>

        {equippedAbilities.length === 0 ? (
          <div className="abilities-empty">
            No abilities available. Equip items that grant abilities.
          </div>
        ) : (
          <>
            {offensiveAbilities.length > 0 && (
              <div className="abilities-category">
                <div className="abilities-category-header abilities-category--offensive">
                  Offensive
                </div>
                <div className="abilities-grid">
                  {offensiveAbilities.map(ability => (
                    <DraggableAbilitySlot key={ability.id} ability={ability} />
                  ))}
                </div>
              </div>
            )}

            {defensiveAbilities.length > 0 && (
              <div className="abilities-category">
                <div className="abilities-category-header abilities-category--defensive">
                  Defensive
                </div>
                <div className="abilities-grid">
                  {defensiveAbilities.map(ability => (
                    <DraggableAbilitySlot key={ability.id} ability={ability} />
                  ))}
                </div>
              </div>
            )}

            {utilityAbilities.length > 0 && (
              <div className="abilities-category">
                <div className="abilities-category-header abilities-category--utility">
                  Utility
                </div>
                <div className="abilities-grid">
                  {utilityAbilities.map(ability => (
                    <DraggableAbilitySlot key={ability.id} ability={ability} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
