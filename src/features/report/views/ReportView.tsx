/**
 * Report View — Detailed BOQ Report with Construction Phases
 *
 * Professional report layout:
 * - Executive summary KPI strip
 * - Grey structure breakdown (excavation → structure → roof)
 * - Finishing phases (plaster → paint → flooring → joinery)
 * - MEP summary
 * - Material quantities
 *
 * Integrates with both manual BOQ and spec-generated BOQ.
 */

import { useMemo, useState } from 'react';
import { useBoqStore } from '../../boq/store';
import { useProjectsStore } from '../../projects/store';
import { useSpecStore } from '../../spec/store';
import { calculateProject } from '../../spec/calculations';
import { formatCurrency } from '../../../lib/calculations';
import type { BoqItem, BoqItemCategory } from '../../../types/domain';

// =============================================================================
// CATEGORY SECTIONS
// =============================================================================

const SECTION_CONFIG: Record<string, { label: string; icon: string; categories: BoqItemCategory[] }> = {
  excavation: {
    label: 'Excavation & Foundation',
    icon: '🏗️',
    categories: ['excavation', 'foundation'],
  },
  structure: {
    label: 'Grey Structure',
    icon: '🧱',
    categories: ['structure', 'concrete', 'steel', 'masonry'],
  },
  finishing: {
    label: 'Finishing',
    icon: '🎨',
    categories: ['finishing'],
  },
  mep: {
    label: 'MEP',
    icon: '⚡',
    categories: ['electrical', 'plumbing'],
  },
  other: {
    label: 'Other',
    icon: '📦',
    categories: ['other'],
  },
};

// =============================================================================
// HELPERS
// =============================================================================

function groupByCategory(items: BoqItem[]): Record<string, BoqItem[]> {
  const groups: Record<string, BoqItem[]> = {};
  for (const item of items) {
    const key = item.category || 'other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

function sectionTotal(items: BoqItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
}

// =============================================================================
// SECTION ROW
// =============================================================================

interface SectionRowProps {
  icon: string;
  label: string;
  items: BoqItem[];
  expanded?: boolean;
  onToggle?: () => void;
}

function SectionRow({ icon, label, items, expanded, onToggle }: SectionRowProps): React.ReactElement {
  const total = sectionTotal(items);
  const count = items.length;

  return (
    <div className="report-section">
      <div
        className="report-section-header"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onToggle?.()}
      >
        <span className="report-section-icon">{icon}</span>
        <span className="report-section-label">{label}</span>
        <span className="report-section-count">{count} items</span>
        <span className="report-section-total">{formatCurrency(total)}</span>
        <span className="report-section-chevron">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="report-section-body">
          <table className="report-table">
            <thead>
              <tr>
                <th style={{ width: '50%' }}>Description</th>
                <th style={{ width: '12%' }}>Unit</th>
                <th style={{ width: '14%' }} className="text-right">Qty</th>
                <th style={{ width: '12%' }} className="text-right">Rate</th>
                <th style={{ width: '12%' }} className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="cell-strong">{item.description}</td>
                  <td className="cell-muted">{item.unit}</td>
                  <td className="text-right font-mono">
                    {item.quantity.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="text-right font-mono muted">{formatCurrency(item.rate, '')}</td>
                  <td className="text-right font-mono font-bold">
                    {formatCurrency(item.quantity * item.rate, '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// KPI STRIP
// =============================================================================

interface KpiProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}

function Kpi({ label, value, sub, accent }: KpiProps): React.ReactElement {
  return (
    <div className={`report-kpi ${accent ? 'report-kpi-accent' : ''}`}>
      <div className="report-kpi-label">{label}</div>
      <div className="report-kpi-value">{value}</div>
      {sub && <div className="report-kpi-sub">{sub}</div>}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReportView(): React.ReactElement {
  const boqItems = useBoqStore((s) => s.items);
  const projects = useProjectsStore((s) => s.projects);
  const currentProjectId = useProjectsStore((s) => s.currentProjectId);
  const spec = useSpecStore((s) => s.spec);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  // Group BOQ items by category
  const grouped = useMemo(() => groupByCategory(boqItems), [boqItems]);

  // Spec-based calculations
  const specCalc = useMemo(
    () => (spec ? calculateProject(spec) : null),
    [spec]
  );

  // Grand total from BOQ
  const boqTotal = useMemo(
    () => boqItems.reduce((sum, item) => sum + item.quantity * item.rate, 0),
    [boqItems]
  );

  // Section totals
  const sectionTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const [key, config] of Object.entries(SECTION_CONFIG)) {
      totals[key] = config.categories.reduce((sum, cat) => {
        return sum + (grouped[cat] ? sectionTotal(grouped[cat]) : 0);
      }, 0);
    }
    return totals;
  }, [grouped]);

  // Expand/collapse state for report sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const key of Object.keys(SECTION_CONFIG)) {
      initial[key] = true; // all expanded by default
    }
    return initial;
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // No project
  if (!currentProjectId) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">No Project Selected</div>
        <div className="empty-state-desc">Select a project to view its report</div>
      </div>
    );
  }

  // No items
  if (boqItems.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">No BOQ Items</div>
        <div className="empty-state-desc">
          Generate items from the Specification tab, or add them manually in the BOQ tab
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      {/* Page Header */}
      <div className="panel-head">
        <div>
          <div className="page-head">
            <div className="title-block">
              <h1>BOQ Report</h1>
              <p>{currentProject!.name} — {currentProject!.location}</p>
            </div>
          </div>
        </div>
        <div className="panel-actions">
          <span className="text-sm text-muted">{boqItems.length} items</span>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="report-kpi-strip">
        <Kpi
          label="Built-up Area"
          value={specCalc ? `${specCalc.totalBuiltUpArea.toLocaleString()} ft²` : '—'}
        />
        <Kpi
          label="Unit Cost"
          value={specCalc ? formatCurrency(specCalc.unitCostPerSft) : '—'}
          sub="/ ft²"
        />
        <Kpi
          label="Grey Structure"
          value={formatCurrency(sectionTotals.excavation + sectionTotals.structure)}
          accent
        />
        <Kpi
          label="Finishing"
          value={formatCurrency(sectionTotals.finishing)}
          accent
        />
        <Kpi
          label="MEP"
          value={formatCurrency(sectionTotals.mep)}
        />
        <Kpi
          label="Grand Total"
          value={formatCurrency(boqTotal)}
          sub={`PKR ${boqTotal.toLocaleString()}`}
          accent
        />
      </div>

      {/* Spec Material Quantities (if available) */}
      {specCalc && (
        <div className="mt-4">
          <div className="report-section-header-static">
            <span className="report-section-icon">📋</span>
            <span className="report-section-label">Material Quantities from Specification</span>
            <span className="report-section-count">Summary</span>
          </div>
          <div className="report-materials-grid">
            <MaterialQty label="Cement Bags" value={specCalc.grey.cementBags} unit="bags" icon="🏗️" />
            <MaterialQty label="Steel" value={specCalc.grey.steelTon} unit="ton" icon="🔩" />
            <MaterialQty label="Bricks" value={specCalc.grey.bricks} unit="nos" icon="🧱" />
            <MaterialQty label="Sand" value={specCalc.grey.sandCuFt} unit="ft³" icon="🏖️" />
            <MaterialQty label="Crush" value={specCalc.grey.crushCuFt} unit="ft³" icon="🪨" />
            <MaterialQty label="Paint Drums" value={specCalc.finishing.paintDrums} unit="drums" icon="🎨" />
            <MaterialQty label="Light Points" value={specCalc.mep.lightPoints} unit="pts" icon="💡" />
            <MaterialQty label="Fan Points" value={specCalc.mep.fanPoints} unit="pts" icon="🌀" />
          </div>
        </div>
      )}

      {/* Section Breakdown */}
      <div className="mt-4">
        {Object.entries(SECTION_CONFIG).map(([key, config]) => {
          const sectionItems = config.categories.flatMap((cat) => grouped[cat] || []);
          if (sectionItems.length === 0) return null;
          return (
            <SectionRow
              key={key}
              icon={config.icon}
              label={config.label}
              items={sectionItems}
              expanded={expandedSections[key]}
              onToggle={() => toggleSection(key)}
            />
          );
        })}
      </div>

      {/* Grand Total Footer */}
      <div className="report-grand-total">
        <span>Grand Total</span>
        <span className="report-grand-total-value">{formatCurrency(boqTotal)}</span>
      </div>
    </div>
  );
}

// =============================================================================
// MATERIAL QTY CARD
// =============================================================================

interface MaterialQtyProps {
  label: string;
  value: number;
  unit: string;
  icon: string;
}

function MaterialQty({ label, value, unit, icon }: MaterialQtyProps): React.ReactElement {
  const display = Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  return (
    <div className="report-material-item">
      <span className="report-material-icon">{icon}</span>
      <div className="report-material-info">
        <div className="report-material-value">{display}</div>
        <div className="report-material-unit">{unit}</div>
        <div className="report-material-label">{label}</div>
      </div>
    </div>
  );
}

export default ReportView;