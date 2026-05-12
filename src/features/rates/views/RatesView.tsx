/**
 * Rates Library view
 * Master rate management: edit, search, filter, insert to BOQ.
 * "Recalculate from Rates" button updates spec BOQ items with current rates.
 *
 * Skills: ag-grid — editable grid, cell editors, themes
 *         vercel-react-best-practices — memo, stable callbacks
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellValueChangedEvent, GridReadyEvent, GridApi } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
import { useRatesStore, RATE_CATEGORY_OPTIONS } from '../store';
import { RateCardList } from '../components/RateCard';
import { useBoqStore } from '../../boq/store';
import { useProjectsStore } from '../../projects/store';
import { formatCurrency } from '../../../lib/calculations';
import type { MaterialRate, RateCategory } from '../../../types/domain';

const CATEGORY_LABELS: Record<RateCategory, string> = {
  material: 'Material',
  labour: 'Labour',
  equipment: 'Equipment',
  other: 'Other',
};

// =============================================================================
// RATE CALCULATOR — Pure functions
// =============================================================================

export interface SpecRateMap {
  cement: number;
  steel: number;
  bricks: number;
  sand: number;
  crush: number;
  plaster: number;
  putty: number;
  primer: number;
  paint: number;
  skirting: number;
  flooring: number;
  cabinet: number;
  countertop: number;
  lightPoint: number;
  fanPoint: number;
  socketPoint: number;
  pprc: number;
  upvc: number;
  geyser: number;
  mainDoor: number;
  internalDoor: number;
  aluminumWindow: number;
  concrete: number;
}

export function buildRateMap(rates: MaterialRate[]): SpecRateMap {
  const byName = (name: string): number => {
    const match = rates.find((r) => r.name.toLowerCase().includes(name.toLowerCase()));
    return match?.rate ?? 0;
  };

  return {
    cement: byName('cement') || 1450,
    steel: byName('steel') || 265000,
    bricks: byName('brick') || 18,
    sand: byName('sand') || 105,
    crush: byName('crush') || 120,
    plaster: byName('plaster') || 50,
    putty: byName('putty') || 800,
    primer: byName('primer') || 350,
    paint: byName('paint') || 12000,
    skirting: byName('skirt') || 80,
    flooring: byName('tile') || 150,
    cabinet: byName('cabinet') || 300,
    countertop: byName('granite') || 500,
    lightPoint: byName('light point') || byName('electrical point') || 2500,
    fanPoint: byName('fan point') || 2000,
    socketPoint: byName('socket') || 1500,
    pprc: byName('pprc') || 180,
    upvc: byName('upvc') || 120,
    geyser: byName('geyser') || 35000,
    mainDoor: byName('main door') || 25000,
    internalDoor: byName('internal door') || 15000,
    aluminumWindow: byName('aluminum window') || 400,
    concrete: byName('concrete') || 320,
  };
}

export function recalculateBoqWithRates(
  items: { description: string; quantity: number; unit: string; rate: number }[],
  rateMap: SpecRateMap
): { updatedItems: typeof items; total: number; savings: number } {
  const defaultRates: Record<string, number> = {
    'Cement': rateMap.cement,
    'Reinforcement Steel': rateMap.steel,
    'Bricks': rateMap.bricks,
    'Sand': rateMap.sand,
    'Crush': rateMap.crush,
    'Plaster': rateMap.plaster,
    'Putty': rateMap.putty,
    'Primer': rateMap.primer,
    'Paint': rateMap.paint,
    'Skirting': rateMap.skirting,
    'Floor Tile': rateMap.flooring,
    'Kitchen Cabinet': rateMap.cabinet,
    'Countertop': rateMap.countertop,
    'Light Point': rateMap.lightPoint,
    'Fan Point': rateMap.fanPoint,
    'Socket': rateMap.socketPoint,
    'PPRC': rateMap.pprc,
    'UPVC': rateMap.upvc,
    'Geyser': rateMap.geyser,
    'Main Door': rateMap.mainDoor,
    'Internal Door': rateMap.internalDoor,
    'Aluminum Window': rateMap.aluminumWindow,
  };

  let total = 0;
  let defaultTotal = 0;
  const updatedItems = items.map((item) => {
    const descLower = item.description.toLowerCase();
    let matchedRate = 0;
    for (const [key, rate] of Object.entries(defaultRates)) {
      if (descLower.includes(key.toLowerCase())) {
        matchedRate = rate;
        break;
      }
    }
    const itemTotal = item.quantity * (matchedRate || item.rate);
    total += itemTotal;
    defaultTotal += item.quantity * item.rate;
    return { ...item, rate: matchedRate || item.rate };
  });

  return {
    updatedItems,
    total,
    savings: defaultTotal - total,
  };
}

// =============================================================================
// RATE CALCULATOR PANEL
// =============================================================================

interface RateCalculatorPanelProps {
  onRecalculate: (rateMap: SpecRateMap) => void;
}

function RateCalculatorPanel({ onRecalculate }: RateCalculatorPanelProps): React.ReactElement {
  const rates = useRatesStore((s) => s.rates);
  const [expanded, setExpanded] = useState(false);

  const rateMap = useMemo(() => buildRateMap(rates), [rates]);

  const totalRates = useMemo(() => {
    return Object.values(rateMap).filter((r) => r > 0).length;
  }, [rateMap]);

  return (
    <div className="rate-calc-panel">
      <div
        className="rate-calc-header"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
      >
        <span>🧮 Rate Calculator</span>
        <span className="rate-calc-summary">
          {totalRates}/22 rates loaded
          {expanded ? ' ▲' : ' ▼'}
        </span>
      </div>

      {expanded && (
        <div className="rate-calc-body">
          <div className="rate-calc-grid">
            {(
              [
                ['Cement (bag)', 'cement'],
                ['Steel (ton)', 'steel'],
                ['Bricks (pcs)', 'bricks'],
                ['Sand (cft)', 'sand'],
                ['Crush (cft)', 'crush'],
                ['Plaster (sft)', 'plaster'],
                ['Putty (bag)', 'putty'],
                ['Primer (ltr)', 'primer'],
                ['Paint (drum)', 'paint'],
                ['Skirting (rft)', 'skirting'],
                ['Flooring (sft)', 'flooring'],
                ['Cabinet (sft)', 'cabinet'],
                ['Countertop (sft)', 'countertop'],
                ['Light Pt', 'lightPoint'],
                ['Fan Pt', 'fanPoint'],
                ['Socket Pt', 'socketPoint'],
                ['PPRC (rft)', 'pprc'],
                ['UPVC (rft)', 'upvc'],
                ['Geyser (nos)', 'geyser'],
                ['Main Door', 'mainDoor'],
                ['Internal Door', 'internalDoor'],
                ['Al Window (sft)', 'aluminumWindow'],
              ] as const
            ).map(([label, key]) => (
              <div key={key} className="rate-calc-item">
                <span className="rate-calc-label">{label}</span>
                <span className={`rate-calc-value ${rateMap[key] > 0 ? '' : 'rate-calc-missing'}`}>
                  {rateMap[key] > 0 ? formatCurrency(rateMap[key], '') : '—'}
                </span>
              </div>
            ))}
          </div>
          <div className="rate-calc-footer">
            <span className="text-sm text-muted">
              {totalRates}/22 rates available from library
            </span>
            <button
              className="btn btn-primary"
              style={{ height: 30, fontSize: 11 }}
              onClick={() => onRecalculate(rateMap)}
              disabled={totalRates === 0}
            >
              🔄 Apply to BOQ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RatesView(): React.ReactElement {
  const gridRef = useRef<AgGridReact>(null);
  const gridApiRef = useRef<GridApi | null>(null);

  const rates = useRatesStore((s) => s.rates);
  const searchQuery = useRatesStore((s) => s.searchQuery);
  const categoryFilter = useRatesStore((s) => s.categoryFilter);
  const setSearchQuery = useRatesStore((s) => s.setSearchQuery);
  const setCategoryFilter = useRatesStore((s) => s.setCategoryFilter);
  const addRate = useRatesStore((s) => s.addRate);
  const updateRate = useRatesStore((s) => s.updateRate);
  const deleteRate = useRatesStore((s) => s.deleteRate);

  const boqItems = useBoqStore((s) => s.items);
  const currentProjectId = useProjectsStore((s) => s.currentProjectId);

  const [viewMode, setViewMode] = useState<'cards' | 'grid'>('cards');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRate, setNewRate] = useState({
    name: '',
    category: 'material' as RateCategory,
    unit: 'cft',
    rate: 0,
    city: 'Lahore',
  });

  const columnDefs = useMemo<ColDef<MaterialRate>[]>(() => [
    {
      headerName: 'Name',
      field: 'name',
      flex: 2,
      minWidth: 160,
      editable: true,
    },
    {
      headerName: 'Category',
      field: 'category',
      width: 100,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['material', 'labour', 'equipment', 'other'] },
      valueFormatter: (p) => CATEGORY_LABELS[p.value as RateCategory] ?? p.value,
    },
    {
      headerName: 'Unit',
      field: 'unit',
      width: 70,
      editable: true,
    },
    {
      headerName: 'Rate (PKR)',
      field: 'rate',
      width: 130,
      editable: true,
      cellEditor: 'agNumberCellEditor',
      valueFormatter: (p) =>
        p.value ? `${Number(p.value).toLocaleString('en-PK')} / ${p.data?.unit ?? 'unit'}` : '—',
    },
    {
      headerName: 'City',
      field: 'city',
      width: 90,
      editable: true,
    },
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<MaterialRate>) => {
      if (!event.data || !event.colDef?.field) return;
      const field = event.colDef.field as keyof MaterialRate;
      updateRate(event.data.id, { [field]: event.newValue });
    },
    [updateRate]
  );

  const handleGridReady = useCallback((params: GridReadyEvent) => {
    gridApiRef.current = params.api;
  }, []);

  const handleAddRate = useCallback(() => {
    if (!newRate.name.trim() || newRate.rate <= 0) return;
    addRate({ ...newRate });
    setNewRate({ name: '', category: 'material', unit: 'cft', rate: 0, city: 'Lahore' });
    setShowAddForm(false);
  }, [newRate, addRate]);

  const handleInsertToBoq = useCallback(
    (_rate: MaterialRate) => {
      if (!currentProjectId) {
        alert('Please select a project first');
        return;
      }
      alert('Double-click a rate in grid view to insert into BOQ, or use the BOQ tab directly.');
    },
    [currentProjectId]
  );

  const handleRecalculate = useCallback(
    (rateMap: SpecRateMap) => {
      if (boqItems.length === 0) {
        alert('No BOQ items to recalculate. Generate BOQ from Specification first.');
        return;
      }
      const result = recalculateBoqWithRates(boqItems, rateMap);
      alert(
        `Rate update preview:\n` +
        `Items: ${result.updatedItems.length}\n` +
        `New total: ${formatCurrency(result.total)}\n` +
        `Savings: ${formatCurrency(result.savings)}\n\n` +
        `To apply, update rates in the grid and regenerate from Specification.`
      );
    },
    [boqItems]
  );

  const handleDeleteRate = useCallback(
    (id: number) => {
      if (confirm('Delete this rate?')) {
        deleteRate(id);
      }
    },
    [deleteRate]
  );

  return (
    <div className="panel">
      {/* Header */}
      <div className="panel-head">
        <div className="title-block">
          <h1 className="panel-title">
            Material Rates
            <small> ({rates.length})</small>
          </h1>
        </div>
        <div className="panel-actions">
          <div className="density-toggle">
            <button
              className={`density-toggle-btn ${viewMode === 'cards' ? 'selected' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              ▦ Cards
            </button>
            <button
              className={`density-toggle-btn ${viewMode === 'grid' ? 'selected' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              ▤ Grid
            </button>
          </div>
          <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
            + Add Rate
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="rates-toolbar">
        <div className="rates-search">
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Search rates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 280 }}
          />
        </div>
        <div className="rates-category-filter">
          <select
            className="form-control"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as RateCategory | 'all')}
          >
            <option value="all">All Categories</option>
            {RATE_CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <RateCalculatorPanel onRecalculate={handleRecalculate} />
      </div>

      {/* Content */}
      {viewMode === 'cards' ? (
        <RateCardList
          rates={rates}
          searchQuery={searchQuery}
          categoryFilter={categoryFilter}
          onUpdate={updateRate}
          onDelete={handleDeleteRate}
          onInsertToBoq={handleInsertToBoq}
        />
      ) : (
        <div style={{ height: 500, width: '100%' }} className="mt-2">
          <AgGridReact
            ref={gridRef}
            rowData={rates}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            onCellValueChanged={handleCellValueChanged}
            onGridReady={handleGridReady}
            rowSelection={{ mode: 'multiRow' }}
            animateRows={true}
            theme={themeQuartz}
            getRowId={(p) => String(p.data.id)}
          />
        </div>
      )}

      {/* Add Rate Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add New Rate</div>
              <button className="modal-close" onClick={() => setShowAddForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-field span-12 mb-4">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={newRate.name}
                  onChange={(e) => setNewRate({ ...newRate, name: e.target.value })}
                  placeholder="e.g. Cement (OPC 50kg)"
                  autoFocus
                />
              </div>
              <div className="form-row">
                <div className="form-field span-6">
                  <label className="form-label">Category</label>
                  <select
                    className="form-control"
                    value={newRate.category}
                    onChange={(e) =>
                      setNewRate({ ...newRate, category: e.target.value as RateCategory })
                    }
                  >
                    {RATE_CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field span-6">
                  <label className="form-label">Unit</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newRate.unit}
                    onChange={(e) => setNewRate({ ...newRate, unit: e.target.value })}
                    placeholder="e.g. bag, cft, pcs"
                  />
                </div>
              </div>
              <div className="form-row mt-4">
                <div className="form-field span-6">
                  <label className="form-label">Rate (PKR)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newRate.rate || ''}
                    onChange={(e) =>
                      setNewRate({ ...newRate, rate: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="e.g. 1250"
                    min={1}
                  />
                </div>
                <div className="form-field span-6">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newRate.city}
                    onChange={(e) => setNewRate({ ...newRate, city: e.target.value })}
                    placeholder="e.g. Lahore"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleAddRate}
                disabled={!newRate.name.trim() || newRate.rate <= 0}
              >
                Add Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RatesView;