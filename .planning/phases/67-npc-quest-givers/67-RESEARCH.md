# Phase 67: NPC Quest Givers - Research

**Researched:** 2026-02-22
**Domain:** Quest-NPC Integration, Visual Markers, Auto-Discovery
**Confidence:** HIGH

## Summary

Phase 67 integrates the quest system (Phases 64-66) with NPCs (Phase 49) by establishing quest givers, visual markers, and auto-discovery mechanics. This phase transforms quests from abstract entities into player-facing interactions: NPCs display "!" markers when they offer quests, "?" markers when ready for turn-in, and the interaction modal shows available/active/completed quests filtered by faction.

The existing codebase provides strong foundations: NpcRegistry singleton (packages/npcs), QuestRegistry singleton with questGiverId field (packages/quests), npc:interact WebSocket event infrastructure (game.gateway.ts), and NpcInteractionModal UI (NpcInteractionModal.tsx). Phase 66 already implements quest completion logic with all validation primitives. The challenge is coordinating these systems: NPCs must query player quest state, display conditional markers, filter quests by faction, and trigger auto-discoveries on zone entry.

Research identified three integration patterns: (1) extend npc:interact:response payload to include available/active/ready quest arrays based on player state, (2) add quest marker sprites rendered above NPC entities using Phaser container + offset positioning, (3) hook into existing zone.entered event emitter (already fired on login/zone transition) to trigger quest auto-discovery. Critical insight: quest state is PRIVATE data — npc:interact:response must be player-specific, not broadcast to zone.

**Primary recommendation:** Extend NPC interaction flow with quest state lookups, render visual markers as child sprites offset above NPC entities, and piggyback on existing zone.entered events for auto-discovery. Use QuestRegistry.getByFaction() to filter quests, and maintain quest state in database to prevent re-granting auto-discover quests.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | 3.80.1 | Quest marker rendering | Already used for all client-side entity rendering, supports sprite containers |
| Socket.IO | 4.7.x | npc:interact events | Existing WebSocket infrastructure for NPC interactions |
| QuestRegistry | Internal | Quest filtering by faction | Phase 64-66 singleton with getByFaction() method |
| NpcRegistry | Internal | NPC definition lookups | Phase 49 singleton with get() method |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Drizzle ORM | 0.30.x | Quest state queries | Check if player has quest active/completed |
| EventEmitter2 | 3.0.1 | zone.entered events | Auto-discover trigger (already emits on zone transition) |
| Zustand | 4.5.x | NPC modal state | Extend useNpcStore to handle quest lists |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sprite markers | DOM overlays | Phaser sprites maintain Z-order, DOM requires screen coordinate transforms |
| zone.entered event | New quest:discover event | zone.entered already fired on login/zone change, no duplication needed |
| Database quest state | In-memory only | Database ensures quest discovery persists across sessions |

**Installation:**
No new dependencies required. All libraries already in project.

## Architecture Patterns

### Pattern 1: Quest State-Aware NPC Interaction
**What:** Extend npc:interact handler to query player quest state and include quest lists in response payload.

**When to use:** Every NPC interaction where NPC has questGiverId set.

**Example:**
```typescript
// Source: Adapted from game.gateway.ts handleNpcInteract()
@SubscribeMessage('npc:interact')
async handleNpcInteract(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { entityId: string }
): Promise<void> {
  const player = this.playerService.getPlayerBySocket(client.id);
  if (!player) return;

  const entity = await this.zonesService.getEntity(player.position.zoneId, data.entityId);
  if (!entity || entity.type !== 'npc') return;

  const npcDef = NpcRegistry.get((entity as Npc).npcId);

  // NEW: Query player quest state for this NPC
  const questState = await this.questService.getQuestsForNpc(
    player.id,
    npcDef.id,
    player.faction
  );

  // Build response with quest arrays
  const response = {
    npcId: npcDef.id,
    displayName: npcDef.displayName,
    // ... existing NPC fields ...

    // NEW: Quest state arrays
    availableQuests: questState.available,  // Can be accepted
    activeQuests: questState.active,        // In progress
    readyQuests: questState.ready,          // Objectives complete, ready to turn in
  };

  client.emit('npc:interact:response', response);
}
```

### Pattern 2: Visual Quest Markers with Phaser Containers
**What:** Render quest marker sprites ("!" or "?") above NPC entities using Phaser container hierarchy.

**When to use:** WorldScene entity rendering when NPC has available or ready quests.

**Example:**
```typescript
// Source: Adapted from Phaser 3 sprite rendering patterns
// https://rexrainbow.github.io/phaser3-rex-notes/docs/site/sprite/

class NPCRenderer {
  private markerSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

  renderNPC(npc: Npc, questMarker?: 'available' | 'ready'): void {
    // Create or update NPC sprite
    const sprite = this.scene.add.sprite(npc.x, npc.y, npc.textureKey);

    // Add quest marker if needed
    if (questMarker) {
      const markerKey = questMarker === 'available' ? 'marker_quest_available' : 'marker_quest_ready';
      const marker = this.scene.add.sprite(0, -40, markerKey);  // Offset above NPC

      // Container groups NPC + marker for automatic positioning
      const container = this.scene.add.container(npc.x, npc.y, [sprite, marker]);
      this.markerSprites.set(npc.id, marker);
    }
  }

  updateQuestMarker(npcId: string, questState: 'available' | 'ready' | 'none'): void {
    const existingMarker = this.markerSprites.get(npcId);
    if (existingMarker) {
      existingMarker.destroy();
      this.markerSprites.delete(npcId);
    }

    if (questState !== 'none') {
      const markerKey = questState === 'available' ? 'marker_quest_available' : 'marker_quest_ready';
      const marker = this.scene.add.sprite(0, -40, markerKey);
      this.markerSprites.set(npcId, marker);
    }
  }
}
```

### Pattern 3: Auto-Discovery on Zone Entry
**What:** Listen to existing zone.entered event to grant quests without requiring NPC interaction.

**When to use:** Tutorial quests or exploration-triggered quests (questGiverId is undefined).

**Example:**
```typescript
// Source: Adapted from QuestService event handlers (quest.service.ts)
@OnEvent('zone.entered')
async handleZoneEnteredForQuests(payload: ZoneEnteredPayload): Promise<void> {
  try {
    const db = this.databaseService.getClient();
    const player = this.playerService.getPlayerById(payload.characterId);
    if (!player) return;

    // Get all quests that auto-discover in this biome
    const autoDiscoverQuests = QuestRegistry.getByFaction(player.faction)
      .filter(q =>
        q.autoDiscoverBiome === payload.biome &&
        q.questGiverId === undefined  // Auto-discover quests have no NPC
      );

    for (const questDef of autoDiscoverQuests) {
      // Check if player already has this quest
      const existing = await getQuestProgress(db, payload.characterId, questDef.id);
      if (existing) continue;  // Skip if already discovered

      // Grant quest automatically
      await createQuestProgress(db, {
        characterId: payload.characterId,
        questId: questDef.id,
        state: 'active',
        objectives: questDef.objectives.map(obj => ({
          objectiveType: obj.objectiveType,
          description: obj.description,
          current: 0,
          required: obj.objectiveType === 'kill' ? obj.targetCount :
                    obj.objectiveType === 'gather' ? obj.quantity : 1,
          targetId: obj.objectiveType === 'kill' ? obj.targetEntityId :
                    obj.objectiveType === 'gather' ? obj.itemId : obj.biome,
          complete: false,
        })),
      });

      // Emit quest:progress to notify player
      this.emitProgressUpdate(payload.characterId, questDef.id, 'active', questDef, objectives);
    }
  } catch (error) {
    console.error('[QuestService] Error handling zone entry for auto-discover:', error);
  }
}
```

### Anti-Patterns to Avoid
- **Broadcasting quest state to zone:** Quest progress is PRIVATE data. Never emit to zone rooms, only to individual player sockets.
- **Re-granting auto-discover quests:** Check database for existing quest_progress row before creating. UNIQUE constraint prevents duplicates but throws error.
- **Marker sprites without cleanup:** Always destroy marker sprites when NPC despawns or quest state changes to prevent memory leaks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Quest marker positioning | Manual screen coordinate transforms | Phaser Container API | Containers automatically update child positions, handle Z-order |
| Quest filtering logic | Custom filter functions per NPC | QuestRegistry.getByFaction() | Registry already implements faction filtering, single source of truth |
| Zone entry detection | Custom zone transition hooks | Existing zone.entered event | GameGateway already emits zone.entered on login/transition (lines 171-176, 262-268) |
| Quest state queries | Raw SQL queries | Drizzle query builders (getQuestProgress, getActiveQuests) | Type-safe, already implemented in packages/database/src/queries/quests.ts |

**Key insight:** Phase 64-66 already built comprehensive quest infrastructure. Don't rebuild state tracking, validation, or persistence — extend existing services.

## Common Pitfalls

### Pitfall 1: Broadcasting Private Quest Data
**What goes wrong:** Server emits npc:interact:response to zone room instead of individual socket, leaking player quest state to all nearby players.

**Why it happens:** Copy-paste from zone broadcast patterns (entity:spawn, player:joined) without recognizing quest state is private.

**How to avoid:** Always use `client.emit()` for player-specific data, NEVER `this.server.to(zoneId).emit()`. Quest state is like inventory — private to individual player.

**Warning signs:** Multiple players see same quest list when interacting with NPC, quest markers flicker for wrong players.

### Pitfall 2: Marker Sprite Memory Leaks
**What goes wrong:** Quest markers accumulate in memory when NPCs despawn or chunk unloads, causing performance degradation.

**Why it happens:** Marker sprites created but not destroyed when parent NPC is removed from scene.

**How to avoid:** Track marker sprites in Map<entityId, Sprite>, destroy when entity:despawn event fires or chunk unloads. Mirror existing entity cleanup patterns in EntityRenderer.

**Warning signs:** Memory usage grows over time, FPS drops in areas with many NPCs.

### Pitfall 3: Double Auto-Discovery
**What goes wrong:** Player re-enters same biome and receives quest multiple times, breaking quest uniqueness.

**Why it happens:** Auto-discover handler doesn't check database for existing quest_progress row before calling createQuestProgress().

**How to avoid:** Query getQuestProgress() before createQuestProgress(). Database UNIQUE constraint prevents duplicates but throws error instead of silently skipping.

**Warning signs:** Console errors on zone re-entry, quest log shows duplicate quests (if constraint not enforced).

### Pitfall 4: Quest Marker Desync
**What goes wrong:** NPC shows "!" marker but player already accepted quest, or "?" marker but objectives incomplete.

**Why it happens:** Client-side marker rendering based on cached state, doesn't update when quest state changes.

**How to avoid:** Listen to quest:progress and quest:completed events to trigger marker re-render. Server-side: always compute marker state fresh on npc:interact.

**Warning signs:** Players report "NPC has marker but no quests available" or "completed quest but marker still shows".

## Code Examples

Verified patterns from existing codebase:

### Server: Extend npc:interact:response with Quest Arrays
```typescript
// Source: game.gateway.ts lines 983-1036, extended for Phase 67
interface NpcInteractResponse {
  npcId: string;
  displayName: string;
  npcType: string;
  faction: string;
  description: string;
  dialogue: Array<{ text: string; condition?: string }>;
  color: number;

  // Type-specific fields
  inventory?: Array<{ itemId: string; buyPrice: number; sellPrice: number; stock: number }>;
  serviceType?: string;
  title?: string;
  role?: string;

  // NEW: Quest arrays (Phase 67)
  availableQuests?: Array<{
    questId: string;
    displayName: string;
    description: string;
    objectives: ObjectiveProgress[];
    rewards: { credits?: number; xp?: number; items?: Array<{itemId: string; quantity: number}> };
    minLevel?: number;
  }>;
  activeQuests?: Array<{
    questId: string;
    displayName: string;
    description: string;
    objectives: ObjectiveProgress[];
    rewards: { credits?: number; xp?: number; items?: Array<{itemId: string; quantity: number}> };
  }>;
  readyQuests?: Array<{
    questId: string;
    displayName: string;
  }>;
}
```

### Client: Render Quest Markers in EntityRenderer
```typescript
// Source: Adapted from apps/web/src/game/rendering/EntityRenderer.ts pattern
private renderQuestMarker(entity: Entity, markerType: 'available' | 'ready'): void {
  const markerKey = markerType === 'available'
    ? 'ui_quest_marker_available'  // "!" sprite
    : 'ui_quest_marker_ready';      // "?" sprite

  // Create marker sprite offset above NPC
  const marker = this.scene.add.sprite(
    entity.x * TILE_SIZE,
    entity.y * TILE_SIZE - 30,  // 30px above entity
    markerKey
  );
  marker.setDepth(entity.y + 100);  // Above all entities

  // Store reference for cleanup
  this.questMarkers.set(entity.id, marker);
}

private cleanupQuestMarker(entityId: string): void {
  const marker = this.questMarkers.get(entityId);
  if (marker) {
    marker.destroy();
    this.questMarkers.delete(entityId);
  }
}
```

### Database: Check for Existing Quest Before Auto-Discovery
```typescript
// Source: packages/database/src/queries/quests.ts getQuestProgress()
const existing = await getQuestProgress(db, characterId, questId);
if (existing) {
  // Quest already discovered, skip
  return;
}

// Safe to create new quest
await createQuestProgress(db, {
  characterId,
  questId,
  state: 'active',
  objectives: /* ... */,
});
```

### Client: Update NPC Modal with Quest Tabs
```typescript
// Source: Adapted from NpcInteractionModal.tsx structure
export const NpcInteractionModal: React.FC = () => {
  const { interactingNpc } = useNpcStore();
  const [activeTab, setActiveTab] = useState<'dialogue' | 'quests' | 'trade'>('dialogue');

  if (!interactingNpc) return null;

  const renderQuestTab = () => {
    if (!interactingNpc.availableQuests && !interactingNpc.activeQuests && !interactingNpc.readyQuests) {
      return null;
    }

    return (
      <div className="npc-quest-tab">
        {/* Available quests (can accept) */}
        {interactingNpc.availableQuests?.map(quest => (
          <div key={quest.questId} className="quest-available">
            <div className="quest-marker">!</div>
            <div className="quest-info">
              <h4>{quest.displayName}</h4>
              <p>{quest.description}</p>
              <button onClick={() => acceptQuest(quest.questId)}>Accept Quest</button>
            </div>
          </div>
        ))}

        {/* Ready quests (can turn in) */}
        {interactingNpc.readyQuests?.map(quest => (
          <div key={quest.questId} className="quest-ready">
            <div className="quest-marker">?</div>
            <div className="quest-info">
              <h4>{quest.displayName}</h4>
              <button onClick={() => completeQuest(quest.questId)}>Turn In Quest</button>
            </div>
          </div>
        ))}

        {/* Active quests (in progress) */}
        {interactingNpc.activeQuests?.map(quest => (
          <div key={quest.questId} className="quest-active">
            <h4>{quest.displayName}</h4>
            <p>{quest.description}</p>
            {quest.objectives.map((obj, i) => (
              <div key={i} className="objective">
                {obj.description}: {obj.current}/{obj.required}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="npc-modal ui-panel">
      {/* Header, portrait, etc. */}

      {/* Tab navigation */}
      <div className="npc-tabs">
        <button onClick={() => setActiveTab('dialogue')}>Dialogue</button>
        {interactingNpc.inventory && <button onClick={() => setActiveTab('trade')}>Trade</button>}
        {(interactingNpc.availableQuests || interactingNpc.activeQuests || interactingNpc.readyQuests) &&
          <button onClick={() => setActiveTab('quests')}>Quests</button>
        }
      </div>

      {/* Tab content */}
      {activeTab === 'dialogue' && renderDialogueTab()}
      {activeTab === 'trade' && renderTradeTab()}
      {activeTab === 'quests' && renderQuestTab()}
    </div>
  );
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Quest markers as DOM elements | Phaser sprite containers | Phaser 3 (2018) | Better performance, automatic Z-order, no screen coordinate transforms |
| Manual quest filtering | Registry singleton with getByFaction() | Phase 64 (2026) | Single source of truth, type-safe, DRY |
| Custom zone entry events | EventEmitter2 with zone.entered | Phase 65 (2026) | Reuse existing event infrastructure, no duplication |
| Client-side quest state | Server-authoritative with database persistence | Phase 64 (2026) | Prevents cheating, survives disconnects |

**Deprecated/outdated:**
- **Hardcoded quest lists per NPC:** Use QuestRegistry with questGiverId field (Phase 66 added this field)
- **Quest markers as text labels:** Use sprite assets (!, ?) with consistent visual style
- **Quest discovery on every zone entry:** Check database for existing quest_progress to prevent duplicates

## Open Questions

1. **Should quest markers be visible from distance or only when near NPC?**
   - What we know: WoW shows markers at distance, ESO shows on proximity
   - What's unclear: Performance impact of rendering markers for all NPCs in chunk
   - Recommendation: Start with always-visible markers, add distance culling if FPS drops (mirror ViewportCuller pattern)

2. **How to handle prerequisite quests for quest chain visibility?**
   - What we know: QuestDefinition has prerequisiteQuestIds field
   - What's unclear: Should unavailable quests show in NPC modal with "locked" state, or be hidden entirely?
   - Recommendation: Hide prerequisite-locked quests from availableQuests array to avoid UI clutter. Phase 69 (Quest Chains) will revisit.

3. **Auto-discover spam prevention: First entry only, or every entry?**
   - What we know: Database UNIQUE constraint prevents duplicate quest_progress rows
   - What's unclear: Should auto-discover fire every time player enters biome (idempotent), or track "first entry" separately?
   - Recommendation: Current approach (check existing quest_progress) is idempotent and prevents spam. No additional tracking needed.

## Sources

### Primary (HIGH confidence)
- Codebase analysis:
  - packages/npcs/src/types.ts (NPC definition types)
  - packages/quests/src/types.ts (QuestDefinition with questGiverId)
  - apps/game-server/src/game/quest.service.ts (Quest completion logic)
  - apps/game-server/src/game/game.gateway.ts (npc:interact handler, zone.entered events)
  - apps/web/src/ui/panels/NpcInteractionModal.tsx (NPC interaction UI)
  - packages/database/src/queries/quests.ts (Quest state queries)

### Secondary (MEDIUM confidence)
- [Phaser 3 Sprite Documentation](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/sprite/) - Sprite rendering and container patterns
- [Game Developer: Quest System Design](https://www.gamedeveloper.com/design/the-quest-for-the-custom-quest-system) - Quest giver patterns
- [FFXIV UI Guide: Quest Icons](https://eu.finalfantasyxiv.com/uiguide/know/faq-display/interface_npc_icon.html) - Quest marker conventions (! and ?)

### Tertiary (LOW confidence)
- [WoW Auto Track Zone Quests](https://www.curseforge.com/wow/addons/auto-track-zone-quests) - Auto-discovery UX patterns (needs verification for this codebase)
- [Dialogue System for Unity: Quests](https://www.pixelcrushers.com/dialogue_system/manual2x/html/quests.html) - Conditional dialogue patterns (Unity-specific, needs adaptation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, no new dependencies
- Architecture: HIGH - Patterns verified in existing codebase (quest.service.ts, game.gateway.ts)
- Pitfalls: HIGH - Identified from Phase 64-66 research and WebSocket private data patterns

**Research date:** 2026-02-22
**Valid until:** 30 days (stable domain - quest systems well-established pattern)
