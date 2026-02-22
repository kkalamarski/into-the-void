# Feature Research

**Domain:** MMO NPC Interaction UI Polish
**Researched:** 2026-02-22
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Unified NPC window | Single window for all NPC interactions (quest/trade/dialogue) | LOW | WoW-style tabbed interface. Current bug: two modals appear. Already partially implemented with tabs. |
| ESC key closes windows | Standard game UI convention - ESC closes current focused window | LOW | Already implemented but has propagation bug where both NPC modal and trading panel close. Need stopPropagation fix. |
| Quest objective tracking | On-screen tracker showing active quest progress | MEDIUM | Currently have quest log but no HUD tracker. WoW shows objectives with progress bars near minimap. |
| Quest markers (! and ?) | Visual indicators on NPCs for quest availability/completion | MEDIUM | Currently implemented in NPC interaction modal tabs. Need to add overhead markers on NPC sprites in world. |
| Item comparison tooltips | Show equipped item stats vs shop item stats | LOW | Already implemented in TradingPanel via getEquippedItemDef. Table stakes for vendor UI. |
| Vendor buyback tab | Recover accidentally sold items | MEDIUM | Not implemented. WoW allows buyback of last 12 items sold (cleared on logout/zone change). |
| Quest reward selection | Choose between multiple quest rewards | MEDIUM | Not implemented. Need UI for selecting reward items when completing quests. |
| Draggable panels | Move UI panels freely | LOW | Already implemented via useDraggablePanel hook. |
| Keyboard shortcuts | Close panels with ESC, accept quests with hotkey | LOW | ESC partially implemented. Need quest accept/turn in shortcuts. |
| Quest categories/grouping | Group quests by zone or type | LOW | Not implemented. Quest log is flat list. WoW groups by region in collapsible sections. |
| Visual quest completion feedback | Audio/visual cue when quest completed | LOW | Not implemented. WoW shows "Quest Complete" banner, plays sound, colors objectives green. |
| NPC portrait/identification | Clear visual identity for NPCs | LOW | Currently using colored placeholder squares. Need actual portraits or better visual identity. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Immersive dialogue presentation | Story-focused dialogue UI (like WoW Immersion addon) | MEDIUM | Replace wall of text with paragraph-by-paragraph presentation. Enhances sci-fi narrative immersion. Current implementation shows all text at once. |
| Smart quest tracker sorting | Auto-sort tracked quests by proximity | MEDIUM | WoW feature: tracker reorders based on zone entry. Reduces cognitive load for players. |
| Faction-specific UI theming | UI colors/styling change based on player faction | LOW | Align with faction identity (Verdant/Helix/Nexus). Reinforces faction allegiance. |
| Quest chain visualization | Show quest progression within chains | MEDIUM | Help players see "this is part 3 of 5". Already have quest chain definitions, need UI. |
| Dynamic quest recommendations | Suggest quests based on level/location | MEDIUM | NPC shows "Recommended for you" section. Reduces analysis paralysis. |
| Shop stock visualization | Show vendor stock changes over time | LOW | Already have stock tracking (-1 = unlimited, number = quantity). Add visual feedback when low. |
| Contextual NPC dialogue | Dialogue changes based on quest state/faction | HIGH | Already partially implemented via dialogue conditions. Expand with more context. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-accept quests | "Clicking is tedious" | Removes player agency, prevents reading quest text, breaks immersion | Add keyboard shortcut (Space/E to accept) instead. Players still consciously accept. |
| Auto-complete quests | "Saves time turning in" | Same as auto-accept. Quest completion is a reward moment. | Add hotkey for turn-in. Keep the conscious action and reward feedback. |
| Quest mini-map markers | "Want exact locations" | Removes exploration, makes game feel like following waypoints | Use zone-level hints instead. "Southeast of crater" is more engaging than GPS coordinates. |
| Multiple simultaneous NPC windows | "Want to compare vendors" | Window management nightmare, cluttered UI | Single NPC window at a time. Close current to open new. Clean, focused interaction. |
| Auto-sell junk items | "Inventory management is annoying" | Players accidentally lose quest items or items they wanted | Add "mark as junk" toggle on items. Player controls what auto-sells. |
| Quest difficulty indicators | "Want to know if I can do it" | Reduces challenge excitement, discourages trying difficult content | Show recommended level only. Let players discover challenge. |

## Feature Dependencies

```
Quest Objective Tracking (HUD)
    └──requires──> Quest System (already implemented)

Buyback Tab
    └──requires──> Trade History Tracking (new)

Quest Reward Selection
    └──requires──> Quest Completion Flow (already implemented)
    └──requires──> Item Selection UI (new)

Quest Markers (World)
    └──requires──> NPC Quest State Sync (already implemented)
    └──requires──> Sprite Overlay System (new)

Quest Chain Visualization
    └──requires──> Quest Chain Definitions (already implemented)
    └──requires──> Graph UI Component (new)

Smart Quest Tracker Sorting
    └──requires──> Quest Objective Tracking (dependency)
    └──requires──> Player Position Tracking (already implemented)

ESC Key Handling (Fixed)
    └──requires──> Event Propagation Management (bug fix)
```

### Dependency Notes

- **Quest Objective Tracking requires Quest System:** HUD tracker displays active quest data. Quest system already exists (useQuestStore), just need HUD component.
- **Buyback Tab requires Trade History:** Need to track last N sold items per trading session. Currently no trade history storage.
- **Quest Reward Selection requires Completion Flow:** Already have quest:complete socket event. Need to add reward selection step before completion.
- **ESC Key Handling requires Propagation Fix:** TradingPanel uses stopPropagation, but both modals listen to ESC. Need event hierarchy fix.
- **Smart Tracker Sorting enhances Quest Tracking:** Auto-sorting is bonus feature built on top of basic tracker.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed for polished feel.

- [x] Unified NPC window with tabs (dialogue/trade/quests) — Already implemented, just has rendering bug
- [x] ESC closes windows (fixed propagation) — Already implemented, needs bug fix
- [x] Item comparison tooltips — Already implemented in TradingPanel
- [x] Draggable panels — Already implemented via useDraggablePanel
- [ ] Quest objective HUD tracker — Expected by all MMO players, table stakes
- [ ] Quest markers on NPC sprites (! and ?) — Table stakes for quest system
- [ ] Visual quest completion feedback — Reward moment needs celebration
- [ ] Quest reward selection UI — Some quests have multiple rewards, need choice

### Add After Validation (v1.x)

Features to add once core is working and validated with players.

- [ ] Vendor buyback tab — Add after confirming trading frequency (if players rarely sell by accident, lower priority)
- [ ] Quest categories/grouping in log — Add when quest count grows (>10 active quests makes flat list unwieldy)
- [ ] Keyboard shortcuts for quest accept/turn-in — Add after observing player behavior (if players use keyboard heavily)
- [ ] Smart quest tracker sorting — Add if players report "can't find quest area"
- [ ] Shop stock visualization — Add if stock management becomes gameplay-relevant

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Immersive dialogue presentation — Nice polish but requires content restructuring
- [ ] Faction-specific UI theming — Visual polish, not gameplay-critical
- [ ] Quest chain visualization — Add when quest chains get complex (5+ quests)
- [ ] Dynamic quest recommendations — AI/algorithm feature, defer until quest pool is large
- [ ] Contextual NPC dialogue system — Already have basic conditions, expand when dialogue volume justifies it

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| ESC key fix (propagation bug) | HIGH | LOW | P1 |
| Quest objective HUD tracker | HIGH | MEDIUM | P1 |
| Quest markers on NPCs (world) | HIGH | MEDIUM | P1 |
| Quest completion feedback | MEDIUM | LOW | P1 |
| Quest reward selection | HIGH | MEDIUM | P1 |
| Keyboard shortcuts (accept/turn-in) | MEDIUM | LOW | P2 |
| Vendor buyback tab | MEDIUM | MEDIUM | P2 |
| Quest categories/grouping | MEDIUM | LOW | P2 |
| Shop stock visualization | LOW | LOW | P2 |
| Smart tracker sorting | MEDIUM | MEDIUM | P2 |
| Immersive dialogue | MEDIUM | MEDIUM | P3 |
| Faction UI theming | LOW | LOW | P3 |
| Quest chain visualization | LOW | MEDIUM | P3 |
| Dynamic recommendations | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch — table stakes features
- P2: Should have, add when possible — polish and quality-of-life
- P3: Nice to have, future consideration — differentiators and advanced features

## Competitor Feature Analysis

| Feature | World of Warcraft | Final Fantasy XIV | Our Approach |
|---------|-------------------|-------------------|--------------|
| NPC Interaction | Unified gossip window with inline options. Quest/vendor as dialogue choices. | Separate quest and shop windows. More modal-heavy. | WoW approach: tabbed unified window. Already implemented, just needs bug fix. |
| Quest Tracking | HUD tracker with collapsible objectives, auto-sorts by proximity. Can track 25 quests, show 5 on HUD. | MSQ tracker always visible, side quests in separate tracker. Two-tier system. | WoW approach: single tracker, player chooses what to track. Simpler for 2D MMO. |
| Quest Markers | Yellow ! (available), blue ! (repeatable), yellow ? (turn-in), gray ! (not eligible). Overhead on NPCs. | Giant glowing markers, minimap icons. Very visible. | WoW approach: subtle overhead markers. Already have ! and ? in modal, need world sprites. |
| Vendor Buyback | Last 12 items, cleared on logout/zone. Separate tab. | Last ~20 items in Buyback tab, persists across sessions (longer). | WoW approach initially. Simpler session-based clearing. |
| Quest Rewards | Modal with reward items shown, click to select before accepting completion. | Similar modal, but includes preview of next quest in chain. | WoW approach: simple selection modal. Preview chain later (P3 feature). |
| Tooltips | Shift-hover shows equipped comparison. Green/red stat differences. Mod support for extended info. | Always-on comparison for equippable items. No shift required. More aggressive. | WoW approach: requires shift/hover intent. Less visual clutter. Already implemented. |
| UI Customization | Full drag/resize/scaling. Save layouts per character. Extensive addon API. | Preset UI layouts. HUD Layout Editor. Less free-form than WoW. | WoW approach for panels (already have dragging). Skip addon API for now. |

## Sources

### NPC Interaction Patterns
- [Dialogue UI - CurseForge](https://www.curseforge.com/wow/addons/dialogueui) - WoW addon for immersive dialogue
- [Conversation - CurseForge](https://www.curseforge.com/wow/addons/conversation) - Natural dialogue-styled NPC interactions
- [Immersion Addon Features](https://www.mmorpg.com/guides/beginners-guide-and-shortcuts-2000116469) - Paragraph-by-paragraph quest text presentation

### Quest System UI
- [Quest Log - Wowpedia](https://wowpedia.fandom.com/wiki/Quest_Log) - Official WoW quest log structure and behavior
- [User Interface and Quest Updates - MMO-Champion](https://www.mmo-champion.com/content/12469-User-Interface-and-Quest-Updates-in-The-War-Within) - WoW quest UI improvements in 2026
- [QuestCompleteSound - CurseForge](https://www.curseforge.com/wow/addons/questcompletesound) - Audio/visual completion feedback addon

### Trading/Vendor UI
- [Vendor - Wowpedia](https://wowpedia.fandom.com/wiki/Vendor) - WoW vendor mechanics and buyback
- [Vendor Buyback Bug - Wowhead Forums](https://www.wowhead.com/forums/topic/vendor-buyback-tab-not-clearing-155992) - Buyback persistence rules
- [EquipCompare - WoWInterface](https://www.wowinterface.com/downloads/info4392-EquipCompare.html) - Item comparison tooltip addon

### UI Polish Standards
- [MMORPG UI Standards - GamingSF](https://gamingsf.wordpress.com/2018/01/19/mmorpg-user-interface-standards/) - Customizability expectations for MMO UI
- [MMO UI Layout Discussion - MMORPG.com](https://forums.mmorpg.com/discussion/426405/ui-layout-what-makes-an-awesome-ui) - Community expectations for UI quality
- [MMO Keybinding Best Practices - Taugrim](https://taugrim.com/2011/04/07/guide-to-strafing-movement-and-keybindings/) - Keyboard shortcut conventions
- [Evolution of UX/UI in MMORPGs - Medium](https://medium.com/design-bootcamp/the-evolution-of-ux-ui-in-mmorpgs-mechanisms-and-emotional-impacts-f4562fd91a15) - Information hierarchy and cognitive load

---
*Feature research for: MMO NPC Interaction UI Polish*
*Researched: 2026-02-22*
