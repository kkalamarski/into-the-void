import React, { useEffect } from 'react';
import { useNpcStore } from '../../store/npcStore';
import { useGameStore } from '../../store/gameStore';
import { useDraggablePanel } from '../../hooks/useDraggablePanel';
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

export const NpcInteractionModal: React.FC = () => {
  const { interactingNpc, closeInteraction, openTrading } = useNpcStore();
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

  if (!interactingNpc) return null;

  // Get greeting dialogue (condition: 'greeting' or first dialogue)
  const greetingLine = interactingNpc.dialogue.find(d => d.condition === 'greeting')
    ?? interactingNpc.dialogue[0];
  const dialogueText = greetingLine?.text ?? '...';

  // Portrait color from NPC definition
  const portraitColor = `#${interactingNpc.color.toString(16).padStart(6, '0')}`;

  // Render action buttons based on NPC type
  const renderActionButtons = () => {
    if (!interactingNpc) return null;

    switch (interactingNpc.npcType) {
      case 'trader':
        return (
          <button
            className="npc-action-btn npc-action-btn--primary"
            onClick={() => {
              openTrading();
            }}
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
        return (
          <button
            className="npc-action-btn npc-action-btn--primary"
            onClick={() => {
              // Future: faction quests/reputation
              console.log('Faction rep clicked - to be implemented');
            }}
          >
            Faction Quests
          </button>
        );

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

        {/* Dialogue section */}
        <div className="npc-dialogue">
          <p className="npc-dialogue-text">"{dialogueText}"</p>
        </div>

        {/* Action buttons - type-specific */}
        <div className="npc-actions">
          {renderActionButtons()}
        </div>
      </div>
    </div>
  );
};
