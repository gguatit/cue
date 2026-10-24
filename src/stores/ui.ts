import { create } from 'zustand'

interface UiState {
  tab: string
  setTab: (tab: string) => void
}

export const useUi = create<UiState>((set) => ({
  tab: 'general',
  setTab: (tab) => set({ tab }),
}))
