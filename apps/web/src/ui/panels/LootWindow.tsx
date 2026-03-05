import React, { useState } from 'react';
import { useAutomationStore } from '../../store/automationStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { gameSocket } from '../../network/socket';
import { useModalStack } from '../../hooks/useModalStack';
import { AUTOMATION_CONFIGS } from '@into-the-void/shared-types';
import { ItemRegistry } from '@into-the-void/items';
import './LootWindow.css';

function getStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Active';
    case 'depleted': return 'Depleted (No Fuel)';
    case 'husk': return 'Destroyed';
    default: return status;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return '#44cc44';
    case 'depleted': return '#cccc44';
    case 'husk': return '#cc4444';
    default: return '#888888';
  }
}

export const LootWindow: React.FC = () => {
  const { lootWindow, closeLootWindow } = useAutomationStore();
  const { inventory } = useInventoryStore();
  const [dismantleConfirm, setDismantleConfirm] = useState(false);

  useModalStack('loot-window', closeLootWindow);

  if (!lootWindow) return null;

  const config = AUTOMATION_CONFIGS[lootWindow.deployableType];
  const fuelPercent = lootWindow.maxFuel > 0
    ? (lootWindow.fuelLevel / lootWindow.maxFuel) * 100
    : 0;
  const durabilityPercent = lootWindow.maxDurability > 0
    ? Math.round((lootWindow.durability / lootWindow.maxDurability) * 100)
    : 100;

  const handleCollect = () => {
    gameSocket.emit('automation:collect', { deployableId: lootWindow.deployableId });
  };

  const handleRefuel = () => {
    if (!inventory || !config) return;

    // Find first matching fuel item in player inventory
    const fuelItem = inventory.items.find(i => i.itemId === config.fuelItemId);
    if (!fuelItem) return;

    gameSocket.emit('automation:refuel', {
      deployableId: lootWindow.deployableId,
      fuelInstanceId: fuelItem.instanceId,
    });
  };

  const handleDismantle = () => {
    if (!dismantleConfirm) {
      setDismantleConfirm(true);
      return;
    }
    gameSocket.emit('automation:dismantle', { deployableId: lootWindow.deployableId });
    setDismantleConfirm(false);
  };

  // Check if player has fuel in inventory
  const hasFuel = inventory?.items.some(i => i.itemId === config?.fuelItemId) ?? false;
  const fuelItemDef = config ? ItemRegistry.get(config.fuelItemId) : null;

  return (
    <div className="loot-window-overlay" onClick={closeLootWindow}>
      <div className="loot-window" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="loot-window-header">
          <div className="loot-window-title">
            <span className="loot-window-name">{config?.displayName || 'Structure'}</span>
            <span className="loot-window-owner">
              Owner: {lootWindow.ownerName}
              {lootWindow.isOwner && ' (You)'}
            </span>
          </div>
          <div className="loot-window-status" style={{ color: getStatusColor(lootWindow.status) }}>
            {getStatusLabel(lootWindow.status)}
          </div>
          <button className="loot-window-close" onClick={closeLootWindow}>X</button>
        </div>

        {/* Output Section */}
        <div className="loot-section">
          <div className="loot-section-label">Accumulated Resources</div>
          {lootWindow.accumulatedResources.length === 0 ? (
            <div className="loot-empty">No resources accumulated</div>
          ) : (
            <div className="loot-resource-grid">
              {lootWindow.accumulatedResources.map((resource, idx) => {
                const itemDef = ItemRegistry.get(resource.itemId);
                return (
                  <div key={idx} className="loot-resource-slot">
                    <div
                      className="loot-resource-icon"
                      style={{ backgroundColor: itemDef ? `#${itemDef.color.toString(16).padStart(6, '0')}` : '#555' }}
                    />
                    <div className="loot-resource-info">
                      <span className="loot-resource-name">{itemDef?.displayName || resource.itemId}</span>
                      <span className="loot-resource-qty">x{resource.quantity}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button
            className={`loot-collect-btn ${lootWindow.isOwner ? '' : 'loot-collect-btn--loot'}`}
            onClick={handleCollect}
            disabled={lootWindow.accumulatedResources.length === 0}
          >
            {lootWindow.isOwner ? 'Collect All' : 'Loot'}
          </button>
        </div>

        {/* Fuel Section */}
        <div className="loot-section">
          <div className="loot-section-label">
            Fuel ({fuelItemDef?.displayName || 'Unknown'})
          </div>
          <div className="loot-fuel-gauge">
            <div className="loot-fuel-bar-container">
              <div
                className="loot-fuel-bar"
                style={{
                  width: `${fuelPercent}%`,
                  backgroundColor: fuelPercent > 25 ? '#44cc44' : fuelPercent > 10 ? '#cccc44' : '#cc4444',
                }}
              />
            </div>
            <span className="loot-fuel-text">{lootWindow.fuelLevel} / {lootWindow.maxFuel}</span>
          </div>
          {lootWindow.isOwner && (
            <button
              className="loot-refuel-btn"
              onClick={handleRefuel}
              disabled={!hasFuel || lootWindow.fuelLevel >= lootWindow.maxFuel}
              title={!hasFuel ? `No ${fuelItemDef?.displayName || 'fuel'} in inventory` : 'Add fuel'}
            >
              Refuel
            </button>
          )}
        </div>

        {/* Recipe Progress (Refinery only) */}
        {lootWindow.activeRecipe && (
          <div className="loot-section">
            <div className="loot-section-label">Transmutation Progress</div>
            <div className="loot-recipe-progress">
              <div className="loot-recipe-bar-container">
                <div
                  className="loot-recipe-bar"
                  style={{ width: `${lootWindow.activeRecipe.progressPercent}%` }}
                />
              </div>
              <span className="loot-recipe-text">
                {lootWindow.activeRecipe.progressPercent}%
              </span>
            </div>
          </div>
        )}

        {/* Status Section */}
        <div className="loot-section">
          <div className="loot-section-label">Durability</div>
          <div className="loot-durability-bar-container">
            <div
              className="loot-durability-bar"
              style={{
                width: `${durabilityPercent}%`,
                backgroundColor: durabilityPercent > 50 ? '#44cc44' : durabilityPercent > 25 ? '#cccc44' : '#cc4444',
              }}
            />
          </div>
          <span className="loot-durability-text">{durabilityPercent}%</span>
        </div>

        {/* Dismantle (Owner only) */}
        {lootWindow.isOwner && (
          <div className="loot-section loot-dismantle-section">
            <button
              className={`loot-dismantle-btn ${dismantleConfirm ? 'loot-dismantle-btn--confirm' : ''}`}
              onClick={handleDismantle}
            >
              {dismantleConfirm ? 'Confirm Dismantle' : 'Dismantle'}
            </button>
            {dismantleConfirm && (
              <button
                className="loot-dismantle-cancel"
                onClick={() => setDismantleConfirm(false)}
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
