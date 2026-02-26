import React, { useState, useEffect } from 'react';
import { useQuestStore } from '../../store/questStore';
import { useGameStore } from '../../store/gameStore';
import { useDraggablePanel } from '../../hooks/useDraggablePanel';
import { useModalStack } from '../../hooks/useModalStack';
import { gameSocket } from '../../network/socket';
import './QuestLogPanel.css';

export const QuestLogPanel: React.FC = () => {
  const { position, isDragging, handleMouseDown } = useDraggablePanel();
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const { activeQuests, completedQuests, trackedQuests, toggleTracked } = useQuestStore();
  const toggleQuestLog = useGameStore(state => state.toggleQuestLog);

  useModalStack('quest-log', toggleQuestLog);

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

  const handleAbandonQuest = (questId: string) => {
    if (confirm('Are you sure you want to abandon this quest?')) {
      gameSocket.emit('quest:abandon', { questId });
    }
  };

  return (
    <div
      className="quest-log-panel ui-panel"
      style={{ transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)` }}
    >
      <div
        className="quest-log-header"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <span>Quest Log</span>
        <button className="close-btn" onClick={toggleQuestLog}>&times;</button>
      </div>

      {/* Tab navigation */}
      <div className="quest-tabs">
        <button
          className={`quest-tab ${activeTab === 'active' ? 'quest-tab--active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active ({activeQuests.length})
        </button>
        <button
          className={`quest-tab ${activeTab === 'completed' ? 'quest-tab--active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed ({completedQuests.length})
        </button>
      </div>

      {/* Tab content */}
      <div className="quest-tab-content">
        {activeTab === 'active' && (
          <>
            {activeQuests.length === 0 ? (
              <p className="quest-empty-message">No active quests. Visit NPCs or explore the world to find quests!</p>
            ) : (
              activeQuests.map(quest => {
                const isTracked = trackedQuests.has(quest.questId);
                const allComplete = quest.objectives.every(obj => obj.complete);

                return (
                  <div key={quest.questId} className="quest-item">
                    <h4 className="quest-item-name">{quest.displayName}</h4>
                    <p className="quest-item-desc">{quest.description}</p>

                    {/* Objectives list */}
                    <div className="quest-objectives">
                      {quest.objectives.map((obj, i) => (
                        <div
                          key={i}
                          className={`quest-objective ${obj.complete ? 'quest-objective--complete' : ''}`}
                        >
                          <span className="objective-text">{obj.description}</span>
                          <span className="objective-progress">
                            {obj.current}/{obj.required}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div className="quest-actions">
                      <button
                        className={`quest-action-btn ${isTracked ? 'quest-action-btn--tracked' : ''}`}
                        onClick={() => toggleTracked(quest.questId)}
                      >
                        {isTracked ? 'Untrack' : 'Track'}
                      </button>
                      {!allComplete && (
                        <button
                          className="quest-action-btn quest-action-btn--danger"
                          onClick={() => handleAbandonQuest(quest.questId)}
                        >
                          Abandon
                        </button>
                      )}
                      {allComplete && (
                        <span className="quest-ready-indicator">Ready to turn in</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {activeTab === 'completed' && (
          <>
            {completedQuests.length === 0 ? (
              <p className="quest-empty-message">No completed quests yet.</p>
            ) : (
              completedQuests.map(quest => (
                <div key={quest.questId} className="quest-item quest-item--completed">
                  <h4 className="quest-item-name">{quest.displayName}</h4>
                  <p className="quest-completion-date">
                    Completed: {new Date(quest.completedAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
};
