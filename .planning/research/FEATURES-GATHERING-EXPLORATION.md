# Feature Landscape

**Domain:** Gathering, Exploration, and Combat Balancing Systems for 2D Sci-Fi Survival MMO
**Researched:** 2026-02-23

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Basic Gathering** | All survival MMOs require resource collection as core loop | Low | Already implemented - tool interaction with entities (plants, minerals, artifacts) |
| **Weighted Loot Tables** | Players expect randomized drops with rarity tiers | Low | Already implemented - rollLootTable with chance-based drops |
| **Entity Spawning** | Resources must replenish; world feels dead without spawns | Medium | Already implemented - fertility noise-based spawning |
| **Basic Combat** | Survival games require threats and defensive gameplay | Medium | Already implemented - abilities, damage calculation, aggro AI |
| **Quest Objectives** | Players expect structured goals (kill X, gather Y, explore Z) | Low | Already implemented - kill/gather/explore objectives |
| **Proficiency Progression** | Players expect to get better at gathering over time | Medium | Standard pattern: XP-per-harvest → level up → unlock tiers/bonuses |
| **Fog of War** | Exploration games universally use map reveal mechanics | Medium | Industry standard: gray unexplored → reveal on proximity |
| **POI Discovery** | Exploration requires discoverable landmarks | Medium | Expected pattern: approach trigger → reveal + minimap icon + achievement |
| **Gradual Combat TTK** | MMO combat is about strategy, not twitch reflexes; 4-8 hits expected | Medium | Requires HP/damage rebalancing to avoid one-shots |
| **Resource Node Tiers** | Better tools unlock better resources | Low | Already implemented - requiredTier on Mineral entities |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Timing Mini-Games for Gathering** | Skill expression beyond "click node, wait" - active engagement | High | QTE-style: moving indicator + success zones. Risk: becomes tedious if forced every time |
| **Risk/Reward Rare Spawns** | Rare nodes in danger zones create meaningful player decisions | Medium | Proven pattern: ARC Raiders (loud alarm on valuable loot), Albion (rare nodes in PvP zones) |
| **Gathering Proficiency Specialization** | Allows players to specialize in specific gathering types | Medium | Witchspire pattern: unlock skills like logging/mining, specialize in subtrees |
| **Zone Mastery System** | Unlocks unique abilities/traversal per zone explored | High | Guild Wars 2 pattern: mastery points from exploration → unlock hang gliding, shortcuts |
| **Lore Fragment Collections** | Narrative delivered through optional discovery | Medium | Warframe pattern: 3 fragments unlock codex page + voice narration + cosmetic reward |
| **Rare Spawn Discovery** | Spawns that appear only in specific conditions (time, weather, events) | Medium | Creates "treasure hunt" gameplay; requires spawn condition system |
| **Proficiency Yield Bonuses** | Higher gathering skill = more resources per node | Low | New World pattern: gathering luck increases rare drops + total yield |
| **Critical Harvest Mechanic** | Random chance for bonus yield on gather | Low | Adds excitement to repetitive gathering without being intrusive |
| **Entity Interaction Variety** | Different entity types require different interaction patterns | Medium | Plants = harvest timing, Minerals = durability/strikes, Artifacts = one-time puzzle |
| **Zone Completion Rewards** | Incentivize thorough exploration with tangible rewards | Medium | FFXIV pattern: planet unlocks gated by completing previous zone |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Forced Mini-Games Every Harvest** | Players find repetitive QTEs frustrating after novelty wears off | Make mini-games optional: auto-harvest (slower/lower yield) vs manual (faster/bonus) |
| **Pure Time-Gating on Proficiency** | Players hate "wait X hours to gather" mechanics | Use XP-based progression: active gathering earns proficiency |
| **One-Shot Combat Mechanics** | User explicitly wants gradual fights (4-8 hits to kill); one-shots feel cheap | Balance HP pools and damage to ensure multi-turn engagements |
| **Mandatory Group Content for Exploration** | Solo explorers get frustrated when discovery requires party | Offer group bonuses, but don't block solo progress |
| **Burden of Knowledge Mini-Games** | Complex mechanics that only work if victim understands them | Keep gathering interactions intuitive: visual feedback, clear timing windows |
| **Gather-The-Rabbits Events** | Arbitrary mini-games unrelated to class abilities feel tacked on | Integrate existing combat/movement abilities into gathering (e.g., use tool special ability) |
| **Inventory Tetris for Gathering** | Players hate complex bag management interrupting flow | Use simple stack limits; auto-consolidate; backpack upgrades increase capacity |
| **Hidden Requirements for POIs** | Players frustrated when they can't figure out how to unlock areas | Always provide hints: scout NPCs, quest breadcrumbs, visible-but-gated landmarks |
| **Exponential Proficiency Grind** | Late-game progression that takes 100x longer than early levels | Use horizontal progression: higher tiers unlock variety, not just +1% yield |
| **RNG-Only Rare Spawns** | Pure luck frustrates completionists | Use deterministic patterns: spawn conditions visible (e.g., "appears during fog weather") |

## Feature Dependencies

```
Gathering System:
  Basic Gathering (existing)
    → Proficiency Progression (track XP per entity type)
      → Proficiency Specialization (skill trees per resource type)
      → Yield Bonuses (proficiency increases rewards)
    → Timing Mini-Games (optional engagement layer)
    → Critical Harvest (random bonus yield)

Exploration System:
  Fog of War (map reveal on proximity)
    → POI Discovery (landmarks unlock map icons + achievements)
      → Zone Mastery (accumulate points from discoveries)
        → Mastery Unlocks (abilities/traversal/bonuses per zone)
    → Lore Fragments (collectibles scattered in zones)
      → Fragment Collections (codex pages + rewards)

Combat Balancing:
  Existing Combat (abilities, damage, aggro)
    → HP/Damage Rebalancing (ensure 4-8 hits TTK)
    → No One-Shot Mechanics (cap damage spikes)
    → Resource Management Combat (longer fights = strategic ability use)

Risk/Reward Systems:
  Existing Entity Spawning (fertility noise)
    → Rare Spawn Conditions (time, weather, events)
      → Danger Zone Spawns (better loot in hostile areas)
    → Spawn Alerts (visual/audio cues for rare nodes)
```

## MVP Recommendation

Prioritize:
1. **Proficiency Progression** - Core loop foundation; players need sense of growth
2. **Fog of War** - Exploration feels unrewarding without discovery mechanics
3. **POI Discovery** - Gives exploration concrete goals
4. **Combat TTK Rebalancing** - User requirement; affects all combat systems
5. **Basic Lore Fragments** - Low-hanging narrative integration

Defer:
- **Timing Mini-Games** - High complexity; test player appetite with prototype first
- **Zone Mastery System** - Requires extensive content creation per zone
- **Proficiency Specialization** - Nice-to-have after basic progression works
- **Rare Spawn Conditions** - Advanced feature; basic spawning already works

### Phase 1: Foundation (Proficiency + Exploration)
Build proficiency XP tracking and fog of war reveal. These are independent systems that enhance existing gameplay without requiring deep integration.

**Rationale:** Players currently harvest entities but get no progression feedback. Fog of war is low-risk, high-impact (instant visual feedback on exploration).

### Phase 2: Discovery (POIs + Combat Balance)
Add POI discovery triggers and rebalance combat HP/damage values for gradual fights.

**Rationale:** POIs depend on fog of war existing. Combat balance is independent but critical for user satisfaction.

### Phase 3: Depth (Lore + Risk/Reward)
Implement lore fragment collection and rare spawn mechanics in danger zones.

**Rationale:** These build on exploration foundation and add narrative/economic depth without being blocking features.

## Complexity Assessment

| Feature Category | Overall Complexity | Blockers |
|------------------|-------------------|----------|
| Proficiency Progression | Medium | Requires character stat tracking, XP formula tuning |
| Fog of War | Medium | Client-side map state, server authority for discovery events |
| POI Discovery | Medium | Trigger colliders, achievement integration, quest system hooks |
| Lore Fragments | Low-Medium | Collectible entities (already have artifacts), codex UI |
| Combat Balancing | Low-Medium | Math rebalancing + testing; no new systems needed |
| Timing Mini-Games | High | New input system, client-server sync, balancing tedium vs reward |
| Zone Mastery | High | Point accumulation, unlock trees, new abilities per zone |
| Rare Spawn Conditions | Medium | Event system, spawn condition evaluation, alert UI |

## Dependencies on Existing Systems

| New Feature | Depends On | Integration Point |
|-------------|-----------|-------------------|
| Proficiency Progression | Entity interaction (existing) | Add XP reward to rollLootTable or post-harvest event |
| Fog of War | Player movement (existing) | Track visited coordinates per character; reveal radius on move |
| POI Discovery | Quest system (existing) | Trigger explore objectives on POI collision |
| Lore Fragments | Artifact entities (existing) | Extend artifact type with fragment collections |
| Combat Rebalancing | Combat system (existing) | Modify Creature.maxHealth and damage calculation formulas |
| Timing Mini-Games | Tool interaction (existing) | Replace instant harvest with timed input window |
| Zone Mastery | POI discovery | Accumulate mastery points from exploration achievements |
| Rare Spawns | Entity spawning (existing) | Add conditional spawn evaluation to fertility noise system |

## Sources

**Gathering Systems:**
- [Mini games for gathering resources? - MMORPG.com Forums](https://forums.mmorpg.com/discussion/229842/mini-games-for-gathering-resources)
- [Witchspire progression system - PC Games Insider](https://www.pcgamesinsider.biz/interviews-and-opinion/75547/designing-a-more-magical-survival-game-a-first-look-at-witchspire/)
- [Risk Versus Reward: Resource Gathering In MMORPGs - MMORPG.com](https://www.mmorpg.com/editorials/risk-versus-reward-resource-gathering-in-mmorpgs-2000119066)
- [Albion Online Gathering Guide 2025](https://albionfreemarket.com/articles/view/gathering-guide-for-beginners-in-albion-online-2025)
- [Albion Online Gathering Skills Wiki](https://wiki.albiononline.com/wiki/Gathering_Skills)

**Proficiency Systems:**
- [RLCraft Skills Wiki](https://rlcraft.wiki.gg/wiki/Skills)
- [Player Specialization and Skillpoint Scaling - ECO Forum](https://ecoforum.strangeloopgames.com/topic/2778/player-specialization-and-skillpoint-scaling/20)

**Exploration Systems:**
- [Corepunk fog of war mechanics - Massively Overpowered](https://massivelyop.com/2019/12/10/corepunk-is-a-new-top-down-dutch-game-with-all-the-mmorpg-trappings/)
- [Fog of War definition - Machinations.io](https://machinations.io/glossary/fog-of-war)
- [Guild Wars 2 Map Completion Wiki](https://wiki.guildwars2.com/wiki/Map_completion)
- [Guild Wars 2 Map Wiki](https://wiki.guildwars2.com/wiki/Map)

**POI Discovery:**
- [Point of Interest Recommendation pitfalls - arXiv](https://arxiv.org/html/2507.13725v1)
- [POI Data Accuracy 2026 - Xtract.io](https://xtract.io/blog/poi-data-accuracy-in-2026-crowdsourcing-vs-ai-vs-government/)

**Lore Collectibles:**
- [Warframe Isleweaver Lore Fragment Locations - GameRant](https://gamerant.com/warframe-all-isleweaver-lore-fragment-locations/)
- [Warframe Duviri Fragment Locations - Steam Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2968522746)

**Zone Mastery:**
- [Pantheon Spring 2026 Combat and Progression Update](https://www.pantheonmmo.com/news/spring-2026-combat-and-progression-update-overview/)
- [Pantheon Mastery System - Massively Overpowered](https://massivelyop.com/2025/12/18/pantheon-explains-its-incoming-mastery-system-and-how-it-will-differentiate-players-of-the-same-class/)
- [Guild Wars 2 Mastery System - Heart of Thorns](https://heartofthorns.guildwars2.com/game/mastery/)
- [Guild Wars 2 Mastery Wiki](https://wiki.guildwars2.com/wiki/Mastery)

**Combat Balancing:**
- [Pantheon Combat Revamp Spring 2026 - Massively Overpowered](https://massivelyop.com/2025/12/09/kickstarted-early-access-mmorpg-pantheon-outlines-its-big-combat-revamp-coming-spring-2026/)
- [Time to Kill and Action Combat MMOs - MMORPG.com Forums](https://forums.mmorpg.com/discussion/498765/time-to-kill-and-action-combat-mmos-where-the-balance-here)

**Loot Systems:**
- [Weighted Random System for Loot Drops - Outscal](https://outscal.com/blog/unity-weighted-random-system-loot-drops)
- [How to: Weighted Random Selections - LootLocker](https://lootlocker.com/blog/random-with-weights)
- [Loot Drop Best Practices - Game Developer](https://www.gamedeveloper.com/design/loot-drop-best-practices)

**Risk/Reward Mechanics:**
- [ARC Raiders Map Modifiers Guide - Boosting Ground](https://boosting-ground.com/arc-raiders/guides/beginner-guides/map-modifiers-conditions)
- [Escape from Tarkov Loot Guide 2025](https://lootcalc.com/guides/eft-loot-optimization-guide)

**Anti-Patterns:**
- [Common anti-patterns in MMORPG design - Game Developer](https://www.gamedeveloper.com/design/common-anti-patterns-in-mmorpg-design)
- [Zileas' List of Game Design Anti-Patterns - League of Legends](http://forums.na.leagueoflegends.com/board/showthread.php?t=293417)
- [Ultimate Guide to Game Design Anti-patterns - Number Analytics](https://www.numberanalytics.com/blog/ultimate-guide-to-game-design-anti-patterns)

**Gathering Luck/Rare Nodes:**
- [New World Harvesting Luck Guide - TechRaptor](https://techraptor.net/gaming/guides/new-world-harvesting-luck-guide)
- [How Luck Works in New World - Studio Loot](https://www.studioloot.com/new-world/articles/how-luck-works-in-new-world/)
- [New World Mining Luck Guide - TechRaptor](https://techraptor.net/gaming/guides/new-world-mining-luck-guide)

**QTE/Timing Mechanics:**
- [Quick Time Event - Wikipedia](https://en.wikipedia.org/wiki/Quick_time_event)
- [QTE Time Hits Minigame - RPG Maker Blog](https://www.rpgmakerweb.com/blog/eventing-a-qte-time-hits-minigame)
