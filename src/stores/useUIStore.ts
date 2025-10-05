// src/stores/useUIStore.ts
// Transient UI state - input, modals, loading states

import { create } from 'zustand';

interface UIState {
  inputContent: string;
  isWaitingForResponse: boolean;
  activeModal: string | null;
  
  setInputContent: (content: string) => void;
  setWaitingForResponse: (waiting: boolean) => void;
  clearInput: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  inputContent: '',
  isWaitingForResponse: false,
  activeModal: null,
  
  setInputContent: (content) => set({ inputContent: content }),
  setWaitingForResponse: (waiting) => set({ isWaitingForResponse: waiting }),
  clearInput: () => set({ inputContent: '' }),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}));

// Optimized selector hooks - components use these to avoid re-renders
export const useInputContent = () => useUIStore(state => state.inputContent);
export const useIsWaiting = () => useUIStore(state => state.isWaitingForResponse);
export const useActiveModal = () => useUIStore(state => state.activeModal);
