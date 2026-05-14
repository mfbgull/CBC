/**
 * Database layer for Construction BOQ Calculator
 * Uses localStorage for persistence (works in both web and Tauri)
 * SQLite can be added later when Tauri is fully working
 */

import type {
  Project,
  ProjectCreateInput,
  ProjectUpdateInput,
  BoqItem,
  BoqItemCreateInput,
  BoqItemUpdateInput,
  MaterialRate,
  MaterialRateCreateInput,
  MaterialRateUpdateInput,
  Template,
  TemplateItem,
  Settings,
} from '../types/domain';
import { logger } from './logger';
import type { ProjectSpec } from '../features/spec/types';
import type { MilestonePaymentPlan } from '../features/payment/store';

// Storage keys
const STORAGE_KEYS = {
  projects: 'boq_projects',
  boqItems: 'boq_items',
  rates: 'boq_rates',
  templates: 'boq_templates',
  settings: 'boq_settings',
  specs: 'boq_specs',
  paymentPlans: 'boq_payment_plans',
};

// In-memory cache
let cachedProjects: Project[] = [];
let cachedRates: MaterialRate[] = [];
let cachedTemplates: Template[] = [];
let cachedSettings: Settings | null = null;

/**
 * Load data from localStorage
 */
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Save data to localStorage
 */
function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    logger.error('Failed to save to localStorage:', error);
  }
}

// Sample data
const SAMPLE_RATES: MaterialRate[] = [
  { id: 1, name: 'Cement (OPC)', category: 'material', unit: 'bag', rate: 1250, city: 'Lahore', updatedAt: '2024-01-15' },
  { id: 2, name: 'Sand', category: 'material', unit: 'cft', rate: 45, city: 'Lahore', updatedAt: '2024-01-15' },
  { id: 3, name: 'Crush', category: 'material', unit: 'cft', rate: 85, city: 'Lahore', updatedAt: '2024-01-15' },
  { id: 4, name: 'Steel (Grade 60)', category: 'material', unit: 'ton', rate: 285000, city: 'Lahore', updatedAt: '2024-01-15' },
  { id: 5, name: 'Bricks', category: 'material', unit: 'pcs', rate: 18, city: 'Lahore', updatedAt: '2024-01-15' },
  { id: 6, name: 'Masonry Labour', category: 'labour', unit: 'cft', rate: 45, city: 'Lahore', updatedAt: '2024-01-15' },
  { id: 7, name: 'Carpenter', category: 'labour', unit: 'day', rate: 2500, city: 'Lahore', updatedAt: '2024-01-15' },
  { id: 8, name: 'Mistri', category: 'labour', unit: 'day', rate: 3500, city: 'Lahore', updatedAt: '2024-01-15' },
  { id: 9, name: 'Painter', category: 'labour', unit: 'sqft', rate: 15, city: 'Lahore', updatedAt: '2024-01-15' },
  { id: 10, name: 'Electrician', category: 'labour', unit: 'point', rate: 400, city: 'Lahore', updatedAt: '2024-01-15' },
  { id: 11, name: 'Plumber', category: 'labour', unit: 'point', rate: 350, city: 'Lahore', updatedAt: '2024-01-15' },
  { id: 12, name: 'Concrete Mix 1:2:4', category: 'material', unit: 'cft', rate: 320, city: 'Lahore', updatedAt: '2024-01-15' },
];

const DEFAULT_SETTINGS: Settings = {
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

/**
 * Initialize database (localStorage mode)
 */
export async function initDatabase(): Promise<void> {
  logger.debug('Initializing database (localStorage mode)...');
  
  // Load cached data
  cachedProjects = loadFromStorage<Project[]>(STORAGE_KEYS.projects, []);
  cachedRates = loadFromStorage<MaterialRate[]>(STORAGE_KEYS.rates, []);
  cachedTemplates = loadFromStorage<Template[]>(STORAGE_KEYS.templates, []);
  cachedSettings = loadFromStorage<Settings | null>(STORAGE_KEYS.settings, null);
  
  // Initialize with sample data if empty
  if (cachedRates.length === 0) {
    cachedRates = [...SAMPLE_RATES];
    saveToStorage(STORAGE_KEYS.rates, cachedRates);
  }
  
  if (!cachedSettings) {
    cachedSettings = DEFAULT_SETTINGS;
    saveToStorage(STORAGE_KEYS.settings, cachedSettings);
  }
  
  logger.debug('Database initialized with localStorage');
}

/**
 * Check if SQLite is available (false for localStorage mode)
 */
export function isSqliteAvailable(): boolean {
  return false; // Using localStorage for now
}

// ============================================
// PROJECT OPERATIONS
// ============================================

export async function getAllProjects(): Promise<Project[]> {
  return cachedProjects;
}

export async function getProject(id: number): Promise<Project | null> {
  return cachedProjects.find(p => p.id === id) || null;
}

export async function createProject(input: ProjectCreateInput): Promise<Project> {
  const maxId = cachedProjects.reduce((max, p) => p.id > max ? p.id : max, 0);
  const newProject: Project = {
    id: maxId + 1,
    name: input.name,
    clientName: input.clientName || '',
    clientPhone: input.clientPhone || '',
    projectType: input.projectType || 'residential',
    location: input.location || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  cachedProjects = [newProject, ...cachedProjects];
  saveToStorage(STORAGE_KEYS.projects, cachedProjects);
  return newProject;
}

export async function updateProject(input: ProjectUpdateInput): Promise<Project> {
  const index = cachedProjects.findIndex(p => p.id === input.id);
  if (index === -1) throw new Error('Project not found');
  
  cachedProjects[index] = {
    ...cachedProjects[index],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  saveToStorage(STORAGE_KEYS.projects, cachedProjects);
  return cachedProjects[index];
}

export async function deleteProject(id: number): Promise<void> {
  cachedProjects = cachedProjects.filter(p => p.id !== id);
  saveToStorage(STORAGE_KEYS.projects, cachedProjects);
}

// ============================================
// BOQ ITEM OPERATIONS
// ============================================

export async function getBoqItems(projectId: number): Promise<BoqItem[]> {
  const allItems = loadFromStorage<BoqItem[]>(STORAGE_KEYS.boqItems, []);
  const filtered = allItems.filter(item => item.projectId === projectId);
  console.log('[DB] getBoqItems for project', projectId, ':', filtered.length, 'items');
  console.log('[DB] allItems in storage:', allItems.length);
  return filtered.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createBoqItem(input: BoqItemCreateInput): Promise<BoqItem> {
  const allItems = loadFromStorage<BoqItem[]>(STORAGE_KEYS.boqItems, []);
  
  const maxId = allItems.reduce((max, item) => item.id > max ? item.id : max, 0);
  const maxSortOrder = allItems
    .filter(item => item.projectId === input.projectId)
    .reduce((max, item) => item.sortOrder > max ? item.sortOrder : max, -1);
  
  const newItem: BoqItem = {
    id: maxId + 1,
    projectId: input.projectId,
    description: input.description,
    quantity: input.quantity,
    unit: input.unit,
    rate: input.rate,
    category: input.category || 'other',
    sortOrder: maxSortOrder + 1,
    isSectionHeader: input.isSectionHeader || false,
  };
  
  allItems.push(newItem);
  saveToStorage(STORAGE_KEYS.boqItems, allItems);
  return newItem;
}

export async function updateBoqItem(input: BoqItemUpdateInput): Promise<BoqItem> {
  const allItems = loadFromStorage<BoqItem[]>(STORAGE_KEYS.boqItems, []);
  const index = allItems.findIndex(item => item.id === input.id);
  if (index === -1) throw new Error('BoqItem not found');
  
  allItems[index] = { ...allItems[index], ...input };
  saveToStorage(STORAGE_KEYS.boqItems, allItems);
  return allItems[index];
}

export async function deleteBoqItem(id: number): Promise<void> {
  let allItems = loadFromStorage<BoqItem[]>(STORAGE_KEYS.boqItems, []);
  allItems = allItems.filter(item => item.id !== id);
  saveToStorage(STORAGE_KEYS.boqItems, allItems);
}

export async function deleteMultipleBoqItems(ids: number[]): Promise<void> {
  let allItems = loadFromStorage<BoqItem[]>(STORAGE_KEYS.boqItems, []);
  allItems = allItems.filter(item => !ids.includes(item.id));
  saveToStorage(STORAGE_KEYS.boqItems, allItems);
}

export async function reorderBoqItems(_projectId: number, itemIds: number[]): Promise<void> {
  const allItems = loadFromStorage<BoqItem[]>(STORAGE_KEYS.boqItems, []);
  
  itemIds.forEach((id, index) => {
    const itemIndex = allItems.findIndex(item => item.id === id);
    if (itemIndex !== -1) {
      allItems[itemIndex].sortOrder = index;
    }
  });
  
  saveToStorage(STORAGE_KEYS.boqItems, allItems);
}

// ============================================
// MATERIAL RATE OPERATIONS
// ============================================

export async function getAllRates(): Promise<MaterialRate[]> {
  return cachedRates;
}

export async function getRatesByCategory(category: string): Promise<MaterialRate[]> {
  return cachedRates.filter(r => r.category === category);
}

export async function searchRates(query: string): Promise<MaterialRate[]> {
  const lowerQuery = query.toLowerCase();
  return cachedRates.filter(r => r.name.toLowerCase().includes(lowerQuery));
}

export async function createRate(input: MaterialRateCreateInput): Promise<MaterialRate> {
  const maxId = cachedRates.reduce((max, r) => r.id > max ? r.id : max, 0);
  const newRate: MaterialRate = {
    id: maxId + 1,
    name: input.name,
    category: input.category,
    unit: input.unit,
    rate: input.rate,
    city: input.city || 'Lahore',
    updatedAt: new Date().toISOString(),
  };
  cachedRates = [...cachedRates, newRate];
  saveToStorage(STORAGE_KEYS.rates, cachedRates);
  return newRate;
}

export async function updateRate(input: MaterialRateUpdateInput): Promise<MaterialRate> {
  const index = cachedRates.findIndex(r => r.id === input.id);
  if (index === -1) throw new Error('Rate not found');
  
  cachedRates[index] = { ...cachedRates[index], ...input, updatedAt: new Date().toISOString() };
  saveToStorage(STORAGE_KEYS.rates, cachedRates);
  return cachedRates[index];
}

export async function deleteRate(id: number): Promise<void> {
  cachedRates = cachedRates.filter(r => r.id !== id);
  saveToStorage(STORAGE_KEYS.rates, cachedRates);
}

// ============================================
// TEMPLATE OPERATIONS
// ============================================

export async function getAllTemplates(): Promise<Template[]> {
  return cachedTemplates;
}

export async function getTemplate(id: number): Promise<Template | null> {
  return cachedTemplates.find(t => t.id === id) || null;
}

export async function createTemplate(
  name: string,
  description: string,
  category: string,
  items: TemplateItem[]
): Promise<Template> {
  const maxId = cachedTemplates.reduce((max, t) => t.id > max ? t.id : max, 0);
  const newTemplate: Template = {
    id: maxId + 1,
    name,
    description,
    category,
    items,
    createdAt: new Date().toISOString(),
  };
  cachedTemplates = [...cachedTemplates, newTemplate];
  saveToStorage(STORAGE_KEYS.templates, cachedTemplates);
  return newTemplate;
}

export async function updateTemplate(
  id: number,
  name: string,
  description: string,
  category: string,
  items: TemplateItem[]
): Promise<Template> {
  const index = cachedTemplates.findIndex(t => t.id === id);
  if (index === -1) throw new Error('Template not found');
  
  cachedTemplates[index] = {
    ...cachedTemplates[index],
    name,
    description,
    category,
    items,
    updatedAt: new Date().toISOString(),
  };
  saveToStorage(STORAGE_KEYS.templates, cachedTemplates);
  return cachedTemplates[index];
}

export async function deleteTemplate(id: number): Promise<void> {
  cachedTemplates = cachedTemplates.filter(t => t.id !== id);
  saveToStorage(STORAGE_KEYS.templates, cachedTemplates);
}

// ============================================
// SETTINGS OPERATIONS
// ============================================

export async function getSettings(): Promise<Settings> {
  return cachedSettings || DEFAULT_SETTINGS;
}

export async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  cachedSettings = { ...(cachedSettings || DEFAULT_SETTINGS), ...settings };
  saveToStorage(STORAGE_KEYS.settings, cachedSettings);
  return cachedSettings;
}

// ============================================
// PROJECT SPEC OPERATIONS
// ============================================

export interface ProjectSpecRow {
  projectId: number;
  spec: ProjectSpec;
  updatedAt: string;
}

export async function getProjectSpec(projectId: number): Promise<ProjectSpec | null> {
  const allSpecs = loadFromStorage<ProjectSpecRow[]>(STORAGE_KEYS.specs, []);
  const row = allSpecs.find((s) => s.projectId === projectId);
  return row?.spec ?? null;
}

export async function saveProjectSpec(projectId: number, spec: ProjectSpec): Promise<void> {
  const allSpecs = loadFromStorage<ProjectSpecRow[]>(STORAGE_KEYS.specs, []);
  const index = allSpecs.findIndex((s) => s.projectId === projectId);
  const row: ProjectSpecRow = { projectId, spec, updatedAt: new Date().toISOString() };
  if (index >= 0) {
    allSpecs[index] = row;
  } else {
    allSpecs.push(row);
  }
  saveToStorage(STORAGE_KEYS.specs, allSpecs);
}

export async function deleteProjectSpec(projectId: number): Promise<void> {
  const allSpecs = loadFromStorage<ProjectSpecRow[]>(STORAGE_KEYS.specs, []);
  const filtered = allSpecs.filter((s) => s.projectId !== projectId);
  saveToStorage(STORAGE_KEYS.specs, filtered);
}

// ============================================
// PAYMENT PLAN OPERATIONS
// ============================================

export async function getPaymentPlan(projectId: number): Promise<MilestonePaymentPlan | null> {
  const allPlans = loadFromStorage<MilestonePaymentPlan[]>(STORAGE_KEYS.paymentPlans, []);
  return allPlans.find((p) => p.projectId === projectId) ?? null;
}

export async function savePaymentPlan(plan: MilestonePaymentPlan): Promise<void> {
  const allPlans = loadFromStorage<MilestonePaymentPlan[]>(STORAGE_KEYS.paymentPlans, []);
  const index = allPlans.findIndex((p) => p.projectId === plan.projectId);
  if (index >= 0) {
    allPlans[index] = plan;
  } else {
    allPlans.push(plan);
  }
  saveToStorage(STORAGE_KEYS.paymentPlans, allPlans);
}