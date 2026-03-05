import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from '../database/database.service';
import { PlayerService } from './player.service';
import { InventoryService } from './inventory.service';
import {
  RecipeDefinition,
  RecipeIngredient,
  RecipeUnlockCondition,
  CraftingDiscipline,
  QualityTier,
} from '@into-the-void/shared-types';
import {
  craftingProficiency,
  CraftingProficiencyJson,
  DEFAULT_CRAFTING_PROFICIENCY,
  recipeUnlocks,
} from '@into-the-void/database';
import { ALL_RECIPES } from '@into-the-void/items';
import { rollQualityTier, calculateEffectiveXP, getQualityStatMultiplier } from '@into-the-void/game-logic';
import { eq, and } from 'drizzle-orm';

/**
 * Active craft state — stored in-memory for the duration of the craft timer (5-30s).
 * Not persisted — disconnect cancels, server restart cancels all.
 */
interface ActiveCraft {
  recipeId: string;
  startedAt: number;
  durationMs: number;
  timerId: ReturnType<typeof setTimeout>;
  characterId: string;
}

/**
 * Result types for CraftingService methods.
 */
export type StartCraftResult =
  | { success: true; recipeId: string; durationMs: number; startedAt: number }
  | { success: false; code: string; message: string };

export type CollectCraftResult =
  | { success: true; recipeId: string; outputItemId: string; qualityTier: QualityTier; proficiencyXP: number; discipline: CraftingDiscipline }
  | { success: false; code: string; message: string };

// --- Recipe Registry ---
// Module-level registry. Populated by Phase 123 recipe content.
// Exported for testing and recipe registration.
const recipes = new Map<string, RecipeDefinition>();

export function registerRecipe(recipe: RecipeDefinition): void {
  recipes.set(recipe.id, recipe);
}

export function getRecipe(id: string): RecipeDefinition | undefined {
  return recipes.get(id);
}

export function getAllRecipes(): RecipeDefinition[] {
  return Array.from(recipes.values());
}

/** Max crafting proficiency level for speed curve calculation */
const MAX_CRAFT_LEVEL = 50;

@Injectable()
export class CraftingService implements OnModuleInit {
  private readonly logger = new Logger(CraftingService.name);

  /** Active crafts keyed by characterId. One per player max (CRFT-06). */
  private activeCrafts: Map<string, ActiveCraft> = new Map();
  /** Cached proficiency keyed by characterId. Loaded on join, evicted on disconnect. */
  private proficiencyCache: Map<string, CraftingProficiencyJson> = new Map();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly playerService: PlayerService,
    private readonly inventoryService: InventoryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Register all recipes from the items package on server startup.
   * Phase 123: Replaces manual registration with auto-registration of ALL_RECIPES.
   */
  onModuleInit(): void {
    for (const recipe of ALL_RECIPES) {
      registerRecipe(recipe);
    }
    const disciplines = new Set(ALL_RECIPES.map(r => r.discipline));
    this.logger.log(`Registered ${ALL_RECIPES.length} recipes across ${disciplines.size} disciplines`);
  }

  // ────────────────────────────────────────────────────────────────
  // Lifecycle: Load / Unload
  // ────────────────────────────────────────────────────────────────

  /**
   * Load crafting proficiency for a character (called on player join).
   * Creates a default row if none exists (first-time player).
   * Mirrors GatheringService.loadProficiency pattern.
   */
  async loadProficiency(characterId: string): Promise<CraftingProficiencyJson> {
    const cached = this.proficiencyCache.get(characterId);
    if (cached) return cached;

    const db = this.databaseService.getClient();
    const [row] = await db
      .select()
      .from(craftingProficiency)
      .where(eq(craftingProficiency.characterId, characterId));

    if (row) {
      // Defensive: merge defaults for any disciplines added after character creation (Phase 124+)
      const merged = { ...DEFAULT_CRAFTING_PROFICIENCY, ...row.proficiency };
      this.proficiencyCache.set(characterId, merged);
      return merged;
    }

    // Create new proficiency row for character
    const [created] = await db
      .insert(craftingProficiency)
      .values({ characterId, proficiency: DEFAULT_CRAFTING_PROFICIENCY })
      .returning();

    this.proficiencyCache.set(characterId, created.proficiency);
    return created.proficiency;
  }

  /**
   * Clean up on player disconnect (CRFT-07).
   * Cancels active craft if any, evicts proficiency cache.
   * Ingredients are NOT refunded (consumed on start, per design decision).
   */
  unloadPlayer(characterId: string): void {
    const active = this.activeCrafts.get(characterId);
    if (active) {
      clearTimeout(active.timerId);
      this.activeCrafts.delete(characterId);
    }
    this.proficiencyCache.delete(characterId);
  }

  // ────────────────────────────────────────────────────────────────
  // Core: Start Craft
  // ────────────────────────────────────────────────────────────────

  /**
   * Start a crafting operation (CRFT-03, CRFT-04, CRFT-05, CRFT-06).
   *
   * Validation order:
   *  1. Player exists
   *  2. No active craft (one-at-a-time)
   *  3. Recipe exists in registry
   *  4. Faction check (specialty recipes)
   *  5. Unlock conditions (level, quest, POI)
   *  6. Ingredient consumption (atomic validate-then-mutate)
   *  7. Start timer
   */
  async startCraft(socketId: string, recipeId: string): Promise<StartCraftResult> {
    // 1. Resolve player
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) {
      return { success: false, code: 'PLAYER_NOT_FOUND', message: 'Player not found' };
    }
    const characterId = player.id;

    // 2. One-active-craft enforcement (CRFT-06)
    if (this.activeCrafts.has(characterId)) {
      return { success: false, code: 'CRAFT_ACTIVE', message: 'A craft is already in progress' };
    }

    // 3. Recipe lookup
    const recipe = getRecipe(recipeId);
    if (!recipe) {
      return { success: false, code: 'RECIPE_NOT_FOUND', message: 'Recipe does not exist' };
    }

    // 4. Faction restriction check
    if (recipe.factionRestriction && player.faction !== recipe.factionRestriction) {
      return {
        success: false,
        code: 'WRONG_FACTION',
        message: `This recipe requires ${recipe.factionRestriction} faction membership`,
      };
    }

    // 5. Unlock conditions check
    for (const condition of recipe.unlockConditions) {
      const unlocked = await this.checkUnlockCondition(characterId, player, condition);
      if (!unlocked) {
        const reason = this.formatUnlockReason(condition);
        return { success: false, code: 'RECIPE_LOCKED', message: `Recipe locked: ${reason}` };
      }
    }

    // 6. Atomic ingredient consumption (CRFT-04)
    const consumeResult = await this.inventoryService.consumeItems(
      characterId,
      recipe.ingredients.map(i => ({ itemId: i.itemId, quantity: i.quantity }))
    );
    if (!consumeResult.success) {
      return {
        success: false,
        code: 'MISSING_INGREDIENTS',
        message: consumeResult.reason ?? 'Insufficient ingredients',
      };
    }

    // 7. Calculate adjusted duration (proficiency speed bonus)
    const prof = await this.loadProficiency(characterId);
    const disciplineData = prof[recipe.discipline];
    const adjustedDuration = this.calculateAdjustedDuration(recipe.craftTimeMs, disciplineData.level);
    const startedAt = Date.now();

    // 8. Set timer and store active craft (CRFT-05)
    const timerId = setTimeout(() => {
      // Timer elapsed — craft is ready for collection.
      // No auto-complete; player must send crafting:collect.
    }, adjustedDuration + 1000); // +1s grace for network latency

    this.activeCrafts.set(characterId, {
      recipeId,
      startedAt,
      durationMs: adjustedDuration,
      timerId,
      characterId,
    });

    // Emit internal event for potential quest tracking
    this.eventEmitter.emit('craft.started', { characterId, recipeId });

    return { success: true, recipeId, durationMs: adjustedDuration, startedAt };
  }

  // ────────────────────────────────────────────────────────────────
  // Core: Collect Craft
  // ────────────────────────────────────────────────────────────────

  /**
   * Collect a completed craft. Rejects if timer hasn't elapsed yet.
   */
  async collectCraft(socketId: string): Promise<CollectCraftResult> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) {
      return { success: false, code: 'PLAYER_NOT_FOUND', message: 'Player not found' };
    }
    const characterId = player.id;

    const active = this.activeCrafts.get(characterId);
    if (!active) {
      return { success: false, code: 'NO_ACTIVE_CRAFT', message: 'No craft in progress' };
    }

    // Reject early collection (CRFT-05)
    if (Date.now() < active.startedAt + active.durationMs) {
      return { success: false, code: 'CRAFT_NOT_READY', message: 'Craft still in progress' };
    }

    // Clear active craft state
    clearTimeout(active.timerId);
    this.activeCrafts.delete(characterId);

    const recipe = getRecipe(active.recipeId);
    if (!recipe) {
      // Defensive — shouldn't happen since recipe was validated on start
      return { success: false, code: 'RECIPE_NOT_FOUND', message: 'Recipe no longer exists' };
    }

    // Phase 123: Roll quality tier based on proficiency level
    const prof = await this.loadProficiency(characterId);
    const disciplineData = prof[recipe.discipline];
    const qualityResult = rollQualityTier(disciplineData.level, recipe.tier);
    const qualityTier = qualityResult.tier;

    // Add output item to inventory (exactly 1 item per user decision)
    // Store quality tier in properties for stat computation (standard omitted for cleaner data)
    const addResult = await this.inventoryService.addItem(characterId, {
      instanceId: crypto.randomUUID(),
      itemId: recipe.outputItemId,
      quantity: 1,
      slot: -1, // addItem finds an available slot
      properties: {
        ...(qualityTier !== 'standard' ? { qualityTier } : {}),
      },
    });

    if (!addResult.success) {
      // Edge case: inventory full after consuming ingredients.
      // Item is lost — player should manage inventory before crafting.
      // TODO: Consider dropping as ground item in future phase
    }

    // Phase 123: Award proficiency XP with decay for low-tier recipes
    const effectiveXP = calculateEffectiveXP(recipe.proficiencyXP, disciplineData.level, recipe.tier);
    await this.awardProficiencyXP(characterId, recipe.discipline, effectiveXP);

    // Emit internal event for quest tracking (includes quality for Phase 123)
    this.eventEmitter.emit('craft.completed', {
      characterId,
      recipeId: recipe.id,
      outputItemId: recipe.outputItemId,
      discipline: recipe.discipline,
      qualityTier,
    });

    // Phase 123: Masterwork prestige broadcast to nearby players
    if (qualityTier === 'masterwork') {
      this.eventEmitter.emit('craft.masterwork', {
        characterId,
        recipeId: recipe.id,
        outputItemId: recipe.outputItemId,
        qualityTier,
      });
    }

    return {
      success: true,
      recipeId: recipe.id,
      outputItemId: recipe.outputItemId,
      qualityTier,
      proficiencyXP: effectiveXP,
      discipline: recipe.discipline,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // Query: Active craft state
  // ────────────────────────────────────────────────────────────────

  /**
   * Check if a player has an active craft.
   */
  getActiveCraft(characterId: string): ActiveCraft | undefined {
    return this.activeCrafts.get(characterId);
  }

  // ────────────────────────────────────────────────────────────────
  // Private: Unlock condition checks
  // ────────────────────────────────────────────────────────────────

  private async checkUnlockCondition(
    characterId: string,
    player: { level: number },
    condition: RecipeUnlockCondition
  ): Promise<boolean> {
    switch (condition.type) {
      case 'level':
        return player.level >= condition.requiredLevel;

      case 'quest':
      case 'poi': {
        const unlockKey = condition.type === 'quest' ? condition.questId : condition.poiId;
        const db = this.databaseService.getClient();
        const [unlock] = await db
          .select()
          .from(recipeUnlocks)
          .where(
            and(
              eq(recipeUnlocks.characterId, characterId),
              eq(recipeUnlocks.recipeId, `unlock:${condition.type}:${unlockKey}`),
            )
          );
        return !!unlock;
      }

      case 'proficiency': {
        const prof = await this.loadProficiency(characterId);
        const disciplineData = prof[condition.discipline];
        return disciplineData.level >= condition.requiredLevel;
      }

      default:
        return false;
    }
  }

  private formatUnlockReason(condition: RecipeUnlockCondition): string {
    switch (condition.type) {
      case 'level':
        return `Requires character level ${condition.requiredLevel}`;
      case 'quest':
        return `Requires completing quest ${condition.questId}`;
      case 'poi':
        return `Requires discovering location ${condition.poiId}`;
      case 'proficiency':
        return `Requires ${condition.discipline} proficiency level ${condition.requiredLevel}`;
      default:
        return 'Unknown requirement';
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Private: Proficiency XP
  // ────────────────────────────────────────────────────────────────

  /**
   * Award crafting proficiency XP with DB persistence.
   * Mirrors GatheringService.awardProficiencyXP pattern.
   */
  private async awardProficiencyXP(
    characterId: string,
    discipline: CraftingDiscipline,
    xp: number
  ): Promise<number> {
    const db = this.databaseService.getClient();

    const [row] = await db
      .select()
      .from(craftingProficiency)
      .where(eq(craftingProficiency.characterId, characterId));

    if (!row) return 1;

    const newProficiency = { ...row.proficiency };
    const newXP = newProficiency[discipline].xp + xp;
    newProficiency[discipline] = {
      xp: newXP,
      level: this.calculateLevelFromXP(newXP),
    };

    await db
      .update(craftingProficiency)
      .set({
        proficiency: newProficiency,
        updatedAt: new Date(),
      })
      .where(eq(craftingProficiency.characterId, characterId));

    // Update cache
    this.proficiencyCache.set(characterId, newProficiency);

    return newProficiency[discipline].level;
  }

  /**
   * Calculate level from total XP.
   * Uses same curve as gathering: level = floor(sqrt(xp / 100)) + 1, capped at MAX_CRAFT_LEVEL.
   */
  private calculateLevelFromXP(xp: number): number {
    return Math.min(MAX_CRAFT_LEVEL, Math.floor(Math.sqrt(xp / 100)) + 1);
  }

  // ────────────────────────────────────────────────────────────────
  // Private: Timer calculation
  // ────────────────────────────────────────────────────────────────

  /**
   * Calculate adjusted craft duration based on proficiency level.
   * Diminishing returns curve: speedFactor = 1 - 0.5 * (level / MAX_LEVEL)^0.7
   * At max level: 50% faster (10s becomes 5s). Per user decision.
   */
  private calculateAdjustedDuration(baseDurationMs: number, level: number): number {
    const normalizedLevel = Math.min(level, MAX_CRAFT_LEVEL) / MAX_CRAFT_LEVEL;
    const speedFactor = 1 - 0.5 * Math.pow(normalizedLevel, 0.7);
    return Math.max(1000, Math.round(baseDurationMs * speedFactor)); // Minimum 1s
  }

  // ────────────────────────────────────────────────────────────────
  // Query: Recipe list with per-character unlock status (Phase 123)
  // ────────────────────────────────────────────────────────────────

  /**
   * Get all recipes with per-character unlock status.
   * Used by client to render recipe browser (RCPE-01, RCPE-03, RCPE-04).
   */
  async getRecipeList(
    characterId: string,
    player: { level: number; faction: string }
  ): Promise<Array<{
    recipe: RecipeDefinition;
    unlocked: boolean;
    unlockReasons: string[];
  }>> {
    const allRecipes = getAllRecipes();
    const results: Array<{
      recipe: RecipeDefinition;
      unlocked: boolean;
      unlockReasons: string[];
    }> = [];

    for (const recipe of allRecipes) {
      const unlockReasons: string[] = [];
      let unlocked = true;

      // Check faction restriction
      if (recipe.factionRestriction && player.faction !== recipe.factionRestriction) {
        unlocked = false;
        unlockReasons.push(`Requires ${recipe.factionRestriction} faction membership`);
      }

      // Check unlock conditions
      for (const condition of recipe.unlockConditions) {
        const conditionMet = await this.checkUnlockCondition(characterId, player as any, condition);
        if (!conditionMet) {
          unlocked = false;
          unlockReasons.push(this.formatUnlockReason(condition));
        }
      }

      results.push({ recipe, unlocked, unlockReasons });
    }

    return results;
  }
}
