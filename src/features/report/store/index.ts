/**
 * Report feature store
 * Minimal state — report view is mostly derived from BOQ + Spec stores
 */

import { create } from 'zustand';

interface ReportState {
  expandedSections: string[];
  toggleSection: (key: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
}

const ALL_SECTIONS: string[] = ['excavation', 'structure', 'finishing', 'mep', 'other'];

export const useReportStore = create<ReportState>((set) => ({
  expandedSections: [...ALL_SECTIONS],

  toggleSection: (key) =>
    set((state) => ({
      expandedSections: state.expandedSections.includes(key)
        ? state.expandedSections.filter((s) => s !== key)
        : [...state.expandedSections, key],
    })),

  expandAll: () => set({ expandedSections: [...ALL_SECTIONS] }),

  collapseAll: () => set({ expandedSections: [] }),
}));