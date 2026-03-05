import { create } from 'zustand';
import { gameSocket } from '../network/socket';
import type { AutomationPanelEntry, LootWindowData, AutomationStructureType } from '@into-the-void/shared-types';

interface AutomationState {
  // Panel data
  structures: AutomationPanelEntry[];
  setStructures: (structures: AutomationPanelEntry[]) => void;

  // Loot window
  lootWindow: LootWindowData | null;
  setLootWindow: (data: LootWindowData | null) => void;
  closeLootWindow: () => void;

  // Active tab in panel
  activeTab: AutomationStructureType;
  setActiveTab: (tab: AutomationStructureType) => void;

  // Request panel refresh
  requestPanelUpdate: () => void;
}

export const useAutomationStore = create<AutomationState>((set) => ({
  structures: [],
  setStructures: (structures) => set({ structures }),

  lootWindow: null,
  setLootWindow: (data) => set({ lootWindow: data }),
  closeLootWindow: () => set({ lootWindow: null }),

  activeTab: 'extractor',
  setActiveTab: (tab) => set({ activeTab: tab }),

  requestPanelUpdate: () => {
    gameSocket.emit('automation:panel_request', {} as Record<string, never>);
  },
}));

// Socket event handlers (side-effect import pattern — same as chatStore, questStore)
gameSocket.on('automation:panel_state', (data) => {
  useAutomationStore.getState().setStructures(data.structures);
});

gameSocket.on('automation:loot_window', (data) => {
  useAutomationStore.getState().setLootWindow(data);
});

gameSocket.on('automation:collected', () => {
  // Close loot window after collection
  useAutomationStore.getState().closeLootWindow();
});

gameSocket.on('automation:refueled', (data) => {
  // Update loot window fuel level if open
  const current = useAutomationStore.getState().lootWindow;
  if (current && current.deployableId === data.deployableId) {
    useAutomationStore.getState().setLootWindow({
      ...current,
      fuelLevel: data.fuelLevel,
      maxFuel: data.maxFuel,
      status: 'active', // Refueling reactivates
    });
  }
  // Refresh panel
  useAutomationStore.getState().requestPanelUpdate();
});

gameSocket.on('automation:status_update', (data) => {
  // Update individual structure in panel state
  const structures = useAutomationStore.getState().structures;
  const updated = structures.map(s =>
    s.deployableId === data.deployableId
      ? {
          ...s,
          status: data.status as 'active' | 'depleted' | 'husk',
          fuelLevel: data.fuelLevel,
          durabilityPercent: data.durabilityPercent,
          accumulatedCount: data.accumulatedCount,
        }
      : s
  );
  useAutomationStore.getState().setStructures(updated);
});

gameSocket.on('automation:dismantled', () => {
  useAutomationStore.getState().closeLootWindow();
  useAutomationStore.getState().requestPanelUpdate();
});
