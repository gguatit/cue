import { create } from 'zustand'

interface UiState {
  tab: string
  setTab: (tab: string) => void
}

export const useUi = create<UiState>((set) => ({
  tab: 'input',
  setTab: (tab) => set({ tab }),
}))
