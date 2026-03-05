import { create } from 'zustand';
import { gameSocket } from '../network/socket';
import { useAlertStore } from './alertStore';
import type {
  RecipeDefinition,
  CraftingDiscipline,
  CraftingProficiencyData,
} from '@into-the-void/shared-types';
import { ItemRegistry } from '@into-the-void/items';

export interface RecipeEntry {
  recipe: RecipeDefinition;
  unlocked: boolean;
  unlockReasons: string[];
}

interface ActiveCraft {
  recipeId: string;
  startedAt: number;
  durationMs: number;
}

interface CraftingState {
  // Recipe data
  recipes: RecipeEntry[];
  setRecipes: (recipes: RecipeEntry[]) => void;

  // Proficiency
  proficiency: CraftingProficiencyData | null;
  setProficiency: (prof: CraftingProficiencyData) => void;

  // UI state
  activeDiscipline: CraftingDiscipline;
  setActiveDiscipline: (d: CraftingDiscipline) => void;
  selectedRecipeId: string | null;
  setSelectedRecipeId: (id: string | null) => void;

  // Active craft
  activeCraft: ActiveCraft | null;
  setActiveCraft: (craft: ActiveCraft | null) => void;

  // Actions
  requestRecipes: () => void;
  startCraft: (recipeId: string) => void;
  collectCraft: () => void;
}

export const useCraftingStore = create<CraftingState>((set) => ({
  recipes: [],
  setRecipes: (recipes) => set({ recipes }),

  proficiency: null,
  setProficiency: (proficiency) => set({ proficiency }),

  activeDiscipline: 'equipment',
  setActiveDiscipline: (activeDiscipline) => set({ activeDiscipline, selectedRecipeId: null }),
  selectedRecipeId: null,
  setSelectedRecipeId: (selectedRecipeId) => set({ selectedRecipeId }),

  activeCraft: null,
  setActiveCraft: (activeCraft) => set({ activeCraft }),

  requestRecipes: () => {
    gameSocket.emit('crafting:recipes', {} as Record<string, never>);
  },

  startCraft: (recipeId: string) => {
    gameSocket.emit('crafting:start', { recipeId });
  },

  collectCraft: () => {
    gameSocket.emit('crafting:collect', {} as Record<string, never>);
  },
}));

// ── Socket event handlers (side-effect import pattern) ──

gameSocket.on('crafting:recipe-list', (data) => {
  useCraftingStore.getState().setRecipes(data.recipes);
  useCraftingStore.getState().setProficiency(data.proficiency);
});

gameSocket.on('crafting:started', (data) => {
  useCraftingStore.getState().setActiveCraft({
    recipeId: data.recipeId,
    startedAt: data.startedAt,
    durationMs: data.durationMs,
  });

  // Schedule auto-collect when timer elapses
  const elapsed = Date.now() - data.startedAt;
  const remaining = Math.max(0, data.durationMs - elapsed);
  setTimeout(() => {
    // Only auto-collect if this craft is still active
    const current = useCraftingStore.getState().activeCraft;
    if (current && current.recipeId === data.recipeId && current.startedAt === data.startedAt) {
      useCraftingStore.getState().collectCraft();
    }
  }, remaining + 200); // +200ms buffer for network latency
});

gameSocket.on('crafting:completed', (data) => {
  const prevProf = useCraftingStore.getState().proficiency;

  // Clear active craft
  useCraftingStore.getState().setActiveCraft(null);

  // Update proficiency from completion data
  if (prevProf) {
    const updatedProf = { ...prevProf };
    updatedProf[data.discipline] = {
      xp: data.newProficiencyXP,
      level: data.newProficiencyLevel,
    };
    useCraftingStore.getState().setProficiency(updatedProf);
  }

  // Toast notification with quality result
  const itemDef = ItemRegistry.get(data.outputItemId);
  const itemName = itemDef?.displayName ?? data.outputItemId;
  const qualityLabel = data.qualityTier === 'standard' ? '' : ` (${data.qualityTier})`;
  useAlertStore.getState().addAlert(
    `Crafted ${itemName}${qualityLabel} +${data.proficiencyXP} XP`,
    'info'
  );

  // Check for level-up by comparing old proficiency
  if (prevProf) {
    const oldLevel = prevProf[data.discipline].level;
    if (data.newProficiencyLevel > oldLevel) {
      const disciplineNames: Record<CraftingDiscipline, string> = {
        equipment: 'Equipment Crafting',
        consumables: 'Consumable Crafting',
        reagents: 'Reagent Processing',
        automation: 'Automation Crafting',
      };
      useAlertStore.getState().addAlert(
        `${disciplineNames[data.discipline]} Level ${data.newProficiencyLevel}!`,
        'info'
      );
    }
  }

  // Re-fetch recipes to update unlock status after proficiency change
  useCraftingStore.getState().requestRecipes();
});

gameSocket.on('crafting:error', (data) => {
  useCraftingStore.getState().setActiveCraft(null);
  useAlertStore.getState().addAlert(data.message, 'error');
});
