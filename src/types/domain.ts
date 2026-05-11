/**
 * Domain types for the Construction BOQ Calculator
 * All types must follow strict typing rules - no 'any' allowed
 */

export type ProjectType = 'residential' | 'commercial' | 'industrial' | 'infrastructure';

export interface Project {
  readonly id: number;
  name: string;
  clientName: string;
  clientPhone: string;
  projectType: ProjectType;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreateInput {
  name: string;
  clientName?: string;
  clientPhone?: string;
  projectType?: ProjectType;
  location?: string;
}

export interface ProjectUpdateInput {
  id: number;
  name?: string;
  clientName?: string;
  clientPhone?: string;
  projectType?: ProjectType;
  location?: string;
}

export type BoqItemCategory = 
  | 'excavation'
  | 'foundation'
  | 'structure'
  | 'masonry'
  | 'concrete'
  | 'steel'
  | 'plumbing'
  | 'electrical'
  | 'finishing'
  | 'other';

export interface BoqItem {
  readonly id: number;
  projectId: number;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  category: BoqItemCategory;
  sortOrder: number;
  isSectionHeader: boolean;
}

export interface BoqItemCreateInput {
  projectId: number;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  category?: BoqItemCategory;
  sortOrder?: number;
  isSectionHeader?: boolean;
}

export interface BoqItemUpdateInput {
  id: number;
  description?: string;
  quantity?: number;
  unit?: string;
  rate?: number;
  category?: BoqItemCategory;
  sortOrder?: number;
  isSectionHeader?: boolean;
}

export type RateCategory = 'material' | 'labour' | 'equipment' | 'other';

export interface MaterialRate {
  readonly id: number;
  name: string;
  category: RateCategory;
  unit: string;
  rate: number;
  city: string;
  updatedAt: string;
}

export interface MaterialRateCreateInput {
  name: string;
  category: RateCategory;
  unit: string;
  rate: number;
  city?: string;
}

export interface MaterialRateUpdateInput {
  id: number;
  name?: string;
  category?: RateCategory;
  unit?: string;
  rate?: number;
  city?: string;
}

export interface Template {
  readonly id: number;
  name: string;
  category: string;
  description: string;
  items: TemplateItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface TemplateItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  category: BoqItemCategory;
}

export interface CalculationResult {
  subtotal: number;
  tax: number;
  taxRate: number;
  contingency: number;
  contingencyRate: number;
  profitMargin: number;
  profitMarginRate: number;
  grandTotal: number;
}

export interface BoqSummary {
  items: BoqItem[];
  subtotal: number;
  itemCount: number;
  categoryTotals: Record<BoqItemCategory, number>;
}

export interface ExportOptions {
  includeCompanyDetails: boolean;
  includeProjectDetails: boolean;
  includeTax: boolean;
  taxRate: number;
  includeContingency: boolean;
  contingencyRate: number;
  includeProfitMargin: boolean;
  profitMarginRate: number;
  pageSize: 'a4' | 'a3' | 'letter';
  orientation: 'portrait' | 'landscape';
}

export interface Settings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  defaultTaxRate: number;
  defaultContingencyRate: number;
  defaultProfitMarginRate: number;
  defaultCity: string;
  currency: string;
  dateFormat: string;
}

export const DEFAULT_SETTINGS: Settings = {
  companyName: '',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  defaultTaxRate: 10,
  defaultContingencyRate: 5,
  defaultProfitMarginRate: 10,
  defaultCity: 'Lahore',
  currency: 'PKR',
  dateFormat: 'YYYY-MM-DD',
};

export interface ValidationError {
  field: string;
  message: string;
}

export interface SaveResult {
  success: boolean;
  error?: string;
}