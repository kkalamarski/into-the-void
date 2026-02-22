import React, { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { useInventoryStore } from '../store/inventoryStore';
import { gameSocket } from '../network/socket';
import { ItemRegistry } from '@into-the-void/items';
import './DeathScreen.css';

/**
 * DeathScreen - displayed when player enters Emergency Lockdown Mode
 * Offers two recovery options:
 * 1. Emergency S.O.S. - extraction to faction hub (full HP)
 * 2. Use Emergency Reboot Kit - revive in place (partial HP based on kit rarity)
 */
export const DeathScreen: React.FC = () => {
  const showDeathScreen = useGameStore((state) => state.showDeathScreen);
  const inventory = useInventoryStore((state) => state.inventory);

  // Find the best available Emergency Reboot Kit in inventory
  const bestRebootKit = useMemo(() => {
    if (!inventory) return null;

    // Find all emergency reboot kits in inventory
    const rebootKits = inventory.items
      .map((item) => {
        const def = ItemRegistry.get(item.itemId);
        if (!def) return null;

        // Check if this item has an emergency_reboot effect
        const rebootEffect = def.effects?.find(
          (e) => e.trigger === 'on_use' && e.effect.type === 'emergency_reboot'
        );
        if (!rebootEffect || rebootEffect.effect.type !== 'emergency_reboot') return null;

        return {
          instanceId: item.instanceId,
          displayName: def.displayName,
          healPercent: rebootEffect.effect.healPercent,
          rarity: def.rarity,
        };
      })
      .filter((kit): kit is NonNullable<typeof kit> => kit !== null);

    if (rebootKits.length === 0) return null;

    // Sort by healPercent descending to get the best kit
    rebootKits.sort((a, b) => b.healPercent - a.healPercent);
    return rebootKits[0];
  }, [inventory]);

  const handleSOS = () => {
    gameSocket.emit('respawn:sos', {});
  };

  const handleReboot = () => {
    if (!bestRebootKit) return;
    gameSocket.emit('respawn:reboot', { itemInstanceId: bestRebootKit.instanceId });
  };

  if (!showDeathScreen) return null;

  return (
    <div className="death-screen-overlay">
      <div className="death-screen">
        <div className="death-screen-warning">EMERGENCY LOCKDOWN MODE</div>
        <p className="death-screen-message">
          Your exo-suit has entered emergency lockdown to preserve life support.
        </p>

        <div className="death-screen-options">
          <button
            className="death-screen-button death-screen-button--sos"
            onClick={handleSOS}
          >
            <span className="button-icon">S.O.S.</span>
            <span className="button-label">Call Emergency Extraction</span>
            <span className="button-desc">Transport to faction hub (100% HP)</span>
          </button>

          <button
            className={`death-screen-button death-screen-button--reboot ${
              !bestRebootKit ? 'death-screen-button--disabled' : ''
            } ${bestRebootKit ? `rarity-${bestRebootKit.rarity}` : ''}`}
            onClick={handleReboot}
            disabled={!bestRebootKit}
          >
            <span className="button-icon">REBOOT</span>
            <span className="button-label">
              {bestRebootKit
                ? `Use ${bestRebootKit.displayName}`
                : 'No Reboot Kit Available'}
            </span>
            <span className="button-desc">
              {bestRebootKit
                ? `Revive in place (${bestRebootKit.healPercent}% HP)`
                : 'Acquire Emergency Reboot Kits from vendors or loot'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
