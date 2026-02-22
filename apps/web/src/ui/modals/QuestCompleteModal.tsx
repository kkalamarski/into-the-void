import React, { useEffect } from 'react';
import { useQuestStore } from '../../store/questStore';
import './QuestCompleteModal.css';

export const QuestCompleteModal: React.FC = () => {
  const completedQuestReward = useQuestStore(state => state.completedQuestReward);
  const clearCompletedReward = useQuestStore(state => state.clearCompletedReward);

  // QUEST-44: Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!completedQuestReward) return;
    const timer = setTimeout(() => clearCompletedReward(), 5000);
    return () => clearTimeout(timer);
  }, [completedQuestReward, clearCompletedReward]);

  if (!completedQuestReward) return null;

  const { displayName, rewards } = completedQuestReward;

  return (
    <div className="quest-complete-overlay">
      <div className="quest-complete-modal">
        <div className="quest-complete-banner">Quest Complete!</div>
        <div className="quest-complete-name">{displayName}</div>
        <div className="quest-complete-rewards">
          <div className="rewards-title">Rewards</div>
          <div className="rewards-list">
            {rewards.credits && rewards.credits > 0 && (
              <div className="reward-item reward-credits">
                +{rewards.credits.toLocaleString()} Credits
              </div>
            )}
            {rewards.xp && rewards.xp > 0 && (
              <div className="reward-item reward-xp">
                +{rewards.xp.toLocaleString()} XP
              </div>
            )}
            {rewards.items && rewards.items.length > 0 && (
              rewards.items.map((item, i) => (
                <div key={i} className="reward-item reward-item-drop">
                  {item.quantity}x {item.itemId}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
