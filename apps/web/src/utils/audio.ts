/**
 * AudioManager — Web Audio API singleton for gapless music looping and SFX playback.
 *
 * Architecture:
 *   musicGain    ─┐
 *   effectsGain  ─┤─► masterGain ─► ctx.destination
 *   ambientGain  ─┘
 *
 * Usage:
 *   await audioManager.init();           // Call on first user gesture
 *   await audioManager.startMusic('/assets/audio/music/zone.ogg');
 *   await audioManager.playEffect('/assets/audio/sfx/click.ogg');
 */

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicBuffer: AudioBuffer | null = null;
  private musicStarted: boolean = false;
  private sfxCache: Map<string, AudioBuffer> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize the Web Audio graph. Must be called on first user gesture.
   * AudioContext is created SYNCHRONOUSLY before any await — required for Safari gesture association.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // SYNCHRONOUS creation — must happen before any await for Safari autoplay compliance
    this.ctx = new AudioContext();
    this.initialized = true;

    // Build gain chain: category gains -> masterGain -> destination
    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.effectsGain = this.ctx.createGain();
    this.ambientGain = this.ctx.createGain();

    this.musicGain.connect(this.masterGain);
    this.effectsGain.connect(this.masterGain);
    this.ambientGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Apply persisted volume values from store
    this.syncVolumesFromStore();
  }

  /**
   * Resume AudioContext if suspended (e.g., after autoplay policy pause).
   */
  async ensureRunning(): Promise<void> {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * Start gapless looped music playback.
   * Guard: does not restart if music is already playing (safe across zone transitions).
   */
  async startMusic(src: string): Promise<void> {
    if (!this.ctx || this.musicStarted) return;

    await this.ensureRunning();

    const response = await fetch(src);
    const arrayBuffer = await response.arrayBuffer();
    this.musicBuffer = await this.ctx.decodeAudioData(arrayBuffer);

    this.musicSource = this.ctx.createBufferSource();
    this.musicSource.buffer = this.musicBuffer;
    this.musicSource.loop = true;
    this.musicSource.connect(this.musicGain!);
    this.musicSource.start();

    this.musicStarted = true;
  }

  /**
   * Stop currently playing music and allow restart.
   */
  stopMusic(): void {
    if (this.musicSource) {
      try {
        this.musicSource.stop();
      } catch {
        // Already stopped — safe to ignore
      }
      this.musicSource = null;
    }
    this.musicStarted = false;
  }

  /**
   * Play a fire-and-forget sound effect. Buffers are cached after first decode.
   * Each call creates a new source node, supporting overlapping playback.
   */
  async playEffect(src: string): Promise<void> {
    if (!this.ctx || !this.effectsGain) return;

    await this.ensureRunning();

    let buffer = this.sfxCache.get(src);
    if (!buffer) {
      const response = await fetch(src);
      const arrayBuffer = await response.arrayBuffer();
      buffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.sfxCache.set(src, buffer);
    }

    // Create a new source node per play — supports overlap, avoids InvalidStateError
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.effectsGain);
    source.start();
  }

  /**
   * Set master volume (scales all categories proportionally).
   * Null-safe — may be called before init() during Zustand persist hydration.
   */
  setMasterVolume(v: number): void {
    if (this.masterGain) this.masterGain.gain.value = v;
  }

  /**
   * Set music volume.
   * Null-safe — may be called before init() during Zustand persist hydration.
   */
  setMusicVolume(v: number): void {
    if (this.musicGain) this.musicGain.gain.value = v;
  }

  /**
   * Set effects (SFX) volume.
   * Null-safe — may be called before init() during Zustand persist hydration.
   */
  setEffectsVolume(v: number): void {
    if (this.effectsGain) this.effectsGain.gain.value = v;
  }

  /**
   * Set ambient volume.
   * Null-safe — may be called before init() during Zustand persist hydration.
   */
  setAmbientVolume(v: number): void {
    if (this.ambientGain) this.ambientGain.gain.value = v;
  }

  /**
   * Suspend/resume AudioContext on tab visibility change.
   */
  handleVisibilityChange(hidden: boolean): void {
    if (!this.ctx) return;
    if (hidden) {
      this.ctx.suspend();
    } else {
      this.ctx.resume();
    }
  }

  /**
   * Read persisted volume values from audioStore and apply to gain nodes.
   * Uses lazy require() to break circular dependency:
   *   audioStore imports audioManager (normal)
   *   audio.ts imports audioStore (lazy — only at runtime, not module load)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private syncVolumesFromStore(): void {
    // Lazy import to avoid circular dependency (audioStore imports audioManager)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAudioStore } = require('../store/audioStore') as {
      useAudioStore: { getState: () => { master: number; music: number; effects: number; ambient: number } };
    };
    const { master, music, effects, ambient } = useAudioStore.getState();
    this.setMasterVolume(master);
    this.setMusicVolume(music);
    this.setEffectsVolume(effects);
    this.setAmbientVolume(ambient);
  }
}

/**
 * Singleton instance. AudioContext is NOT created at module load time —
 * only inside init() on first user gesture to comply with autoplay policies.
 */
export const audioManager = new AudioManager();
