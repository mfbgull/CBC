/**
 * Material/Labour rates feature store
 * Manages the rate library with SQLite persistence
 */

import { create } from 'zustand';
import type { MaterialRate, MaterialRateCreateInput, RateCategory } from '../../types/domain';
import * as db from '../../lib/db';
import { logger } from '../../lib/logger';

// Constants
export const RATE_CATEGORY_OPTIONS = [
  { value: 'material', label: 'Material' },
  { value: 'labour', label: 'Labour' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'other', label: 'Other' },
];

interface RatesState {
  // Data
  rates: MaterialRate[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Filter state
  searchQuery: string;
  categoryFilter: RateCategory | 'all';
  cityFilter: string;

  // Actions
  initialize: () => Promise<void>;
  setRates: (rates: MaterialRate[]) => void;
  addRate: (input: MaterialRateCreateInput) => Promise<MaterialRate>;
  updateRate: (id: number, updates: Partial<MaterialRate>) => Promise<void>;
  deleteRate: (id: number) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: RateCategory | 'all') => void;
  setCityFilter: (city: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  searchRates: (query: string) => Promise<MaterialRate[]>;
}

// Debounce helper
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

export const useRatesStore = create<RatesState>()((set, get) => ({
  // Initial state
  rates: [],
  isLoading: false,
  isInitialized: false,
  error: null,
  searchQuery: '',
  categoryFilter: 'all',
  cityFilter: '',

  initialize: async () => {
    if (get().isInitialized) return;
    
    set({ isLoading: true, error: null });
    try {
      const rates = await db.getAllRates();
      set({ rates, isLoading: false, isInitialized: true });
    } catch (error) {
      logger.error('Failed to load rates:', error);
      set({ error: 'Failed to load rates', isLoading: false });
    }
  },

  setRates: (rates) => set({ rates }),

  addRate: async (input: MaterialRateCreateInput) => {
    set({ isLoading: true });
    try {
      const newRate = await db.createRate(input);
      set((state) => ({
        rates: [...state.rates, newRate],
        isLoading: false,
      }));
      return newRate;
    } catch (error) {
      logger.error('Failed to create rate:', error);
      set({ error: 'Failed to create rate', isLoading: false });
      throw error;
    }
  },

  updateRate: async (id: number, updates: Partial<MaterialRate>) => {
    // Optimistic update
    set((state) => ({
      rates: state.rates.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
      ),
    }));

    try {
      await db.updateRate({
        id,
        name: updates.name,
        category: updates.category,
        unit: updates.unit,
        rate: updates.rate,
        city: updates.city,
      });
    } catch (error) {
      logger.error('Failed to update rate:', error);
      // Reload on error
      const rates = await db.getAllRates();
      set({ rates });
    }
  },

  deleteRate: async (id: number) => {
    // Optimistic update
    set((state) => ({
      rates: state.rates.filter((r) => r.id !== id),
    }));

    try {
      await db.deleteRate(id);
    } catch (error) {
      logger.error('Failed to delete rate:', error);
      // Reload on error
      const rates = await db.getAllRates();
      set({ rates });
    }
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),

  setCityFilter: (cityFilter) => set({ cityFilter }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  searchRates: async (query: string) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    
    if (!query.trim()) {
      // Return all rates if query is empty
      return get().rates;
    }

    return new Promise((resolve) => {
      searchTimeout = setTimeout(async () => {
        try {
          const results = await db.searchRates(query);
          resolve(results);
        } catch (error) {
          logger.error('Search failed:', error);
          resolve([]);
        }
      }, 200);
    });
  },
}));

// Simple selectors
export const selectAllRates = (state: RatesState) => state.rates;
export const selectSearchQuery = (state: RatesState) => state.searchQuery;
export const selectCategoryFilter = (state: RatesState) => state.categoryFilter;
export const selectIsInitialized = (state: RatesState) => state.isInitialized;