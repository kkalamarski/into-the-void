import React from 'react';
import { useQuestStore } from '../../store/questStore';
import './QuestCompleteModal.css';

export const QuestCompleteModal: React.FC = () => {
  const completedRewards = useQuestStore(state => state.completedRewards);
  const removeCompletedReward = useQuestStore(state => state.removeCompletedReward);

  // Click-to-dismiss handler with event propagation stopping
  const handleDismiss = (e: React.MouseEvent, questId: string) => {
    e.stopPropagation(); // Prevent click from reaching game canvas
    removeCompletedReward(questId);
  };

  if (completedRewards.length === 0) return null;

  return (
    <div className="quest-complete-overlay">
      {completedRewards.map((reward, index) => {
        const { questId, displayName, rewards } = reward;
        return (
          <div
            key={questId}
            className="quest-complete-modal"
            onClick={(e) => handleDismiss(e, questId)}
            style={{ top: `${30 + index * 12}%` }}
          >
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
                  rewards.items.map((item: { itemId: string; quantity: number }, i: number) => (
                    <div key={i} className="reward-item reward-item-drop">
                      {item.quantity}x {item.itemId}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
