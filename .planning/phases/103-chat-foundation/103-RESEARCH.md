# Phase 103: Chat Foundation - Research

**Researched:** 2026-02-26
**Domain:** Socket.IO chat dispatch, server-side message validation, rate limiting, Phaser keyboard isolation
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Chat messages are delivered from server to client (fix socket dispatch bug) | No `gameSocket.on('chat:message')` listener exists anywhere in the client; server dispatches correctly but no client handler receives it; confirmed by codebase audit |
| INFRA-02 | Chat input does not trigger Phaser keyboard movement while typing | `WorldScene.setKeyboardEnabled()` already exists; existing panels use `onFocus/onBlur` or `useEffect` mount/unmount pattern; ChatPanel input needs `onFocus`/`onBlur` handlers wired to this method |
| INFRA-03 | Chat messages are rate-limited (>5 messages in rapid succession silently dropped) | No rate limiting on `chat:send` currently; manual token-bucket pattern or `@nestjs/throttler` (not installed) both viable; manual bucket matches PlayerService movement throttle pattern already in codebase |
| INFRA-04 | Chat messages validated server-side (non-empty, max 280 chars) | No validation in current `handleChat`; `data.message` used raw; must trim + length-check before constructing or broadcasting the message |
</phase_requirements>

## Summary

Phase 103 is a pure infrastructure and bug-fix phase. The project research has already done deep analysis of the full v1.22 chat system. Phase 103 is the narrowest slice of that work: fix the broken socket delivery pipeline, add input validation and rate limiting to the server handler, and isolate the chat input from Phaser keyboard capture. No new channels, no UI tabs, no database schema.

The central finding is a precise mismatch between what exists and what is needed. `chat:message` IS registered in `socket.ts` `serverEvents` array (line 90) so the socket dispatcher handles it — but there is NO `gameSocket.on('chat:message', handler)` call anywhere in the client codebase. The dispatcher fires into a void. This is INFRA-01. The fix is one `gameSocket.on('chat:message', ...)` call wired to `useGameStore.getState().addChatMessage()`, placed in `gameStore.ts` alongside the other `gameSocket.on()` side effects already present there.

The keyboard isolation fix (INFRA-02) is also straightforward because the pattern is fully established and used by five other panels. `WorldScene.setKeyboardEnabled(false/true)` exists. The difference for ChatPanel is that keyboard should be disabled on input `onFocus` and re-enabled on `onBlur` — NOT on panel mount/unmount as other panels do — because the chat panel stays visible and players should be able to use hotkeys when not actively typing.

Rate limiting (INFRA-03) and server-side validation (INFRA-04) are purely server-side changes to `handleChat()` in `game.gateway.ts`. The success criteria specifies silent drop after 5 messages, which is a token-bucket pattern. The existing codebase already has a movement throttle in `PlayerService` using a `lastMoveTimes` Map — the same approach applies here.

**Primary recommendation:** Wire `gameSocket.on('chat:message')` in `gameStore.ts`, add `onFocus`/`onBlur` keyboard disable/enable to ChatPanel input, add server-side length/empty validation to `handleChat`, and add a per-player burst rate limiter (5 burst cap, silent drop on excess). No new packages needed.

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `socket.io` | `^4.7.0` | Event dispatch | Already the game's real-time backbone; `chat:message` is already a typed `ServerEvents` key |
| `zustand` | `^4.5.0` | Client chat state in `gameStore` | All client socket state lives here; `addChatMessage` action already exists |
| `@nestjs/websockets` + `@nestjs/platform-socket.io` | `^10.3.0` | `@SubscribeMessage('chat:send')` | `handleChat` handler already registered; only the body changes |

### Supporting (no new installs needed for Phase 103)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@nestjs/throttler` | `^6.4.0` (not installed) | `WsThrottlerGuard` for declarative rate limiting | Skip for Phase 103 — manual token bucket matches the project's existing movement throttle pattern and requires no new dependency |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual token-bucket in `handleChat` | `@nestjs/throttler` + `WsThrottlerGuard` | Throttler is cleaner long-term but requires a new install and `ThrottlerModule` setup in `GameModule`; for 5 tests of this phase, a manual Map-based bucket matches existing patterns and requires zero new packages |

**Installation:** No new packages needed for Phase 103.

## Architecture Patterns

### Recommended Project Structure (changes only)

```
apps/game-server/src/game/
+-- game.gateway.ts    MODIFIED — add rate limiting + message validation to handleChat()

apps/web/src/store/
+-- gameStore.ts       MODIFIED — add gameSocket.on('chat:message') side-effect handler

apps/web/src/ui/panels/
+-- ChatPanel.tsx      MODIFIED — add onFocus/onBlur keyboard disable/enable on input
```

### Pattern 1: gameSocket.on() Side-Effect Registration in gameStore

**What:** `gameStore.ts` already registers `gameSocket.on('error', ...)`, `gameSocket.on('player:xp', ...)`, and others as module-level side effects. `chat:message` must follow the same pattern.

**When to use:** Any server event that populates Zustand state.

**Example:**
```typescript
// apps/web/src/store/gameStore.ts — add alongside existing gameSocket.on() calls
gameSocket.on('chat:message', (message: ChatMessage) => {
  useGameStore.getState().addChatMessage(message);
});
```

This is the entire INFRA-01 fix. The `addChatMessage` action is already defined. The `chat:message` event is already in `serverEvents`. Only this listener registration was missing.

### Pattern 2: onFocus/onBlur Keyboard Isolation for Chat Input

**What:** The existing `setKeyboardEnabled(false/true)` pattern used by InventoryPanel, EquipmentPanel, AbilitiesPanel, QuestLogPanel, and PersonalStoragePanel disables Phaser keyboard on panel mount and re-enables on panel unmount via `useEffect`. ChatPanel is always-visible (not a modal), so the pattern must be scoped to input focus/blur instead.

**When to use:** Any `<input>` inside a React component rendered over the Phaser canvas.

**Example:**
```typescript
// apps/web/src/ui/panels/ChatPanel.tsx
const handleInputFocus = () => {
  const worldScene = useGameStore.getState().game?.getWorldScene();
  worldScene?.setKeyboardEnabled(false);
};

const handleInputBlur = () => {
  const worldScene = useGameStore.getState().game?.getWorldScene();
  worldScene?.setKeyboardEnabled(true);
};

// In JSX:
<input
  type="text"
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  onFocus={handleInputFocus}
  onBlur={handleInputBlur}
  placeholder="Type a message..."
  maxLength={280}
/>
```

This precisely mirrors how the game retrieves the WorldScene (`useGameStore.getState().game?.getWorldScene()`) as seen in every other panel that calls `setKeyboardEnabled`.

### Pattern 3: Manual Token-Bucket Rate Limiter in handleChat

**What:** The success criterion says >5 messages in rapid succession are silently dropped. The gateway must track per-player send times and count. `PlayerService` already has `lastMoveTimes: Map<string, number>` for movement throttling — the same approach applies.

**When to use:** Server-side rate limiting of any per-player high-frequency socket event.

**Example:**
```typescript
// In GameGateway (or extracted helper) — manages per-player burst tracking
private lastChatTimes: Map<string, number[]> = new Map();
private readonly CHAT_BURST_LIMIT = 5;
private readonly CHAT_WINDOW_MS = 5000; // 5 messages per 5 seconds

private canSendChat(playerId: string): boolean {
  const now = Date.now();
  const times = (this.lastChatTimes.get(playerId) || [])
    .filter(t => now - t < this.CHAT_WINDOW_MS);
  if (times.length >= this.CHAT_BURST_LIMIT) return false;
  times.push(now);
  this.lastChatTimes.set(playerId, times);
  return true;
}
```

Then in `handleChat`:
```typescript
if (!this.canSendChat(player.id)) return; // silently drop per INFRA-03 spec
```

### Pattern 4: Server-Side Message Validation in handleChat

**What:** Validate before constructing the message object. Check both empty string and max length. The success criteria specifies rejection (no delivery to any client). Empty messages are silently dropped; length violation returns an error.

**Example:**
```typescript
// In GameGateway.handleChat(), before constructing the message object
const trimmed = data.message?.trim() ?? '';
if (trimmed.length === 0) return; // silently discard
if (trimmed.length > 280) {
  client.emit('error', { code: 'INVALID_ACTION', message: 'Message too long (max 280 characters).' });
  return;
}
```

### Anti-Patterns to Avoid

- **Using panel-mount useEffect for keyboard disable in ChatPanel:** The panel is always open when the user is in game. Disabling keyboard on mount means the player can never use WASD hotkeys with chat visible. Use `onFocus`/`onBlur` on the input element instead.
- **Registering `chat:message` listener in ChatPanel.tsx:** The pattern in this codebase is to register socket listeners in store files (`gameStore.ts`, etc.), not in React components. ChatPanel reads from `gameStore.chatMessages` directly.
- **Relying on client-side `maxLength={200}` for INFRA-04:** The current ChatPanel already has `maxLength={200}` but this is a UX hint, not enforcement. Server validation is required per the success criterion.
- **Using `this.server.emit()` for global channel:** The existing gateway already uses this for global. Phase 103 does NOT change the routing logic — that is Phase 105's concern. Do not refactor the switch cases; just add validation and rate limiting.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessing WorldScene from React component | Custom event bus or Phaser game events | `useGameStore.getState().game?.getWorldScene()?.setKeyboardEnabled()` | This exact pattern is used in 5 existing panels — it's the established project convention |
| Socket event registration | Custom observable wrapper | `gameSocket.on()` module-level side effect in store file | Already the project pattern; `gameSocket` is a typed singleton with `on()` method |

**Key insight:** Phase 103 requires zero custom infrastructure. Every pattern needed already exists in the codebase.

## Common Pitfalls

### Pitfall 1: Disabling Keyboard on Panel Mount Instead of Input Focus

**What goes wrong:** If `setKeyboardEnabled(false)` is put in a `useEffect(() => ..., [])` for ChatPanel (like the other panels), the player can never use WASD to move while the chat panel is visible. ChatPanel is always visible in game — it's not a toggled modal like InventoryPanel.

**Why it happens:** Direct copy of the other panel pattern without considering that chat is persistent.

**How to avoid:** Put `setKeyboardEnabled` calls in `onFocus`/`onBlur` on the `<input>` element, not in a panel-level `useEffect`.

**Warning signs:** Player cannot move at all while the chat panel is visible on screen.

### Pitfall 2: Thinking the Bug is in socket.ts serverEvents Array

**What goes wrong:** The project SUMMARY.md (written before Phase 102 landed) says "`chat:message` missing from serverEvents array." This was fixed. The current code (confirmed by codebase audit) shows `'chat:message'` IS in `serverEvents` at line 90 of `socket.ts`. The actual bug is that no `gameSocket.on('chat:message', handler)` call exists in the client — the dispatcher fires but no handler is registered.

**Why it happens:** The STATE.md blocker note predates the fix. The research files may describe the old state.

**How to avoid:** The fix is adding `gameSocket.on('chat:message', (msg) => useGameStore.getState().addChatMessage(msg))` to `gameStore.ts`, not touching `socket.ts`.

**Warning signs:** If you check `serverEvents` in socket.ts and it already has `'chat:message'`, you're looking at the right file but the wrong bug.

### Pitfall 3: Rate Limiter Using a Single Timestamp (Not Burst-Aware)

**What goes wrong:** `if (Date.now() - lastTime < 1000) return` only prevents back-to-back spam but not burst: a player can send 1 message, wait 1.1 seconds, send another 1 message — effectively bypassing burst limiting.

**Why it happens:** Simplest possible rate limit, but the success criterion says "more than 5 messages in rapid succession" — implying a burst window, not a single-message cooldown.

**How to avoid:** Use a sliding window array (keep timestamps of recent sends, evict those older than the window, check count). See Pattern 3 above.

**Warning signs:** Player can send exactly 1 message per second indefinitely, which is not what the spec intends (5-message burst then drop).

### Pitfall 4: Empty String After Trim Not Caught

**What goes wrong:** A message of `"   "` (whitespace only) passes a `data.message.length > 0` check. After trim it is empty, but it gets broadcast as a blank message.

**Why it happens:** Checking `data.message` before trimming.

**How to avoid:** Assign `const trimmed = data.message?.trim() ?? ''` first, then check `trimmed.length === 0`.

## Code Examples

Verified patterns from codebase audit:

### INFRA-01: Register chat:message listener (gameStore.ts)

```typescript
// Source: apps/web/src/store/gameStore.ts — add alongside existing gameSocket.on() calls
// (gameSocket.on('error'), gameSocket.on('player:xp'), etc. are all registered this way)
gameSocket.on('chat:message', (message: ChatMessage) => {
  useGameStore.getState().addChatMessage(message);
});
```

### INFRA-02: Input focus/blur keyboard disable (ChatPanel.tsx)

```typescript
// Source: pattern from apps/web/src/ui/panels/AbilitiesPanel.tsx et al.
// but scoped to input focus rather than panel mount

const handleInputFocus = () => {
  const worldScene = useGameStore.getState().game?.getWorldScene();
  worldScene?.setKeyboardEnabled(false);
};

const handleInputBlur = () => {
  const worldScene = useGameStore.getState().game?.getWorldScene();
  worldScene?.setKeyboardEnabled(true);
};
```

### INFRA-03: Token-bucket rate limiter in gateway

```typescript
// Source: modeled on PlayerService.lastMoveTimes pattern in player.service.ts
private readonly chatBurstWindow: Map<string, number[]> = new Map();
private readonly CHAT_BURST_LIMIT = 5;
private readonly CHAT_BURST_WINDOW_MS = 5000;

private canSendChat(playerId: string): boolean {
  const now = Date.now();
  const recent = (this.chatBurstWindow.get(playerId) || [])
    .filter(t => now - t < this.CHAT_BURST_WINDOW_MS);
  if (recent.length >= this.CHAT_BURST_LIMIT) return false;
  recent.push(now);
  this.chatBurstWindow.set(playerId, recent);
  return true;
}
```

### INFRA-04: Server-side message validation in handleChat

```typescript
// Source: gateway validation pattern from other handlers in game.gateway.ts
const trimmed = data.message?.trim() ?? '';

if (trimmed.length === 0) return;

if (trimmed.length > 280) {
  client.emit('error', {
    code: 'INVALID_ACTION',
    message: 'Message too long (max 280 characters).',
  });
  return;
}
```

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (packages/game-logic only) |
| Config file | `packages/game-logic/vitest.config.ts` |
| Quick run command | `nx run game-logic:test` |
| Full suite command | `pnpm test` |

**Note:** No test infrastructure exists for `apps/game-server` or `apps/web`. The game-logic package has vitest but chat logic does not live there. All four success criteria for Phase 103 must be verified manually by observation:

1. INFRA-01: Send a zone chat message; verify it appears in the ChatPanel of a second connected client.
2. INFRA-02: Focus the chat input; type "wasd"; verify the player character does NOT move.
3. INFRA-03: Send 6+ messages in rapid succession; verify the 6th is silently dropped server-side (does not appear for any client).
4. INFRA-04: Attempt to send an empty message and a 281-character message; verify neither is broadcast.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | Zone chat message received by second client | Manual smoke | N/A | No test file |
| INFRA-02 | Typing WASD in chat input does not move character | Manual observation | N/A | No test file |
| INFRA-03 | >5 rapid messages silently dropped | Manual smoke | N/A | No test file |
| INFRA-04 | Empty and >280-char messages rejected server-side | Manual smoke | N/A | No test file |

### Wave 0 Gaps

No automated test files are needed for Phase 103. All four criteria require a running game server + client connection and are verified by manual interaction. This is consistent with the rest of the game-server test approach (zero spec files exist in `apps/game-server/src/game/`).

## Open Questions

1. **maxLength on the input — 200 or 280?**
   - What we know: The current ChatPanel has `maxLength={200}`. The REQUIREMENTS.md and success criteria state 280. The project SUMMARY.md references 280.
   - What's unclear: Whether 200 was intentional or a placeholder.
   - Recommendation: Use 280 everywhere (both server validation and input `maxLength`). 280 is the specified requirement.

2. **Rate limiter window: "5 messages in rapid succession" — how wide is the window?**
   - What we know: The success criterion says "more than 5 messages in rapid succession." No explicit time window is specified.
   - What's unclear: Whether "rapid succession" means within 1 second, 5 seconds, or indefinite burst-and-hold.
   - Recommendation: Use a 5-second sliding window (5 messages per 5 seconds). This matches the stated intention of preventing spam without frustrating legitimate fast typing. Implement as a named constant (`CHAT_BURST_WINDOW_MS = 5000`) for easy adjustment.

3. **Should `faction` channel silently drop or return an error now?**
   - What we know: The current switch in `handleChat` has no `faction` case — it falls through. Phase 103 only addresses INFRA-01 through INFRA-04. Faction routing is Phase 105 scope.
   - What's unclear: Whether the planner should add a defensive `default` case returning an error, or leave it as-is.
   - Recommendation: Leave the switch as-is. Do not add defensive error cases for channels not yet implemented — that would pollute the Phase 103 scope. The "faction silent drop" is documented as a known Phase 105 task.

## Sources

### Primary (HIGH confidence)

- `apps/web/src/network/socket.ts` — confirmed `'chat:message'` IS in `serverEvents` array (line 90); no listener registration bug here
- `apps/web/src/store/gameStore.ts` — confirmed no `gameSocket.on('chat:message')` anywhere; `addChatMessage` action exists and is correct
- `apps/game-server/src/game/game.gateway.ts` (lines 403-437) — confirmed no rate limiting, no message length validation, no trim; `data.message` used raw
- `apps/web/src/game/scenes/WorldScene.ts` (line 2124) — confirmed `setKeyboardEnabled()` exists and is the project-standard keyboard isolation method
- `apps/web/src/ui/panels/AbilitiesPanel.tsx`, `InventoryPanel.tsx`, `EquipmentPanel.tsx`, `QuestLogPanel.tsx`, `PersonalStoragePanel.tsx` — confirmed `useGameStore.getState().game?.getWorldScene()?.setKeyboardEnabled()` is the universal pattern for keyboard isolation
- `apps/web/src/ui/panels/ChatPanel.tsx` — confirmed no `onFocus`/`onBlur` on input, `maxLength={200}`, hardcoded `channel: 'zone'`
- `packages/shared-types/src/network/events.ts` (line 399) — confirmed `ChatChannel = 'zone' | 'faction' | 'whisper' | 'global' | 'system'` (no `'local'`)
- `apps/game-server/src/game/game.module.ts` — confirmed service registration pattern for adding new services (relevant for future phases, not 103)

### Secondary (MEDIUM confidence)

- `.planning/research/PITFALLS-CHAT-SYSTEM.md` — project-level research; pitfalls 3 (no rate limiting) and 8 (no message validation) directly apply to Phase 103
- `.planning/research/ARCHITECTURE.md` — build order section confirms Phase 103 scope; Pattern 1 and 4 apply

### Tertiary (LOW confidence)

None — all claims are grounded in direct codebase audit.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages needed; all technologies confirmed present and in use
- Architecture: HIGH — based on direct codebase audit of all four affected files; patterns are established and used multiple times
- Pitfalls: HIGH — each pitfall is grounded in an actual code observation (confirmed line numbers)

**Research date:** 2026-02-26
**Valid until:** 2026-04-26 (stable codebase; patterns unlikely to change)
