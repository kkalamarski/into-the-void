---
phase: 50-trading-system
plan: 01
status: complete
---

## Summary

Added credit mutation database operations and trade socket event types.

## What Was Done

### Task 1: Credit Mutation Functions
- Added `deductCredits()` to `packages/database/src/queries/characters.ts`:
  - Validates amount > 0
  - Uses atomic UPDATE with `WHERE credits >= amount` to prevent negative balance
  - Returns `{ success: true, newBalance }` on success
  - Returns `{ success: false, error: 'Insufficient credits' }` if balance check fails

- Added `addCredits()` to `packages/database/src/queries/characters.ts`:
  - Validates amount > 0
  - Uses atomic UPDATE to add credits
  - Returns `{ success: true, newBalance }`

### Task 2: Export Credit Functions
- Both functions exported via `packages/database/src/queries/characters.ts` (re-exported through `index.ts`)

### Task 3: Trade Socket Event Types
Added to `packages/shared-types/src/network/events.ts`:

**Client Events:**
- `trade:buy`: `{ npcId: string; itemId: string; quantity: number }`
- `trade:sell`: `{ npcId: string; itemInstanceId: string; quantity: number }`

**Server Events:**
- `trade:result`: `{ success: boolean; action: 'buy' | 'sell'; itemId?: string; quantity?: number; totalPrice?: number; newBalance?: number; error?: string }`
- `credits:update`: `{ credits: number }`

## Verification

- `pnpm build` passes for all packages
- `deductCredits` and `addCredits` exported from `@into-the-void/database`
- All 4 trade event types present in shared-types
