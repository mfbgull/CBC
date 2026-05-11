/**
 * Settings feature store
 * Manages app settings with SQLite persistence
 */

import { create } from 'zustand';
import type { Settings, ExportOptions } from '../../types/domain';
import { DEFAULT_SETTINGS } from '../../types/domain';
import * as db from '../../lib/db';

// Debounce helper
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

interface SettingsState {
  // Settings data
  settings: Settings;
  exportOptions: ExportOptions;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  setSettings: (settings: Partial<Settings>) => void;
  setExportOptions: (options: Partial<ExportOptions>) => void;
  resetSettings: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  // Initial state
  settings: DEFAULT_SETTINGS,
  exportOptions: {
    includeCompanyDetails: true,
    includeProjectDetails: true,
    includeTax: true,
    taxRate: 10,
    includeContingency: true,
    contingencyRate: 5,
    includeProfitMargin: true,
    profitMarginRate: 10,
    pageSize: 'a4',
    orientation: 'portrait',
  },
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    if (get().isInitialized) return;
    
    set({ isLoading: true, error: null });
    try {
      const settings = await db.getSettings();
      set({ settings, isLoading: false, isInitialized: true });
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ error: 'Failed to load settings', isLoading: false });
    }
  },

  setSettings: (newSettings) => {
    // Optimistic update
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));

    // Debounced save
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        const { settings } = get();
        await db.updateSettings(settings);
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    }, 500);
  },

  setExportOptions: (newOptions) => set((state) => ({
    exportOptions: { ...state.exportOptions, ...newOptions },
  })),

  resetSettings: () => {
    set({ settings: DEFAULT_SETTINGS });
    
    // Save to database
    db.updateSettings(DEFAULT_SETTINGS).catch(console.error);
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));