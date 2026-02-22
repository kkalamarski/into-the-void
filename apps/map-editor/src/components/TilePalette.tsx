import { useState } from 'react';
import { TileId } from '@into-the-void/world-gen';
import { ALL_TILES } from '@into-the-void/tiles';
import { useEditorStore } from '../store/editorStore';
import './TilePalette.css';

// Map string tile IDs to numeric TileId enum values
const TILE_ID_MAP: Record<string, TileId> = {
  void_floor: TileId.VOID_FLOOR,
  void_wall: TileId.VOID_WALL,
  crystal_floor: TileId.CRYSTAL_FLOOR,
  crystal_formation: TileId.CRYSTAL_FORMATION,
  toxic_floor: TileId.TOXIC_FLOOR,
  toxic_pool: TileId.TOXIC_POOL,
  ruins_floor: TileId.RUINS_FLOOR,
  ruins_wall: TileId.RUINS_WALL,
  ice_floor: TileId.ICE_FLOOR,
  ice_wall: TileId.ICE_WALL,
  volcanic_floor: TileId.VOLCANIC_FLOOR,
  lava: TileId.LAVA,
  fungal_floor: TileId.FUNGAL_FLOOR,
  fungal_growth: TileId.FUNGAL_GROWTH,
  crater_floor: TileId.CRATER_FLOOR,
  crater_debris: TileId.CRATER_DEBRIS,
  portal: TileId.PORTAL,
};

function TilePreview({ textureKey, fallbackColor }: { textureKey: string; fallbackColor: string }) {
  const [imgError, setImgError] = useState(false);
  const spritePath = `/assets/sprites/${textureKey}.png`;

  if (imgError) {
    // Fallback to colored diamond if image fails to load
    return (
      <div
        className="tile-preview tile-preview-fallback"
        style={{
          background: fallbackColor,
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        }}
      />
    );
  }

  return (
    <img
      src={spritePath}
      alt=""
      className="tile-preview tile-preview-sprite"
      onError={() => setImgError(true)}
    />
  );
}

export function TilePalette() {
  const selectedTileId = useEditorStore((state) => state.selectedTileId);
  const setSelectedTileId = useEditorStore((state) => state.setSelectedTileId);

  return (
    <div className="tile-palette-container">
      <div className="panel-section">
        <h3>Tiles</h3>
      </div>
      <div className="panel-content">
        <div className="tile-palette">
          {ALL_TILES.map((tileDef) => {
            const numericId = TILE_ID_MAP[tileDef.id];
            if (numericId === undefined) return null;

            const isSelected = selectedTileId === numericId;
            const fallbackColor = `#${tileDef.color.toString(16).padStart(6, '0')}`;

            return (
              <button
                key={tileDef.id}
                className={`tile-item ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedTileId(numericId)}
                title={tileDef.description || tileDef.displayName}
              >
                <TilePreview textureKey={tileDef.textureKey} fallbackColor={fallbackColor} />
                <span className="tile-name">{tileDef.displayName}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
