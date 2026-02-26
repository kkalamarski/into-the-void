import { create } from 'zustand';

interface ModalEntry {
  id: string;
  onClose: () => void;
}

interface ModalStackState {
  stack: ModalEntry[];
  push: (id: string, onClose: () => void) => void;
  pop: () => void;
  popById: (id: string) => void;
  peek: () => ModalEntry | undefined;
}

export const useModalStackStore = create<ModalStackState>((set, get) => ({
  stack: [],

  push: (id, onClose) =>
    set((state) => {
      // Idempotent guard: do not push duplicate ids
      if (state.stack.some((entry) => entry.id === id)) {
        return state;
      }
      return { stack: [...state.stack, { id, onClose }] };
    }),

  pop: () =>
    set((state) => ({
      stack: state.stack.slice(0, -1),
    })),

  popById: (id) =>
    set((state) => ({
      stack: state.stack.filter((entry) => entry.id !== id),
    })),

  peek: () => {
    const stack = get().stack;
    return stack[stack.length - 1];
  },
}));
