import React, { useState, useEffect, useRef } from 'react';
import { useCraftingStore } from '../../store/craftingStore';
import { useGameStore } from '../../store/gameStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useModalStack } from '../../hooks/useModalStack';
import { useDraggablePanel } from '../../hooks/useDraggablePanel';
import { ItemRegistry } from '@into-the-void/items';
import { ItemIcon } from '../../components/ItemIcon';
import { getQualityThresholds } from '@into-the-void/game-logic';
import type {
  CraftingDiscipline,
  RecipeDefinition,
  CraftingProficiencyData,
} from '@into-the-void/shared-types';
import {
  GiAnvil,
  GiCauldron,
  GiPestleMortar,
  GiGears,
  GiPadlock,
} from 'react-icons/gi';
import type { IconType } from 'react-icons';
import './CraftingPanel.css';

const DISCIPLINE_CONFIG: {
  id: CraftingDiscipline;
  label: string;
  icon: IconType;
}[] = [
  { id: 'equipment', label: 'Equipment', icon: GiAnvil },
  { id: 'consumables', label: 'Consumables', icon: GiCauldron },
  { id: 'reagents', label: 'Reagents', icon: GiPestleMortar },
  { id: 'automation', label: 'Automation', icon: GiGears },
];

/**
 * Calculate XP progress within current level.
 * Level formula: level = floor(sqrt(xp / 100)) + 1
 * So xpForLevel(L) = (L-1)^2 * 100
 */
function getXpProgress(xp: number, level: number): number {
  const xpForCurrent = (level - 1) * (level - 1) * 100;
  const xpForNext = level * level * 100;
  const range = xpForNext - xpForCurrent;
  if (range <= 0) return 1;
  return Math.min(1, Math.max(0, (xp - xpForCurrent) / range));
}

/**
 * Count how many of a specific item the player owns in inventory.
 */
function getOwnedCount(itemId: string, items: { itemId: string; quantity: number }[]): number {
  return items
    .filter((i) => i.itemId === itemId)
    .reduce((sum, i) => sum + i.quantity, 0);
}

/**
 * Check if player has all ingredients for a recipe.
 */
function hasAllIngredients(
  recipe: RecipeDefinition,
  items: { itemId: string; quantity: number }[]
): boolean {
  return recipe.ingredients.every(
    (ing) => getOwnedCount(ing.itemId, items) >= ing.quantity
  );
}

// ── Sub-components ──

function DisciplineTabs({
  proficiency,
}: {
  proficiency: CraftingProficiencyData | null;
}) {
  const activeDiscipline = useCraftingStore((s) => s.activeDiscipline);
  const setActiveDiscipline = useCraftingStore((s) => s.setActiveDiscipline);

  const activeData = proficiency?.[activeDiscipline];
  const xpProgress = activeData ? getXpProgress(activeData.xp, activeData.level) : 0;

  return (
    <div className="crafting-tabs">
      {DISCIPLINE_CONFIG.map((disc) => {
        const Icon = disc.icon;
        const level = proficiency?.[disc.id]?.level ?? 1;
        const isActive = activeDiscipline === disc.id;

        return (
          <button
            key={disc.id}
            className={`crafting-tab ${isActive ? 'crafting-tab--active' : ''}`}
            onClick={() => setActiveDiscipline(disc.id)}
            title={`${disc.label} (Level ${level})`}
          >
            <Icon className="crafting-tab-icon" />
            <span className="crafting-tab-label">{disc.label}</span>
            <span className="crafting-tab-level">Lv.{level}</span>
          </button>
        );
      })}
      <div className="crafting-xp-section">
        <div className="crafting-xp-bar">
          <div
            className="crafting-xp-bar-fill"
            style={{ width: `${xpProgress * 100}%` }}
          />
        </div>
        <span className="crafting-xp-label">
          {activeData
            ? `${activeData.xp - (activeData.level - 1) * (activeData.level - 1) * 100} / ${activeData.level * activeData.level * 100 - (activeData.level - 1) * (activeData.level - 1) * 100} XP`
            : 'XP'}
        </span>
      </div>
    </div>
  );
}

function RecipeList() {
  const recipes = useCraftingStore((s) => s.recipes);
  const activeDiscipline = useCraftingStore((s) => s.activeDiscipline);
  const selectedRecipeId = useCraftingStore((s) => s.selectedRecipeId);
  const setSelectedRecipeId = useCraftingStore((s) => s.setSelectedRecipeId);
  const { inventory } = useInventoryStore();

  const filtered = recipes.filter((r) => r.recipe.discipline === activeDiscipline);
  const items = inventory?.items ?? [];

  return (
    <div className="crafting-recipe-list">
      {filtered.length === 0 && (
        <div className="crafting-recipe-empty">No recipes</div>
      )}
      {filtered.map((entry) => {
        const { recipe, unlocked } = entry;
        const craftable = unlocked && hasAllIngredients(recipe, items);
        const isSelected = selectedRecipeId === recipe.id;

        const rowClasses = [
          'crafting-recipe-row',
          isSelected ? 'crafting-recipe--selected' : '',
          !unlocked ? 'crafting-recipe--locked' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={recipe.id}
            className={rowClasses}
            onClick={() => setSelectedRecipeId(recipe.id)}
          >
            <ItemIcon
              itemId={recipe.outputItemId}
              fallbackColor={ItemRegistry.get(recipe.outputItemId)?.color ?? 0x888888}
              size={24}
              className="crafting-recipe-icon"
            />
            <span className="crafting-recipe-name">{recipe.displayName}</span>
            {!unlocked ? (
              <GiPadlock className="crafting-recipe-status crafting-recipe-status--locked" />
            ) : craftable ? (
              <span className="crafting-recipe-status crafting-recipe-status--craftable" />
            ) : (
              <span className="crafting-recipe-status crafting-recipe-status--missing" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function RecipeDetail() {
  const recipes = useCraftingStore((s) => s.recipes);
  const selectedRecipeId = useCraftingStore((s) => s.selectedRecipeId);
  const proficiency = useCraftingStore((s) => s.proficiency);
  const activeCraft = useCraftingStore((s) => s.activeCraft);
  const startCraft = useCraftingStore((s) => s.startCraft);
  const { inventory } = useInventoryStore();

  const [progress, setProgress] = useState(0);
  const [remainingSec, setRemainingSec] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Progress bar timer
  useEffect(() => {
    if (!activeCraft) {
      setProgress(0);
      setRemainingSec(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const update = () => {
      const elapsed = Date.now() - activeCraft.startedAt;
      const pct = Math.min(1, elapsed / activeCraft.durationMs);
      const rem = Math.max(0, activeCraft.durationMs - elapsed);
      setProgress(pct);
      setRemainingSec(Math.ceil(rem / 1000));
    };

    update();
    intervalRef.current = setInterval(update, 100);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeCraft]);

  if (!selectedRecipeId) {
    return (
      <div className="crafting-detail">
        <div className="crafting-detail-empty">Select a recipe</div>
      </div>
    );
  }

  const entry = recipes.find((r) => r.recipe.id === selectedRecipeId);
  if (!entry) {
    return (
      <div className="crafting-detail">
        <div className="crafting-detail-empty">Recipe not found</div>
      </div>
    );
  }

  const { recipe, unlocked, unlockReasons } = entry;
  const items = inventory?.items ?? [];
  const canCraft = unlocked && hasAllIngredients(recipe, items) && !activeCraft;
  const outputDef = ItemRegistry.get(recipe.outputItemId);

  // Quality thresholds
  const profLevel = proficiency?.[recipe.discipline]?.level ?? 1;
  const quality = getQualityThresholds(profLevel, recipe.tier);

  // Determine disabled reason
  let disabledReason = '';
  if (activeCraft) {
    disabledReason = 'Craft in progress';
  } else if (!unlocked) {
    disabledReason = unlockReasons.join(', ');
  } else if (!hasAllIngredients(recipe, items)) {
    disabledReason = 'Missing ingredients';
  }

  const isCraftingThis = activeCraft?.recipeId === recipe.id;

  return (
    <div className="crafting-detail">
      {/* Header */}
      <div className="crafting-detail-header">
        <ItemIcon
          itemId={recipe.outputItemId}
          fallbackColor={outputDef?.color ?? 0x888888}
          size={48}
          className="crafting-detail-icon"
        />
        <div className="crafting-detail-title">
          <span className="crafting-detail-name">{recipe.displayName}</span>
          <span className="crafting-detail-desc">{recipe.description}</span>
        </div>
      </div>

      {/* Locked overlay */}
      {!unlocked && (
        <div className="crafting-locked-banner">
          <GiPadlock className="crafting-locked-icon" />
          <div className="crafting-locked-reasons">
            {unlockReasons.map((reason, i) => (
              <span key={i}>{reason}</span>
            ))}
          </div>
        </div>
      )}

      {/* Ingredients */}
      <div className="crafting-ingredients">
        <div className="crafting-section-title">Ingredients</div>
        {recipe.ingredients.map((ing) => {
          const owned = getOwnedCount(ing.itemId, items);
          const sufficient = owned >= ing.quantity;
          const ingDef = ItemRegistry.get(ing.itemId);
          return (
            <div
              key={ing.itemId}
              className={`crafting-ingredient ${sufficient ? 'crafting-ing--sufficient' : 'crafting-ing--insufficient'}`}
            >
              <ItemIcon
                itemId={ing.itemId}
                fallbackColor={ingDef?.color ?? 0x888888}
                size={20}
                className="crafting-ingredient-icon"
              />
              <span className="crafting-ingredient-name">
                {ingDef?.displayName ?? ing.itemId}
              </span>
              <span className="crafting-ingredient-count">
                x{owned}/{ing.quantity}
              </span>
            </div>
          );
        })}
      </div>

      {/* Quality */}
      <div className="crafting-quality">
        <div className="crafting-section-title">Quality</div>
        <div className="crafting-quality-badges">
          <span className="crafting-quality-badge crafting-quality-badge--standard">
            Standard {Math.round(quality.standardChance * 100)}%
          </span>
          {quality.refinedChance > 0.005 && (
            <span className="crafting-quality-badge crafting-quality-badge--refined">
              Refined {Math.round(quality.refinedChance * 100)}%
            </span>
          )}
          {quality.masterworkChance > 0.005 && (
            <span className="crafting-quality-badge crafting-quality-badge--masterwork">
              Masterwork {Math.round(quality.masterworkChance * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Craft button or progress bar */}
      <div className="crafting-action">
        {isCraftingThis ? (
          <div className="crafting-progress">
            <div className="crafting-progress-bar">
              <div
                className="crafting-progress-fill"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="crafting-progress-text">
              Crafting... {remainingSec}s
            </span>
          </div>
        ) : (
          <button
            className="crafting-craft-btn"
            disabled={!canCraft}
            onClick={() => startCraft(recipe.id)}
            title={disabledReason || 'Start crafting'}
          >
            {activeCraft ? 'Craft in Progress' : 'Craft'}
          </button>
        )}
      </div>

      {/* Craft time info */}
      {!activeCraft && (
        <div className="crafting-time-info">
          Craft time: {(recipe.craftTimeMs / 1000).toFixed(1)}s
        </div>
      )}
    </div>
  );
}

// ── Main Component ──

export const CraftingPanel: React.FC = () => {
  const { toggleCrafting } = useGameStore();
  const { requestRecipes } = useCraftingStore();
  const { position, handleMouseDown } = useDraggablePanel();

  useModalStack('crafting-panel', toggleCrafting);

  // Disable Phaser keyboard while panel is open
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

  // Request recipes on mount
  useEffect(() => {
    requestRecipes();
  }, []);

  const proficiency = useCraftingStore((s) => s.proficiency);

  return (
    <div
      className="crafting-panel ui-panel"
      style={{
        transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
      }}
    >
      <div className="crafting-header" onMouseDown={handleMouseDown}>
        <span>Crafting</span>
        <button className="close-btn" onClick={toggleCrafting}>
          &times;
        </button>
      </div>

      <div className="crafting-body">
        <DisciplineTabs proficiency={proficiency} />
        <RecipeList />
        <RecipeDetail />
      </div>
    </div>
  );
};
