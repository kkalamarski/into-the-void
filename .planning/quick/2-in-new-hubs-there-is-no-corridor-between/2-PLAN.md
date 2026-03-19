---
phase: quick-fix
plan: 2
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/world-gen/src/maps/hubs/hub_verdant.json
autonomous: true
requirements: []
must_haves:
  truths:
    - "All rooms in hub_verdant (Canopy Station) are reachable from every other room"
    - "Player can walk from Trading Garden to Atrium without being blocked"
    - "Player can walk from Nursery to Atrium without being blocked"
    - "Corridors use canopy_corridor (tile 33) and canopy_door (tile 32) tiles consistent with existing corridor style"
  artifacts:
    - path: "packages/world-gen/src/maps/hubs/hub_verdant.json"
      provides: "Fixed hub map with connected rooms"
  key_links:
    - from: "packages/world-gen/src/maps/hubs/hub_verdant.json"
      to: "packages/world-gen/src/maps/hub-loader.ts"
      via: "JSON import and Zod validation"
      pattern: "validateHubChunk"
---

<objective>
Fix disconnected rooms in hub_verdant (Canopy Station) by carving corridors through the wall band at rows 28-29 that blocks passage between all three isolated regions.

Purpose: Players spawning in Canopy Station currently cannot walk between rooms because a wall band at rows 28-29 severs the corridor network into 3 disconnected islands (NW rooms, NE Nursery, Center/South Atrium+Docking). This makes the hub unplayable.

Output: Updated hub_verdant.json with fully connected walkable areas.
</objective>

<execution_context>
@/Users/krzysztof.kalamarski/.claude/get-shit-done/workflows/execute-plan.md
@/Users/krzysztof.kalamarski/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/world-gen/src/maps/hubs/hub_verdant.json
@packages/world-gen/src/maps/hub-loader.ts
@packages/world-gen/src/generation/hub.ts
@packages/tiles/src/definitions/hub-canopy-tiles.ts

<analysis>
## Bug Analysis

hub_verdant.json has 3 disconnected walkable regions:
- Region 1 (NW): Trading Garden (12,15) + Communion Hall (12,68) — 1166 tiles
- Region 2 (NE): Nursery (92,15) — 535 tiles
- Region 3 (Center/South): Atrium (44,30) + Docking Bay (44,95) — 2350 tiles

The other 3 hubs (hub_helix, hub_nexus, hub_neutral) are fully connected — 0 unreachable tiles.

## Root Cause

A wall band at rows 28-29 blocks both corridor paths:

**NW corridor (cols 35-37):** Corridor tiles exist at rows 25-27 and rows 30-37, but rows 28-29 at cols 36-37 are wall tiles (tile 31, collision=true, height=2). Col 35 at rows 28-29 is floor (tile 30) but that single column does NOT connect to the corridor below because at row 30+, the corridor only spans cols 35-37 and col 35 alone reaches down but the corridor path requires cols 36-37 to be open too.

**NE corridor (cols 91-93):** Corridor tiles exist at rows 25-27 and rows 30-37, but rows 28-29 at cols 91 are wall tiles (tile 31). Cols 92-93 at rows 28-29 are floor (tile 30), connecting into the Nursery room but NOT reaching the corridor below which starts at col 91.

## Fix Required

Carve walkable corridor tiles at rows 28-29 to bridge the gaps:
1. NW corridor: Set cols 36-37 at rows 28-29 to corridor tile (33), collision=false, height=0
2. NE corridor: Set col 91 at rows 28-29 to corridor tile (33), collision=false, height=0

## Tile Reference (numeric IDs = index in ALL_TILES array)
- 30 = CANOPY_FLOOR (walkable, height 0)
- 31 = CANOPY_WALL (blocking, height 2)
- 32 = CANOPY_DOOR (walkable, height 0)
- 33 = CANOPY_CORRIDOR (walkable, height 0)
- 34 = CANOPY_DECORATION (blocking, height 1)
- 35 = CANOPY_ACCENT (walkable, height 0)
</analysis>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Carve corridors in hub_verdant.json to connect all rooms</name>
  <files>packages/world-gen/src/maps/hubs/hub_verdant.json</files>
  <action>
Write a Node.js script to modify hub_verdant.json. The script must:

1. Load hub_verdant.json
2. Fix NW corridor gap — at rows 28-29, cols 36-37:
   - Set tiles[28][36] = 33 (CANOPY_CORRIDOR), collisions[28][36] = false, heights[28][36] = 0
   - Set tiles[28][37] = 33, collisions[28][37] = false, heights[28][37] = 0
   - Set tiles[29][36] = 33, collisions[29][36] = false, heights[29][36] = 0
   - Set tiles[29][37] = 33, collisions[29][37] = false, heights[29][37] = 0
3. Fix NE corridor gap — at rows 28-29, col 91:
   - Set tiles[28][91] = 33, collisions[28][91] = false, heights[28][91] = 0
   - Set tiles[29][91] = 33, collisions[29][91] = false, heights[29][91] = 0
4. Write the modified JSON back (with same formatting: 2-space indent)
5. Run BFS connectivity check to verify ALL walkable tiles are now in a single connected region
6. Delete the script after successful verification

Do NOT modify any other hub JSON files (they are already fully connected).
Do NOT change any TypeScript source files.
  </action>
  <verify>
    <automated>node -e "
const data = require('./packages/world-gen/src/maps/hubs/hub_verdant.json');
const w = data.width, h = data.height;
const walkable = [];
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!data.collisions[y][x]) walkable.push({x, y});
const visited = new Set();
const queue = [walkable[0]];
visited.add(walkable[0].y * w + walkable[0].x);
while (queue.length > 0) { const {x, y} = queue.shift(); for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) { const nx=x+dx, ny=y+dy; if (nx>=0 && nx<w && ny>=0 && ny<h && !data.collisions[ny][nx]) { const k=ny*w+nx; if (!visited.has(k)) { visited.add(k); queue.push({x:nx,y:ny}); }}}}
const unreachable = walkable.length - visited.size;
if (unreachable > 0) { console.error('FAIL: ' + unreachable + ' unreachable tiles'); process.exit(1); }
console.log('PASS: All ' + walkable.length + ' walkable tiles are connected');
"</automated>
  </verify>
  <done>
    - hub_verdant.json has 0 unreachable walkable tiles (all rooms connected via corridors)
    - NW corridor at rows 28-29, cols 36-37 uses CANOPY_CORRIDOR tiles (id 33)
    - NE corridor at rows 28-29, col 91 uses CANOPY_CORRIDOR tiles (id 33)
    - No other hub JSON files modified
    - hub-loader.ts Zod validation still passes (server can load the map)
  </done>
</task>

</tasks>

<verification>
1. BFS connectivity check confirms 0 unreachable tiles in hub_verdant
2. All 4 hub JSONs still pass Zod validation: `node -e "require('./packages/world-gen/src/maps/hub-loader.ts')"` (via tsx or build)
3. The modified cells use corridor tile 33 with collision=false and height=0, matching the existing corridor pattern
</verification>

<success_criteria>
- hub_verdant.json has exactly 1 connected walkable region (was 3)
- Corridors use canopy_corridor tile (33) matching existing style
- Other 3 hub maps remain unchanged and fully connected
- Build succeeds: `npx nx run world-gen:build` (or equivalent)
</success_criteria>

<output>
After completion, create `.planning/quick/2-in-new-hubs-there-is-no-corridor-between/2-SUMMARY.md`
</output>
