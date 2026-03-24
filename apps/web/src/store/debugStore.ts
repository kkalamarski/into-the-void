import { create } from 'zustand';

export interface DebugData {
  px: number;
  py: number;
  zoneId: string;
  tileX: number;
  tileY: number;
  elevation: number;
  tileType: string;
  biomeName: string;
  fps: number;
  entityCount: number;
  ping: number;
  chunksLoaded: number;
  chunksPending: number;
  chunksFailed: number;
  dayNightPhase: string;
  dayNightProgress: number;
  combatState: string;
  targetId: string;
}

interface DebugStore {
  visible: boolean;
  data: DebugData;
  toggle: () => void;
  setVisible: (v: boolean) => void;
  updateData: (partial: Partial<DebugData>) => void;
}

const defaultData: DebugData = {
  px: 0, py: 0, zoneId: '-', tileX: 0, tileY: 0,
  elevation: 0, tileType: '-', biomeName: '-',
  fps: 0, entityCount: 0, ping: 0,
  chunksLoaded: 0, chunksPending: 0, chunksFailed: 0,
  dayNightPhase: '-', dayNightProgress: 0,
  combatState: 'None', targetId: 'None',
};

export const useDebugStore = create<DebugStore>((set) => ({
  visible: false,
  data: defaultData,
  toggle: () => set((s) => ({ visible: !s.visible })),
  setVisible: (v) => set({ visible: v }),
  updateData: (partial) => set((s) => ({ data: { ...s.data, ...partial } })),
}));
