import { create } from 'zustand';

interface KbState {
  items: [];
  isLoading: boolean;
}

export const useKbStore = create<KbState>(() => ({
  items: [],
  isLoading: false,
}));
