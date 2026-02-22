---
phase: 67-npc-quest-givers
plan: 03
subsystem: quest-system
tags: [quest-markers, npc-ui, visual-feedback]
dependency-graph:
  requires: [phase-67-plan-01-npc-quest-integration, phase-67-plan-02-npc-quest-definitions]
  provides: [quest-marker-ui, npc-quest-visual-feedback]
  affects: [entity-renderer, world-scene, preload-scene]
tech-stack:
  added: []
  patterns: [lazy-marker-update, procedural-fallback-graphics, floating-animation]
key-files:
  created: []
  modified:
    - apps/web/src/game/scenes/PreloadScene.ts
    - apps/web/src/game/rendering/EntityRenderer.ts
    - apps/web/src/game/scenes/WorldScene.ts
decisions:
  - "Quest markers update lazily on NPC interaction (not real-time) for performance"
  - "Marker priority: ready (?) > available (!) > none"
  - "Procedural fallback graphics used when sprite files don't exist"
metrics:
  duration: 468s
  completed: 2026-02-22
---

# Phase 67 Plan 03: Quest Marker Visual Feedback Summary

**One-liner:** Quest markers (! and ?) float above NPCs to show available and ready-to-turn-in quests after interaction

## What Was Built

Added visual quest markers that appear above NPC entities to indicate quest availability without requiring repeated interactions.

### Quest Marker Preload (PreloadScene.ts)

**Sprite Loading:**
- Added `ui_quest_marker_available.png` preload (yellow ! marker)
- Added `ui_quest_marker_ready.png` preload (cyan ? marker)

**Procedural Fallbacks:**
- Generated `ui_quest_marker_available_fallback` texture (64x64 yellow circle with black "!")
- Generated `ui_quest_marker_ready_fallback` texture (64x64 cyan circle with black "?")
- Three-tier fallback: PNG sprite → procedural texture → inline graphics

The fallback system ensures markers always display even if sprite assets are missing.

### Quest Marker Rendering (EntityRenderer.ts)

**New Methods:**

1. **createQuestMarker(npcEntityId, markerType, container)**
   - Creates marker sprite/graphics positioned above NPC nameplate
   - Adds floating animation (8px vertical motion, 1s cycle)
   - Three rendering modes: sprite → fallback texture → inline procedural
   - Stores marker in `questMarkers` Map for tracking

2. **removeQuestMarker(npcEntityId)**
   - Destroys marker graphics and removes from tracking Map
   - Called before creating new marker (prevents duplicates)

3. **updateQuestMarker(npcEntityId, markerType, container)**
   - Changes marker type or removes marker
   - markerType: 'available' | 'ready' | 'none'

4. **clearAllQuestMarkers()**
   - Cleanup method for all markers (called on scene shutdown)

**Marker Positioning:**
- Positioned at `uiBaseY - 60` (60px above nameplate)
- Accounts for entity scale (larger NPCs get proportionally positioned markers)
- Uses container system for automatic parent-relative positioning

### Quest Marker Update Logic (WorldScene.ts)

**NPC Data Storage:**
- Added npcId storage on NPC containers during `spawnEntity()`
- Uses type guard: `if (entity.type === 'npc' && 'npcId' in entity)`

**Event Listener:**
- Listens for `npc:interact:response` socket event
- Calls `updateNpcQuestMarker()` with NPC data

**Update Algorithm (updateNpcQuestMarker):**
```typescript
// Marker priority: ready > available > none
if (data.readyQuests?.length > 0) {
  markerType = 'ready';
} else if (data.availableQuests?.length > 0) {
  markerType = 'available';
} else {
  markerType = 'none';
}
```

**Helper Method:**
- `findNpcContainerById(npcId)` searches `entitySprites` Map for matching npcId
- Returns container for marker attachment

### Lazy Update Pattern

Quest markers update **after NPC interaction**, not in real-time. This design decision:
- Avoids server broadcasting quest state changes to all nearby players
- Reduces network traffic significantly
- Provides immediate feedback after interaction (when it matters most)
- Acceptable UX tradeoff: players see markers after first interaction

Real-time updates would require server to:
1. Track which players can see which NPCs
2. Broadcast quest state changes on quest:progress/complete events
3. Filter by NPC visibility per player

This complexity is unnecessary since markers primarily guide initial discovery.

## Deviations from Plan

None - plan executed exactly as written.

Note: Task 2 implementation was completed in previous plan 67-02 execution as part of NPC interaction modal work. Code verification confirmed all required functionality present.

## Technical Details

### Marker Rendering Fallback Chain

**Tier 1: PNG Sprite (preferred)**
```typescript
if (this.scene.textures.exists('ui_quest_marker_available')) {
  const sprite = this.scene.add.sprite(0, markerY, textureKey);
  sprite.setScale(0.8);
}
```

**Tier 2: Procedural Texture (generated in PreloadScene)**
```typescript
else if (this.scene.textures.exists('ui_quest_marker_available_fallback')) {
  const sprite = this.scene.add.sprite(0, markerY, fallbackKey);
}
```

**Tier 3: Inline Graphics (last resort)**
```typescript
else {
  const graphics = this.scene.add.graphics();
  graphics.fillStyle(0xffcc00, 1); // yellow for available
  graphics.fillCircle(0, markerY - 20, 20);
  // Add symbol text
}
```

This ensures markers always display regardless of asset availability.

### Floating Animation

Markers use Phaser tween system for subtle floating effect:
```typescript
this.scene.tweens.add({
  targets: markerContainer,
  y: -8,
  duration: 1000,
  yoyo: true,
  repeat: -1,
  ease: 'Sine.easeInOut',
});
```

Creates smooth up/down motion that draws player attention without being distracting.

### Container Hierarchy

Marker rendering uses Phaser's container system:
```
NpcContainer (entity)
  └─ Shadow
  └─ Sprite
  └─ Nameplate
  └─ QuestMarker (added dynamically)
       └─ Sprite/Graphics
       └─ Text (if inline)
```

This ensures:
- Markers move with NPC during pathfinding
- Depth sorting works correctly
- Cleanup is automatic when NPC despawns

## Files Modified

### apps/web/src/game/scenes/PreloadScene.ts (+69 lines)

- Added quest marker sprite preload (2 images)
- Generated procedural fallback textures (yellow ! and cyan ?)
- Used `make.text()` to render symbols on procedural markers

### apps/web/src/game/rendering/EntityRenderer.ts (+148 lines)

- Added `questMarkers: Map<string, Container>` property
- Added `createQuestMarker()` method with three-tier fallback
- Added `removeQuestMarker()` cleanup method
- Added `updateQuestMarker()` convenience method
- Added `clearAllQuestMarkers()` for scene shutdown

### apps/web/src/game/scenes/WorldScene.ts (+94 lines)

- Added npcId storage on NPC entity containers
- Added `npc:interact:response` event listener
- Added `updateNpcQuestMarker()` method
- Added `findNpcContainerById()` helper method

## Validation

**Build Status:** ✅ Passed
```bash
pnpm build
# NX Successfully ran target build for 12 projects
```

**Visual Verification:** ✅ Passed (human-verified)
- Quest markers appear above NPCs after interaction
- Yellow "!" shows for available quests
- Cyan "?" shows for ready quests
- Markers float with smooth animation
- Markers update when quest state changes (accept/complete)

**Integration Test:**
1. Started dev server
2. Logged in character and went to faction hub
3. Interacted with faction rep NPC
4. Verified "!" marker appeared after closing modal (NPC had available quest)
5. Accepted quest and verified marker disappeared
6. Completed quest objective and returned to NPC
7. Verified "?" marker appeared (quest ready to turn in)

All functionality working as expected.

## Self-Check

Verifying plan must-haves against implementation:

**Truths:**
- ✅ NPCs with available quests show "!" marker above their head (yellow)
- ✅ NPCs with quests ready for turn-in show "?" marker (cyan)
- ✅ Quest markers update when quest state changes

**Artifacts:**
- ✅ `apps/web/src/game/rendering/EntityRenderer.ts` provides quest marker sprite creation and management, contains "createQuestMarker"
- ✅ `apps/web/src/game/scenes/WorldScene.ts` provides quest marker update logic on state changes, contains "updateNpcQuestMarker"

**Key Links:**
- ✅ `apps/web/src/game/scenes/WorldScene.ts` calls `EntityRenderer.createQuestMarker` for NPC entities (line 1793)
- ✅ Pattern "createQuestMarker" exists in WorldScene → EntityRenderer flow

## Self-Check: PASSED

All required files exist and contain expected patterns. Commits verified:

- e16cc32: feat(67-03): add quest marker preload with procedural fallbacks
- feacbf5: feat(67-02): add Quests tab to NPC interaction modal (includes Task 2 implementation)

Human verification confirmed visual functionality matches specification.
