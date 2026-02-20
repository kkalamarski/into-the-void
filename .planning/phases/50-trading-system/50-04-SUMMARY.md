---
phase: 50-trading-system
plan: 04
status: complete
---

## Summary

Wired credits:update socket event to gameStore for real-time HUD credit balance updates.

## What Was Done

### Task 1: Add credits:update Socket Listener

Added listener to `apps/web/src/store/gameStore.ts`:

```typescript
gameSocket.on('credits:update', (data: { credits: number }) => {
  const state = useGameStore.getState();
  if (state.player) {
    useGameStore.setState({
      player: { ...state.player, credits: data.credits },
    });
  }
});
```

### Reactive Chain Verified

1. **TradingPanel** reads `player?.credits` from `useGameStore()`:
   - Line 55: Check if player can afford items
   - Line 104: Display "Your Credits" balance
   - Line 114: `canAfford` calculation for buy buttons

2. **HUD** reads `player.credits` from `useGameStore()`:
   - Line 133: Display credit balance in player stats

Both components automatically re-render when `player.credits` changes in the store.

## Verification

- `pnpm build --filter web` passes
- credits:update listener at line 464 in gameStore.ts
- TradingPanel uses `player?.credits` (3 locations)
- HUD uses `player.credits` (1 location)
