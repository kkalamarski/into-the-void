import React, { useEffect } from 'react';
import { useStorageStore } from '../../store/storageStore';
import { useGameStore } from '../../store/gameStore';
import { gameSocket } from '../../network/socket';
import { ItemRegistry } from '@into-the-void/items';
import { RARITY_COLORS } from '../constants';
import { ItemTooltip } from '../../components/ItemTooltip';
import { ItemIcon } from '../../components/ItemIcon';
import { useDraggablePanel } from '../../hooks/useDraggablePanel';
import './PersonalStoragePanel.css';

export const PersonalStoragePanel: React.FC = () => {
  const { storage } = useStorageStore();
  const { toggleStorage } = useGameStore();
  const { position, isDragging, handleMouseDown } = useDraggablePanel();

  // Disable Phaser keyboard when storage panel is open
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

  // Request storage data from server on mount
  useEffect(() => {
    gameSocket.emit('storage:open', {});
  }, []);

  if (!storage) {
    return (
      <div
        className="storage-panel ui-panel"
        style={{ transform: `translateY(-50%) translate(${position.x}px, ${position.y}px)` }}
      >
        <div
          className="storage-header"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <span>Storage</span>
          <button className="close-btn" onClick={toggleStorage}>&times;</button>
        </div>
        <div className="storage-loading">Loading storage...</div>
      </div>
    );
  }

  const slots: (typeof storage.items[number] | null)[] = Array.from(
    { length: storage.maxSlots },
    (_, i) => storage.items.find((item) => item.slot === i) ?? null
  );

  return (
    <div
      className="storage-panel ui-panel"
      style={{ transform: `translateY(-50%) translate(${position.x}px, ${position.y}px)` }}
    >
      <div
        className="storage-header"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <span>Storage ({storage.items.length}/{storage.maxSlots})</span>
        <button className="close-btn" onClick={toggleStorage}>&times;</button>
      </div>
      <div className="storage-grid">
        {slots.map((item, i) => {
          if (!item) {
            return <div key={`empty-${i}`} className="storage-slot storage-slot--empty" />;
          }
          const itemDef = ItemRegistry.get(item.itemId);
          return (
            <ItemTooltip key={item.instanceId} item={itemDef}>
              <div
                className="storage-slot storage-slot--filled"
                style={{ borderColor: RARITY_COLORS[itemDef.rarity] }}
              >
                <ItemIcon itemId={item.itemId} fallbackColor={itemDef.color} size={40} className="slot-icon" />
                {item.quantity > 1 && (
                  <span className="slot-quantity">{item.quantity}</span>
                )}
              </div>
            </ItemTooltip>
          );
        })}
      </div>
    </div>
  );
};
