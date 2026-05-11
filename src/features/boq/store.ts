/**
 * BOQ feature store
 * Manages BOQ items for the current project with SQLite persistence
 * Includes autosave functionality
 */

import { create } from 'zustand';
import type { BoqItem, BoqItemCreateInput } from '../../types/domain';
import * as db from '../../lib/db';
import { validateBoqItem } from '../../lib/calculations';

// Constants
export const UNIT_OPTIONS = [
  { value: 'sft', label: 'Sq. ft.' },
  { value: 'sqm', label: 'Sq. m.' },
  { value: 'cft', label: 'Cu. ft.' },
  { value: 'cbm', label: 'Cu. m.' },
  { value: 'rft', label: 'Rft' },
  { value: 'rm', label: 'R.m.' },
  { value: 'pcs', label: 'Pcs' },
  { value: 'bag', label: 'Bag' },
  { value: 'ton', label: 'Ton' },
  { value: 'kg', label: 'Kg' },
  { value: 'day', label: 'Day' },
  { value: 'point', label: 'Point' },
  { value: 'ls', label: 'Lump Sum' },
];

export const CATEGORY_OPTIONS = [
  { value: 'excavation', label: 'Excavation' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'structure', label: 'Structure' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'steel', label: 'Steel' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'other', label: 'Other' },
];

export interface BoqValidationResult {
  valid: boolean;
  errors: { id: number; description: string; field: string; message: string }[];
}

interface BoqState {
  // Data
  items: BoqItem[];
  selectedItemIds: number[];
  currentProjectId: number | null;
  isLoading: boolean;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: string | null;
  error: string | null;

  // Actions
  setItems: (items: BoqItem[]) => void;
  addItem: (input: Omit<BoqItemCreateInput, 'projectId'>) => Promise<BoqItem>;
  addItems: (inputs: Omit<BoqItemCreateInput, 'projectId'>[]) => Promise<void>;
  updateItem: (id: number, updates: Partial<BoqItem>) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  deleteItems: (ids: number[]) => Promise<void>;
  setSelectedItems: (ids: number[]) => void;
  clearSelection: () => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  reorderItems: (itemIds: number[]) => Promise<void>;
  toggleSectionHeader: (id: number) => Promise<void>;
  validate: () => BoqValidationResult;
  loadForProject: (projectId: number) => Promise<void>;
  clearProject: () => void;
}

// Debounce helper for autosave
let saveTimeouts: Map<number, ReturnType<typeof setTimeout>> = new Map();

function debounceSave(id: number, fn: () => void, delay = 500) {
  const existing = saveTimeouts.get(id);
  if (existing) clearTimeout(existing);
  
  const timeout = setTimeout(() => {
    fn();
    saveTimeouts.delete(id);
  }, delay);
  
  saveTimeouts.set(id, timeout);
}

export const useBoqStore = create<BoqState>()((set, get) => ({
  // Initial state
  items: [],
  selectedItemIds: [],
  currentProjectId: null,
  isLoading: false,
  isDirty: false,
  isSaving: false,
  lastSaved: null,
  error: null,

  setItems: (items) => set({ items }),

  addItem: async (input) => {
    const { currentProjectId } = get();
    if (!currentProjectId) throw new Error('No project selected');

    const itemInput: BoqItemCreateInput = {
      projectId: currentProjectId,
      description: input.description,
      quantity: input.quantity,
      unit: input.unit,
      rate: input.rate,
      category: input.category || 'other',
      isSectionHeader: input.isSectionHeader,
    };

    await db.createBoqItem(itemInput);
    
    // Refresh items from storage to ensure we have correct list
    const items = await db.getBoqItems(currentProjectId);
    set({ items, isDirty: false });
    
    return items[items.length - 1];
  },

  addItems: async (inputs) => {
    const { currentProjectId } = get();
    if (!currentProjectId) throw new Error('No project selected');
    
    for (const input of inputs) {
      const itemInput: BoqItemCreateInput = {
        projectId: currentProjectId,
        description: input.description,
        quantity: input.quantity,
        unit: input.unit,
        rate: input.rate,
        category: input.category || 'other',
        isSectionHeader: input.isSectionHeader,
      };
      await db.createBoqItem(itemInput);
    }

    // Refresh items from storage
    const items = await db.getBoqItems(currentProjectId);
    set({ items, isDirty: false });
  },

  updateItem: async (id, updates) => {
    // Optimistic update
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
      isDirty: true,
    }));

    // Debounced save to database
    const saveUpdate = async () => {
      set({ isSaving: true });
      try {
        const item = get().items.find(i => i.id === id);
        if (item) {
          await db.updateBoqItem({
            id,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            category: item.category,
            sortOrder: item.sortOrder,
            isSectionHeader: item.isSectionHeader,
          });
        }
        set({ isSaving: false, lastSaved: new Date().toISOString() });
      } catch (error) {
        console.error('Failed to save item:', error);
        set({ isSaving: false, error: 'Failed to save changes' });
      }
    };

    debounceSave(id, saveUpdate);
  },

  deleteItem: async (id) => {
    // Optimistic update
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      selectedItemIds: state.selectedItemIds.filter((itemId) => itemId !== id),
      isDirty: true,
    }));

    try {
      await db.deleteBoqItem(id);
    } catch (error) {
      console.error('Failed to delete item:', error);
      // Reload items on error
      const { currentProjectId } = get();
      if (currentProjectId) {
        const items = await db.getBoqItems(currentProjectId);
        set({ items });
      }
    }
  },

  deleteItems: async (ids) => {
    // Optimistic update
    set((state) => ({
      items: state.items.filter((item) => !ids.includes(item.id)),
      selectedItemIds: state.selectedItemIds.filter((id) => !ids.includes(id)),
      isDirty: true,
    }));

    try {
      await db.deleteMultipleBoqItems(ids);
    } catch (error) {
      console.error('Failed to delete items:', error);
      // Reload items on error
      const { currentProjectId } = get();
      if (currentProjectId) {
        const items = await db.getBoqItems(currentProjectId);
        set({ items });
      }
    }
  },

  setSelectedItems: (ids) => set({ selectedItemIds: ids }),

  clearSelection: () => set({ selectedItemIds: [] }),

  setLoading: (isLoading) => set({ isLoading }),

  setSaving: (isSaving) => set({ isSaving }),

  setError: (error) => set({ error }),

  reorderItems: async (itemIds) => {
    const { currentProjectId, items } = get();
    if (!currentProjectId) return;

    // Optimistic update - update sort order in memory
    const reorderedItems = itemIds.map((id, index) => {
      const item = items.find(i => i.id === id);
      return item ? { ...item, sortOrder: index } : null;
    }).filter(Boolean) as BoqItem[];

    set({ items: reorderedItems, isDirty: true });

    // Save to database
    try {
      await db.reorderBoqItems(currentProjectId, itemIds);
      set({ lastSaved: new Date().toISOString() });
    } catch (error) {
      console.error('Failed to reorder items:', error);
    }
  },

  toggleSectionHeader: async (id) => {
    const item = get().items.find(i => i.id === id);
    if (!item) return;

    const updates: Partial<BoqItem> = {
      isSectionHeader: !item.isSectionHeader,
    };

    // Optimistic update
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      ),
      isDirty: true,
    }));

    try {
      await db.updateBoqItem({
        id,
        isSectionHeader: !item.isSectionHeader,
      });
    } catch (error) {
      console.error('Failed to toggle section header:', error);
    }
  },

  validate: () => {
    const { items } = get();
    const errors: BoqValidationResult['errors'] = [];

    items.forEach((item) => {
      const itemErrors = validateBoqItem(item);
      if (itemErrors.length > 0) {
        errors.push({
          id: item.id,
          description: item.description,
          field: 'general',
          message: itemErrors.join(', '),
        });
      }
    });

    return { valid: errors.length === 0, errors };
  },

  loadForProject: async (projectId: number) => {
    set({ isLoading: true, currentProjectId: projectId, error: null });
    
    try {
      const items = await db.getBoqItems(projectId);
      console.log('[Store] loadForProject:', projectId, '→ items:', items.length);
      set({ items, isLoading: false, isDirty: false, lastSaved: null });
    } catch (error) {
      console.error('[Store] Failed to load BOQ items:', error);
      set({ error: 'Failed to load BOQ items', isLoading: false });
    }
  },

  clearProject: () => {
    set({
      items: [],
      currentProjectId: null,
      isDirty: false,
      lastSaved: null,
      selectedItemIds: [],
    });
    // Clear any pending save timeouts
    saveTimeouts.forEach((timeout) => clearTimeout(timeout));
    saveTimeouts.clear();
  },
}));

// Simple selectors
export const selectBoqItems = (state: BoqState) => state.items;
export const selectBoqIsDirty = (state: BoqState) => state.isDirty;
export const selectBoqSelectedIds = (state: BoqState) => state.selectedItemIds;
export const selectCurrentProjectId = (state: BoqState) => state.currentProjectId;