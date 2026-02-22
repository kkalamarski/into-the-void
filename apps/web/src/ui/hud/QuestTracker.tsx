import React from 'react';
import { useQuestStore } from '../../store/questStore';
import { useGameStore } from '../../store/gameStore';
import './QuestTracker.css';

export const QuestTracker: React.FC = () => {
  const activeQuests = useQuestStore(state => state.activeQuests);
  const trackedQuests = useQuestStore(state => state.trackedQuests);
  const toggleQuestLog = useGameStore(state => state.toggleQuestLog);

  // Filter to only tracked quests
  const tracked = activeQuests.filter(q => trackedQuests.has(q.questId));

  if (tracked.length === 0) return null;

  return (
    <div className="quest-tracker">
      {tracked.map(quest => (
        <div
          key={quest.questId}
          className="tracked-quest"
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
    </div>
  );
};
