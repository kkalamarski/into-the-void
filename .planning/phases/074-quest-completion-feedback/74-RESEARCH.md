# Phase 74: Quest Completion Feedback - Research

**Researched:** 2026-02-23
**Domain:** UI notification systems, animation, audio feedback
**Confidence:** HIGH

## Summary

Quest completion feedback requires a centrally-positioned banner with GPU-accelerated animations, queued notification management to prevent overlaps, and HTML5 Audio for notification sounds. The existing codebase already has strong patterns: `QuestCompleteModal` provides the visual structure, `alertStore` demonstrates queue management, and design tokens in `global.css` standardize animations. The primary gaps are: (1) audio integration (no existing audio system), (2) queue management for concurrent quest completions, and (3) click-to-dismiss functionality.

Phase 74 builds on existing modal infrastructure (QuestCompleteModal from earlier phases) and extends it with audio feedback and improved queue handling. The alert notification system (`alertStore`, `AlertNotification.tsx`) provides a proven pattern for multiple concurrent notifications with auto-dismiss and stacking behavior.

**Primary recommendation:** Extend `questStore` with a completion notification queue (array instead of single `completedQuestReward`), add HTML5 Audio playback triggered on `quest:completed` socket event, implement click-to-dismiss on banner with `pointer-events: auto`, and use GPU-accelerated `transform: translateY()` for slide-in animations.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 4.x (in use) | Quest completion queue state | Already used for questStore, alertStore - proven pattern for notification queues |
| HTML5 Audio | Native | Notification sound playback | Built-in browser API, no dependencies, autoplay-policy compliant |
| CSS Animations | Native | Banner slide-in/fade-out | GPU-accelerated transforms, no library overhead, existing design token system |
| React hooks | Native | Auto-dismiss timers, cleanup | `useEffect` with `setTimeout` - existing pattern in LevelUpNotification, AlertNotification |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS `will-change` | Native | Animation performance hint | Apply just before animation, remove after completion to prevent GPU memory bloat |
| localStorage | Native | Audio preference (muted/volume) | Optional - persist user audio settings across sessions |
| AnimationFrame API | Native | Queue position recalculation | Optional - if multiple banners need smooth stacking animations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| HTML5 Audio | Web Audio API | Web Audio provides advanced features (filters, spatial audio, dynamic synthesis) but adds complexity for simple notification sounds - overkill for this use case |
| Zustand queue array | react-toastify library | External libraries (Sonner, Notistack, React Hot Toast) handle queue/stack automatically but add bundle size (5KB+) - current codebase uses Zustand patterns consistently |
| CSS Animations | Framer Motion | Animation library adds ~50KB bundle weight - CSS transforms are GPU-accelerated and sufficient for slide-in/fade-out |

**Installation:**
```bash
# No new dependencies required - uses existing stack
# Optional: audio asset sources (free CC0)
# Kenney UI Audio: https://kenney.nl/assets/ui-audio
# Mixkit: https://mixkit.co/free-sound-effects/notification/
# ZapSplat: https://www.zapsplat.com/sound-effect-category/alerts-and-prompts/
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── store/
│   └── questStore.ts               # MODIFY: array queue instead of single reward
├── ui/
│   └── modals/
│       ├── QuestCompleteModal.tsx  # MODIFY: queue support + click dismiss
│       └── QuestCompleteModal.css  # MODIFY: GPU-accelerated animations
├── assets/
│   └── audio/
│       └── quest-complete.mp3      # NEW: notification sound effect
└── utils/
    └── audio.ts                    # NEW: audio playback helper (optional)
```

### Pattern 1: Queue Management with Array State
**What:** Replace single `completedQuestReward` with array queue, render all with stacked positioning
**When to use:** Multiple quest completions can occur within 5-second auto-dismiss window
**Example:**
```typescript
// Source: Existing alertStore pattern (apps/web/src/store/alertStore.ts)
interface QuestState {
  completedRewards: QuestReward[];  // Changed from single to array
  addCompletedReward: (reward: QuestReward) => void;
  removeCompletedReward: (questId: string) => void;
}

export const useQuestStore = create<QuestState>((set, get) => ({
  completedRewards: [],

  addCompletedReward: (reward) => {
    set((state) => ({
      // Keep max 3 active banners, FIFO queue
      completedRewards: [...state.completedRewards.slice(-2), reward]
    }));

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      get().removeCompletedReward(reward.questId);
    }, 5000);
  },

  removeCompletedReward: (questId) => {
    set((state) => ({
      completedRewards: state.completedRewards.filter(r => r.questId !== questId)
    }));
  }
}));
```

### Pattern 2: Click-to-Dismiss with Pointer Events
**What:** Enable manual dismissal while maintaining auto-dismiss timer
**When to use:** User wants to clear banner before 5-second timeout
**Example:**
```typescript
// Source: React useState + clearTimeout pattern
const QuestCompleteModal: React.FC = () => {
  const completedRewards = useQuestStore(state => state.completedRewards);
  const removeCompletedReward = useQuestStore(state => state.removeCompletedReward);

  const handleDismiss = (questId: string) => {
    removeCompletedReward(questId);
  };

  return (
    <div className="quest-complete-container">
      {completedRewards.map((reward, index) => (
        <div
          key={reward.questId}
          className="quest-complete-modal"
          onClick={() => handleDismiss(reward.questId)}
          style={{ top: `${20 + index * 10}%` }}  // Stacked positioning
        >
          {/* Banner content */}
        </div>
      ))}
    </div>
  );
};
```

### Pattern 3: HTML5 Audio Playback with Autoplay Policy Compliance
**What:** Play notification sound on quest completion, respect browser autoplay policies
**When to use:** User has interacted with page (game is active), audio not muted
**Example:**
```typescript
// Source: MDN Web Audio API best practices
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
const playQuestCompleteSound = () => {
  const audio = new Audio('/assets/audio/quest-complete.mp3');
  audio.volume = 0.3;  // Non-intrusive volume

  // Autoplay policy: only plays if user has interacted
  audio.play().catch(err => {
    // Silently fail if autoplay blocked - don't disrupt UX
    console.debug('[Audio] Quest complete sound blocked by autoplay policy');
  });
};

// In questStore socket handler:
gameSocket.on('quest:completed', (data) => {
  const store = useQuestStore.getState();
  store.addCompletedReward(data);
  playQuestCompleteSound();  // Audio cue
});
```

### Pattern 4: GPU-Accelerated Slide-In Animation
**What:** Use `transform: translateY()` with `will-change` for smooth 60fps animation
**When to use:** Banner entrance/exit animations
**Example:**
```css
/* Source: CSS GPU Acceleration best practices 2026
   https://www.lexo.ch/blog/2025/01/boost-css-performance-with-will-change-and-transform-translate3d-why-gpu-acceleration-matters/ */
.quest-complete-modal {
  /* Enable pointer events for click-to-dismiss */
  pointer-events: auto;
  cursor: pointer;

  /* GPU-accelerated entrance animation */
  animation: slideInBounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  will-change: transform, opacity;
}

@keyframes slideInBounce {
  0% {
    transform: translateY(-100px) scale(0.9);
    opacity: 0;
  }
  60% {
    transform: translateY(10px) scale(1.02);
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

/* Remove will-change after animation completes to free GPU memory */
.quest-complete-modal.animate-complete {
  will-change: auto;
}
```

### Anti-Patterns to Avoid
- **Setting `will-change` permanently:** Causes GPU memory bloat - only apply during animation lifecycle
- **Using `left/top` for animation:** Triggers layout recalculation - use `transform: translate()` instead
- **Hard-coding z-index values:** Use existing z-index hierarchy - quest banners should be below death screen (1100) but above panels (100)
- **Calling `audio.play()` without `.catch()`:** Browser autoplay policies will throw errors in strict mode - always handle promise rejection

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Notification queue | Custom linked list or imperative queue logic | Zustand array slice with `.slice(-N)` pattern | Zustand reactive updates trigger re-renders automatically, existing alertStore proves pattern works |
| Audio playback manager | Custom audio pool, preloading system | HTML5 `new Audio()` per play | For single notification sounds, instantiation overhead is negligible (~1ms), complex pooling adds bugs |
| Animation frame loops | `requestAnimationFrame` for slide-in | CSS keyframe animations with `animation` property | Browser optimizes CSS animations automatically, RAF requires manual coordination |
| Timer cleanup | Manual `clearTimeout` tracking across component lifecycle | `useEffect` return cleanup function | React hooks handle cleanup on unmount automatically, prevents memory leaks |

**Key insight:** Modern browsers optimize CSS animations and HTML5 audio for common use cases (slide-in banners, notification sounds). Custom implementations (RAF loops, audio pools, manual queue management) add complexity without measurable benefit for this scale (1-3 concurrent banners, single sound effect).

## Common Pitfalls

### Pitfall 1: Queue Overflow with Rapid Completions
**What goes wrong:** Player completes 5+ quests simultaneously (turn-in multiple ready quests), banners stack vertically off-screen
**Why it happens:** No queue limit enforcement, all completions render immediately
**How to avoid:** Limit visible queue to 3 banners with `.slice(-2)` pattern (keeps last 3), excess completions wait in queue (FIFO)
**Warning signs:** CSS `top` positioning exceeds viewport height, banners rendering outside visible area

### Pitfall 2: Memory Leak from Uncancelled Timers
**What goes wrong:** Component unmounts (player disconnects, navigates away) before 5-second auto-dismiss, `setTimeout` callback tries to update unmounted component
**Why it happens:** `setTimeout` in `addCompletedReward` not cancelled on unmount
**How to avoid:** Store timer IDs in component state, cancel in `useEffect` cleanup - OR use store-level timer tracking
**Warning signs:** React warning "Can't perform state update on unmounted component", memory profiler shows dangling timers

### Pitfall 3: Audio Not Playing (Autoplay Policy Block)
**What goes wrong:** Quest complete sound doesn't play on first completion after page load
**Why it happens:** Browser autoplay policy requires user interaction before unmuted audio, WebSocket event doesn't count as interaction
**How to avoid:** Wrap `audio.play()` in `.catch()` to silently fail, OR require one click on game canvas before audio enabled
**Warning signs:** Console errors "play() request was interrupted", audio works after first manual click but not on initial load

### Pitfall 4: Banner Blocks Critical UI During Combat
**What goes wrong:** Quest completion banner appears centered during combat, blocks enemy health bar or ability cooldowns
**Why it happens:** Fixed central positioning (50% viewport) overlaps with HUD elements
**How to avoid:** Position banner at 30-35% viewport height instead of 50%, check z-index doesn't exceed HUD (100)
**Warning signs:** User reports can't see enemy HP during quest completion, banner blocks action bar visibility

### Pitfall 5: Animation Jank on Low-End Devices
**What goes wrong:** Banner slide-in stutters or drops frames on integrated GPUs
**Why it happens:** Animating non-GPU properties (margin, top, left), too many concurrent animations, `will-change` overuse
**How to avoid:** Animate only `transform` and `opacity`, remove `will-change` after animation completes, limit concurrent banners to 3
**Warning signs:** Chrome DevTools Performance tab shows layout thrashing, FPS drops below 30 during animation

### Pitfall 6: Race Condition with Socket Event + Store Update
**What goes wrong:** Audio plays but banner doesn't render, or banner shows stale data
**Why it happens:** `gameSocket.on('quest:completed')` handler updates store asynchronously, audio plays before React re-render
**How to avoid:** Call audio playback AFTER `addCompletedReward()` in same synchronous handler, rely on Zustand's synchronous state update
**Warning signs:** Intermittent missing banners, audio plays 100ms before banner appears

### Pitfall 7: Click-Through to Game Canvas Dismisses Banner Accidentally
**What goes wrong:** User clicks banner to dismiss, click propagates through to game canvas, triggers unwanted movement/action
**Why it happens:** No `event.stopPropagation()` on banner click handler
**How to avoid:** Call `e.stopPropagation()` in `onClick` handler to prevent event bubbling
**Warning signs:** Banner dismisses correctly but character moves unexpectedly, player reports "clicking notification makes me run away"

## Code Examples

Verified patterns from official sources and existing codebase:

### Queue-Based Store Pattern (from alertStore)
```typescript
// Source: apps/web/src/store/alertStore.ts (verified working)
interface QuestState {
  completedRewards: QuestReward[];  // Array queue
  addCompletedReward: (reward: QuestReward) => void;
  removeCompletedReward: (questId: string) => void;
}

export const useQuestStore = create<QuestState>((set, get) => ({
  completedRewards: [],

  addCompletedReward: (reward) => {
    set((state) => ({
      completedRewards: [...state.completedRewards.slice(-2), reward]  // Keep max 3
    }));

    setTimeout(() => {
      get().removeCompletedReward(reward.questId);
    }, 5000);
  },

  removeCompletedReward: (questId) => {
    set((state) => ({
      completedRewards: state.completedRewards.filter(r => r.questId !== questId)
    }));
  }
}));
```

### HTML5 Audio Playback with Error Handling
```typescript
// Source: MDN Web Audio API Best Practices
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
const playQuestCompleteSound = () => {
  const audio = new Audio('/assets/audio/quest-complete.mp3');
  audio.volume = 0.3;  // Non-intrusive (SUCCESS CRITERIA: non-intrusive notification sound)

  audio.play().catch(err => {
    // Browser autoplay policy blocked - fail silently
    console.debug('[Audio] Autoplay blocked:', err);
  });
};

// Socket handler integration
gameSocket.on('quest:completed', (data) => {
  const store = useQuestStore.getState();
  store.addCompletedReward(data);
  playQuestCompleteSound();  // Audio cue after state update
});
```

### GPU-Accelerated CSS Animation
```css
/* Source: CSS GPU Acceleration Guide 2026
   https://www.lexo.ch/blog/2025/01/boost-css-performance-with-will-change-and-transform-translate3d-why-gpu-acceleration-matters/ */
.quest-complete-modal {
  pointer-events: auto;  /* Enable click-to-dismiss */
  cursor: pointer;

  /* GPU-accelerated properties only */
  animation: slideInBounce var(--duration-slow) var(--ease-out) forwards;
  will-change: transform, opacity;
}

@keyframes slideInBounce {
  0% {
    transform: translateY(-100px) scale(0.95);
    opacity: 0;
  }
  60% {
    transform: translateY(8px) scale(1.02);
    opacity: 1;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

/* Remove will-change after animation to free GPU memory */
.quest-complete-modal.entered {
  will-change: auto;
}

/* Exit animation for dismiss */
@keyframes fadeOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.9);
  }
}
```

### Click-to-Dismiss with Event Stopping
```typescript
// Source: React event handling best practices
const QuestCompleteModal: React.FC = () => {
  const completedRewards = useQuestStore(state => state.completedRewards);
  const removeCompletedReward = useQuestStore(state => state.removeCompletedReward);

  const handleDismiss = (e: React.MouseEvent, questId: string) => {
    e.stopPropagation();  // Prevent click from reaching game canvas
    removeCompletedReward(questId);
  };

  return (
    <div className="quest-complete-container">
      {completedRewards.map((reward, index) => (
        <div
          key={reward.questId}
          className="quest-complete-modal"
          onClick={(e) => handleDismiss(e, reward.questId)}
          style={{
            top: `${30 + index * 12}%`,  // Stacked, avoid blocking HUD
            zIndex: 200 + index  // Each banner slightly higher
          }}
        >
          <div className="quest-complete-banner">Quest Complete!</div>
          <div className="quest-complete-name">{reward.displayName}</div>
          {/* Rewards display */}
        </div>
      ))}
    </div>
  );
};
```

### useEffect Timer Cleanup Pattern
```typescript
// Source: apps/web/src/components/LevelUpNotification.tsx (verified working)
export const QuestCompleteModal: React.FC = () => {
  const completedRewards = useQuestStore(state => state.completedRewards);
  const clearCompletedReward = useQuestStore(state => state.removeCompletedReward);

  // Alternative: component-level auto-dismiss with cleanup
  useEffect(() => {
    if (completedRewards.length === 0) return;

    const timers = completedRewards.map(reward =>
      setTimeout(() => clearCompletedReward(reward.questId), 5000)
    );

    // Cleanup: cancel all timers on unmount or reward change
    return () => timers.forEach(clearTimeout);
  }, [completedRewards, clearCompletedReward]);

  // ... render
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ScriptProcessorNode (Web Audio) | AudioWorklet API | 2017-2020 | ScriptProcessorNode deprecated - runs on main thread causing audio glitches. AudioWorklet runs on audio thread. For simple playback, HTML5 Audio sufficient. |
| CSS `margin`/`top` animation | CSS `transform` animation | 2014-2016 | `transform` triggers GPU compositing layer, 60fps smooth. `margin`/`top` triggers layout recalculation, causes jank. |
| Global notification library | Inline Zustand queue | 2023-2026 | Modern apps prefer minimal dependencies. Zustand + custom queue = 1KB vs react-toastify 5KB+. Existing codebase uses Zustand consistently. |
| Single notification state | Array queue with FIFO | 2020-2026 | Array queues handle concurrent notifications naturally. `.slice(-N)` pattern prevents overflow. Zustand reactive updates handle rendering. |
| Manual `will-change` management | Temporary `will-change` lifecycle | 2024-2026 | Permanent `will-change` causes GPU memory bloat. Apply before animation, remove after completes. |

**Deprecated/outdated:**
- **React `componentWillMount` for audio preload:** Deprecated in React 16.3 - use `useEffect` with empty deps
- **`<audio>` element with refs:** Imperative, harder to cleanup - use `new Audio()` for one-off sounds
- **jQuery animation libraries:** Dead in 2026 - CSS animations + React state is standard
- **Flash audio players:** Dead since 2020 - HTML5 Audio has 99%+ browser support

## Open Questions

1. **What audio format to use (MP3 vs OGG vs WEBM)?**
   - What we know: MP3 has universal support (99%+ browsers), OGG smaller file size but worse mobile support
   - What's unclear: Does target audience include legacy mobile browsers (iOS <9)?
   - Recommendation: Use MP3 for compatibility, keep file <50KB (1-2 second sound effect)

2. **Should audio be configurable (volume slider, mute toggle)?**
   - What we know: No existing audio settings UI in codebase, localStorage used for quest tracker state
   - What's unclear: User expectation for audio controls in this game
   - Recommendation: Start with fixed 0.3 volume, add settings panel in later phase if users request it

3. **How to handle banner overflow on small screens (mobile)?**
   - What we know: Game is 2D MMO (likely desktop-first), current HUD uses fixed positioning
   - What's unclear: Mobile support priority, viewport sizes to support
   - Recommendation: Test at 1024x768 minimum, reduce banner size at <1280px viewport width with media query

4. **Should multiple banners stack vertically or queue (one at a time)?**
   - What we know: AlertNotification uses vertical stacking (allows 5), success criteria says "queue properly without overlapping"
   - What's unclear: "Queue" means wait in line OR stack without overlap?
   - Recommendation: Stack vertically (like AlertNotification) with 3 max visible, interpret "queue properly" as "manage multiple without visual bugs"

## Sources

### Primary (HIGH confidence)
- **Existing codebase:**
  - `apps/web/src/store/alertStore.ts` - Queue pattern with auto-dismiss
  - `apps/web/src/store/questStore.ts` - Quest reward state structure
  - `apps/web/src/components/LevelUpNotification.tsx` - Auto-dismiss timer + useEffect cleanup
  - `apps/web/src/ui/modals/QuestCompleteModal.tsx` - Banner structure and styling
  - `apps/web/src/styles/global.css` - Design tokens (--duration-*, --ease-*, z-index hierarchy)
  - z-index hierarchy: Tooltips (2000) > AlertNotification (1200) > DeathScreen (1100) > LoadingOverlay (1000) > LevelUpNotification (500) > QuestCompleteModal (200) > Panels (100) > QuestTracker (50)

- **MDN Web Audio API Best Practices:**
  - [Web Audio API best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) - Autoplay policies, AudioWorklet vs HTML5 Audio

- **MDN CSS Animations:**
  - [Using CSS animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Animations/Using) - Keyframes, animation property, performance

### Secondary (MEDIUM confidence)
- **CSS GPU Acceleration Guide 2026:**
  - [CSS GPU Acceleration: will-change & translate3d Guide](https://www.lexo.ch/blog/2025/01/boost-css-performance-with-will-change-and-transform-translate3d-why-gpu-acceleration-matters/) - will-change lifecycle, transform performance

- **React Notification Libraries 2026:**
  - [Top 9 React notification libraries in 2026 | Knock](https://knock.app/blog/the-top-notification-libraries-for-react) - Sonner, Notistack, React Hot Toast comparison

- **Notification Pattern Design Systems:**
  - [Carbon Design System - Notifications](https://carbondesignsystem.com/patterns/notification-pattern/) - Queue vs stack behavior, auto-dismiss patterns
  - [Ant Design - Notification](https://ant.design/components/notification/) - Duration defaults (4.5s), stacking behavior

- **Game UI Design Best Practices:**
  - [Game UI: design principles, best practices, and examples](https://www.justinmind.com/ui-design/game) - Central positioning for critical info, corner placement for HUD
  - [12 Principles of Using Banners in Your UI UX Design](https://www.uinkits.com/blog-post/12-principles-of-using-banners-in-your-ui-ux-design) - Banner positioning, visual hierarchy

### Tertiary (LOW confidence - use for inspiration, verify before implementing)
- **Free Audio Resources (CC0):**
  - [Kenney UI Audio](https://kenney.nl/assets/ui-audio) - 50 UI sound effects, CC0
  - [Mixkit Notification Sounds](https://mixkit.co/free-sound-effects/notification/) - 36 notification sounds, royalty-free
  - [ZapSplat UI Alerts](https://www.zapsplat.com/sound-effect-category/alerts-and-prompts/) - 160,000+ sounds, CC0 available

- **Animation Examples:**
  - [Animate.css](https://animate.style/) - Ready-to-use bounce/slide animations
  - [20 CSS Notifications](https://freefrontend.com/css-notifications/) - CodePen examples of notification animations

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zustand, HTML5 Audio, CSS animations all verified in existing codebase or MDN docs
- Architecture: HIGH - Patterns extracted from working code (alertStore, LevelUpNotification) and official docs
- Pitfalls: HIGH - Based on known browser autoplay policies, React lifecycle, CSS performance research from authoritative sources
- Audio implementation: MEDIUM - No existing audio in codebase, relying on MDN docs + external research
- Queue overflow handling: MEDIUM - Success criteria ambiguous ("queue properly"), using alertStore as precedent

**Research date:** 2026-02-23
**Valid until:** 30 days (stable domain - notification patterns, CSS animations, HTML5 audio APIs don't change rapidly)
