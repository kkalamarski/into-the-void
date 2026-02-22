import { useState } from 'react';
import { useMapStore } from '../store/mapStore';
import { SpawnPoint } from '@into-the-void/shared-types';
import './PropertiesPanel.css';

export function PropertiesPanel() {
  const spawnPoints = useMapStore((state) => state.spawnPoints);
  const addSpawnPoint = useMapStore((state) => state.addSpawnPoint);
  const removeSpawnPoint = useMapStore((state) => state.removeSpawnPoint);

  const [newSpawn, setNewSpawn] = useState<Partial<SpawnPoint>>({
    x: 32,
    y: 32,
    entityType: 'creature',
    spawnId: '',
    respawnTime: 60,
  });

  const handleAddSpawn = () => {
    if (!newSpawn.spawnId) return;
    addSpawnPoint({
      x: newSpawn.x ?? 0,
      y: newSpawn.y ?? 0,
      entityType: newSpawn.entityType as 'creature' | 'mineral',
      spawnId: newSpawn.spawnId,
      respawnTime: newSpawn.respawnTime ?? 60,
    });
    setNewSpawn({ ...newSpawn, spawnId: '' });
  };

  return (
    <div className="properties-panel">
      <div className="panel-section">
        <h3>Map Properties</h3>
        <div className="property-row">
          <label>
            Width
            <input
              type="number"
              value={useMapStore.getState().width}
              readOnly
            />
          </label>
          <label>
            Height
            <input
              type="number"
              value={useMapStore.getState().height}
              readOnly
            />
          </label>
        </div>
      </div>

      <div className="panel-section">
        <h3>Spawn Points</h3>
        <div className="spawn-form">
          <div className="property-row">
            <label>
              X
              <input
                type="number"
                value={newSpawn.x}
                onChange={(e) => setNewSpawn({ ...newSpawn, x: parseInt(e.target.value, 10) })}
                min={0}
                max={63}
              />
            </label>
            <label>
              Y
              <input
                type="number"
                value={newSpawn.y}
                onChange={(e) => setNewSpawn({ ...newSpawn, y: parseInt(e.target.value, 10) })}
                min={0}
                max={63}
              />
            </label>
          </div>
          <label>
            Type
            <select
              value={newSpawn.entityType}
              onChange={(e) => setNewSpawn({ ...newSpawn, entityType: e.target.value as 'creature' | 'mineral' })}
            >
              <option value="creature">Creature</option>
              <option value="mineral">Mineral</option>
            </select>
          </label>
          <label>
            Spawn ID
            <input
              type="text"
              value={newSpawn.spawnId}
              onChange={(e) => setNewSpawn({ ...newSpawn, spawnId: e.target.value })}
              placeholder="e.g., void_crawler_01"
            />
          </label>
          <label>
            Respawn Time (s)
            <input
              type="number"
              value={newSpawn.respawnTime}
              onChange={(e) => setNewSpawn({ ...newSpawn, respawnTime: parseInt(e.target.value, 10) })}
              min={0}
            />
          </label>
          <button onClick={handleAddSpawn} disabled={!newSpawn.spawnId}>
            Add Spawn Point
          </button>
        </div>
      </div>

      <div className="panel-section spawn-list-section">
        <h3>Spawn List ({spawnPoints.length})</h3>
        <div className="spawn-list">
          {spawnPoints.length === 0 ? (
            <div className="empty-message">No spawn points</div>
          ) : (
            spawnPoints.map((spawn, index) => (
              <div key={index} className="spawn-item">
                <div className="spawn-info">
                  <span className={`spawn-type ${spawn.entityType}`}>
                    {spawn.entityType === 'creature' ? '👹' : '💎'}
                  </span>
                  <span className="spawn-id">{spawn.spawnId}</span>
                  <span className="spawn-pos">
                    ({spawn.x}, {spawn.y})
                  </span>
                </div>
                <button
                  className="remove-btn"
                  onClick={() => removeSpawnPoint(index)}
                  title="Remove spawn point"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
