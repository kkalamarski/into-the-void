import { useGameStore } from '../store/gameStore';
import './ZoneNameCinematic.css';

export function ZoneNameCinematic() {
  const cinematic = useGameStore((s) => s.zoneCinematic);

  if (!cinematic) return null;

  return (
    <div className="zone-cinematic-overlay" key={cinematic.instanceId}>
      <div className="zone-cinematic-name">{cinematic.zoneName}</div>
      <div className="zone-cinematic-line" />
      <div className={`zone-cinematic-tier zone-cinematic-tier--${cinematic.tier}`}>
        {cinematic.tierLabel}
      </div>
    </div>
  );
}
