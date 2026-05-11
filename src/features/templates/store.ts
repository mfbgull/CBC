/**
 * Templates feature store
 * Manages BOQ templates with SQLite persistence
 */

import { create } from 'zustand';
import type { Template, TemplateItem } from '../../types/domain';
import * as db from '../../lib/db';

interface TemplatesState {
  // Data
  templates: Template[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  addTemplate: (name: string, description: string, category: string, items: TemplateItem[]) => Promise<Template>;
  updateTemplate: (id: number, name: string, description: string, category: string, items: TemplateItem[]) => Promise<void>;
  deleteTemplate: (id: number) => Promise<void>;
  getTemplate: (id: number) => Promise<Template | null>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTemplatesStore = create<TemplatesState>()((set, get) => ({
  // Initial state
  templates: [],
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    if (get().isInitialized) return;
    
    set({ isLoading: true, error: null });
    try {
      const templates = await db.getAllTemplates();
      set({ templates, isLoading: false, isInitialized: true });
    } catch (error) {
      console.error('Failed to load templates:', error);
      set({ error: 'Failed to load templates', isLoading: false });
    }
  },

  addTemplate: async (name: string, description: string, category: string, items: TemplateItem[]) => {
    set({ isLoading: true });
    try {
      const newTemplate = await db.createTemplate(name, description, category, items);
      set((state) => ({
        templates: [...state.templates, newTemplate],
        isLoading: false,
      }));
      return newTemplate;
    } catch (error) {
      console.error('Failed to create template:', error);
      set({ error: 'Failed to create template', isLoading: false });
      throw error;
    }
  },

  updateTemplate: async (id: number, name: string, description: string, category: string, items: TemplateItem[]) => {
    // Optimistic update
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === id ? { ...t, name, description, category, items, updatedAt: new Date().toISOString() } : t
      ),
    }));

    try {
      await db.updateTemplate(id, name, description, category, items);
    } catch (error) {
      console.error('Failed to update template:', error);
      // Reload on error
      const templates = await db.getAllTemplates();
      set({ templates });
    }
  },

  deleteTemplate: async (id: number) => {
    // Optimistic update
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== id),
    }));

    try {
      await db.deleteTemplate(id);
    } catch (error) {
      console.error('Failed to delete template:', error);
      // Reload on error
      const templates = await db.getAllTemplates();
      set({ templates });
    }
  },

  getTemplate: async (id: number) => {
    try {
      return await db.getTemplate(id);
    } catch (error) {
      console.error('Failed to get template:', error);
      return null;
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));

// Simple selectors
export const selectAllTemplates = (state: TemplatesState) => state.templates;
export const selectIsInitialized = (state: TemplatesState) => state.isInitialized;