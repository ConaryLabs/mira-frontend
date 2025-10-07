// src/stores/useUIStore.ts
// Transient UI state - input, modals, loading states, and tab navigation

import { create } from 'zustand';

type Tab = 'chat' | 'projects';

interface UIState {
  // Input state
  inputContent: string;
  isWaitingForResponse: boolean;
  
  // Modal state
  activeModal: string | null;
  
  // Tab navigation
  activeTab: Tab;
  
  // Actions
  setInputContent: (content: string) => void;
  setWaitingForResponse: (waiting: boolean) => void;
  clearInput: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  setActiveTab: (tab: Tab) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  inputContent: '',
  isWaitingForResponse: false,
  activeModal: null,
  activeTab: 'chat',
  
  // Actions
  setInputContent: (content) => set({ inputContent: content }),
  setWaitingForResponse: (waiting) => set({ isWaitingForResponse: waiting }),
  clearInput: () => set({ inputContent: '' }),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

// Optimized selector hooks - components use these to avoid re-renders
export const useInputContent = () => useUIStore(state => state.inputContent);
export const useIsWaiting = () => useUIStore(state => state.isWaitingForResponse);
export const useActiveModal = () => useUIStore(state => state.activeModal);
export const useActiveTab = () => useUIStore(state => state.activeTab);
