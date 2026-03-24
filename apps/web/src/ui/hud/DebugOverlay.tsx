import { useDebugStore } from '../../store/debugStore';
import './DebugOverlay.css';

export function DebugOverlay() {
  const visible = useDebugStore((s) => s.visible);
  const d = useDebugStore((s) => s.data);

  if (!visible) return null;

  return (
    <div className="debug-overlay">
      <div className="debug-title">Into the Void — Debug (F3)</div>

      <div className="debug-section">
        <div>XY: {d.px.toFixed(1)}, {d.py.toFixed(1)}</div>
        <div>Zone: {d.zoneId}</div>
        <div>Tile: {d.tileX}, {d.tileY}</div>
        <div>Elevation: {d.elevation}</div>
        <div>Tile Type: {d.tileType}</div>
        <div>Biome: {d.biomeName}</div>
      </div>

      <div className="debug-section">
        <div>FPS: {d.fps}</div>
        <div>Entities: {d.entityCount}</div>
        <div>Ping: {d.ping}ms</div>
        <div>Chunks: {d.chunksLoaded} loaded, {d.chunksPending} pending, {d.chunksFailed} failed</div>
      </div>

      <div className="debug-section">
        <div>Day/Night: {d.dayNightPhase} ({d.dayNightProgress}%)</div>
        <div>Combat: {d.combatState}</div>
        <div>Target: {d.targetId}</div>
      </div>
    </div>
  );
}
