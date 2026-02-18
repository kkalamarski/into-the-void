import React, { useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useInventoryStore } from '../../store/inventoryStore';
import { useStatsStore } from '../../store/statsStore';
import { useGameStore } from '../../store/gameStore';
import { gameSocket } from '../../network/socket';
import { ItemRegistry } from '@into-the-void/items';
import { RARITY_COLORS, STAT_DISPLAY_ORDER } from '../constants';
import { ItemTooltip } from '../../components/ItemTooltip';
import { useDraggablePanel } from '../../hooks/useDraggablePanel';
import type { InventoryItem } from '@into-the-void/shared-types';
import {
  GiSpaceSuit,
  GiHearts,
  GiShield,
  GiSwordWound,
  GiSpeedometer,
  GiBattery100,
  GiHealing,
  GiRadarSweep,
  GiMagicShield,
} from 'react-icons/gi';
import type { IconType } from 'react-icons';
import './EquipmentPanel.css';

const STAT_ICONS: Record<string, IconType> = {
  durability: GiHearts,
  toughness: GiShield,
  power: GiSwordWound,
  haste: GiSpeedometer,
  vigor: GiBattery100,
  recovery: GiHealing,
  perception: GiRadarSweep,
  resilience: GiMagicShield,
};

interface EquipSlotProps {
  slotId: string;
  label: string;
  item?: InventoryItem;
  disabled?: boolean;
  onUnequip?: (instanceId: string) => void;
  size?: 'normal' | 'large';
}

function EquipSlot({ slotId, label, item, disabled, onUnequip, size = 'normal' }: EquipSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `equip-${slotId}`, disabled });
  const itemDef = item ? ItemRegistry.get(item.itemId) : null;
  const playerLevel = useGameStore(state => state.player?.level ?? 1);
  const isLevelLocked = itemDef != null && itemDef.requiredLevel > playerLevel;

  const slotClasses = [
    'equip-slot',
    `equip-slot--${size}`,
    isOver ? 'equip-slot--over' : '',
    item ? 'equip-slot--filled' : '',
    disabled ? 'equip-slot--disabled' : '',
    isLevelLocked ? 'equip-slot--locked' : '',
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

interface CharStatRowProps {
  statKey: string;
  label: string;
  base: number;
  equipment: number;
  total: number;
}

function CharStatRow({ statKey, label, base, equipment, total }: CharStatRowProps) {
  const Icon = STAT_ICONS[statKey] ?? GiHearts;
  return (
    <div className="char-stat-row">
      <Icon className="char-stat-icon" />
      <span className="char-stat-label">{label}</span>
      <span className="char-stat-total">{total}</span>
      <span className="char-stat-breakdown">
        {equipment !== 0 ? `(${base}+${equipment})` : ''}
      </span>
    </div>
  );
}

export const EquipmentPanel: React.FC = () => {
  const { inventory } = useInventoryStore();
  const { stats } = useStatsStore();
  const { toggleEquipment, player } = useGameStore();
  const { position, isDragging, handleMouseDown } = useDraggablePanel();

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

  // Defensive: ensure modules is always an array (existing DB data may lack it)
  const modules = inventory.equipment.modules ?? [];

  // Derive module slot count from equipped suit's moduleSlots property
  const moduleSlotCount = inventory.equipment.exosuit
    ? ItemRegistry.get(inventory.equipment.exosuit.itemId)?.moduleSlots ?? 0
    : 0;

  const handleUnequip = (instanceId: string) => {
    gameSocket.emit('inventory:unequip', { instanceId });
  };

  return (
    <div
      className="equipment-panel ui-panel"
      style={{ transform: `translateY(-50%) translate(${position.x}px, ${position.y}px)` }}
    >
      <div
        className="equipment-header"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <span>Character</span>
        <button className="close-btn" onClick={toggleEquipment}>&times;</button>
      </div>

      <div className="equipment-layout">
        {/* Left: Equipment Slots */}
        <div className="equipment-column">
          {/* Character visual area */}
          <div className="character-visual">
            <div className="character-avatar">
              <GiSpaceSuit className="avatar-icon" />
            </div>
            <div className="character-info">
              <span className="character-name">{player?.name ?? 'Unknown'}</span>
              <span className="character-level">Level {player?.level ?? 1}</span>
            </div>
          </div>

          {/* Exo-Suit - center, large */}
          <div className="slot-group slot-group--center">
            <EquipSlot
              slotId="exosuit"
              label="Exo-Suit"
              item={inventory.equipment.exosuit}
              onUnequip={handleUnequip}
              size="large"
            />
          </div>

          {/* Modules Row */}
          {moduleSlotCount > 0 && (
            <div className="slot-group slot-group--modules">
              {Array.from({ length: moduleSlotCount }, (_, i) => (
                <EquipSlot
                  key={`module-${i}`}
                  slotId={`module-${i}`}
                  label={`M${i + 1}`}
                  item={modules[i]}
                  disabled={i >= moduleSlotCount}
                  onUnequip={handleUnequip}
                />
              ))}
            </div>
          )}
          {moduleSlotCount === 0 && (
            <div className="modules-hint">Equip suit for modules</div>
          )}

          {/* Tools Row */}
          <div className="slot-group slot-group--tools">
            <EquipSlot
              slotId="tool"
              label="Main"
              item={inventory.equipment.tool}
              onUnequip={handleUnequip}
            />
            <EquipSlot
              slotId="accessory1"
              label="Off"
              item={inventory.equipment.accessory1}
              onUnequip={handleUnequip}
            />
            <EquipSlot
              slotId="accessory2"
              label="Acc"
              item={inventory.equipment.accessory2}
              onUnequip={handleUnequip}
            />
          </div>
        </div>

        {/* Right: Character Stats */}
        <div className="stats-column">
          <div className="stats-section-title">Character Stats</div>
          {stats ? (
            STAT_DISPLAY_ORDER.map(({ key, label }) => (
              <CharStatRow
                key={key}
                statKey={key}
                label={label}
                base={stats.base[key]}
                equipment={stats.equipment[key]}
                total={stats.total[key]}
              />
            ))
          ) : (
            <div className="stats-loading">Loading stats...</div>
          )}
        </div>
      </div>
    </div>
  );
};
