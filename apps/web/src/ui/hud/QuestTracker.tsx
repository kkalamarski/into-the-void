import React, { useState } from 'react';
import { useQuestStore } from '../../store/questStore';
import { useGameStore } from '../../store/gameStore';
import './QuestTracker.css';

const STORAGE_KEY = 'quest-tracker-collapsed';

export const QuestTracker: React.FC = () => {
  const activeQuests = useQuestStore(state => state.activeQuests);
  const trackedQuests = useQuestStore(state => state.trackedQuests);
  const toggleQuestLog = useGameStore(state => state.toggleQuestLog);

  // Collapse state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem(STORAGE_KEY, String(newValue));
      return newValue;
    });
  };

  // Filter to only tracked quests
  const tracked = activeQuests.filter(q => trackedQuests.has(q.questId));

  // Limit to 3 quests for display
  const displayQuests = tracked.slice(0, 3);

  if (tracked.length === 0) return null;

  return (
    <div className="quest-tracker">
      <div className="quest-tracker-header" onClick={toggleCollapse}>
        <span className="quest-tracker-title">Quests ({tracked.length})</span>
        <span className="quest-tracker-toggle">{isCollapsed ? '>' : 'v'}</span>
      </div>
      {!isCollapsed && (
        <div className="quest-tracker-content">
          {displayQuests.map((quest, index) => (
            <div
              key={quest.questId}
              className={`tracked-quest ${index === 0 ? 'tracked-quest--primary' : 'tracked-quest--secondary'}`}
              onClick={toggleQuestLog}
              title="Click to open quest log"
            >
              <div className="tracked-quest-name">{quest.displayName}</div>
              <div className="tracked-quest-objectives">
                {quest.objectives.map((obj, i) => (
                  <div
                    key={i}
                    className={`tracked-objective ${obj.complete ? 'tracked-objective--complete' : ''}`}
                  >
                    <span className="objective-text">{obj.description}</span>
                    <span className="objective-progress">
                      {obj.current}/{obj.required}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {tracked.length > 3 && (
            <div className="quest-tracker-overflow">+{tracked.length - 3} more</div>
          )}
        </div>
      )}
    </div>
  );
};
