import React, { useEffect } from 'react';
import { useNpcStore } from '../../store/npcStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useGameStore } from '../../store/gameStore';
import { useDraggablePanel } from '../../hooks/useDraggablePanel';
import { gameSocket } from '../../network/socket';
import { ItemRegistry } from '@into-the-void/items';
import './TradingPanel.css';

export const TradingPanel: React.FC = () => {
  const { interactingNpc, showTrading, closeTrading, tradeError, setTradeError } = useNpcStore();
  const { inventory } = useInventoryStore();
  const { player } = useGameStore();
  const { position, isDragging, handleMouseDown } = useDraggablePanel();

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

  // Handle Escape key to close TradingPanel
  // CRITICAL: Use stopPropagation to prevent NpcInteractionModal from also receiving the event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();  // Prevent NpcInteractionModal from closing
        closeTrading();
      }
    };
    // Use capture phase to intercept before NpcInteractionModal's handler
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [closeTrading]);

  if (!showTrading || !interactingNpc || interactingNpc.npcType !== 'trader') {
    return null;
  }

  const traderInventory = interactingNpc.inventory ?? [];
  const playerItems = inventory?.items ?? [];

  const handleBuy = (itemId: string, buyPrice: number) => {
    if (!player || player.credits < buyPrice) {
      setTradeError('Insufficient credits');
      return;
    }
    setTradeError(null);
    gameSocket.emit('trade:buy', {
      npcId: interactingNpc.npcId ?? interactingNpc.displayName,
      itemId,
      quantity: 1,
    });
  };

  const handleSell = (instanceId: string) => {
    setTradeError(null);
    gameSocket.emit('trade:sell', {
      npcId: interactingNpc.npcId ?? interactingNpc.displayName,
      itemInstanceId: instanceId,
      quantity: 1,
    });
  };

  // Get sell price for player items from trader's inventory
  const getSellPrice = (itemId: string): number | null => {
    const tradeItem = traderInventory.find(i => i.itemId === itemId);
    return tradeItem?.sellPrice ?? null;
  };

  return (
    <div
      className="trading-panel ui-panel"
      style={{ transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)` }}
    >
      <div
        className="trading-panel-header"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <span>Trade with {interactingNpc.displayName}</span>
        <button className="close-btn" onClick={closeTrading}>&times;</button>
      </div>

      <div className="trading-panel-content">
        {/* Error message */}
        {tradeError && (
          <div className="trade-error">{tradeError}</div>
        )}

        {/* Player credits */}
        <div className="trade-credits">
          Your Credits: <span className="credits-value">{(player?.credits ?? 0).toLocaleString()} cr</span>
        </div>

        <div className="trade-columns">
          {/* Buy section - trader's items */}
          <div className="trade-section trade-buy">
            <h3>Buy</h3>
            <div className="trade-items">
              {traderInventory.map((item) => {
                const itemDef = ItemRegistry.get(item.itemId);
                const canAfford = (player?.credits ?? 0) >= item.buyPrice;
                return (
                  <div key={item.itemId} className={`trade-item ${!canAfford ? 'cannot-afford' : ''}`}>
                    <div className="trade-item-info">
                      <span className="trade-item-name">{itemDef?.displayName ?? item.itemId}</span>
                      <span className="trade-item-stock">
                        {item.stock === -1 ? 'Unlimited' : `Stock: ${item.stock}`}
                      </span>
                    </div>
                    <div className="trade-item-action">
                      <span className="trade-item-price">{item.buyPrice} cr</span>
                      <button
                        className="trade-btn trade-btn--buy"
                        onClick={() => handleBuy(item.itemId, item.buyPrice)}
                        disabled={!canAfford}
                      >
                        Buy
                      </button>
                    </div>
                  </div>
                );
              })}
              {traderInventory.length === 0 && (
                <div className="trade-empty">No items available</div>
              )}
            </div>
          </div>

          {/* Sell section - player's items */}
          <div className="trade-section trade-sell">
            <h3>Sell</h3>
            <div className="trade-items">
              {playerItems.map((item) => {
                const itemDef = ItemRegistry.get(item.itemId);
                const sellPrice = getSellPrice(item.itemId);
                const canSell = sellPrice !== null;
                return (
                  <div key={item.instanceId} className={`trade-item ${!canSell ? 'cannot-sell' : ''}`}>
                    <div className="trade-item-info">
                      <span className="trade-item-name">{itemDef?.displayName ?? item.itemId}</span>
                      <span className="trade-item-qty">x{item.quantity}</span>
                    </div>
                    <div className="trade-item-action">
                      {canSell ? (
                        <>
                          <span className="trade-item-price sell-price">{sellPrice} cr</span>
                          <button
                            className="trade-btn trade-btn--sell"
                            onClick={() => handleSell(item.instanceId)}
                          >
                            Sell
                          </button>
                        </>
                      ) : (
                        <span className="trade-item-no-buy">Not traded</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {playerItems.length === 0 && (
                <div className="trade-empty">No items to sell</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
