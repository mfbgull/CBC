/**
 * PaymentPlanView — Milestone Payment Schedule
 *
 * Displays construction phases with payment milestones.
 * Auto-calculates amounts from project total cost.
 * Tracks payment status per milestone.
 */

import { useEffect, useMemo, useState } from 'react';
import { usePaymentStore, totalPaid, remainingBalance } from '../store';
import { PrintPaymentPlanButton } from '../components/PrintPaymentPlan';
import { useBoqStore } from '../../boq/store';
import { useProjectsStore } from '../../projects/store';
import { useSpecStore } from '../../spec/store';
import { formatCurrency } from '../../../lib/calculations';
import type { PaymentStatus, Milestone } from '../store';

// =============================================================================
// HELPERS
// =============================================================================

const PHASE_ICONS: Record<string, string> = {
  foundation: '🏗️',
  structure: '🧱',
  roof: '🏠',
  finishing: '🎨',
  handover: '🔑',
};

const STATUS_STYLES: Record<PaymentStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Pending' },
  due: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Due' },
  partial: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Partial' },
  paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'Paid' },
};

function StatusBadge({ status }: { status: PaymentStatus }): React.ReactElement {
  const style = STATUS_STYLES[status];
  return (
    <span className={`pill ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

// =============================================================================
// MILESTONE ROW
// =============================================================================

interface MilestoneRowProps {
  milestone: {
    id: string;
    name: string;
    phase: string;
    percentage: number;
    amount: number;
    status: PaymentStatus;
    notes?: string;
  };
  isEditable: boolean;
  onMarkPaid: (id: string) => void;
  onMarkPartial: (id: string, amount: number) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}

function MilestoneRow({
  milestone,
  isEditable,
  onMarkPaid,
  onMarkPartial,
  onUpdateNotes,
}: MilestoneRowProps): React.ReactElement {
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);

  const icon = PHASE_ICONS[milestone.phase] ?? '📋';

  return (
    <div className="payment-milestone-row">
      <div className="payment-milestone-icon">{icon}</div>

      <div className="payment-milestone-info">
        <div className="payment-milestone-name">{milestone.name}</div>
        {editingNotes ? (
          <input
            type="text"
            className="spec-field-input"
            style={{ height: 20, fontSize: 10 }}
            defaultValue={milestone.notes ?? ''}
            placeholder="Add note..."
            onBlur={(e) => {
              milestone.notes !== e.target.value &&
                onUpdateNotes(milestone.id, e.target.value);
              setEditingNotes(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') setEditingNotes(false);
            }}
            autoFocus
          />
        ) : milestone.notes ? (
          <div
            className="payment-milestone-notes"
            onClick={() => setEditingNotes(true)}
            style={{ cursor: 'pointer' }}
            title="Click to edit note"
          >
            {milestone.notes}
          </div>
        ) : isEditable ? (
          <button
            className="spec-btn-sm"
            style={{ height: 18, fontSize: 9, marginTop: 2 }}
            onClick={() => setEditingNotes(true)}
          >
            + Note
          </button>
        ) : null}
      </div>

      <div className="payment-milestone-percent">{milestone.percentage}%</div>

      <div className="payment-milestone-amount">
        {formatCurrency(milestone.amount)}
      </div>

      <div className="payment-milestone-status">
        <StatusBadge status={milestone.status} />
      </div>

      {isEditable && milestone.status !== 'paid' && (
        <div className="payment-milestone-actions">
          <button
            className="spec-btn-sm bg-green-600 text-white hover:bg-green-700"
            onClick={() => onMarkPaid(milestone.id)}
          >
            ✓ Paid
          </button>
          <button
            className="spec-btn-sm"
            onClick={() => setShowPartialModal(true)}
          >
            Partial
          </button>
        </div>
      )}

      {/* Partial Payment Modal */}
      {showPartialModal && (
        <div className="modal-overlay" onClick={() => setShowPartialModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Partial Payment — {milestone.name}</div>
              <button className="modal-close" onClick={() => setShowPartialModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-muted mb-4">
                Full amount: <strong>{formatCurrency(milestone.amount)}</strong>
              </p>
              <div className="form-field">
                <label className="form-label">Amount Received (PKR)</label>
                <input
                  type="number"
                  className="form-control"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  placeholder="e.g. 500000"
                  min={1}
                  max={milestone.amount}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowPartialModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const amt = parseFloat(partialAmount);
                  if (amt > 0) {
                    onMarkPartial(milestone.id, amt);
                    setShowPartialModal(false);
                    setPartialAmount('');
                  }
                }}
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PROGRESS BAR
// =============================================================================

function ProgressBar({ paid, total }: { paid: number; total: number }): React.ReactElement {
  const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;

  return (
    <div className="payment-progress-container">
      <div className="payment-progress-bar">
        <div
          className="payment-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="payment-progress-label">
        <span>{pct.toFixed(1)}% paid</span>
        <span>{formatCurrency(paid)} of {formatCurrency(total)}</span>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PaymentPlanView(): React.ReactElement {
  const plan = usePaymentStore((s) => s.plan);
  const isLoading = usePaymentStore((s) => s.isLoading);
  const isDirty = usePaymentStore((s) => s.isDirty);
  const loadPlan = usePaymentStore((s) => s.loadPlan);
  const updateMilestone = usePaymentStore((s) => s.updateMilestone);
  const addMilestone = usePaymentStore((s) => s.addMilestone);
  const markPaid = usePaymentStore((s) => s.markPaid);
  const markPartial = usePaymentStore((s) => s.markPartial);
  const recalculateTotal = usePaymentStore((s) => s.recalculateTotal);

  const boqItems = useBoqStore((s) => s.items);
  const currentProjectId = useProjectsStore((s) => s.currentProjectId);
  const currentProject = useProjectsStore((s) =>
    s.projects.find((p) => p.id === s.currentProjectId)
  );
  const specCalc = useSpecStore((s) => s.calculation);

  // Calculate total cost
  const totalCost = useMemo(() => {
    if (boqItems.length > 0) {
      return boqItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    }
    if (specCalc) {
      return specCalc.totalMaterialCost;
    }
    return 0;
  }, [boqItems, specCalc]);

  // Paid & remaining
  const paidAmount = useMemo(() => (plan ? totalPaid(plan) : 0), [plan]);
  const remaining = useMemo(() => (plan ? remainingBalance(plan) : 0), [plan]);

  // Load plan when project/cost changes
  useEffect(() => {
    if (currentProjectId && totalCost > 0) {
      loadPlan(currentProjectId, totalCost);
    }
  }, [currentProjectId, totalCost, loadPlan]);

  // Recalculate when total cost changes significantly
  useEffect(() => {
    if (plan && Math.abs(plan.totalCost - totalCost) > totalCost * 0.01) {
      recalculateTotal(totalCost);
    }
  }, [totalCost, plan, recalculateTotal]);

  // ── No project ─────────────────────────────────────────────────────────────

  if (!currentProjectId) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">💰</div>
        <div className="empty-state-title">No Project Selected</div>
        <div className="empty-state-desc">
          Select a project to view its payment plan
        </div>
      </div>
    );
  }

  // ── No cost ───────────────────────────────────────────────────────────────

  if (totalCost === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">💰</div>
        <div className="empty-state-title">No Cost Data</div>
        <div className="empty-state-desc">
          Generate a BOQ from the Specification tab, or add items manually,
          before setting up the payment plan
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" />
      </div>
    );
  }

  // ── No plan yet ────────────────────────────────────────────────────────────

  if (!plan) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">💰</div>
        <div className="empty-state-title">No Payment Plan</div>
        <button
          className="btn btn-primary mt-4"
          onClick={() => currentProjectId && loadPlan(currentProjectId, totalCost)}
        >
          Create Payment Plan
        </button>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="panel">
      {/* Header */}
      <div className="panel-head">
        <div className="title-block">
          <h1>Payment Plan</h1>
          <p>
            {currentProject?.name} — {formatCurrency(totalCost)} total
            {isDirty && <span className="text-amber-500 ml-2">● Unsaved</span>}
          </p>
        </div>
        <div className="panel-actions">
          <span className="text-sm text-muted">{plan.milestones.length} milestones</span>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="payment-kpi-strip">
        <div className="payment-kpi">
          <div className="payment-kpi-label">Total Cost</div>
          <div className="payment-kpi-value">{formatCurrency(plan.totalCost)}</div>
        </div>
        <div className="payment-kpi payment-kpi-paid">
          <div className="payment-kpi-label">Paid</div>
          <div className="payment-kpi-value">{formatCurrency(paidAmount)}</div>
        </div>
        <div className="payment-kpi payment-kpi-remaining">
          <div className="payment-kpi-label">Remaining</div>
          <div className="payment-kpi-value">{formatCurrency(remaining)}</div>
        </div>
      </div>

      {/* Progress */}
      <ProgressBar paid={paidAmount} total={plan.totalCost} />

      {/* Milestone List */}
      <div className="mt-4">
        <div className="payment-list-header">
          <span></span>
          <span>Milestone</span>
          <span>%</span>
          <span>Amount</span>
          <span>Status</span>
          <span></span>
        </div>

        <div className="payment-list">
          {plan.milestones.map((ms) => (
            <MilestoneRow
              key={ms.id}
              milestone={ms}
              isEditable
              onMarkPaid={markPaid}
              onMarkPartial={markPartial}
              onUpdateNotes={(id, notes) => updateMilestone(id, { notes })}
            />
          ))}
        </div>
      </div>

      {/* Add Milestone */}
      <div className="mt-4 pt-4 border-t">
        <AddMilestoneForm onAdd={(m) => addMilestone(m)} />
      </div>

      {/* Save Button */}
      <div className="mt-4 flex justify-end">
        <button
          className="btn btn-ghost"
          onClick={async () => {
            const { savePaymentPlan } = await import('../../../lib/db');
            if (plan) {
              await savePaymentPlan(plan);
              setTimeout(() => usePaymentStore.getState().setPlan(plan), 100);
            }
          }}
        >
          💾 Save Plan
        </button>
        <PrintPaymentPlanButton />
      </div>
    </div>
  );
}

// =============================================================================
// ADD MILESTONE FORM
// =============================================================================

interface AddMilestoneFormProps {
  onAdd: (milestone: Omit<Milestone, 'id' | 'amount'>) => void;
}

function AddMilestoneForm({ onAdd }: AddMilestoneFormProps): React.ReactElement {
  const [name, setName] = useState('');
  const [phase, setPhase] = useState('finishing');
  const [percentage, setPercentage] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !percentage) return;
    onAdd({
      name: name.trim(),
      phase: phase as Milestone['phase'],
      percentage: parseFloat(percentage),
      status: 'pending' as const,
      notes: notes.trim() || undefined,
    });
    setName('');
    setPercentage('');
    setNotes('');
  };

  return (
    <div className="payment-add-form">
      <div className="text-sm font-semibold text-slate-600 mb-3">+ Add Custom Milestone</div>
      <div className="payment-add-fields">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="form-control"
          style={{ flex: 2 }}
          placeholder="Milestone name"
        />
        <select
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
          className="form-control"
          style={{ flex: 1 }}
        >
          <option value="foundation">Foundation</option>
          <option value="structure">Structure</option>
          <option value="roof">Roof</option>
          <option value="finishing">Finishing</option>
          <option value="handover">Handover</option>
        </select>
        <input
          type="number"
          value={percentage}
          onChange={(e) => setPercentage(e.target.value)}
          className="form-control"
          style={{ flex: 1 }}
          placeholder="%"
          min={1}
          max={100}
        />
        <button
          className="btn btn-primary"
          onClick={handleAdd}
          disabled={!name.trim() || !percentage}
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default PaymentPlanView;