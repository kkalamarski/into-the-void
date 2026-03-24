import Phaser from 'phaser';
import type { Direction } from '@into-the-void/shared-types';
import { gameSocket } from '../../../network/socket';
import { useGameStore } from '../../../store/gameStore';

type WASDKeys = {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
};

/**
 * Resolve 8-directional movement from simultaneous WASD key states.
 * Uses screen-relative mapping: W=up, S=down, A=left, D=right on screen.
 * Dual-key combos produce grid cardinals (screen diagonals).
 */
export function resolveDirection(keys: { W: boolean; A: boolean; S: boolean; D: boolean }): Direction | null {
  const w = keys.W;
  const a = keys.A;
  const s = keys.S;
  const d = keys.D;

  // Dual-key combos = grid cardinals (appear as screen diagonals)
  if (w && d) return 'n';  // screen top-right diagonal
  if (w && a) return 'w';  // screen top-left diagonal
  if (s && d) return 'e';  // screen bottom-right diagonal
  if (s && a) return 's';  // screen bottom-left diagonal

  // Single key = screen-relative (grid diagonals)
  if (w) return 'nw';  // screen up
  if (s) return 'se';  // screen down
  if (a) return 'sw';  // screen left
  if (d) return 'ne';  // screen right

  return null;
}

/**
 * Manages keyboard input setup, hotkey bindings, and mouse button tracking.
 * Extracted from WorldScene (Phase 152).
 */
export class InputController {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: WASDKeys | null = null;
  private leftMouseDown = false;
  private rightMouseDown = false;

  constructor(private scene: Phaser.Scene) {}

  /**
   * Set up all keyboard shortcuts and mouse tracking.
   * Called from WorldScene.create().
   */
  create(): void {
    if (this.scene.input.keyboard) {
      this.cursors = this.scene.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };

      // Tool swap hotkey: Q swaps main and secondary tool slots
      this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q).on('down', () => {
        if (this.scene.input.keyboard?.enabled) {
          gameSocket.emit('equipment:tool_swap', {});
        }
      });

      // UI toggle hotkeys: I=Inventory, E=Equipment, Tab=Storage, C=Chat
      this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I).on('down', () => {
        if (this.scene.input.keyboard?.enabled) {
          useGameStore.getState().toggleInventory();
        }
      });

      this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E).on('down', () => {
        if (this.scene.input.keyboard?.enabled) {
          useGameStore.getState().toggleEquipment();
        }
      });

      // K=Abilities (skills) panel
      this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K).on('down', () => {
        if (this.scene.input.keyboard?.enabled) {
          useGameStore.getState().toggleAbilities();
        }
      });

      // P is alias for E (both toggle equipment+stats panel)
      this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P).on('down', () => {
        if (this.scene.input.keyboard?.enabled) {
          useGameStore.getState().toggleEquipment();
        }
      });

      // Recall hotkey: H teleports player to faction hub from open world
      // Server validates and rejects if player is already in hub
      this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H).on('down', () => {
        if (this.scene.input.keyboard?.enabled) {
          gameSocket.emit('hub:recall', {});
        }
      });

      // Debug overlay toggle: F3 (always active regardless of keyboard enabled state)
      this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F3).on('down', () => {
        this.scene.events.emit('input:toggle-debug');
      });
    }

    // Track mouse buttons for tile inspection (both buttons = look at tile, like Tibia)
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.leftMouseDown = true;
      if (pointer.rightButtonDown()) this.rightMouseDown = true;

      // Both buttons pressed - emit event for tile info
      if (this.leftMouseDown && this.rightMouseDown) {
        this.scene.events.emit('input:both-buttons', pointer);
      }
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) this.leftMouseDown = false;
      if (!pointer.rightButtonDown()) this.rightMouseDown = false;

      // Hide tile info when any button released
      this.scene.events.emit('input:button-released');
    });

    // Prevent context menu on right click
    this.scene.input.mouse?.disableContextMenu();
  }

  /**
   * Get current movement key state (WASD + arrow keys merged).
   */
  getMovementKeys(): { W: boolean; A: boolean; S: boolean; D: boolean } {
    const keys = {
      W: this.wasd?.W.isDown ?? false,
      A: this.wasd?.A.isDown ?? false,
      S: this.wasd?.S.isDown ?? false,
      D: this.wasd?.D.isDown ?? false,
    };

    // Also support arrow keys mapped to same axes
    if (this.cursors) {
      if (this.cursors.up.isDown) keys.W = true;
      if (this.cursors.down.isDown) keys.S = true;
      if (this.cursors.left.isDown) keys.A = true;
      if (this.cursors.right.isDown) keys.D = true;
    }

    return keys;
  }

  /**
   * Check if keyboard input is enabled.
   */
  isKeyboardEnabled(): boolean {
    return this.scene.input.keyboard?.enabled ?? false;
  }

  isLeftMouseDown(): boolean {
    return this.leftMouseDown;
  }

  isRightMouseDown(): boolean {
    return this.rightMouseDown;
  }

  /**
   * Enable or disable keyboard input.
   * Called by React UI panels to prevent movement while typing or browsing.
   */
  setKeyboardEnabled(enabled: boolean): void {
    if (this.scene.input?.keyboard) {
      this.scene.input.keyboard.enabled = enabled;
    }
  }

  /**
   * Reset movement input state to prevent stuck keys.
   * Called when modal opens to clear any keys that were held during the click.
   */
  resetMovementInput(): void {
    // Reset WASD keys
    if (this.wasd) {
      this.wasd.W.reset();
      this.wasd.A.reset();
      this.wasd.S.reset();
      this.wasd.D.reset();
    }
    // Reset cursor keys
    if (this.cursors) {
      this.cursors.up.reset();
      this.cursors.down.reset();
      this.cursors.left.reset();
      this.cursors.right.reset();
    }
  }

  /**
   * Clean up input resources.
   */
  destroy(): void {
    this.cursors = null;
    this.wasd = null;
  }
}
