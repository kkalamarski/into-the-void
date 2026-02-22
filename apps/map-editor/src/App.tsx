import React, { useEffect, useRef, useCallback, useState } from 'react';
import Phaser from 'phaser';
import { useEditorStore } from './store/editorStore';
import { useMapStore } from './store/mapStore';
import { MenuBar } from './components/MenuBar';
import { Toolbar } from './components/Toolbar';
import { TilePalette } from './components/TilePalette';
import { PropertiesPanel } from './components/PropertiesPanel';
import { EditorScene } from './game/EditorScene';
import { exportChunk } from './io/exportChunk';
import { importChunk } from './io/importChunk';

export function App() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);

  // Initialize Phaser game
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: '#0a0a0f',
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [EditorScene],
    };

    gameRef.current = new Phaser.Game(config);

    // Listen for tile hover events from the scene
    gameRef.current.events.on('tileHover', (coords: { x: number; y: number } | null) => {
      setHoveredTile(coords);
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // File operations
  const handleNew = useCallback(() => {
    useMapStore.getState().newMap(64, 64);
    const scene = gameRef.current?.scene.getScene('EditorScene') as EditorScene | undefined;
    scene?.refreshMap();
  }, []);

  const handleOpen = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.chunk.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      const result = importChunk(text);
      if (result.success && result.data) {
        useMapStore.getState().loadChunk(result.data);
        const scene = gameRef.current?.scene.getScene('EditorScene') as EditorScene | undefined;
        scene?.refreshMap();
      } else {
        alert(`Failed to load: ${result.error}`);
      }
    };
    input.click();
  }, []);

  const handleSave = useCallback(() => {
    const chunk = useMapStore.getState().getChunkData();
    const json = exportChunk(chunk);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chunk.zoneId || 'untitled'}.chunk.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleUndo = useCallback(() => {
    useEditorStore.getState().undo();
    const scene = gameRef.current?.scene.getScene('EditorScene') as EditorScene | undefined;
    scene?.refreshMap();
  }, []);

  const handleRedo = useCallback(() => {
    useEditorStore.getState().redo();
    const scene = gameRef.current?.scene.getScene('EditorScene') as EditorScene | undefined;
    scene?.refreshMap();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        handleOpen();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleNew();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNew, handleOpen, handleSave, handleUndo, handleRedo]);

  return (
    <div className="app-container">
      <MenuBar
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />
      <div className="main-content">
        <div className="left-panel">
          <Toolbar />
          <TilePalette />
        </div>
        <div className="canvas-container" ref={containerRef}>
          {hoveredTile && (
            <div className="coord-display">
              X: {hoveredTile.x}, Y: {hoveredTile.y}
            </div>
          )}
        </div>
        <div className="right-panel">
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}
