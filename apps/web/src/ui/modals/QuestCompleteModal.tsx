import React from 'react';
import { useQuestStore } from '../../store/questStore';
import { useModalStack } from '../../hooks/useModalStack';
import './QuestCompleteModal.css';

interface QuestCompleteContentProps {
  onClose: () => void;
}

const QuestCompleteContent: React.FC<QuestCompleteContentProps> = ({ onClose }) => {
  const completedRewards = useQuestStore(state => state.completedRewards);
  const removeCompletedReward = useQuestStore(state => state.removeCompletedReward);

  useModalStack('quest-complete', onClose);

  // Click-to-dismiss handler with event propagation stopping
  const handleDismiss = (e: React.MouseEvent, questId: string) => {
    e.stopPropagation(); // Prevent click from reaching game canvas
    removeCompletedReward(questId);
  };

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

export const QuestCompleteModal: React.FC = () => {
  const completedRewards = useQuestStore(state => state.completedRewards);
  const removeCompletedReward = useQuestStore(state => state.removeCompletedReward);

  if (completedRewards.length === 0) return null;

  // Dismiss the first reward on ESC (LIFO within one component = dismiss oldest first)
  const handleEscClose = () => {
    if (completedRewards.length > 0) {
      removeCompletedReward(completedRewards[0].questId);
    }
  };

  return <QuestCompleteContent onClose={handleEscClose} />;
};
