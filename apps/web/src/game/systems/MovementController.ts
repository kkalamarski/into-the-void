import { Direction, Position } from '@into-the-void/shared-types';
import { calculateNewPosition } from '@into-the-void/game-logic';
import { useGameStore } from '../../store/gameStore';
import { gameSocket } from '../../network/socket';

interface PendingInput {
  sequence: number;
  direction: Direction;
  timestamp: number;
}

export class MovementController {
  private pendingInputs: PendingInput[] = [];
  private inputSequence = 0;
  private collisionMap: boolean[][] | null = null;
  private onPositionUpdate: ((position: Position, reconciling: boolean) => void) | null = null;

  setCollisionMap(map: boolean[][]): void {
    this.collisionMap = map;
  }

  setPositionUpdateHandler(handler: (position: Position, reconciling: boolean) => void): void {
    this.onPositionUpdate = handler;
  }

  processInput(direction: Direction): void {
    const player = useGameStore.getState().player;
    if (!player) return;

    // Check collision map before predicting (basic client-side validation)
    if (this.collisionMap) {
      const newPos = calculateNewPosition(player.position, direction);
      // Only validate if staying in same zone (zone transitions handled by server)
      if (newPos.zoneId === player.position.zoneId) {
        if (this.collisionMap[newPos.y]?.[newPos.x]) {
          return; // Blocked, don't predict or send
        }
      }
    }

    this.inputSequence++;

    const input: PendingInput = {
      sequence: this.inputSequence,
      direction,
      timestamp: Date.now(),
    };

    // Step 1: Apply locally (prediction)
    this.applyInput(input);

    // Step 2: Store for reconciliation
    this.pendingInputs.push(input);

    // Limit pending inputs to prevent memory issues on high latency
    if (this.pendingInputs.length > 10) {
      this.pendingInputs.shift();
    }

    // Step 3: Send to server with sequence
    gameSocket.emit('player:move', {
      direction: input.direction,
      sequence: input.sequence,
    });
  }

  private applyInput(input: PendingInput): void {
    const player = useGameStore.getState().player;
    if (!player) return;

    const newPosition = calculateNewPosition(player.position, input.direction);

    // Update Zustand store
    useGameStore.getState().setPlayer({
      ...player,
      position: newPosition,
    });

    // Notify WorldScene for sprite update
    if (this.onPositionUpdate) {
      this.onPositionUpdate(newPosition, false);
    }
  }

  reconcile(serverPosition: Position, lastProcessedInput: number): Position {
    // Discard acknowledged inputs
    this.pendingInputs = this.pendingInputs.filter(
      (input) => input.sequence > lastProcessedInput
    );

    // Start from server's authoritative position
    let reconciledPosition = serverPosition;

    // Replay unacknowledged inputs
    for (const input of this.pendingInputs) {
      reconciledPosition = calculateNewPosition(reconciledPosition, input.direction);
    }

    // Get current client position BEFORE updating store
    const player = useGameStore.getState().player;
    const currentClientPosition = player?.position;

    // Check if reconciled position differs from current client position
    const positionMismatch = currentClientPosition && (
      reconciledPosition.x !== currentClientPosition.x ||
      reconciledPosition.y !== currentClientPosition.y ||
      reconciledPosition.zoneId !== currentClientPosition.zoneId
    );

    // Only update store if position changed
    if (player && positionMismatch) {
      useGameStore.getState().setPlayer({
        ...player,
        position: reconciledPosition,
      });
    }

    // Only notify WorldScene if there's an actual position correction needed
    // This prevents jitter from redundant updates when prediction was correct
    if (positionMismatch && this.onPositionUpdate) {
      this.onPositionUpdate(reconciledPosition, true);
    }

    return reconciledPosition;
  }

  clearPendingInputs(): void {
    this.pendingInputs = [];
    this.inputSequence = 0;
  }

  getPendingInputCount(): number {
    return this.pendingInputs.length;
  }
}
