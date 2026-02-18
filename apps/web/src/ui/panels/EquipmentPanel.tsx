import React, { useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useInventoryStore } from '../../store/inventoryStore';
import { useGameStore } from '../../store/gameStore';
import { gameSocket } from '../../network/socket';
import { ItemRegistry } from '@into-the-void/items';
import { RARITY_COLORS } from '../constants';
import { ItemTooltip } from '../../components/ItemTooltip';
import type { InventoryItem } from '@into-the-void/shared-types';
import './EquipmentPanel.css';

interface EquipSlotProps {
  slotId: string;
  label: string;
  item?: InventoryItem;
  disabled?: boolean;
  onUnequip?: (instanceId: string) => void;
}

function EquipSlot({ slotId, label, item, disabled, onUnequip }: EquipSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `equip-${slotId}`, disabled });
  const itemDef = item ? ItemRegistry.get(item.itemId) : null;

  const slotClasses = [
    'equip-slot',
    isOver ? 'equip-slot--over' : '',
    item ? 'equip-slot--filled' : '',
    disabled ? 'equip-slot--disabled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (item && onUnequip) {
      onUnequip(item.instanceId);
    }
  };

  return (
    <div ref={setNodeRef} className={slotClasses} onContextMenu={handleContextMenu}>
      {item && itemDef ? (
        <ItemTooltip item={itemDef}>
          <div className="equip-slot-inner">
            <div
              className="slot-icon"
              style={{
                backgroundColor: `#${itemDef.color.toString(16).padStart(6, '0')}`,
                borderColor: RARITY_COLORS[itemDef.rarity],
              }}
            />
          </div>
        </ItemTooltip>
      ) : (
        <span className="equip-slot-label">{label}</span>
      )}
    </div>
  );
}

export const EquipmentPanel: React.FC = () => {
  const { inventory } = useInventoryStore();
  const { toggleEquipment } = useGameStore();

  // Disable Phaser keyboard when equipment panel is open
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

  // Derive module slot count from equipped suit's moduleSlots property
  const moduleSlotCount = inventory.equipment.exosuit
    ? ItemRegistry.get(inventory.equipment.exosuit.itemId)?.moduleSlots ?? 0
    : 0;

  const handleUnequip = (instanceId: string) => {
    gameSocket.emit('inventory:unequip', { instanceId });
  };

  return (
    <div className="equipment-panel ui-panel">
      <div className="equipment-header">
        <span>Equipment</span>
        <button className="close-btn" onClick={toggleEquipment}>&times;</button>
      </div>

      <div className="equipment-body">
        {/* Exo-Suit Section */}
        <div className="equipment-section">
          <div className="equipment-section-title">Exo-Suit</div>
          <div className="suit-slot-container">
            <EquipSlot
              slotId="exosuit"
              label="Exo-Suit"
              item={inventory.equipment.exosuit}
              onUnequip={handleUnequip}
            />
          </div>
        </div>

        {/* Modules Section */}
        <div className="equipment-section">
          <div className="equipment-section-title">
            Modules ({inventory.equipment.modules.length}/{moduleSlotCount})
          </div>
          {moduleSlotCount > 0 ? (
            <div className="modules-grid">
              {Array.from({ length: moduleSlotCount }, (_, i) => (
                <EquipSlot
                  key={`module-${i}`}
                  slotId={`module-${i}`}
                  label={`Module ${i + 1}`}
                  item={inventory.equipment.modules[i]}
                  disabled={i >= moduleSlotCount}
                  onUnequip={handleUnequip}
                />
              ))}
            </div>
          ) : (
            <div className="modules-empty">Equip a suit to unlock module slots</div>
          )}
        </div>

        {/* Tools Section */}
        <div className="equipment-section">
          <div className="equipment-section-title">Tools</div>
          <div className="tools-section">
            <EquipSlot
              slotId="tool"
              label="Tool (Main)"
              item={inventory.equipment.tool}
              onUnequip={handleUnequip}
            />
            <EquipSlot
              slotId="accessory1"
              label="Tool (Secondary)"
              item={inventory.equipment.accessory1}
              onUnequip={handleUnequip}
            />
          </div>
        </div>

        {/* Accessories Section */}
        <div className="equipment-section">
          <div className="equipment-section-title">Accessories</div>
          <div className="tools-section">
            <EquipSlot
              slotId="accessory2"
              label="Accessory"
              item={inventory.equipment.accessory2}
              onUnequip={handleUnequip}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
