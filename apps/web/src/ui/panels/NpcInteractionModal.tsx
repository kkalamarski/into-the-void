import React, { useEffect } from 'react';
import { useNpcStore, type NpcInteraction } from '../../store/npcStore';
import { useGameStore } from '../../store/gameStore';
import { useDraggablePanel } from '../../hooks/useDraggablePanel';
import { useInventoryStore } from '../../store/inventoryStore';
import { gameSocket } from '../../network/socket';
import { ItemRegistry, type ItemDefinition } from '@into-the-void/items';
import type { InventoryEquipment } from '@into-the-void/shared-types';
import { ItemTooltip } from '../../components/ItemTooltip';
import { RARITY_COLORS } from '../constants';
import './NpcInteractionModal.css';

// NPC type display labels
const NPC_TYPE_LABELS: Record<string, string> = {
  trader: 'Trader',
  guard: 'Guard',
  faction_rep: 'Faction Representative',
  ambient: 'Citizen',
  service: 'Service',
};

// Service type labels for action buttons
const SERVICE_LABELS: Record<string, string> = {
  repair: 'Repair',
  storage: 'Storage',
  transport: 'Travel',
  medical: 'Heal',
};

// Helper to get equipped item for a slot
const getEquippedForSlot = (slot: string | undefined, eq: InventoryEquipment | undefined): string | undefined => {
  if (!slot || !eq) return undefined;
  switch (slot) {
    case 'exosuit': return eq.exosuit?.itemId;
    case 'tool': return eq.tool?.itemId;
    case 'accessory': return eq.accessory1?.itemId;
    case 'module': return eq.modules?.[0]?.itemId;
    default: return undefined;
  }
};

const getEquippedItemDef = (itemDef: ItemDefinition | undefined, equipment: InventoryEquipment | undefined): ItemDefinition | undefined => {
  if (!itemDef?.equipSlot) return undefined;
  const equippedId = getEquippedForSlot(itemDef.equipSlot, equipment);
  return equippedId ? ItemRegistry.get(equippedId) : undefined;
};

// Extracted TradeTab component to prevent remount on parent re-render
interface TradeTabProps {
  npc: NpcInteraction;
  tradeError: string | null;
  setTradeError: (error: string | null) => void;
}

const TradeTab: React.FC<TradeTabProps> = ({ npc, tradeError, setTradeError }) => {
  const { inventory } = useInventoryStore();
  const { player } = useGameStore();

  if (npc.npcType !== 'trader') {
    return <p className="npc-empty-message">This NPC doesn't have trade options.</p>;
  }

  const traderInventory = npc.inventory ?? [];
  const playerItems = inventory?.items ?? [];

  const handleBuy = (itemId: string, buyPrice: number) => {
    if (!player || player.credits < buyPrice) {
      setTradeError('Insufficient credits');
      return;
    }
    setTradeError(null);
    gameSocket.emit('trade:buy', {
      npcId: npc.npcId ?? npc.displayName,
      itemId,
      quantity: 1,
    });
  };

  const handleSell = (instanceId: string) => {
    setTradeError(null);
    gameSocket.emit('trade:sell', {
      npcId: npc.npcId ?? npc.displayName,
      itemInstanceId: instanceId,
      quantity: 1,
    });
  };

  const getSellPrice = (itemId: string): number => {
    const tradeItem = traderInventory.find(i => i.itemId === itemId);
    if (tradeItem?.sellPrice !== undefined) {
      return tradeItem.sellPrice;
    }
    const itemDef = ItemRegistry.get(itemId);
    return Math.max(1, Math.floor((itemDef?.baseValue ?? 2) * 0.5));
  };

  return (
    <div className="npc-trade-tab">
      {tradeError && <div className="npc-trade-error">{tradeError}</div>}
      <div className="npc-trade-credits">
        Your Credits: <span className="credits-value">{(player?.credits ?? 0).toLocaleString()} cr</span>
      </div>
      <div className="npc-trade-columns">
        <div className="npc-trade-section npc-trade-buy">
          <h3>Buy</h3>
          <div className="npc-trade-items">
            {traderInventory.map((item) => {
              const itemDef = ItemRegistry.get(item.itemId);
              const canAfford = (player?.credits ?? 0) >= item.buyPrice;
              const rarityColor = RARITY_COLORS[itemDef?.rarity ?? 'common'];
              const equippedItemDef = getEquippedItemDef(itemDef, inventory?.equipment);
              return (
                <div key={item.itemId} className={`npc-trade-item ${!canAfford ? 'cannot-afford' : ''}`}>
                  <ItemTooltip item={itemDef} equippedItem={equippedItemDef}>
                    <div
                      className="npc-trade-item-icon"
                      style={{
                        backgroundColor: `#${(itemDef?.color ?? 0x888888).toString(16).padStart(6, '0')}`,
                        borderColor: rarityColor,
                      }}
                    />
                  </ItemTooltip>
                  <div className="npc-trade-item-info">
                    <span className="npc-trade-item-name" style={{ color: rarityColor }}>
                      {itemDef?.displayName ?? item.itemId}
                    </span>
                    <span className="npc-trade-item-stock">
                      {item.stock === -1 ? 'Unlimited' : `Stock: ${item.stock}`}
                    </span>
                  </div>
                  <div className="npc-trade-item-action">
                    <span className="npc-trade-item-price">{item.buyPrice} cr</span>
                    <button
                      className="npc-trade-btn npc-trade-btn--buy"
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
              <div className="npc-trade-empty">No items available</div>
            )}
          </div>
        </div>
        <div className="npc-trade-section npc-trade-sell">
          <h3>Sell</h3>
          <div className="npc-trade-items">
            {playerItems.map((item) => {
              const itemDef = ItemRegistry.get(item.itemId);
              const sellPrice = getSellPrice(item.itemId);
              const rarityColor = RARITY_COLORS[itemDef?.rarity ?? 'common'];
              return (
                <div key={item.instanceId} className="npc-trade-item">
                  <ItemTooltip item={itemDef}>
                    <div
                      className="npc-trade-item-icon"
                      style={{
                        backgroundColor: `#${(itemDef?.color ?? 0x888888).toString(16).padStart(6, '0')}`,
                        borderColor: rarityColor,
                      }}
                    />
                  </ItemTooltip>
                  <div className="npc-trade-item-info">
                    <span className="npc-trade-item-name" style={{ color: rarityColor }}>
                      {itemDef?.displayName ?? item.itemId}
                    </span>
                    <span className="npc-trade-item-qty">x{item.quantity}</span>
                  </div>
                  <div className="npc-trade-item-action">
                    <span className="npc-trade-item-price sell-price">{sellPrice} cr</span>
                    <button
                      className="npc-trade-btn npc-trade-btn--sell"
                      onClick={() => handleSell(item.instanceId)}
                    >
                      Sell
                    </button>
                  </div>
                </div>
              );
            })}
            {playerItems.length === 0 && (
              <div className="npc-trade-empty">No items to sell</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const NpcInteractionModal: React.FC = () => {
  const { interactingNpc, closeInteraction, activeTab, setActiveTab, tradeError, setTradeError, acceptQuest, completeQuestAtNpc } = useNpcStore();
  const { position, isDragging, handleMouseDown } = useDraggablePanel();

  // Disable Phaser keyboard when modal is open
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

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeInteraction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeInteraction]);

  // Default to quests tab if NPC has ready or available quests
  useEffect(() => {
    if (interactingNpc) {
      if (interactingNpc.readyQuests?.length || interactingNpc.availableQuests?.length) {
        setActiveTab('quests');
      } else {
        setActiveTab('dialogue');
      }
    }
  }, [interactingNpc, setActiveTab]);

  if (!interactingNpc) return null;

  // Get greeting dialogue (condition: 'greeting' or first dialogue)
  const greetingLine = interactingNpc.dialogue.find(d => d.condition === 'greeting')
    ?? interactingNpc.dialogue[0];
  const dialogueText = greetingLine?.text ?? '...';

  // Portrait color from NPC definition
  const portraitColor = `#${interactingNpc.color.toString(16).padStart(6, '0')}`;

  // Check if NPC has quests
  const hasQuests = interactingNpc.availableQuests?.length ||
                    interactingNpc.activeQuests?.length ||
                    interactingNpc.readyQuests?.length;

  // Render quests tab content
  const renderQuestsTab = () => {
    if (!hasQuests) return <p className="npc-empty-message">No quests available.</p>;

    return (
      <div className="npc-quests-tab">
        {/* Ready quests (turn in) - show first, most important */}
        {interactingNpc.readyQuests?.map(quest => (
          <div key={quest.questId} className="npc-quest npc-quest--ready">
            <div className="npc-quest-marker">?</div>
            <div className="npc-quest-info">
              <h4 className="npc-quest-name">{quest.displayName}</h4>
              <button
                className="npc-action-btn npc-action-btn--primary"
                onClick={() => completeQuestAtNpc(quest.questId)}
              >
                Turn In
              </button>
            </div>
          </div>
        ))}

        {/* Available quests (can accept) */}
        {interactingNpc.availableQuests?.map(quest => (
          <div key={quest.questId} className="npc-quest npc-quest--available">
            <div className="npc-quest-marker">!</div>
            <div className="npc-quest-info">
              <h4 className="npc-quest-name">{quest.displayName}</h4>
              <p className="npc-quest-desc">{quest.description}</p>
              <div className="npc-quest-rewards">
                {quest.rewards.credits && <span className="npc-quest-reward">{quest.rewards.credits} credits</span>}
                {quest.rewards.xp && <span className="npc-quest-reward">{quest.rewards.xp} XP</span>}
              </div>
              <button
                className="npc-action-btn npc-action-btn--primary"
                onClick={() => acceptQuest(quest.questId)}
              >
                Accept Quest
              </button>
            </div>
          </div>
        ))}

        {/* Active quests (in progress) */}
        {interactingNpc.activeQuests?.map(quest => (
          <div key={quest.questId} className="npc-quest npc-quest--active">
            <div className="npc-quest-info">
              <h4 className="npc-quest-name">{quest.displayName}</h4>
              <p className="npc-quest-desc">{quest.description}</p>
              <div className="npc-quest-objectives">
                {quest.objectives.map((obj, i) => (
                  <div key={i} className={`npc-quest-objective ${obj.complete ? 'npc-quest-objective--complete' : ''}`}>
                    {obj.description}: {obj.current}/{obj.required}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render action buttons based on NPC type
  const renderActionButtons = () => {
    if (!interactingNpc) return null;

    switch (interactingNpc.npcType) {
      case 'trader':
        return (
          <button
            className="npc-action-btn npc-action-btn--primary"
            onClick={() => setActiveTab('trade')}
          >
            Trade
          </button>
        );

      case 'service': {
        const serviceLabel = interactingNpc.serviceType
          ? SERVICE_LABELS[interactingNpc.serviceType] ?? 'Service'
          : 'Service';
        return (
          <button
            className="npc-action-btn npc-action-btn--primary"
            onClick={() => {
              // Future: service-specific actions
              console.log(`${serviceLabel} clicked - to be implemented`);
            }}
          >
            {serviceLabel}
          </button>
        );
      }

      case 'faction_rep':
        return hasQuests ? (
          <button
            className="npc-action-btn npc-action-btn--primary"
            onClick={() => setActiveTab('quests')}
          >
            Faction Quests
          </button>
        ) : null;

      case 'guard':
      case 'ambient':
        // Guards and ambient NPCs have no action buttons
        return null;

      default:
        return null;
    }
  };

  return (
    <div
      className="npc-modal ui-panel"
      style={{ transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)` }}
    >
      <div
        className="npc-modal-header"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <span>{interactingNpc.displayName}</span>
        <button className="close-btn" onClick={closeInteraction}>&times;</button>
      </div>

      <div className="npc-modal-content">
        {/* Portrait section */}
        <div className="npc-portrait-section">
          <div className="npc-portrait" style={{ backgroundColor: portraitColor }}>
            {/* Future: actual portrait sprite. For now, colored placeholder */}
          </div>
          <div className="npc-identity">
            <span className="npc-name">{interactingNpc.displayName}</span>
            <span className="npc-type">{NPC_TYPE_LABELS[interactingNpc.npcType] ?? interactingNpc.npcType}</span>
            {interactingNpc.title && <span className="npc-title">{interactingNpc.title}</span>}
            {interactingNpc.role && <span className="npc-role">{interactingNpc.role}</span>}
          </div>
        </div>

        {/* Tab navigation - only show if trader or has quests */}
        {(interactingNpc.npcType === 'trader' || hasQuests) && (
          <div className="npc-tabs">
            <button
              className={`npc-tab ${activeTab === 'dialogue' ? 'npc-tab--active' : ''}`}
              onClick={() => setActiveTab('dialogue')}
            >
              Dialogue
            </button>
            {interactingNpc.npcType === 'trader' && (
              <button
                className={`npc-tab ${activeTab === 'trade' ? 'npc-tab--active' : ''}`}
                onClick={() => setActiveTab('trade')}
              >
                Trade
              </button>
            )}
            {hasQuests && (
              <button
                className={`npc-tab ${activeTab === 'quests' ? 'npc-tab--active' : ''}`}
                onClick={() => setActiveTab('quests')}
              >
                Quests {interactingNpc.availableQuests?.length ? `(${interactingNpc.availableQuests.length})` : ''}
              </button>
            )}
          </div>
        )}

        {/* Tab content */}
        {activeTab === 'dialogue' && (
          <>
            <div className="npc-dialogue">
              <p className="npc-dialogue-text">"{dialogueText}"</p>
            </div>
            <div className="npc-actions">
              {renderActionButtons()}
            </div>
          </>
        )}
        {activeTab === 'trade' && <TradeTab npc={interactingNpc} tradeError={tradeError} setTradeError={setTradeError} />}
        {activeTab === 'quests' && renderQuestsTab()}
      </div>
    </div>
  );
};
