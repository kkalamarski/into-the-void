/**
 * Day/Night Cycle types and constants.
 * Shared between server (time sync) and client (cycle rendering).
 */

/** The four distinct phases of the day/night cycle */
export type DayNightPhase = 'Dawn' | 'Day' | 'Dusk' | 'Night';

/** Full cycle duration: 20 minutes real time */
export const CYCLE_DURATION_MS = 20 * 60 * 1000;

/** Phase boundaries as fraction of cycle [0, 1) */
export const PHASE_BOUNDARIES = {
  Dawn:  { start: 0.0,  end: 0.1  },  // 0:00 - 2:00
  Day:   { start: 0.1,  end: 0.5  },  // 2:00 - 10:00
  Dusk:  { start: 0.5,  end: 0.6  },  // 10:00 - 12:00
  Night: { start: 0.6,  end: 1.0  },  // 12:00 - 20:00
} as const;
