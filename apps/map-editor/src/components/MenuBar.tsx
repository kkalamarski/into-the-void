import { useEditorStore } from '../store/editorStore';
import { useMapStore } from '../store/mapStore';
import './MenuBar.css';

interface MenuBarProps {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function MenuBar({ onNew, onOpen, onSave, onUndo, onRedo }: MenuBarProps) {
  const zoneId = useMapStore((state) => state.zoneId);
  const canUndo = useEditorStore((state) => state.undoStack.length > 0);
  const canRedo = useEditorStore((state) => state.redoStack.length > 0);

  return (
    <div className="menubar">
      <div className="menubar-left">
        <span className="app-title">Into the Void - Map Editor</span>
        <span className="separator">|</span>
        <button className="menubar-btn" onClick={onNew} title="New Map (Ctrl+N)">
          New
        </button>
        <button className="menubar-btn" onClick={onOpen} title="Open (Ctrl+O)">
          Open
        </button>
        <button className="menubar-btn" onClick={onSave} title="Save (Ctrl+S)">
          Save
        </button>
        <span className="separator">|</span>
        <button
          className="menubar-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          className="menubar-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          Redo
        </button>
      </div>
      <div className="menubar-center">
        <input
          type="text"
          className="zone-id-input"
          value={zoneId}
          onChange={(e) => useMapStore.getState().setZoneId(e.target.value)}
          placeholder="Zone ID"
          title="Zone ID for export"
        />
      </div>
      <div className="menubar-right">
        <span className="status-text">
          {useMapStore.getState().width}x{useMapStore.getState().height}
        </span>
      </div>
    </div>
  );
}
