---
phase: quick-7
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/src/game/systems/WeatherSystem.ts
autonomous: true
requirements: [QUICK-7]

must_haves:
  truths:
    - "Weather particles cover the entire visible viewport, not just one region"
    - "Falling particles (rain, snow, ash) spawn from above the viewport and fall through it"
    - "Rising particles (spores, steam) spawn from below the viewport and float upward through it"
    - "Drifting particles (mist, void energy) spawn across the full viewport area"
    - "Resize handler updates emit zones correctly for the active weather type"
  artifacts:
    - path: "apps/web/src/game/systems/WeatherSystem.ts"
      provides: "Per-weather-type emit zone calculation"
      contains: "getEmitZone"
  key_links:
    - from: "WeatherSystem.createEmitter"
      to: "getEmitZone helper"
      via: "function call"
      pattern: "getEmitZone"
    - from: "WeatherSystem resize handler"
      to: "getEmitZone helper"
      via: "function call"
      pattern: "getEmitZone"
---

<objective>
Fix weather particle effects so they cover the entire visible screen instead of appearing only in one portion.

Purpose: Weather particles currently spawn from a thin strip at the top of the viewport (y: -15% to 0%, full width). This works for falling particles (rain, snow, ash) but causes rising particles (spores, steam), drifting particles (mist), and chaotic particles (void_energy) to either immediately fly off-screen or cluster at the top. The emit zone must match each weather type's movement direction.

Output: Updated WeatherSystem with per-weather-type emit zones so all particle effects visually fill the full viewport.
</objective>

<execution_context>
@/Users/krzysztof.kalamarski/.claude/get-shit-done/workflows/execute-plan.md
@/Users/krzysztof.kalamarski/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/src/game/systems/WeatherSystem.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add per-weather-type emit zone calculation and apply it in createEmitter + resize handler</name>
  <files>apps/web/src/game/systems/WeatherSystem.ts</files>
  <action>
The bug: the emit zone is always `Rectangle(0, -(height*0.15), width, height*0.15)` -- a thin strip just above the top of the viewport. This is correct for particles that fall downward (rain, snow, ash) but wrong for:
- **Rising particles** (spores with `speedY: {min:-15, max:30}`, ironhold steam with `speedY: {min:-60, max:-20}`): These need to spawn from the bottom of the viewport so they float upward through the visible area.
- **Drifting particles** (mist with near-zero `speedY` and wide `speedX`, void_energy with bidirectional speeds): These need to spawn across the full viewport since they don't have a dominant travel direction.
- **Lateral drift** (meridian holo-dust with `speedX: {min:20, max:40}`): Needs to spawn from the left edge.

Create a private helper method `getEmitZone(config: WeatherConfig, width: number, height: number)` that returns a `Phaser.Geom.Rectangle` based on the weather type's movement characteristics:

1. **Falling types** (`rain`, `snow`, `ash` where speedY is predominantly positive): Keep the current top-strip zone: `Rectangle(0, -(height * 0.15), width, height * 0.15)` -- particles spawn above viewport and fall through.

2. **Rising/floating types** (`spores`): Use a full-viewport zone: `Rectangle(0, 0, width, height)` -- particles can appear anywhere since spores float lazily in all directions. The slight upward bias means they need to spawn throughout.

3. **Drifting types** (`mist`): Use a full-viewport zone: `Rectangle(0, 0, width, height)` -- mist has near-zero vertical speed and wide horizontal drift, needs to appear everywhere.

4. **Chaotic types** (`void_energy`): Use a full-viewport zone: `Rectangle(0, 0, width, height)` -- bidirectional speeds mean particles fly in all directions.

Implementation approach -- use a simple switch on `config.type`:
```typescript
private getEmitZone(config: WeatherConfig, width: number, height: number): Phaser.Geom.Rectangle {
  switch (config.type) {
    case 'rain':
    case 'snow':
    case 'ash':
      // Falling: spawn strip above viewport, particles fall through
      return new Phaser.Geom.Rectangle(0, -(height * 0.15), width, height * 0.15);
    case 'spores':
    case 'mist':
    case 'void_energy':
      // Floating/drifting/chaotic: spawn across full viewport
      return new Phaser.Geom.Rectangle(0, 0, width, height);
    default:
      return new Phaser.Geom.Rectangle(0, -(height * 0.15), width, height * 0.15);
  }
}
```

Then update THREE locations to use this helper:

1. **`createEmitter` method** (line ~385): Replace the inline `new Phaser.Geom.Rectangle(0, -(height * 0.15), width, height * 0.15)` with `this.getEmitZone(config, width, height)`.

2. **`resizeHandler` in constructor** (line ~248-249): The resize handler currently hardcodes the top-strip zone. It needs access to the current weather config to compute the correct zone. Store `currentConfig` as a private field (set it in `createEmitter`), then use it in the resize handler:
   ```typescript
   if (this.activeEmitter && this.currentConfig) {
     this.activeEmitter.setEmitZone(
       new Phaser.GameObjects.Particles.Zones.RandomZone(
         this.getEmitZone(this.currentConfig, width, height) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource
       )
     );
   }
   ```

3. Add a private field `private currentConfig: WeatherConfig | null = null;` alongside the existing `currentBiome` field. Set it in `setBiome` right after `const config = WEATHER_CONFIGS[biome];` with `this.currentConfig = config;`. Clear it in `destroy()`.

Important: Do NOT change the emitter position (stays at 0,0), do NOT change scrollFactor (stays at 0), do NOT change depth (stays at 9500). Only the emit zone rectangle changes based on weather type.
  </action>
  <verify>
    Run `npx nx run web:build` to confirm TypeScript compiles without errors.
  </verify>
  <done>
    - Weather particles of type rain/snow/ash spawn from the top strip (existing behavior preserved)
    - Weather particles of type spores/mist/void_energy spawn across the full viewport area
    - Resize handler uses the same per-type emit zone logic
    - Build succeeds with no type errors
  </done>
</task>

</tasks>

<verification>
- `npx nx run web:build` passes
- Visual: In any zone with mist/spores/void_energy weather, particles should appear across the full screen, not clustered at the top
</verification>

<success_criteria>
- All six weather types have appropriate emit zones matching their movement direction
- Falling particles (rain, snow, ash) still spawn from above and fall through the viewport
- Floating/drifting particles (spores, mist, void_energy) spawn across the full viewport
- Resize handler correctly updates the emit zone for the current weather type
- Build compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/7-atmospheric-effects-are-not-visible-on-t/7-SUMMARY.md`
</output>
