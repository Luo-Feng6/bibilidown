import { create } from 'zustand'

export type AppView = 'download' | 'settings' | 'history' | 'about'

interface NavigationStore {
  currentView: AppView
  navigate: (view: AppView) => void
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  currentView: 'download',
  navigate: (view) => set({ currentView: view }),
}))
