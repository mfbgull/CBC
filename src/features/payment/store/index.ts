/**
 * Payment Plan Feature — Milestone-based payment schedules
 *
 * Construction projects are paid in phases. This feature defines:
 * - Milestones (phase name, percentage, amount range)
 * - Auto-calculated amounts based on total project cost
 * - Payment status tracking
 *
 * All business logic is pure functions with explicit types.
 */

import { create } from 'zustand';
import { logger } from '../../../lib/logger';

// =============================================================================
// TYPES
// =============================================================================

export type PaymentStatus = 'pending' | 'due' | 'partial' | 'paid';

export interface Milestone {
  /** Unique identifier */
  id: string;
  /** Display name e.g. "Ground Floor Slab" */
  name: string;
  /** Construction phase */
  phase: 'foundation' | 'structure' | 'roof' | 'finishing' | 'handover';
  /** Percentage of total cost */
  percentage: number;
  /** Calculated PKR amount (derived from total cost) */
  amount: number;
  /** Payment status */
  status: PaymentStatus;
  /** Notes */
  notes?: string;
}

export interface MilestonePaymentPlan {
  readonly projectId: number;
  /** Human-readable name for this plan */
  name: string;
  /** Total project cost this plan is based on */
  totalCost: number;
  /** Milestones in order */
  milestones: Milestone[];
  /** Last updated */
  updatedAt: string;
}

// =============================================================================
// DEFAULT MILESTONE STRUCTURE (Pakistan construction standard)
// =============================================================================

export const DEFAULT_MILESTONES: Omit<Milestone, 'amount' | 'status'>[] = [
  { id: 'ms_01', name: 'Booking / Plot Registry', phase: 'foundation', percentage: 15 },
  { id: 'ms_02', name: 'Foundation & Grey Structure', phase: 'foundation', percentage: 20 },
  { id: 'ms_03', name: 'Ground Floor Structure', phase: 'structure', percentage: 15 },
  { id: 'ms_04', name: 'First Floor Structure', phase: 'structure', percentage: 15 },
  { id: 'ms_05', name: 'Roof & Masonry', phase: 'roof', percentage: 10 },
  { id: 'ms_06', name: 'Plaster & Finishing', phase: 'finishing', percentage: 15 },
  { id: 'ms_07', name: 'Electrical & Plumbing', phase: 'finishing', percentage: 5 },
  { id: 'ms_08', name: 'Handover / Possession', phase: 'handover', percentage: 5 },
];

// =============================================================================
// PURE FUNCTIONS (no side effects)
// =============================================================================

/**
 * Creates a default payment plan for a given project cost.
 * Pure function — no DOM, no DB, deterministic.
 */
export function createDefaultPlan(
  projectId: number,
  name: string,
  totalCost: number
): MilestonePaymentPlan {
  const milestones: Milestone[] = DEFAULT_MILESTONES.map((def) => ({
    ...def,
    amount: Math.round((def.percentage / 100) * totalCost),
    status: 'pending' as const,
  }));

  return {
    projectId,
    name,
    totalCost,
    milestones,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Recalculates milestone amounts based on a new total cost.
 */
export function recalculatePlan(
  plan: MilestonePaymentPlan,
  newTotalCost: number
): MilestonePaymentPlan {
  const milestones: Milestone[] = plan.milestones.map((ms) => ({
    ...ms,
    amount: Math.round((ms.percentage / 100) * newTotalCost),
  }));

  return {
    ...plan,
    totalCost: newTotalCost,
    milestones,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Marks a milestone as paid with a paid amount.
 */
export function markMilestonePaid(
  plan: MilestonePaymentPlan,
  milestoneId: string,
  paidAmount: number
): MilestonePaymentPlan {
  const milestones: Milestone[] = plan.milestones.map((ms) => {
    if (ms.id !== milestoneId) return ms;
    const newStatus: PaymentStatus =
      paidAmount >= ms.amount
        ? 'paid'
        : paidAmount > 0
        ? 'partial'
        : 'due';
    return { ...ms, status: newStatus };
  });

  return { ...plan, milestones, updatedAt: new Date().toISOString() };
}

/**
 * Returns the total paid amount across all milestones.
 */
export function totalPaid(plan: MilestonePaymentPlan): number {
  return plan.milestones.reduce((sum, ms) => {
    if (ms.status === 'paid') return sum + ms.amount;
    if (ms.status === 'partial') return sum + Math.round(ms.amount * 0.5);
    return sum;
  }, 0);
}

/**
 * Returns the remaining balance.
 */
export function remainingBalance(plan: MilestonePaymentPlan): number {
  return plan.totalCost - totalPaid(plan);
}

// =============================================================================
// STORE
// =============================================================================

interface PaymentState {
  plan: MilestonePaymentPlan | null;
  isLoading: boolean;
  isDirty: boolean;

  // Actions
  loadPlan: (projectId: number, totalCost: number) => Promise<void>;
  setPlan: (plan: MilestonePaymentPlan) => void;
  updateMilestone: (milestoneId: string, updates: Partial<Milestone>) => void;
  addMilestone: (milestone: Omit<Milestone, 'id' | 'amount'>) => void;
  removeMilestone: (milestoneId: string) => void;
  recalculateTotal: (newTotalCost: number) => void;
  markPaid: (milestoneId: string) => void;
  markPartial: (milestoneId: string, paidAmount: number) => void;
  clearPlan: () => void;
}

export const usePaymentStore = create<PaymentState>()((set, get) => ({
  plan: null,
  isLoading: false,
  isDirty: false,

  loadPlan: async (projectId, totalCost) => {
    const { getPaymentPlan } = await import('../../../lib/db');
    set({ isLoading: true });

    try {
      const saved = await getPaymentPlan(projectId);
      if (saved) {
        // Recalculate with current total cost
        const updated = recalculatePlan(saved, totalCost);
        set({ plan: updated, isLoading: false, isDirty: false });
      } else {
        // Create fresh plan
        const plan = createDefaultPlan(projectId, 'Standard Payment Plan', totalCost);
        set({ plan, isLoading: false, isDirty: false });
      }
    } catch (err) {
      logger.error('Failed to load payment plan:', err);
      set({ isLoading: false });
    }
  },

  setPlan: (plan) => set({ plan, isDirty: false }),

  updateMilestone: (milestoneId, updates) => {
    const { plan } = get();
    if (!plan) return;

    const milestones: Milestone[] = plan.milestones.map((ms) =>
      ms.id === milestoneId
        ? {
            ...ms,
            ...updates,
            // Recalculate amount if percentage changed
            amount:
              updates.percentage !== undefined
                ? Math.round((updates.percentage / 100) * plan.totalCost)
                : ms.amount,
          }
        : ms
    );

    set({ plan: { ...plan, milestones, updatedAt: new Date().toISOString() }, isDirty: true });
  },

  addMilestone: (milestone) => {
    const { plan } = get();
    if (!plan) return;

    const newMilestone: Milestone = {
      ...milestone,
      id: `ms_${Date.now()}`,
      amount: Math.round((milestone.percentage / 100) * plan.totalCost),
    };

    set({
      plan: {
        ...plan,
        milestones: [...plan.milestones, newMilestone],
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    });
  },

  removeMilestone: (milestoneId) => {
    const { plan } = get();
    if (!plan) return;

    set({
      plan: {
        ...plan,
        milestones: plan.milestones.filter((ms) => ms.id !== milestoneId),
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    });
  },

  recalculateTotal: (newTotalCost) => {
    const { plan } = get();
    if (!plan) return;

    const updated = recalculatePlan(plan, newTotalCost);
    set({ plan: updated, isDirty: true });
  },

  markPaid: (milestoneId) => {
    const { plan } = get();
    if (!plan) return;

    const updated = markMilestonePaid(plan, milestoneId, plan.milestones.find((m) => m.id === milestoneId)?.amount ?? 0);
    set({ plan: updated, isDirty: true });

    import('../../../lib/db').then(({ savePaymentPlan }) => {
      savePaymentPlan(updated).catch((err) => logger.error('Failed to auto-save payment:', err));
    });
  },

  markPartial: (milestoneId, paidAmount) => {
    const { plan } = get();
    if (!plan) return;

    const updated = markMilestonePaid(plan, milestoneId, paidAmount);
    set({ plan: updated, isDirty: true });

    import('../../../lib/db').then(({ savePaymentPlan }) => {
      savePaymentPlan(updated).catch((err) => logger.error('Failed to auto-save partial payment:', err));
    });
  },

  clearPlan: () => set({ plan: null, isDirty: false }),
}));