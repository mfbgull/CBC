/**
 * Export feature module
 * Handles PDF, Excel, and Print exports
 */

import { create } from 'zustand';
import type { ExportOptions } from '../../types/domain';

interface ExportState {
  // Export settings
  exportOptions: ExportOptions;
  isExporting: boolean;
  lastExportDate: string | null;
  error: string | null;

  // Actions
  setExportOptions: (options: Partial<ExportOptions>) => void;
  setExporting: (exporting: boolean) => void;
  setError: (error: string | null) => void;
  resetExportOptions: () => void;
}

export const useExportStore = create<ExportState>((set) => ({
  // Default export options
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
  isExporting: false,
  lastExportDate: null,
  error: null,

  // Actions
  setExportOptions: (options) => set((state) => ({
    exportOptions: { ...state.exportOptions, ...options },
  })),

  setExporting: (isExporting) => set({ isExporting }),

  setError: (error) => set({ error }),

  resetExportOptions: () => set({
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
  }),
}));