# Phase 73: Quest Markers in World - Research

**Researched:** 2026-02-23
**Domain:** Phaser Visual Markers, Quest State Synchronization, Real-time Updates
**Confidence:** HIGH

## Summary

Phase 73 extends the existing quest marker system (implemented in Phase 67) from lazy updates (markers appear only after NPC interaction) to real-time visibility (markers display immediately on zone entry and update when quest state changes). The current implementation already has complete infrastructure: EntityRenderer.createQuestMarker() for rendering, WorldScene.applyInitialQuestMarkers() for zone entry markers, and npc:quest-markers server event for batch marker data. The gap is reactivity — markers currently only update on NPC interaction, not when quests are accepted/completed/abandoned elsewhere.

Research confirms the existing pattern is sound: markers render as Phaser sprite containers positioned 60px above NPC nameplates using three-tier fallback (PNG sprite → procedural texture → inline graphics), with floating animation for visual polish. The server emits npc:quest-markers on zone entry containing marker state for all zone NPCs. Current limitation: markers don't update when player accepts/completes quests without closing the modal, or when quest state changes via other NPCs or auto-completion events.

**Primary recommendation:** Hook quest:progress, quest:completed, and quest:abandoned client events to trigger marker re-evaluation for affected NPCs. Server-side logic already exists in GameGateway.computeNpcQuestMarkerState() — reuse this for individual NPC marker updates. Client-side, extend WorldScene event listeners to call updateNpcQuestMarker() for the relevant NPC when quest state changes. No new network events needed — existing quest events carry questId which maps to questGiverId for marker refresh.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | 3.90.0 | Quest marker rendering | Already used for all entity rendering, sprite containers, tweens |
| Socket.IO | 4.7.x | Quest state events | Existing WebSocket infrastructure for quest:progress, quest:completed |
| QuestRegistry | Internal | Quest-to-NPC mapping | Phase 64 singleton with questGiverId field for reverse lookup |
| EntityRenderer | Internal | Marker sprite creation | Phase 67 implementation with createQuestMarker(), updateQuestMarker() |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand | 4.5.x | Quest state tracking | useQuestStore already tracks activeQuests, completedQuests |
| EventEmitter2 | 3.0.1 | Server-side zone events | Already emits zone.entered for auto-discovery |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Quest event hooks | Polling quest state | Events are real-time, polling wastes CPU and network |
| Recompute all markers | Update only affected NPC | Full recompute O(n) NPCs, selective update O(1) |
| Server broadcasts marker state | Client computes markers | Server has authoritative quest state, client would duplicate logic |

**Installation:**
No new dependencies required. All libraries already in project.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/game/
├── rendering/
│   └── EntityRenderer.ts         # Existing: createQuestMarker, updateQuestMarker
└── scenes/
    └── WorldScene.ts              # Existing: applyInitialQuestMarkers, updateNpcQuestMarker
                                   # NEW: Hook quest events for real-time updates
```

### Pattern 1: Quest Event-Driven Marker Updates
**What:** Listen to quest:progress, quest:completed, quest:abandoned events and update affected NPC markers immediately.

**When to use:** When quest state changes and marker should reflect new state without NPC interaction.

**Example:**
```typescript
// Source: WorldScene.ts create() method extension
// Hook quest events for real-time marker updates
gameSocket.on('quest:progress', (data: QuestProgressPayload) => {
  this.updateMarkerForQuestChange(data.questId);
});

gameSocket.on('quest:completed', (data: { questId: string; /* ... */ }) => {
  this.updateMarkerForQuestChange(data.questId);
});

gameSocket.on('quest:abandoned', (data: { questId: string }) => {
  this.updateMarkerForQuestChange(data.questId);
});

/**
 * Update quest marker for NPC associated with this quest.
 * Called when quest state changes (accept, complete, abandon).
 */
private updateMarkerForQuestChange(questId: string): void {
  const questDef = QuestRegistry.get(questId);
  if (!questDef || !questDef.questGiverId) return; // Auto-discover quest, no NPC

  // Find NPC container for this questGiverId
  const npcContainer = this.findNpcContainerById(questDef.questGiverId);
  if (!npcContainer) return; // NPC not in current zone or despawned

  // Recompute marker state for this NPC
  const markerType = this.computeMarkerTypeForNpc(questDef.questGiverId);

  this.entityRenderer?.updateQuestMarker(
    npcContainer.getData('entityId') as string,
    markerType,
    npcContainer
  );
}
```

### Pattern 2: Client-Side Marker State Computation
**What:** Compute marker type (available/ready/none) from client-side quest state without server round-trip.

**When to use:** When quest state is already cached in useQuestStore (activeQuests, completedQuests).

**Example:**
```typescript
// Source: Adapted from GameGateway.computeNpcQuestMarkerState pattern
private computeMarkerTypeForNpc(npcId: string): 'available' | 'ready' | 'none' {
  const questStore = useQuestStore.getState();
  const npcStore = useNpcStore.getState();

  // Priority: ready > available > none

  // Check if any active quests for this NPC are ready to turn in
  for (const activeQuest of questStore.activeQuests) {
    const questDef = QuestRegistry.get(activeQuest.questId);
    if (questDef.questGiverId === npcId) {
      const allComplete = activeQuest.objectives.every(obj => obj.complete);
      if (allComplete) {
        return 'ready'; // Highest priority
      }
    }
  }

  // Check if this NPC has available quests
  const availableQuests = QuestRegistry.getAll()
    .filter(q => q.questGiverId === npcId)
    .filter(q => {
      // Not already active
      const isActive = questStore.activeQuests.some(aq => aq.questId === q.id);
      if (isActive) return false;

      // Not already completed (unless repeatable bounty)
      const completed = questStore.completedQuests.some(cq => cq.questId === q.id);
      if (completed && !q.isBounty) return false;

      // Meets prerequisites
      if (q.prerequisiteQuestIds && q.prerequisiteQuestIds.length > 0) {
        const metPrereqs = q.prerequisiteQuestIds.every(prereqId =>
          questStore.completedQuests.some(cq => cq.questId === prereqId)
        );
        if (!metPrereqs) return false;
      }

      return true;
    });

  if (availableQuests.length > 0) {
    return 'available';
  }

  return 'none';
}
```

### Pattern 3: Depth Sorting for Markers
**What:** Ensure quest markers render above NPC sprites but below modal windows using Phaser depth system.

**When to use:** All marker rendering to maintain correct z-order layering.

**Example:**
```typescript
// Source: Phaser 3 depth sorting patterns
// https://phaser.io/examples/v3/view/depth-sorting/z-index

// Markers inherit container depth from parent NPC
// NPC depth calculated by: isoTransform.calculateDepth(worldX, worldY, elevation, 0, true)
// This places markers above tiles and entities at same Y coordinate
// Modal windows use scrollFactor 0 and depth 1000+, always rendering on top

// No explicit depth setting needed - container hierarchy handles this
const markerContainer = this.scene.add.container(0, 0);
// Marker automatically inherits parent NPC container's depth
npcContainer.add(markerContainer);
```

### Anti-Patterns to Avoid
- **Recomputing all NPC markers on every quest event:** O(n) operation wastes CPU. Only update affected NPC.
- **Storing quest state in WorldScene:** useQuestStore is single source of truth. Read from store, don't duplicate.
- **Server broadcasting individual marker updates:** Bandwidth waste. Client can compute marker state from quest events.
- **Destroying and recreating markers unnecessarily:** updateQuestMarker() already handles transitions. Don't destroy unless NPC despawns.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Marker depth sorting | Custom z-index logic | Phaser Container depth inheritance | Containers automatically propagate depth to children |
| Quest-to-NPC mapping | Custom lookup table | QuestRegistry.get(questId).questGiverId | Registry already links quests to NPCs via questGiverId field |
| Marker animation | RAF or setInterval loops | Phaser Tweens | Tweens are GPU-accelerated, automatically cleaned up |
| Quest state queries | Raw database queries | useQuestStore Zustand hooks | Client-side cache already synced via quest:progress events |

**Key insight:** Phase 67 built all infrastructure. Don't rebuild marker rendering or NPC lookup — just add event hooks for reactivity.

## Common Pitfalls

### Pitfall 1: Marker Update Race Conditions
**What goes wrong:** Quest accepted, marker removed, but server hasn't confirmed — marker flickers back if NPC interaction modal reopened quickly.

**Why it happens:** Client optimistically updates marker before server confirms quest state change.

**How to avoid:** Wait for quest:progress event confirmation before updating marker. Server is authoritative for quest state.

**Warning signs:** Markers flash between states when accepting/completing quests rapidly.

### Pitfall 2: Memory Leaks from Event Listeners
**What goes wrong:** Quest event listeners accumulate on scene restart, causing duplicate marker updates and FPS drops.

**Why it happens:** WorldScene.create() registers listeners but shutdown() doesn't unregister them.

**How to avoid:** Store event handler references and call gameSocket.off() in WorldScene.shutdown(). Mirror existing event cleanup pattern.

**Warning signs:** Performance degrades after multiple zone transitions, markers update multiple times per quest event.

### Pitfall 3: Marker Updates for Despawned NPCs
**What goes wrong:** Quest completed while NPC is despawned (chunk unloaded), marker update fails silently or throws error.

**Why it happens:** updateMarkerForQuestChange() calls findNpcContainerById() which returns undefined for despawned NPCs.

**How to avoid:** Early return if npcContainer is undefined. This is expected behavior — marker will update when chunk reloads.

**Warning signs:** Console errors on quest completion, "Cannot read property 'getData' of undefined" errors.

### Pitfall 4: Wrong Marker Priority
**What goes wrong:** NPC shows "!" marker but player can turn in completed quest, or shows "?" but has other available quests.

**Why it happens:** Marker computation doesn't follow priority: ready > available > none.

**How to avoid:** Always check ready state first, then available, then default to none. Mirror GameGateway.computeNpcQuestMarkerState() logic.

**Warning signs:** Players report "wrong marker" or "marker doesn't match quest state".

## Code Examples

Verified patterns from existing codebase:

### Client: Hook Quest Events for Real-Time Updates
```typescript
// Source: WorldScene.ts create() method
// Location: After existing npc:quest-markers listener (line 273)

// Hook quest state changes for real-time marker updates
gameSocket.on('quest:progress', (data: QuestProgressPayload) => {
  // Quest progress updated (objective count changed)
  // May transition from available → ready if objectives complete
  const questDef = QuestRegistry.get(data.questId);
  if (questDef.questGiverId) {
    this.updateMarkerForQuestId(data.questId);
  }
});

gameSocket.on('quest:completed', (data: { questId: string; /* ... */ }) => {
  // Quest turned in, remove ready marker
  const questDef = QuestRegistry.get(data.questId);
  if (questDef.questGiverId) {
    this.updateMarkerForQuestId(data.questId);
  }
});

gameSocket.on('quest:abandoned', (data: { questId: string }) => {
  // Quest abandoned, may make available again
  const questDef = QuestRegistry.get(data.questId);
  if (questDef.questGiverId) {
    this.updateMarkerForQuestId(data.questId);
  }
});

/**
 * Update quest marker for NPC associated with questId.
 * Recomputes marker state from current quest progress.
 */
private updateMarkerForQuestId(questId: string): void {
  const questDef = QuestRegistry.get(questId);
  if (!questDef || !questDef.questGiverId) return;

  const npcContainer = this.findNpcContainerById(questDef.questGiverId);
  if (!npcContainer) return; // NPC not in zone

  const markerType = this.computeMarkerTypeForNpc(questDef.questGiverId);

  this.entityRenderer?.updateQuestMarker(
    npcContainer.getData('entityId') as string,
    markerType,
    npcContainer
  );
}
```

### Client: Compute Marker Type from Quest Store
```typescript
// Source: Adapted from GameGateway.computeNpcQuestMarkerState (lines 1378-1423)
// Client-side equivalent using useQuestStore

/**
 * Compute marker type for NPC from current quest state.
 * Priority: ready (?) > available (!) > none
 */
private computeMarkerTypeForNpc(npcId: string): 'available' | 'ready' | 'none' {
  const questStore = useQuestStore.getState();
  const player = useGameStore.getState().player;
  if (!player) return 'none';

  // 1. Check for ready quests (highest priority)
  for (const activeQuest of questStore.activeQuests) {
    const questDef = QuestRegistry.get(activeQuest.questId);
    if (questDef.questGiverId === npcId) {
      const allComplete = activeQuest.objectives.every(obj => obj.complete);
      if (allComplete) {
        return 'ready'; // Can turn in
      }
    }
  }

  // 2. Check for available quests
  const allQuests = QuestRegistry.getByFaction(player.faction);
  const availableQuests = allQuests.filter(q => {
    if (q.questGiverId !== npcId) return false;

    // Not already active
    const isActive = questStore.activeQuests.some(aq => aq.questId === q.id);
    if (isActive) return false;

    // Not completed (unless repeatable bounty)
    const completed = questStore.completedQuests.some(cq => cq.questId === q.id);
    if (completed && !q.isBounty) return false;

    // Check prerequisites
    if (q.prerequisiteQuestIds && q.prerequisiteQuestIds.length > 0) {
      const metPrereqs = q.prerequisiteQuestIds.every(prereqId =>
        questStore.completedQuests.some(cq => cq.questId === prereqId)
      );
      if (!metPrereqs) return false;
    }

    return true;
  });

  if (availableQuests.length > 0) {
    return 'available'; // Can accept
  }

  return 'none'; // No quests
}
```

### Cleanup: Unregister Quest Event Listeners
```typescript
// Source: WorldScene.ts shutdown() method extension
// Location: After existing cleanup (line 1759)

shutdown(): void {
  // ... existing cleanup ...

  // Unregister quest event listeners to prevent memory leaks
  if (gameSocket) {
    gameSocket.off('quest:progress', this.handleQuestProgress);
    gameSocket.off('quest:completed', this.handleQuestCompleted);
    gameSocket.off('quest:abandoned', this.handleQuestAbandoned);
  }
}

// Store bound handlers as instance methods for cleanup
private handleQuestProgress = (data: QuestProgressPayload) => {
  const questDef = QuestRegistry.get(data.questId);
  if (questDef.questGiverId) {
    this.updateMarkerForQuestId(data.questId);
  }
};

private handleQuestCompleted = (data: { questId: string }) => {
  const questDef = QuestRegistry.get(data.questId);
  if (questDef.questGiverId) {
    this.updateMarkerForQuestId(data.questId);
  }
};

private handleQuestAbandoned = (data: { questId: string }) => {
  const questDef = QuestRegistry.get(data.questId);
  if (questDef.questGiverId) {
    this.updateMarkerForQuestId(data.questId);
  }
};
```

### Existing: Marker Rendering Pattern (Already Implemented)
```typescript
// Source: EntityRenderer.ts lines 642-717
// Phase 67 implementation - NO CHANGES NEEDED

createQuestMarker(
  npcEntityId: string,
  markerType: 'available' | 'ready',
  container: Phaser.GameObjects.Container
): Phaser.GameObjects.Container {
  // Clean up existing marker if any
  this.removeQuestMarker(npcEntityId);

  const markerContainer = this.scene.add.container(0, 0);

  // Get entity scale for positioning
  const scale = container.getData('entityScale') ?? 1.0;
  const spriteHeight = BASE_SPRITE_HEIGHT * scale;

  // Position above nameplate (nameplate is at uiBaseY, marker above that)
  const markerY = -this.elevationOffset - spriteHeight * 0.5 - 60;

  // Three-tier fallback: sprite → procedural → inline
  const textureKey = markerType === 'available'
    ? 'ui_quest_marker_available'
    : 'ui_quest_marker_ready';

  const fallbackKey = markerType === 'available'
    ? 'ui_quest_marker_available_fallback'
    : 'ui_quest_marker_ready_fallback';

  if (this.scene.textures.exists(textureKey)) {
    const sprite = this.scene.add.sprite(0, markerY, textureKey);
    sprite.setScale(0.8);
    sprite.setOrigin(0.5, 1.0);
    markerContainer.add(sprite);
  } else if (this.scene.textures.exists(fallbackKey)) {
    const sprite = this.scene.add.sprite(0, markerY, fallbackKey);
    sprite.setScale(0.8);
    sprite.setOrigin(0.5, 1.0);
    markerContainer.add(sprite);
  } else {
    // Inline procedural fallback
    const graphics = this.scene.add.graphics();
    const color = markerType === 'available' ? 0xffcc00 : 0x00ccff;
    graphics.fillStyle(color, 1);
    graphics.fillCircle(0, markerY - 20, 20);
    graphics.lineStyle(3, 0x000000);
    graphics.strokeCircle(0, markerY - 20, 20);
    markerContainer.add(graphics);

    const symbol = markerType === 'available' ? '!' : '?';
    const text = this.scene.add.text(0, markerY - 20, symbol, {
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#000000',
    });
    text.setOrigin(0.5, 0.5);
    markerContainer.add(text);
  }

  // Floating animation
  this.scene.tweens.add({
    targets: markerContainer,
    y: -8,
    duration: 1000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // Add to NPC container
  container.add(markerContainer);

  // Track for cleanup
  this.questMarkers.set(npcEntityId, markerContainer);

  return markerContainer;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Lazy marker updates (Phase 67) | Real-time marker updates (Phase 73) | 2026-02-23 | Markers visible immediately on zone entry, update on quest state change |
| Server computes markers on demand | Client computes from quest store | Phase 73 (planned) | Reduces server load, instant updates without network round-trip |
| DOM-based markers | Phaser sprite containers | Phaser 3 (2018) | GPU acceleration, automatic depth sorting, no coordinate transforms |
| Static markers | Floating animation tweens | Phase 67 (2026) | Visual polish, draws player attention |

**Deprecated/outdated:**
- **Lazy marker updates only on NPC interaction:** Now update immediately when quest state changes
- **Server-side marker state computation:** Client can compute from quest store for instant feedback
- **Markers without visibility at distance:** Current implementation renders markers at same distance as NPC sprites (VISIBILITY_RADIUS = 48 tiles)

## Open Questions

1. **Should markers update immediately or batch on next frame?**
   - What we know: Quest events can fire rapidly (e.g., killing multiple creatures, turning in multiple quests)
   - What's unclear: Will updating markers on every quest event cause performance issues?
   - Recommendation: Update immediately for responsiveness. If FPS drops, add throttle (update max once per 100ms per NPC).

2. **How to handle marker updates when NPC modal is open?**
   - What we know: Player can accept/complete quests in modal, quest events fire while modal open
   - What's unclear: Should marker update while player is still interacting with NPC?
   - Recommendation: Update marker even if modal open. Marker change is subtle (outside modal bounds) and confirms quest action.

3. **Should repeatable bounty quests show markers after first completion?**
   - What we know: Bounty quests (isBounty: true) can be repeated after completion
   - What's unclear: Should "?" marker show immediately after turning in, or only after cooldown?
   - Recommendation: Show "available" marker immediately if bounty can be repeated (canRepeatBountyQuest() check). Mirrors WoW daily quest pattern.

## Sources

### Primary (HIGH confidence)
- Codebase analysis:
  - apps/web/src/game/rendering/EntityRenderer.ts (lines 642-752: Quest marker implementation)
  - apps/web/src/game/scenes/WorldScene.ts (lines 267-275, 1798-1864: Marker update logic)
  - apps/game-server/src/game/game.gateway.ts (lines 1378-1427: Server marker computation)
  - packages/shared-types/src/network/events.ts (lines 276-281: npc:quest-markers event type)
  - .planning/phases/67-npc-quest-givers/67-RESEARCH.md (Phase 67 research findings)
  - .planning/phases/67-npc-quest-givers/67-03-SUMMARY.md (Phase 67 implementation details)

### Secondary (MEDIUM confidence)
- [Phaser 3 Depth Sorting Examples](https://phaser.io/examples/v3/view/depth-sorting/z-index) - Sprite z-index and depth management
- [Phaser 3 Tween Animations](https://phaser.discourse.group/t/how-to-tween-sprite-in-phaser-3/4526) - Floating animation patterns
- [MDN: Animations and Tweens](https://developer.mozilla.org/en-US/docs/Games/Tutorials/2D_breakout_game_Phaser/Animations_and_tweens) - Tween animation fundamentals

### Tertiary (LOW confidence)
- None required - existing codebase and official docs provide complete coverage

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, Phase 67 infrastructure complete
- Architecture: HIGH - Patterns verified in existing codebase (EntityRenderer, WorldScene, QuestRegistry)
- Pitfalls: HIGH - Identified from Phase 67 implementation and event listener cleanup patterns

**Research date:** 2026-02-23
**Valid until:** 30 days (stable domain - quest marker system fully implemented in Phase 67)
