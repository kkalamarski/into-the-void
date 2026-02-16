# Requirements: Into the Void

**Defined:** 2026-02-16
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.4 Requirements

Requirements for milestone v1.4: Infinite World & Seamless Chunks.

### Coordinate System

- [ ] **COORD-01**: Depth sorting uses world coordinates for correct z-order across chunks
- [ ] **COORD-02**: Entity visibility uses world coordinate distance, not zone ID matching
- [ ] **COORD-03**: Tile rendering calculates depth from world position (chunkX * 32 + localX)

### Chunk Streaming

- [ ] **CHUNK-01**: Client loads 3x3 grid of chunks around player position
- [ ] **CHUNK-02**: Client requests chunks via WebSocket when approaching chunk boundary
- [ ] **CHUNK-03**: Server generates chunks on demand with deterministic seed
- [ ] **CHUNK-04**: Server caches generated chunks with LRU cleanup
- [ ] **CHUNK-05**: Client unloads chunks when player moves beyond load radius
- [ ] **CHUNK-06**: Loading indicator displayed while chunks are pending
- [ ] **CHUNK-07**: Player can move seamlessly across chunk boundaries without visual breaks

### Biome Distribution

- [ ] **BIOME-01**: Biome determined per-tile using world coordinates (not per-chunk)
- [ ] **BIOME-02**: Biome transitions are seamless using noise layers (no hard edges)
- [ ] **BIOME-03**: HUD displays current biome name based on player position
- [ ] **BIOME-04**: Temperature/moisture/elevation noise creates natural climate zones

### Memory & Performance

- [ ] **MEM-01**: Phaser containers destroyed when chunks unload (no memory leaks)
- [ ] **MEM-02**: WebSocket room subscriptions cleaned up during chunk transitions
- [ ] **MEM-03**: Chunk requests use priority queue (visible chunks first)
- [ ] **MEM-04**: Server chunk cache bounded with max size limit

## Future Requirements

Deferred to future release. Tracked but not in v1.4 roadmap.

### Optimization

- **OPT-01**: Redis-based chunk cache for multi-server scaling
- **OPT-02**: Predictive pre-loading based on player movement direction
- **OPT-03**: Chunk fade-in animation (smooth appearance)

### World Modification

- **MOD-01**: Player-modified chunks persist to database
- **MOD-02**: Delta storage for terrain edits
- **MOD-03**: Building/construction system

### Visual Polish (from v1.3)

- **VPOL-01**: Visual elevation transitions (ramps/stairs between levels)
- **VPOL-02**: Dynamic wall transparency when blocking player view
- **VPOL-03**: Procedural side-face texture variation per biome
- **VPOL-04**: Shadows cast by elevated terrain and structures

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Client-side chunk generation | Security risk, desync potential with multiplayer |
| Unlimited chunk load radius | Memory explosion, server load |
| Cross-chunk structures | Complexity - structures stay within single chunks |
| Real-time chunk modification | Requires persistence layer, defer to building system |
| Multi-server chunk sharing | Only needed at 1000+ players |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| COORD-01 | Phase 17 | Pending |
| COORD-02 | Phase 17 | Pending |
| COORD-03 | Phase 17 | Pending |
| CHUNK-01 | Phase 18 | Pending |
| CHUNK-02 | Phase 18 | Pending |
| CHUNK-03 | Phase 18 | Pending |
| CHUNK-04 | Phase 18 | Pending |
| CHUNK-05 | Phase 18 | Pending |
| CHUNK-06 | Phase 18 | Pending |
| CHUNK-07 | Phase 18 | Pending |
| MEM-01 | Phase 18 | Pending |
| MEM-02 | Phase 18 | Pending |
| MEM-03 | Phase 18 | Pending |
| MEM-04 | Phase 18 | Pending |
| BIOME-01 | Phase 19 | Pending |
| BIOME-02 | Phase 19 | Pending |
| BIOME-03 | Phase 19 | Pending |
| BIOME-04 | Phase 19 | Pending |

**Coverage:**
- v1.4 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 (100% coverage)

---
*Requirements defined: 2026-02-16*
*Last updated: 2026-02-16 after roadmap creation*
