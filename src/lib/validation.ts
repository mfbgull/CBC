/**
 * Zod validation schemas for Construction BOQ Calculator
 * All external inputs must validate through these schemas
 */

import { z } from 'zod';

// Project validation schemas
export const projectTypeSchema = z.enum([
  'residential',
  'commercial',
  'industrial',
  'infrastructure',
]);

export const projectCreateSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  clientName: z.string().max(200).optional(),
  clientPhone: z.string().max(50).optional(),
  projectType: projectTypeSchema.optional(),
  location: z.string().max(200).optional(),
});

export const projectUpdateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200).optional(),
  clientName: z.string().max(200).optional(),
  clientPhone: z.string().max(50).optional(),
  projectType: projectTypeSchema.optional(),
  location: z.string().max(200).optional(),
});

// BOQ Item validation schemas
export const boqItemCategorySchema = z.enum([
  'excavation',
  'foundation',
  'structure',
  'masonry',
  'concrete',
  'steel',
  'plumbing',
  'electrical',
  'finishing',
  'other',
]);

export const boqItemCreateSchema = z.object({
  projectId: z.number().int().positive('Project ID is required'),
  description: z.string().min(1, 'Description is required').max(500),
  quantity: z.number().finite().min(0, 'Quantity cannot be negative'),
  unit: z.string().min(1, 'Unit is required').max(20),
  rate: z.number().finite().min(0, 'Rate cannot be negative'),
  category: boqItemCategorySchema.optional(),
  sortOrder: z.number().int().optional(),
  isSectionHeader: z.boolean().optional(),
});

export const boqItemUpdateSchema = z.object({
  id: z.number().int().positive(),
  projectId: z.number().int().positive().optional(),
  description: z.string().min(1).max(500).optional(),
  quantity: z.number().finite().min(0).optional(),
  unit: z.string().min(1).max(20).optional(),
  rate: z.number().finite().min(0).optional(),
  category: boqItemCategorySchema.optional(),
  sortOrder: z.number().int().optional(),
  isSectionHeader: z.boolean().optional(),
});

// Material Rate validation schemas
export const rateCategorySchema = z.enum(['material', 'labour', 'equipment', 'other']);

export const materialRateCreateSchema = z.object({
  name: z.string().min(1, 'Material name is required').max(200),
  category: rateCategorySchema,
  unit: z.string().min(1, 'Unit is required').max(20),
  rate: z.number().finite().min(0, 'Rate cannot be negative'),
  city: z.string().max(100).optional(),
});

export const materialRateUpdateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200).optional(),
  category: rateCategorySchema.optional(),
  unit: z.string().min(1).max(20).optional(),
  rate: z.number().finite().min(0).optional(),
  city: z.string().max(100).optional(),
});

// Export options validation
export const exportOptionsSchema = z.object({
  includeCompanyDetails: z.boolean().optional(),
  includeProjectDetails: z.boolean().optional(),
  includeTax: z.boolean().optional(),
  taxRate: z.number().finite().min(0).max(100).optional(),
  includeContingency: z.boolean().optional(),
  contingencyRate: z.number().finite().min(0).max(100).optional(),
  includeProfitMargin: z.boolean().optional(),
  profitMarginRate: z.number().finite().min(0).max(100).optional(),
  pageSize: z.enum(['a4', 'a3', 'letter']).optional(),
  orientation: z.enum(['portrait', 'landscape']).optional(),
});

// Settings validation
export const settingsSchema = z.object({
  companyName: z.string().max(200).optional(),
  companyAddress: z.string().max(500).optional(),
  companyPhone: z.string().max(50).optional(),
  companyEmail: z.string().email().max(200).optional(),
  defaultTaxRate: z.number().finite().min(0).max(100).optional(),
  defaultContingencyRate: z.number().finite().min(0).max(100).optional(),
  defaultProfitMarginRate: z.number().finite().min(0).max(100).optional(),
  defaultCity: z.string().max(100).optional(),
  currency: z.string().length(3).optional(),
  dateFormat: z.string().max(20).optional(),
});

// Type exports for validated data
export type ValidatedProjectCreate = z.infer<typeof projectCreateSchema>;
export type ValidatedProjectUpdate = z.infer<typeof projectUpdateSchema>;
export type ValidatedBoqItemCreate = z.infer<typeof boqItemCreateSchema>;
export type ValidatedBoqItemUpdate = z.infer<typeof boqItemUpdateSchema>;
export type ValidatedMaterialRateCreate = z.infer<typeof materialRateCreateSchema>;
export type ValidatedMaterialRateUpdate = z.infer<typeof materialRateUpdateSchema>;
export type ValidatedExportOptions = z.infer<typeof exportOptionsSchema>;
export type ValidatedSettings = z.infer<typeof settingsSchema>;