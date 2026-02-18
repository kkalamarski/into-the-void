import React, { useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useInventoryStore } from '../../store/inventoryStore';
import { useGameStore } from '../../store/gameStore';
import { gameSocket } from '../../network/socket';
import { ItemRegistry } from '@into-the-void/items';
import { RARITY_COLORS } from '../constants';
import { ItemTooltip } from '../../components/ItemTooltip';
import { useDraggablePanel } from '../../hooks/useDraggablePanel';
import type { InventoryItem } from '@into-the-void/shared-types';
import {
  GiSpaceSuit,
  GiShield,
  GiPoisonGas,
  GiLightningFrequency,
  GiRadarSweep,
  GiJumpAcross,
  GiBattery100,
  GiEnergyArrow,
} from 'react-icons/gi';
import type { IconType } from 'react-icons';
import './EquipmentPanel.css';

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

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  Icon: IconType;
  color: string;
}

function StatBar({ label, value, max, Icon, color }: StatBarProps) {
  const percent = Math.min((value / max) * 100, 100);
  return (
    <div className="stat-bar">
      <div className="stat-bar-header">
        <Icon className="stat-bar-icon" style={{ color }} />
        <span className="stat-bar-label">{label}</span>
        <span className="stat-bar-value">{value}</span>
      </div>
      <div className="stat-bar-track">
        <div
          className="stat-bar-fill"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

interface StatRowProps {
  label: string;
  value: string;
  Icon: IconType;
  color?: string;
}

function StatRow({ label, value, Icon, color }: StatRowProps) {
  return (
    <div className="stat-row-compact">
      <Icon className="stat-icon-small" style={{ color: color ?? 'var(--color-accent)' }} />
      <span className="stat-label-compact">{label}</span>
      <span className="stat-value-compact">{value}</span>
    </div>
  );
}

export const EquipmentPanel: React.FC = () => {
  const { inventory } = useInventoryStore();
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

  const stats = inventory.stats ?? {
    armor: 0,
    speedMultiplier: 1.0,
    hazardResistance: 0,
    detectionRange: 0,
    energyCapacity: 100,
    rechargeRate: 1.0,
    jumpHeight: 1.0,
    bonuses: {},
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

        {/* Right: Stats */}
        <div className="stats-column">
          <div className="stats-section-title">Combat Stats</div>

          <StatBar
            label="Armor"
            value={stats.armor}
            max={100}
            Icon={GiShield}
            color="#4a9eff"
          />

          <StatBar
            label="Hazard Resist"
            value={stats.hazardResistance}
            max={100}
            Icon={GiPoisonGas}
            color="#4aff4a"
          />

          <div className="stats-divider" />

          <div className="stats-section-title">Performance</div>

          <StatRow
            label="Speed"
            value={`${(stats.speedMultiplier * 100).toFixed(0)}%`}
            Icon={GiLightningFrequency}
            color="#ffcc00"
          />
          <StatRow
            label="Detection"
            value={`${stats.detectionRange}m`}
            Icon={GiRadarSweep}
            color="#00ccff"
          />
          <StatRow
            label="Jump"
            value={`${(stats.jumpHeight * 100).toFixed(0)}%`}
            Icon={GiJumpAcross}
            color="#ff9944"
          />

          <div className="stats-divider" />

          <div className="stats-section-title">Energy</div>

          <StatBar
            label="Capacity"
            value={stats.energyCapacity}
            max={200}
            Icon={GiBattery100}
            color="#ffcc00"
          />

          <StatRow
            label="Recharge"
            value={`${(stats.rechargeRate * 100).toFixed(0)}%`}
            Icon={GiEnergyArrow}
            color="#ffcc00"
          />
        </div>
      </div>
    </div>
  );
};
