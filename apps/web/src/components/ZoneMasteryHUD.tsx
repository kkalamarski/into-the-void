import { useZoneMasteryStore } from '../store/zoneMasteryStore';
import { BIOME_DISPLAY_NAMES } from '@into-the-void/shared-types';
import './ZoneMasteryHUD.css';

const TIER_COLORS: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
};

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
};

export function ZoneMasteryHUD() {
  const { currentBiome, getCurrentProgress, getProgressPercentage, completionBanners, removeCompletionBanner } = useZoneMasteryStore();

  const progress = getCurrentProgress();
  const percentage = progress ? getProgressPercentage(progress) : 0;
  const biomeName = currentBiome ? (BIOME_DISPLAY_NAMES[currentBiome as keyof typeof BIOME_DISPLAY_NAMES] ?? currentBiome) : '';

  return (
    <>
      {/* Mastery progress panel */}
      {progress && (
        <div className="zone-mastery-hud">
          <div className="mastery-header">
            <span className="mastery-biome">{biomeName}</span>
            <span className="mastery-tier" style={{ color: TIER_COLORS[progress.tier] }}>
              {TIER_LABELS[progress.tier]} Mastery
            </span>
          </div>
          <div className="mastery-progress-bar">
            <div className="mastery-progress-fill" style={{ width: `${percentage}%`, backgroundColor: TIER_COLORS[progress.tier] }} />
          </div>
          <div className="mastery-percentage">{percentage}%</div>
          <div className="mastery-objectives">
            {progress.objectives.map((obj, i) => (
              <div key={i} className={`mastery-objective ${obj.complete ? 'complete' : ''}`}>
                <span className="objective-icon">{obj.complete ? '[x]' : '[ ]'}</span>
                <span className="objective-text">{obj.description}</span>
                <span className="objective-count">{obj.current}/{obj.required}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completion banners */}
      {completionBanners.map((banner, idx) => (
        <div
          key={banner.id}
          className="mastery-completion-banner"
          style={{ top: `${30 + idx * 12}%` }}
          onClick={() => removeCompletionBanner(banner.id)}
        >
          <div className="banner-title" style={{ color: TIER_COLORS[banner.tier] }}>
            {TIER_LABELS[banner.tier]} Mastery Complete!
          </div>
          <div className="banner-biome">{BIOME_DISPLAY_NAMES[banner.biome as keyof typeof BIOME_DISPLAY_NAMES] ?? banner.biome}</div>
          {banner.rewards.length > 0 && (
            <div className="banner-rewards">
              {banner.rewards.map((r, i) => (
                <div key={i} className="banner-reward">Unlocked: {r.displayName}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
