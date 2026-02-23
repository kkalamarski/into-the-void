/**
 * Audio utility for game sound effects.
 * Uses HTML5 Audio API with autoplay policy compliance.
 */

const AUDIO_VOLUME = 0.3; // Non-intrusive volume (30%)

/**
 * Play quest completion notification sound.
 * Silently fails if browser autoplay policy blocks playback.
 */
export function playQuestCompleteSound(): void {
  const audio = new Audio('/assets/audio/quest-complete.mp3');
  audio.volume = AUDIO_VOLUME;

  // Handle autoplay policy - fail silently to not disrupt UX
  audio.play().catch((err) => {
    console.debug('[Audio] Quest complete sound blocked:', err.message);
  });
}
