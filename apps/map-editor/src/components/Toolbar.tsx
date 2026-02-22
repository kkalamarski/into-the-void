import { useEditorStore, EditorTool } from '../store/editorStore';
import './Toolbar.css';

const TOOLS: { id: EditorTool; icon: string; label: string; shortcut: string }[] = [
  { id: 'paint', icon: '🖌️', label: 'Paint', shortcut: 'P' },
  { id: 'fill', icon: '🪣', label: 'Fill', shortcut: 'F' },
  { id: 'eyedropper', icon: '💧', label: 'Eyedropper', shortcut: 'I' },
  { id: 'eraser', icon: '🧹', label: 'Eraser', shortcut: 'E' },
  { id: 'elevation', icon: '⬆️', label: 'Elevation', shortcut: 'H' },
  { id: 'collision', icon: '🚫', label: 'Collision', shortcut: 'C' },
  { id: 'stack', icon: '🧱', label: 'Stack', shortcut: 'S' },
];

export function Toolbar() {
  const tool = useEditorStore((state) => state.tool);
  const setTool = useEditorStore((state) => state.setTool);
  const paintElevation = useEditorStore((state) => state.paintElevation);
  const setPaintElevation = useEditorStore((state) => state.setPaintElevation);
  const showGrid = useEditorStore((state) => state.showGrid);
  const toggleGrid = useEditorStore((state) => state.toggleGrid);
  const showSpawnPoints = useEditorStore((state) => state.showSpawnPoints);
  const toggleSpawnPoints = useEditorStore((state) => state.toggleSpawnPoints);
  const showCollisions = useEditorStore((state) => state.showCollisions);
  const toggleCollisions = useEditorStore((state) => state.toggleCollisions);
  const flatMode = useEditorStore((state) => state.flatMode);
  const toggleFlatMode = useEditorStore((state) => state.toggleFlatMode);

  return (
    <div className="toolbar">
      <div className="panel-section">
        <h3>Tools</h3>
        <div className="tool-buttons">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={`tool-button ${tool === t.id ? 'active' : ''}`}
              onClick={() => setTool(t.id)}
              title={`${t.label} (${t.shortcut})`}
            >
              {t.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h3>Elevation</h3>
        <div className="elevation-control">
          <input
            type="range"
            min="0"
            max="5"
            value={paintElevation}
            onChange={(e) => setPaintElevation(parseInt(e.target.value, 10))}
          />
          <span className="elevation-value">{paintElevation}</span>
        </div>
        <div className="elevation-description">
          {tool === 'stack' ? (
            <>Stack tiles at elevation {paintElevation}. Shift+click to remove.</>
          ) : (
            <>Paint brush elevation level (0-5)</>
          )}
        </div>
      </div>

      <div className="panel-section">
        <h3>View</h3>
        <div className="toggle-options">
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={toggleGrid}
            />
            <span>Show Grid (G)</span>
          </label>
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={showSpawnPoints}
              onChange={toggleSpawnPoints}
            />
            <span>Show Spawn Points</span>
          </label>
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={showCollisions}
              onChange={toggleCollisions}
            />
            <span>Show Collisions</span>
          </label>
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={flatMode}
              onChange={toggleFlatMode}
            />
            <span>Flat Mode (2D)</span>
          </label>
        </div>
      </div>
    </div>
  );
}
