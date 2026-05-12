/**
 * RateCard — Editable Rate Item with Categories
 *
 * Displays a single rate as a card with:
 * - Name, category badge, unit
 * - Inline editable rate field
 * - "Add to BOQ" button
 * - Delete button
 *
 * Skill: ag-grid — row/cell patterns, value formatting
 * Skill: vercel-composition-patterns — compound components
 * Skill: vercel-react-best-practices — memo, passive listeners
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { MaterialRate, RateCategory } from '../../../types/domain';
import { formatCurrency } from '../../../lib/calculations';

interface RateCardProps {
  rate: MaterialRate;
  onUpdate: (id: number, updates: Partial<MaterialRate>) => void;
  onDelete: (id: number) => void;
  onInsertToBoq: (rate: MaterialRate) => void;
}

const CATEGORY_COLORS: Record<RateCategory, { bg: string; text: string; border: string }> = {
  material: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  labour: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  equipment: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  other: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
};

const CATEGORY_LABELS: Record<RateCategory, string> = {
  material: 'Material',
  labour: 'Labour',
  equipment: 'Equipment',
  other: 'Other',
};

export function RateCard({
  rate,
  onUpdate,
  onDelete,
  onInsertToBoq,
}: RateCardProps): React.ReactElement {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(rate.rate));
  const inputRef = useRef<HTMLInputElement>(null);

  const categoryStyle = useMemo(() => CATEGORY_COLORS[rate.category] ?? CATEGORY_COLORS.other, [rate.category]);

  const startEdit = useCallback(() => {
    setEditValue(String(rate.rate));
    setIsEditing(true);
    // Focus on next tick after render
    requestAnimationFrame(() => inputRef.current?.select());
  }, [rate.rate]);

  const commitEdit = useCallback(() => {
    const newRate = parseFloat(editValue);
    if (!isNaN(newRate) && newRate > 0 && newRate !== rate.rate) {
      onUpdate(rate.id, { rate: newRate });
    }
    setIsEditing(false);
  }, [editValue, rate.id, rate.rate, onUpdate]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue(String(rate.rate));
  }, [rate.rate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        commitEdit();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    },
    [commitEdit, cancelEdit]
  );

  return (
    <div className={`rate-card ${categoryStyle.bg} ${categoryStyle.border}`}>
      {/* Category Badge */}
      <div className="rate-card-category">
        <span className={`pill ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}>
          {CATEGORY_LABELS[rate.category]}
        </span>
      </div>

      {/* Name */}
      <div className="rate-card-name">{rate.name}</div>

      {/* Unit */}
      <div className="rate-card-unit">/{rate.unit}</div>

      {/* Editable Rate */}
      <div className="rate-card-rate">
        {isEditing ? (
          <input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="rate-edit-input"
            min={1}
            autoFocus
          />
        ) : (
          <div
            className="rate-value-display"
            onClick={startEdit}
            title="Click to edit rate"
          >
            {formatCurrency(rate.rate, '')}
          </div>
        )}
      </div>

      {/* City */}
      <div className="rate-card-city">{rate.city}</div>

      {/* Actions */}
      <div className="rate-card-actions">
        <button
          className="btn btn-ghost"
          style={{ height: 26, fontSize: 10, padding: '0 8px' }}
          onClick={() => onInsertToBoq(rate)}
          title="Add to BOQ"
        >
          ➕ BOQ
        </button>
        <button
          className="spec-btn-icon text-red-400"
          onClick={() => onDelete(rate.id)}
          title="Delete rate"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// RATE CARD LIST — Compound Component
// =============================================================================

interface RateCardListProps {
  rates: MaterialRate[];
  searchQuery: string;
  categoryFilter: RateCategory | 'all';
  onUpdate: (id: number, updates: Partial<MaterialRate>) => void;
  onDelete: (id: number) => void;
  onInsertToBoq: (rate: MaterialRate) => void;
}

interface RateCardGroupProps {
  category: RateCategory;
  rates: MaterialRate[];
  onUpdate: (id: number, updates: Partial<MaterialRate>) => void;
  onDelete: (id: number) => void;
  onInsertToBoq: (rate: MaterialRate) => void;
}

function RateCardGroup({ category, rates, onUpdate, onDelete, onInsertToBoq }: RateCardGroupProps): React.ReactElement | null {

  return (
    <div className="rate-card-group">
      <div className="rate-card-group-header">
        <span>{CATEGORY_LABELS[category]}</span>
        <span className="rate-card-group-count">{rates.length} rates</span>
      </div>
      <div className="rate-card-group-body">
        {rates.map((rate) => (
          <RateCard
            key={rate.id}
            rate={rate}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onInsertToBoq={onInsertToBoq}
          />
        ))}
      </div>
    </div>
  );
}

export function RateCardList({
  rates,
  searchQuery,
  categoryFilter,
  onUpdate,
  onDelete,
  onInsertToBoq,
}: RateCardListProps): React.ReactElement {
  const filtered = useMemo(() => {
    return rates.filter((rate) => {
      if (searchQuery && !rate.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (categoryFilter !== 'all' && rate.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [rates, searchQuery, categoryFilter]);

  const grouped = useMemo(() => {
    const groups: Record<RateCategory, MaterialRate[]> = {
      material: [],
      labour: [],
      equipment: [],
      other: [],
    };
    for (const rate of filtered) {
      groups[rate.category]?.push(rate);
    }
    // Sort within groups by name
    for (const group of Object.values(groups)) {
      group.sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }, [filtered]);

  const categories: RateCategory[] = ['material', 'labour', 'equipment', 'other'];

  return (
    <div className="rate-card-list">
      {categories.map((cat) => (
        <RateCardGroup
          key={cat}
          category={cat}
          rates={grouped[cat]}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onInsertToBoq={onInsertToBoq}
        />
      ))}
      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">No rates found</div>
          <div className="empty-state-desc">Try a different search or category filter</div>
        </div>
      )}
    </div>
  );
}

export type { RateCardListProps, RateCardGroupProps };