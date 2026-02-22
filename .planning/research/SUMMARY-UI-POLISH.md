# Project Research Summary

**Project:** UI Polish & NPC Interaction Window Unification
**Domain:** React/Phaser MMO UI Layer
**Researched:** 2026-02-22
**Confidence:** HIGH

## Executive Summary

This research addresses UI polish and the double-modal bug in Into the Void's NPC interaction system. The current architecture renders both NpcInteractionModal and TradingPanel as separate components when interacting with trader NPCs, causing visual duplication and event handling conflicts. The root cause is redundant state management with two boolean flags (`interactingNpc` and `showTrading`) controlling what should be a single unified window.

The recommended approach is to consolidate TradingPanel into NpcInteractionModal as a tab, following the existing tab pattern already implemented for dialogue/trade/quests navigation. This requires no new technologies—plain CSS with design tokens, React 18, and the existing @floating-ui/react library handle all polish requirements. The stack research confirms that modern CSS (2026) provides GPU-accelerated transitions, glassmorphism via backdrop-filter, and comprehensive animation capabilities without JavaScript libraries.

The key risk is nested modal escape key handling, which can cascade close events if not implemented with event capture phase. Research identifies seven critical pitfalls including keyboard listener memory leaks, Phaser keyboard state desync, and race conditions between modal close and socket emissions. These are preventable through established patterns already present in the codebase (TradingPanel's capture-phase escape handler, Phaser keyboard cleanup reading fresh game instances).

## Key Findings

### Recommended Stack

The existing stack requires no additions. Plain CSS with design tokens, React 18, and @floating-ui/react (already installed) provide all necessary capabilities for polished game UI.

**Core technologies:**
- **Plain CSS (CSS3 2026)**: All styling and animations — Zero runtime overhead, GPU-accelerated transforms/opacity, native browser optimizations. Modern CSS includes backdrop-filter for glassmorphism, CSS variables for design tokens, and comprehensive animation support. No libraries needed.
- **CSS Custom Properties (Native)**: Design token system — Already in use (`--color-bg-*`, `--color-accent`). Industry standard with 97%+ browser support. Enables theme consistency without build tools.
- **React 18 (18.2.0)**: UI component framework — Already established. Handles component state and event management without CSS-in-JS overhead.
- **@floating-ui/react (0.27.18)**: Tooltip positioning — Already installed. Industry-leading positioning library with automatic collision detection. Used by existing ItemTooltip.

**Recommended additions to design tokens:**
- Animation timing tokens (`--transition-fast: 0.1s`, `--transition-normal: 0.2s`, `--transition-slow: 0.3s`)
- Shadow tokens for depth hierarchy (`--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-glow`)
- Glassmorphism tokens (`--glass-bg`, `--glass-border`, `--glass-blur`)
- Interactive state tokens (`--hover-lift: translateY(-2px)`, `--active-press: scale(0.98)`)

**What NOT to use:**
- CSS-in-JS libraries (Emotion, styled-components) — Runtime overhead incompatible with 60fps game UI requirements
- Animation libraries (Framer Motion, GSAP) — Unnecessary for simple transitions, CSS is 10x faster
- Tailwind CSS — Utility-first approach creates verbose classNames for animation-heavy components

### Expected Features

Research identifies table stakes features that MMO players expect, competitive differentiators, and anti-features that seem good but create problems.

**Must have (table stakes):**
- Unified NPC window (single window with tabs for dialogue/trade/quests) — Current bug shows two modals
- ESC key closes windows properly — Already implemented but has propagation bug requiring stopPropagation fix
- Quest objective tracking HUD — Expected by all MMO players, shows active quest progress near minimap
- Quest markers on NPC sprites (! and ?) — Visual indicators for quest availability/completion in world
- Item comparison tooltips — Show equipped vs shop item stats (already implemented in TradingPanel)
- Quest reward selection UI — Choose between multiple quest rewards when completing quests
- Visual quest completion feedback — Audio/visual cue with "Quest Complete" banner
- Draggable panels — Move UI freely (already implemented via useDraggablePanel hook)

**Should have (competitive):**
- Immersive dialogue presentation — Story-focused paragraph-by-paragraph presentation (enhances sci-fi narrative)
- Smart quest tracker sorting — Auto-sort tracked quests by proximity to player
- Faction-specific UI theming — UI colors change based on player faction (Verdant/Helix/Nexus/Unaffiliated)
- Quest chain visualization — Show "this is part 3 of 5" progression
- Vendor buyback tab — Recover accidentally sold items (last 12 items, cleared on logout)
- Keyboard shortcuts for quest actions — Accept/turn-in with hotkeys

**Defer (v2+):**
- Quest categories/grouping in log — Add when quest count exceeds 10 active quests
- Dynamic quest recommendations — AI-driven "Recommended for you" suggestions
- Shop stock visualization — Visual feedback for low stock items
- Contextual NPC dialogue — Dialogue changes based on quest state/faction (basic conditions already exist)

**Anti-features (avoid):**
- Auto-accept/auto-complete quests — Removes player agency and breaks immersion. Use keyboard shortcuts instead.
- Quest mini-map markers with GPS coordinates — Removes exploration. Use zone-level hints ("Southeast of crater").
- Multiple simultaneous NPC windows — Window management nightmare. Single window at a time.
- Auto-sell junk items — Players accidentally lose quest items. Add "mark as junk" toggle instead.

### Architecture Approach

The recommended architecture uses a single unified modal with tab-based navigation, eliminating redundant state. The current double-render bug stems from GameUI.tsx rendering both NpcInteractionModal (when `interactingNpc` is truthy) and TradingPanel (when `showTrading` is truthy) simultaneously.

**Solution pattern:** Extract TradingPanel's trade UI into a TradeTab component embedded within NpcInteractionModal. Remove `showTrading` boolean and replace with `activeTab === 'trade'` check. Single modal handles all NPC interactions (dialogue, trade, quests) with consistent keyboard handling and state management.

**Major components:**
1. **NpcInteractionModal (unified window)** — Single source of truth for NPC interactions. Renders tabbed content based on `activeTab` state. Handles escape key, keyboard disable, dragging, and close button at parent level.
2. **TradeTab (extracted from TradingPanel)** — Trade UI content without panel wrapper. Contains buy/sell grids, item rendering, credit display. No positioning, no header, no close button (parent handles).
3. **npcStore (simplified state)** — Removes `showTrading`, `openTrading()`, `closeTrading()` actions. Keeps `interactingNpc` (source of truth) and `activeTab` (tab navigation). Single `closeInteraction()` clears all NPC state.
4. **GameUI (single render point)** — Removes duplicate TradingPanel render. Only renders NpcInteractionModal when `interactingNpc` exists.

**CSS organization:**
- Merge TradingPanel.css trade-specific styles into NpcInteractionModal.css
- Prefix with `.npc-trade-*` for consistency with `.npc-dialogue-*` and `.npc-quests-*`
- Delete TradingPanel.css after extraction
- Keep existing panel-level styles (`.npc-modal`, `.npc-modal-header`) unchanged

**Data flow:**
```
User clicks NPC → WorldScene emits 'entity:interact' → Server responds 'npc:interact:response'
→ npcStore.setInteractingNpc(npcData) → GameUI renders NpcInteractionModal
→ User clicks "Trade" tab → npcStore.setActiveTab('trade') → Modal renders TradeTab content
```

No separate modal state eliminates double render and escape key conflicts.

### Critical Pitfalls

Research identifies seven critical pitfalls with established prevention patterns:

1. **Nested Modal Escape Key Cascade** — Pressing Escape triggers both modal close handlers, closing entire stack instead of innermost modal. Use event capture phase (`addEventListener('keydown', handler, true)`) for nested modals with `e.stopPropagation()`. TradingPanel already implements this correctly (line 61-73).

2. **Keyboard Event Listener Memory Leaks** — Modal components add window-level listeners but fail cleanup, causing accumulation across open/close cycles and input lag. Ensure cleanup function references same handler instance and options. Use `return () => removeEventListener('keydown', handleKeyDown, true)` in useEffect.

3. **Phaser Keyboard State Desync After Modal Close** — Cleanup reads stale game instance from closure, keyboard remains disabled after close. Read fresh instance in cleanup: `const game = useGameStore.getState().game; game?.getWorldScene()?.setKeyboardEnabled(true)`. Current implementation correct in all modals.

4. **Modal State Duplication Leading to Desync** — Multiple boolean flags (`interactingNpc`, `showTrading`) create conflicting sources of truth. Consolidate to single modal state with tab navigation. Remove redundant booleans.

5. **Z-Index Wars Between Modals** — Tooltips/dropdowns render behind modal due to stacking context trap. Portal tooltips to document body (ItemTooltip already does this) or use higher z-index for nested overlays.

6. **Modal Tab State Lost on Re-open** — Tab state stored in component-local useState is lost on unmount. Decide: persist in npcStore per-NPC or use smart defaults (e.g., if NPC has ready quests, default to 'quests' tab).

7. **Race Condition Between Modal Close and Socket Emission** — Player clicks "Buy", modal closes optimistically, server rejects, error appears after modal closed. Prevent modal close while trade pending or show toast notification outside modal via alertStore.

## Implications for Roadmap

Based on research, UI polish work should be structured in three phases focusing on bug fixes, core polish, and advanced features. Total estimated effort: 4-6 phases depending on feature scope.

### Phase 1: Modal Unification (Bug Fix)
**Rationale:** Fixes double-render bug immediately, establishes foundation for all polish work. No new features, pure refactoring with minimal risk.

**Delivers:** Single unified NPC window with functional tab navigation, eliminated double-modal bug, proper escape key handling.

**Addresses:**
- Unified NPC window (table stakes from FEATURES.md)
- ESC key closes windows (table stakes, bug fix)

**Avoids:**
- Nested modal escape cascade (Pitfall #1) via single modal architecture
- Modal state duplication desync (Pitfall #4) via state consolidation

**Implementation approach:**
1. Extract TradeTab component from TradingPanel.tsx
2. Add trade CSS to NpcInteractionModal.css
3. Remove `showTrading` state from npcStore
4. Update GameUI to render single modal
5. Delete TradingPanel files after verification

**Research flag:** SKIP — Standard React refactoring pattern, all research complete.

### Phase 2: Quest Objective Tracker HUD
**Rationale:** Table stakes feature expected by MMO players. Independent of modal work, can be built in parallel. Uses existing quest system data.

**Delivers:** On-screen HUD component showing active quest progress with collapsible objectives, positioned near minimap area.

**Addresses:**
- Quest objective tracking HUD (table stakes from FEATURES.md)

**Implements:**
- New HUD component with fixed positioning (z-index below modals)
- Reads from useQuestStore active quests
- Uses existing CSS token system for styling

**Research flag:** SKIP — Standard HUD overlay pattern, existing questStore provides data model.

### Phase 3: Visual Polish (Hover States, Transitions, Glassmorphism)
**Rationale:** Applies polish patterns from STACK.md to all interactive elements. Builds on unified modal from Phase 1. Low risk, high visual impact.

**Delivers:** GPU-accelerated hover states on all buttons/tabs, 150ms modal fade-in transitions, glassmorphism on modals, micro-interactions for button feedback.

**Uses:**
- Plain CSS with GPU-accelerated transforms (STACK.md Pattern 1)
- Asymmetric transitions for responsive feel (STACK.md Pattern 2)
- Glassmorphism with backdrop-filter (STACK.md Pattern 3)
- Design token expansion (animation timing, shadows, glass effects)

**Avoids:**
- Inline hover styles causing re-renders (Technical Debt pattern)
- Hover states too subtle (UX Pitfall — minimum 15% brightness change)

**Implementation approach:**
1. Add animation/shadow/glassmorphism tokens to global.css
2. Apply `:hover`, `:active`, `:focus-visible` states to all interactive elements
3. Add `@keyframes` for modal enter/exit
4. Apply `backdrop-filter: blur(8px)` to modals
5. Test at 60fps with Chrome DevTools Performance

**Research flag:** SKIP — All CSS patterns documented in STACK.md, high confidence.

### Phase 4: Quest Markers in World
**Rationale:** Table stakes for quest system. Requires sprite overlay system (new architecture component). Medium complexity.

**Delivers:** Yellow ! (available quest), yellow ? (turn-in quest) sprites rendered above NPC entities in WorldScene.

**Addresses:**
- Quest markers on NPCs (table stakes from FEATURES.md)

**Implements:**
- Sprite overlay system in Phaser WorldScene
- NPC quest state sync from server
- Marker visibility based on quest eligibility

**Research flag:** NEEDS RESEARCH — Phaser sprite overlay patterns not covered in current research. Use `/gsd:research-phase` to investigate Phaser sprite z-indexing and dynamic sprite attachment.

### Phase 5: Quest Reward Selection & Completion Feedback
**Rationale:** Critical table stakes for quest system. Builds on modal unification. Medium complexity due to socket flow changes.

**Delivers:** Modal showing reward item choices when completing quest with multiple rewards. "Quest Complete" banner with sound effect.

**Addresses:**
- Quest reward selection UI (table stakes from FEATURES.md)
- Visual quest completion feedback (table stakes)

**Avoids:**
- Race condition with socket emission (Pitfall #7) by waiting for server confirmation

**Implementation approach:**
1. Add reward selection step to quest:complete flow
2. New RewardSelectionModal or embed in NpcInteractionModal
3. Add quest completion banner (fixed position, 3s auto-dismiss)
4. Add audio feedback via HTML5 Audio API

**Research flag:** PARTIAL — UI patterns established, but need socket flow research for reward selection. Verify quest:complete event supports reward selection in server code.

### Phase 6: Error Feedback & Loading States
**Rationale:** Polish for production readiness. Handles edge cases from Pitfall #7. Low complexity, high UX value.

**Delivers:** Toast notification system for errors outside modals, loading spinners on async buttons, "pending" states during socket round-trips.

**Addresses:**
- Error feedback polish (from PITFALLS.md Pitfall #7)

**Implements:**
- alertStore for transient notifications (AlertNotification component already exists)
- Button pending states with visual feedback
- Socket error handlers showing toast notifications

**Avoids:**
- Silent failures when server rejects actions (Pitfall #7)
- Missing loading states ("Looks Done But Isn't" checklist item)

**Research flag:** SKIP — AlertNotification component exists, standard pattern.

### Phase Ordering Rationale

- **Phase 1 first:** Fixes blocking bug and establishes architecture for all subsequent work. Must complete before Phase 3 (polish applies to unified modal).
- **Phase 2 parallel:** Quest tracker is independent of modal work, can be developed simultaneously with Phase 1.
- **Phase 3 after Phase 1:** Visual polish requires unified modal architecture from Phase 1. Applies CSS patterns to stable component structure.
- **Phase 4 anytime:** Quest markers independent of modal/HUD work. Could be parallel with Phase 3 if resources available.
- **Phase 5 after Phase 1:** Reward selection extends unified modal system. Depends on modal consolidation.
- **Phase 6 last:** Error feedback is final polish layer. Benefits from complete feature set to test edge cases.

**Deferred to v2 (future consideration):**
- Vendor buyback tab — Add after validating trading frequency
- Immersive dialogue presentation — Requires content restructuring
- Quest chain visualization — Add when chains exceed 5 quests
- Faction-specific UI theming — Visual polish, not gameplay-critical
- Smart quest tracker sorting — Add if players report navigation issues

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Quest Markers in World):** Phaser sprite overlay system not covered in current research. Need to investigate dynamic sprite attachment, z-index layering, and performance implications of per-NPC sprite overlays.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Modal Unification):** React component refactoring with established patterns. All architecture decisions documented.
- **Phase 2 (Quest Objective Tracker):** Standard HUD overlay with existing data model.
- **Phase 3 (Visual Polish):** All CSS patterns documented in STACK.md with code examples.
- **Phase 5 (Quest Rewards):** UI patterns established, may need quick socket flow verification.
- **Phase 6 (Error Feedback):** AlertNotification component exists, standard toast pattern.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommended technologies already in codebase. Modern CSS capabilities verified with 2026 browser support data (95%+). No new dependencies required. Sources include official documentation and established experts (Josh W. Comeau for CSS patterns). |
| Features | MEDIUM | Table stakes and differentiators validated against WoW/FFXIV competitor analysis. Some features (buyback tab, quest chain visualization) have incomplete usage data—need validation during implementation to confirm priority. Anti-features identified from community best practices. |
| Architecture | HIGH | Solution pattern directly addresses root cause identified in codebase analysis. Unified modal approach matches existing patterns (QuestLogPanel tabs). CSS consolidation follows established token system. All integration points documented with current line references. |
| Pitfalls | HIGH | All seven pitfalls verified with codebase examples and prevention patterns. Phaser keyboard cleanup pattern confirmed in multiple modals. Escape key capture phase validated in TradingPanel implementation. Memory leak prevention matches React best practices from high-confidence sources. |

**Overall confidence:** HIGH

### Gaps to Address

While core research is high-confidence, these areas need attention during implementation:

- **Quest reward selection socket flow:** Verify game-server supports reward selection in quest:complete event. Current research assumes server-side capability exists. If not, requires Phase 5 to expand to include server-side changes.

- **Phaser sprite overlay performance:** Phase 4 needs research on performance implications of dynamic sprite overlays. If every NPC gets persistent overhead sprite, need to verify no frame rate impact with 50+ NPCs visible. May require viewport culling for quest markers.

- **Faction UI theming scope:** Deferred to v2, but if pursued, need to define: (1) which UI elements change colors, (2) whether theming is CSS-only or requires asset variants, (3) how theme switching works on faction change.

- **Tab state persistence decision:** Phase 1 mentions decision needed: persist tab state per-NPC in npcStore vs smart defaults. Lean toward NO (simpler) unless user testing demands it. Document decision in Phase 1 plan.

- **Buyback tab persistence rules:** Deferred feature, but if implemented, need to define: session-based clearing (on logout) vs WoW-style zone change clearing vs FFXIV-style persistent across sessions. Affects server-side storage requirements.

## Sources

### Primary (HIGH confidence)
- STACK-UI-POLISH.md research (2026-02-22) — Plain CSS patterns, design tokens, browser support data
- ARCHITECTURE-UI-POLISH.md research (2026-02-22) — Component structure analysis, state management patterns
- PITFALLS-UI-POLISH.md research (2026-02-22) — Seven critical pitfalls with codebase examples
- FEATURES-NPC-UI-POLISH.md research (2026-02-22) — Table stakes features, competitor analysis (WoW, FFXIV)
- Into the Void codebase at /Users/krzysztof.kalamarski/Projects/into-the-void — Direct inspection of NpcInteractionModal.tsx, TradingPanel.tsx, npcStore.ts, GameUI.tsx with line-level references
- [An Interactive Guide to CSS Transitions • Josh W. Comeau](https://www.joshwcomeau.com/animation/css-transitions/) — Asymmetric transition patterns
- [CSS Animations: The Complete Guide for 2026 | DevToolbox](https://devtoolbox.dedyn.io/blog/css-animations-complete-guide) — GPU acceleration best practices
- [Phaser game with React UI](https://3ee.com/blog/phaser-game-react-ui/) — Keyboard conflict resolution patterns
- [Cancel React Modal with Escape Key](https://keyholesoftware.com/cancel-a-react-modal-with-escape-key-or-external-click/) — Event capture phase for nested modals
- [How to Fix Memory Leaks in React](https://www.freecodecamp.org/news/fix-memory-leaks-in-react-apps/) — Event listener cleanup patterns

### Secondary (MEDIUM confidence)
- [Quest Log - Wowpedia](https://wowpedia.fandom.com/wiki/Quest_Log) — WoW quest UI structure
- [Vendor - Wowpedia](https://wowpedia.fandom.com/wiki/Vendor) — Buyback mechanics and persistence rules
- [Glassmorphism: What It Is and How to Use It in 2026](https://invernessdesignstudio.com/glassmorphism-what-it-is-and-how-to-use-it-in-2026) — Glassmorphism implementation
- [Button States Explained (2026) | DesignRush](https://www.designrush.com/best-designs/websites/trends/button-states) — Interactive state best practices
- [React State Management in 2025](https://www.developerway.com/posts/react-state-management-2025) — Zustand patterns and single source of truth principles
- [Effortless Modal Management with Zustand](https://medium.com/@selvakumar_P/effortless-modal-management-in-react-with-zustand-2e99dc876a82) — Modal state patterns

### Tertiary (LOW confidence)
- [10+ Best CSS and JavaScript Animation Libraries For 2026](https://graygrids.com/blog/best-css-javascript-animation-libraries) — Library comparison (aggregated content, used for "what NOT to use" validation)
- [MMORPG UI Standards - GamingSF](https://gamingsf.wordpress.com/2018/01/19/mmorpg-user-interface-standards/) — General MMO UI expectations (dated 2018, validated against modern competitors)

---
*Research completed: 2026-02-22*
*Ready for roadmap: yes*
