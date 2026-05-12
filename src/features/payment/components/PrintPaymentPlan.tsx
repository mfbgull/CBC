/**
 * Print Preview — Payment Plan Print Layout
 *
 * Professional print-ready payment schedule:
 * - Header with company name and project info
 * - Milestone table with phases, percentages, amounts
 * - Progress bar visualization
 * - Signatures section
 * - Print button that opens browser print dialog
 *
 * Pure functions: calculateProgress(), buildPrintHTML()
 */

import { useCallback } from 'react';
import { usePaymentStore, totalPaid, remainingBalance } from '../store';
import { useProjectsStore } from '../../projects/store';
import { useSettingsStore } from '../../settings/store';
import { formatCurrency } from '../../../lib/calculations';

// =============================================================================
// PURE FUNCTIONS
// =============================================================================

interface PrintData {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  projectName: string;
  clientName: string;
  totalCost: number;
  paidAmount: number;
  remainingAmount: number;
  milestones: Array<{
    name: string;
    phase: string;
    percentage: number;
    amount: number;
    status: string;
    paidDate?: string;
    notes?: string;
  }>;
  generatedDate: string;
}

function calculateProgress(paid: number, total: number): number {
  return total > 0 ? Math.min((paid / total) * 100, 100) : 0;
}

const PHASE_LABELS: Record<string, string> = {
  foundation: 'Foundation & Ground',
  structure: 'Structural Work',
  roof: 'Roof & Masonry',
  finishing: 'Finishing Work',
  handover: 'Handover & Possession',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  due: 'Due',
  partial: 'Partial Payment',
  paid: 'Paid',
};

function buildPrintHTML(data: PrintData): string {
  const progressPct = calculateProgress(data.paidAmount, data.totalCost);
  const date = new Date().toLocaleDateString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Generate table rows
  const rows = data.milestones
    .map(
      (ms) => `
    <tr class="${ms.status === 'paid' ? 'row-paid' : ms.status === 'partial' ? 'row-partial' : ''}">
      <td>${ms.name}</td>
      <td>${PHASE_LABELS[ms.phase] ?? ms.phase}</td>
      <td class="num">${ms.percentage}%</td>
      <td class="num">${formatCurrency(ms.amount, '')}</td>
      <td class="num">${STATUS_LABELS[ms.status] ?? ms.status}</td>
      ${ms.paidDate ? `<td class="num">${ms.paidDate}</td>` : '<td class="num">—</td>'}
      ${ms.notes ? `<td>${ms.notes}</td>` : '<td>—</td>'}
    </tr>`
    )
    .join('');

  // Phase group totals
  const phaseTotals: Record<string, number> = {};
  for (const ms of data.milestones) {
    phaseTotals[ms.phase] = (phaseTotals[ms.phase] ?? 0) + ms.amount;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Plan — ${data.projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
      color: #1e293b;
      padding: 20mm;
    }
    @page { size: A4; margin: 15mm; }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 3px solid #2563eb;
    }
    .company { font-size: 18px; font-weight: 800; color: #2563eb; }
    .company-addr { font-size: 10px; color: #64748b; margin-top: 3px; }
    .project-info { text-align: right; }
    .project-name { font-size: 14px; font-weight: 700; color: #1e293b; }
    .client-name { font-size: 10px; color: #64748b; margin-top: 2px; }
    .print-date { font-size: 10px; color: #94a3b8; margin-top: 4px; }

    /* Progress */
    .progress-section { margin-bottom: 14px; }
    .progress-label {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      color: #475467;
      margin-bottom: 6px;
    }
    .progress-bar-wrap {
      height: 12px;
      background: #e2e8f0;
      border-radius: 99px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #2563eb, #3b82f6);
      border-radius: 99px;
      transition: width 0.5s ease;
    }
    .progress-stats {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
    }
    .stat { text-align: center; }
    .stat-val { font-size: 14px; font-weight: 800; color: #1e293b; }
    .stat-label { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-val.green { color: #16a34a; }
    .stat-val.amber { color: #d97706; }
    .stat-val.blue { color: #2563eb; }

    /* Table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th {
      background: #2563eb;
      color: white;
      padding: 8px 10px;
      text-align: left;
      font-weight: 700;
      font-size: 10px;
      letter-spacing: 0.04em;
    }
    th.num { text-align: right; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tr.row-paid td { background: #f0fdf4; }
    tr.row-partial td { background: #eff6ff; }
    tr:hover td { background: #f8fafc; }
    tr:last-child td { border-bottom: none; }

    /* Grand total */
    .grand-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #1e293b;
      color: white;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .grand-total-label { font-size: 14px; font-weight: 700; }
    .grand-total-value { font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums; }

    /* Phase summary */
    .phase-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 16px; }
    .phase-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
    }
    .phase-card-icon { font-size: 20px; margin-bottom: 4px; }
    .phase-card-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 3px; }
    .phase-card-value { font-size: 13px; font-weight: 800; color: #1e293b; }
    .phase-card-amount { font-size: 10px; color: #64748b; margin-top: 2px; }

    /* Signatures */
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
    }
    .sig-box { text-align: center; }
    .sig-line {
      border-bottom: 1px solid #1e293b;
      margin-bottom: 6px;
      padding-bottom: 40px;
    }
    .sig-name { font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 4px; }
    .sig-role { font-size: 10px; color: #64748b; }
    .sig-date { font-size: 10px; color: #94a3b8; margin-top: 4px; }

    /* Footer */
    .footer {
      margin-top: 30px;
      text-align: center;
      color: #94a3b8;
      font-size: 9px;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
    }

    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div>
      <div class="company">${data.companyName || 'Construction BOQ Calculator'}</div>
      ${data.companyAddress ? `<div class="company-addr">${data.companyAddress}${data.companyPhone ? ' | ' + data.companyPhone : ''}</div>` : ''}
    </div>
    <div class="project-info">
      <div class="project-name">${data.projectName}</div>
      ${data.clientName ? `<div class="client-name">Client: ${data.clientName}</div>` : ''}
      <div class="print-date">Generated: ${date}</div>
    </div>
  </div>

  <!-- Progress Section -->
  <div class="progress-section">
    <div class="progress-label">
      <span>Payment Progress</span>
      <span>${progressPct.toFixed(1)}% Complete</span>
    </div>
    <div class="progress-bar-wrap">
      <div class="progress-bar-fill" style="width: ${progressPct}%"></div>
    </div>
    <div class="progress-stats">
      <div class="stat">
        <div class="stat-val blue">${formatCurrency(data.totalCost, '')}</div>
        <div class="stat-label">Total Cost</div>
      </div>
      <div class="stat">
        <div class="stat-val green">${formatCurrency(data.paidAmount, '')}</div>
        <div class="stat-label">Paid</div>
      </div>
      <div class="stat">
        <div class="stat-val amber">${formatCurrency(data.remainingAmount, '')}</div>
        <div class="stat-label">Remaining</div>
      </div>
    </div>
  </div>

  <!-- Phase Summary Cards -->
  <div class="phase-grid">
    ${(['foundation', 'structure', 'roof', 'finishing', 'handover'] as const).map((phase) => {
      const amount = phaseTotals[phase] ?? 0;
      const icons: Record<string, string> = { foundation: '🏗️', structure: '🧱', roof: '🏠', finishing: '🎨', handover: '🔑' };
      return `
      <div class="phase-card">
        <div class="phase-card-icon">${icons[phase]}</div>
        <div class="phase-card-label">${PHASE_LABELS[phase]}</div>
        <div class="phase-card-value">${amount > 0 ? formatCurrency(amount, '') : '—'}</div>
      </div>`;
    }).join('')}
  </div>

  <!-- Milestone Table -->
  <table>
    <thead>
      <tr>
        <th style="width: 25%">Milestone</th>
        <th style="width: 15%">Phase</th>
        <th class="num" style="width: 10%">%</th>
        <th class="num" style="width: 15%">Amount (PKR)</th>
        <th class="num" style="width: 12%">Status</th>
        <th class="num" style="width: 12%">Date</th>
        <th style="width: 11%">Notes</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <!-- Grand Total -->
  <div class="grand-total">
    <span class="grand-total-label">GRAND TOTAL</span>
    <span class="grand-total-value">${formatCurrency(data.totalCost, '')}</span>
  </div>

  <!-- Signatures -->
  <div class="signatures">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-name">Contractor / Builder</div>
      <div class="sig-role">Authorized Signatory</div>
      <div class="sig-date">Date: _____________</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-name">Client / Owner</div>
      <div class="sig-role">Project Proponent</div>
      <div class="sig-date">Date: _____________</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    Payment Plan generated on ${date} | Construction BOQ Calculator | This is a professional estimate and subject to final confirmation.
  </div>

</body>
</html>`;
}

// =============================================================================
// PRINT BUTTON COMPONENT
// =============================================================================

interface PrintPaymentPlanButtonProps {
  className?: string;
}

export function PrintPaymentPlanButton({ className }: PrintPaymentPlanButtonProps): React.ReactElement {
  const plan = usePaymentStore((s) => s.plan);
  const currentProject = useProjectsStore((s) =>
    s.projects.find((p) => p.id === s.currentProjectId)
  );
  const settings = useSettingsStore((s) => s.settings);

  const handlePrint = useCallback(() => {
    if (!plan || !currentProject) {
      alert('No payment plan or project selected');
      return;
    }

    const paidAmount = totalPaid(plan);
    const remaining = remainingBalance(plan);

    const data: PrintData = {
      companyName: settings?.companyName || 'Construction BOQ Calculator',
      companyAddress: settings?.companyAddress || '',
      companyPhone: settings?.companyPhone || '',
      projectName: currentProject.name,
      clientName: currentProject.clientName || '',
      totalCost: plan.totalCost,
      paidAmount,
      remainingAmount: remaining,
      milestones: plan.milestones.map((ms) => ({
        name: ms.name,
        phase: ms.phase,
        percentage: ms.percentage,
        amount: ms.amount,
        status: ms.status,
        paidDate: ms.status === 'paid' ? new Date().toLocaleDateString('en-PK') : undefined,
        notes: ms.notes,
      })),
      generatedDate: new Date().toISOString(),
    };

    const html = buildPrintHTML(data);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Auto-print after load
    printWindow.onload = () => {
      printWindow.print();
    };
  }, [plan, currentProject, settings]);

  if (!plan) {
    return (
      <button className={className ?? 'btn btn-ghost'} disabled>
        🖨️ Print Payment Plan
      </button>
    );
  }

  return (
    <button className={className ?? 'btn btn-ghost'} onClick={handlePrint}>
      🖨️ Print Payment Plan
    </button>
  );
}

export default PrintPaymentPlanButton;