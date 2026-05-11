/**
 * Pure calculation functions for BOQ items
 * No side effects, no DOM access, no database access
 */

import type { BoqItem, BoqSummary, CalculationResult, BoqItemCategory } from '../types/domain';

/**
 * Calculate total for a single BOQ item
 * Formula: total = quantity × rate
 */
export function calculateItemTotal(item: Pick<BoqItem, 'quantity' | 'rate'>): number {
  const { quantity, rate } = item;
  return quantity * rate;
}

/**
 * Calculate subtotal for all BOQ items
 */
export function calculateSubtotal(items: BoqItem[]): number {
  return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
}

/**
 * Calculate category-wise totals
 */
export function calculateCategoryTotals(items: BoqItem[]): Record<BoqItemCategory, number> {
  const totals: Record<BoqItemCategory, number> = {
    excavation: 0,
    foundation: 0,
    structure: 0,
    masonry: 0,
    concrete: 0,
    steel: 0,
    plumbing: 0,
    electrical: 0,
    finishing: 0,
    other: 0,
  };

  for (const item of items) {
    const category = item.category || 'other';
    totals[category] += calculateItemTotal(item);
  }

  return totals;
}

/**
 * Complete BOQ summary with all calculations
 */
export function calculateBoqSummary(items: BoqItem[]): BoqSummary {
  const subtotal = calculateSubtotal(items);
  const categoryTotals = calculateCategoryTotals(items);

  return {
    items,
    subtotal,
    itemCount: items.length,
    categoryTotals,
  };
}

/**
 * Calculate complete project finances
 */
export function calculateTotals(
  subtotal: number,
  taxRate: number = 10,
  contingencyRate: number = 5,
  profitMarginRate: number = 10
): CalculationResult {
  const tax = subtotal * (taxRate / 100);
  const afterTax = subtotal + tax;
  const contingency = afterTax * (contingencyRate / 100);
  const afterContingency = afterTax + contingency;
  const profitMargin = afterContingency * (profitMarginRate / 100);
  const grandTotal = afterContingency + profitMargin;

  return {
    subtotal,
    tax,
    taxRate,
    contingency,
    contingencyRate,
    profitMargin,
    profitMarginRate,
    grandTotal,
  };
}

/**
 * Format currency number to string
 */
export function formatCurrency(amount: number, currency: string = 'PKR'): string {
  const formatted = new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${currency} ${formatted}`;
}

/**
 * Format quantity with unit
 */
export function formatQuantity(quantity: number, unit: string): string {
  const formatted = new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(quantity);

  return `${formatted} ${unit}`;
}

/**
 * Round to 2 decimal places for currency calculations
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Validate quantity - must be non-negative
 */
export function validateQuantity(quantity: number): boolean {
  return quantity >= 0 && Number.isFinite(quantity);
}

/**
 * Validate rate - must be non-negative
 */
export function validateRate(rate: number): boolean {
  return rate >= 0 && Number.isFinite(rate);
}

/**
 * Validate BOQ item
 */
export function validateBoqItem(item: Partial<BoqItem>): string[] {
  const errors: string[] = [];

  if (!item.description || item.description.trim() === '') {
    errors.push('Description is required');
  }

  if (item.quantity === undefined || item.quantity === null) {
    errors.push('Quantity is required');
  } else if (!validateQuantity(item.quantity)) {
    errors.push('Quantity must be non-negative');
  }

  if (!item.unit || item.unit.trim() === '') {
    errors.push('Unit is required');
  }

  if (item.rate === undefined || item.rate === null) {
    errors.push('Rate is required');
  } else if (!validateRate(item.rate)) {
    errors.push('Rate must be non-negative');
  }

  return errors;
}