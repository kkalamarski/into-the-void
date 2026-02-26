import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { audioManager } from '../utils/audio';

/**
 * Persisted Zustand store for audio volume settings.
 *
 * Stores 4 independent volume categories (0.0 – 1.0).
 * Setters update state AND apply immediately to AudioManager gain nodes.
 * Only numeric values are persisted to localStorage — setter functions are excluded.
 *
 * Import direction: audioStore -> audioManager (safe, one-way)
 * Reverse direction: audio.ts -> audioStore uses lazy require() in syncVolumesFromStore()
 */

interface AudioState {
  /** Master volume — scales all categories proportionally. Default: 1.0 (100%) */
  master: number;
  /** Music volume. Default: 0.3 (30%) */
  music: number;
  /** Sound effects volume. Default: 0.7 (70%) */
  effects: number;
  /** Ambient volume. Default: 0.5 (50%) */
  ambient: number;

  setMaster: (v: number) => void;
  setMusic: (v: number) => void;
  setEffects: (v: number) => void;
  setAmbient: (v: number) => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      master: 1.0,
      music: 0.3,
      effects: 0.7,
      ambient: 0.5,

      setMaster: (v) => {
        set({ master: v });
        audioManager.setMasterVolume(v);
      },
      setMusic: (v) => {
        set({ music: v });
        audioManager.setMusicVolume(v);
      },
      setEffects: (v) => {
        set({ effects: v });
        audioManager.setEffectsVolume(v);
      },
      setAmbient: (v) => {
        set({ ambient: v });
        audioManager.setAmbientVolume(v);
      },
    }),
    {
      name: 'audio-settings',
      partialize: (state) => ({
        master: state.master,
        music: state.music,
        effects: state.effects,
        ambient: state.ambient,
      }),
    }
  )
);
