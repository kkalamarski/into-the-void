import React, { useState, useEffect } from 'react';
import { useCraftingStore } from '../../store/craftingStore';
import { useGameStore } from '../../store/gameStore';
import { GiAnvil } from 'react-icons/gi';
import './CraftingIndicator.css';

export const CraftingIndicator: React.FC = () => {
  const activeCraft = useCraftingStore((s) => s.activeCraft);
  const recipes = useCraftingStore((s) => s.recipes);
  const showCrafting = useGameStore((s) => s.showCrafting);
  const toggleCrafting = useGameStore((s) => s.toggleCrafting);
  const [progress, setProgress] = useState(0);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!activeCraft) {
      setProgress(0);
      setRemaining(0);
      return;
    }

    const update = () => {
      const elapsed = Date.now() - activeCraft.startedAt;
      const pct = Math.min(1, elapsed / activeCraft.durationMs);
      const rem = Math.max(0, activeCraft.durationMs - elapsed);
      setProgress(pct);
      setRemaining(rem);
    };

    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [activeCraft]);

  // Don't show if: no active craft, or crafting panel is already open
  if (!activeCraft || showCrafting) return null;

  // Find recipe display name
  const recipeEntry = recipes.find((r) => r.recipe.id === activeCraft.recipeId);
  const recipeName = recipeEntry?.recipe.displayName ?? 'Crafting...';
  const remainingSec = Math.ceil(remaining / 1000);

  return (
    <div
      className="crafting-indicator"
      onClick={toggleCrafting}
      title="Click to open crafting panel"
    >
      <GiAnvil className="crafting-indicator-icon" />
      <div className="crafting-indicator-info">
        <span className="crafting-indicator-name">{recipeName}</span>
        <div className="crafting-indicator-bar">
          <div
            className="crafting-indicator-bar-fill"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="crafting-indicator-time">{remainingSec}s</span>
      </div>
    </div>
  );
};
