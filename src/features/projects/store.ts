/**
 * Projects feature store
 * Uses Zustand for state management with SQLite persistence
 */

import { create } from 'zustand';
import type { Project, ProjectCreateInput, ProjectUpdateInput } from '../../types/domain';
import * as db from '../../lib/db';

interface ProjectsState {
  // Data
  projects: Project[];
  currentProjectId: number | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  setProjects: (projects: Project[]) => void;
  addProject: (input: ProjectCreateInput) => Promise<Project>;
  updateProject: (input: ProjectUpdateInput) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  setCurrentProject: (id: number | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// Debounce helper
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  // Initial state
  projects: [],
  currentProjectId: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  // Initialize - load projects from SQLite
  initialize: async () => {
    if (get().isInitialized) return;
    
    set({ isLoading: true, error: null });
    try {
      const projects = await db.getAllProjects();
      set({ projects, isLoading: false, isInitialized: true });
    } catch (error) {
      console.error('Failed to load projects:', error);
      set({ error: 'Failed to load projects', isLoading: false });
    }
  },

  setProjects: (projects) => set({ projects }),

  addProject: async (input: ProjectCreateInput) => {
    set({ isLoading: true });
    try {
      const newProject = await db.createProject(input);
      set((state) => ({
        projects: [newProject, ...state.projects],
        isLoading: false,
      }));
      return newProject;
    } catch (error) {
      console.error('Failed to create project:', error);
      set({ error: 'Failed to create project', isLoading: false });
      throw error;
    }
  },

  updateProject: async (input: ProjectUpdateInput) => {
    // Optimistic update
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === input.id
          ? { ...p, ...input, updatedAt: new Date().toISOString() }
          : p
      ),
    }));

    // Debounced save
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        await db.updateProject(input);
      } catch (error) {
        console.error('Failed to update project:', error);
        // Reload on error to get consistent state
        const projects = await db.getAllProjects();
        set({ projects });
      }
    }, 300);
  },

  deleteProject: async (id: number) => {
    // Optimistic update
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
    }));

    try {
      await db.deleteProject(id);
    } catch (error) {
      console.error('Failed to delete project:', error);
      // Reload on error
      const projects = await db.getAllProjects();
      set({ projects });
    }
  },

  setCurrentProject: (id) => set({ currentProjectId: id }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));

// Simple selectors
export const selectAllProjects = (state: ProjectsState) => state.projects;
export const selectCurrentProjectId = (state: ProjectsState) => state.currentProjectId;
export const selectIsInitialized = (state: ProjectsState) => state.isInitialized;