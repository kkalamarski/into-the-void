import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { Entity } from '@into-the-void/shared-types';
import { gameSocket } from '../network/socket';

// Required: enable immer Map/Set support before store creation
// Without this, state.entities.set() and state.entities.delete() throw runtime errors
enableMapSet();

interface EntityState {
  entities: Map<string, Entity>;
  spawnEntity: (entity: Entity) => void;
  updateEntity: (entityId: string, changes: Partial<Entity>) => void;
  despawnEntity: (entityId: string) => void;
  clearEntities: () => void;
  getEntityAtPosition: (x: number, y: number, zoneId: string) => Entity | undefined;
}

export const useEntityStore = create<EntityState>()(
  immer((set, get) => ({
    entities: new Map(),

    spawnEntity: (entity) => set((state) => {
      state.entities.set(entity.id, entity);
    }),

    updateEntity: (entityId, changes) => set((state) => {
      const existing = state.entities.get(entityId);
      if (existing) {
        state.entities.set(entityId, { ...existing, ...changes });
      }
    }),

    despawnEntity: (entityId) => set((state) => {
      state.entities.delete(entityId);
    }),

    clearEntities: () => set((state) => {
      state.entities = new Map();
    }),

    // Use get() not set() to avoid immer draft proxy issues
    getEntityAtPosition: (x, y, zoneId) => {
      for (const e of get().entities.values()) {
        if (e.active && e.position.x === x && e.position.y === y && e.position.zoneId === zoneId) {
          return e;
        }
      }
      return undefined;
    },
  }))
);

// Wire socket events at module level
// Note: GameSocket supports multiple handlers per event — both gameStore and entityStore
// handlers fire. gameStore drives Phaser rendering; entityStore drives React components
// and pathfinding queries.
gameSocket.on('entity:spawn', (entity: Entity) => {
  useEntityStore.getState().spawnEntity(entity);
});

gameSocket.on('entity:update', ({ entityId, changes }: { entityId: string; changes: Partial<Entity> }) => {
  useEntityStore.getState().updateEntity(entityId, changes);
});

gameSocket.on('entity:despawn', ({ entityId }: { entityId: string }) => {
  useEntityStore.getState().despawnEntity(entityId);
});

gameSocket.on('entity:batch', ({ updates }: { updates: Array<{ entityId: string; changes: Partial<Entity> }> }) => {
  const store = useEntityStore.getState();
  for (const { entityId, changes } of updates) {
    store.updateEntity(entityId, changes);
  }
});

// CRAI-04/06: Frenzy state change — update entity so EntityRenderer can react
gameSocket.on('creature:frenzy', ({ entityId, frenzied }: { entityId: string; frenzied: boolean }) => {
  useEntityStore.getState().updateEntity(entityId, { frenzied } as Partial<Entity>);
});

// CRAI-01: Stampede — dispatch DOM event for Phaser camera shake
gameSocket.on('creature:stampede', ({ affectedPlayerIds, damage }: {
  zoneId: string;
  creatureIds: string[];
  direction: { dx: number; dy: number };
  affectedPlayerIds: string[];
  damage: number;
}) => {
  // Dispatch custom event for Phaser scene to pick up (camera shake)
  window.dispatchEvent(new CustomEvent('creature:stampede', {
    detail: { affectedPlayerIds, damage },
  }));
});
