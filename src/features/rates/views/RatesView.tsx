/**
 * Rates Library view
 * Uses ERP design system
 */

import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellValueChangedEvent, GridReadyEvent, GridApi, RowDoubleClickedEvent } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
import { useRatesStore, RATE_CATEGORY_OPTIONS } from '../store';
import { selectAllRates, selectSearchQuery, selectCategoryFilter } from '../store';
import { useBoqStore } from '../../boq/store';
import { useProjectsStore, selectAllProjects, selectCurrentProjectId } from '../../projects/store';
import { formatCurrency } from '../../../lib/calculations';
import type { MaterialRate, BoqItem, BoqItemCategory } from '../../../types/domain';

// Sample rates data for initial load
const SAMPLE_RATES: MaterialRate[] = [
  { id: 1, name: 'Cement (OPC)', category: 'material', unit: 'bag', rate: 1250, city: 'Lahore', updatedAt: '2024-01-15' },
  { id: 2, name: 'Sand', category: 'material', unit: 'cft', rate: 45, city: 'lahore', updatedAt: '2024-01-15' },
  { id: 3, name: 'Crush', category: 'material', unit: 'cft', rate: 85, city: 'lahore', updatedAt: '2024-01-15' },
  { id: 4, name: 'Steel (Grade 60)', category: 'material', unit: 'ton', rate: 285000, city: 'lahore', updatedAt: '2024-01-15' },
  { id: 5, name: 'Bricks', category: 'material', unit: 'pcs', rate: 18, city: 'lahore', updatedAt: '2024-01-15' },
  { id: 6, name: 'Masonry Labour', category: 'labour', unit: 'cft', rate: 45, city: 'lahore', updatedAt: '2024-01-15' },
  { id: 7, name: 'Carpenter', category: 'labour', unit: 'day', rate: 2500, city: 'lahore', updatedAt: '2024-01-15' },
  { id: 8, name: 'Mistri', category: 'labour', unit: 'day', rate: 3500, city: 'lahore', updatedAt: '2024-01-15' },
  { id: 9, name: 'Painter', category: 'labour', unit: 'sqft', rate: 15, city: 'lahore', updatedAt: '2024-01-15' },
  { id: 10, name: 'Electrician', category: 'labour', unit: 'point', rate: 400, city: 'lahore', updatedAt: '2024-01-15' },
  { id: 11, name: 'Plumber', category: 'labour', unit: 'point', rate: 350, city: 'lahore', updatedAt: '2024-01-15' },
  { id: 12, name: 'Concrete Mix 1:2:4', category: 'material', unit: 'cft', rate: 320, city: 'lahore', updatedAt: '2024-01-15' },
  { id: 13, name: 'RCC Work', category: 'labour', unit: 'cft', rate: 180, city: 'lahore', updatedAt: '2024-01-15' },
  { id: 14, name: 'Earth Work', category: 'labour', unit: 'cft', rate: 12, city: 'lahore', updatedAt: '2024-01-15' },
  { id: 15, name: 'Tiles (Floor)', category: 'material', unit: 'sqft', rate: 150, city: 'lahore', updatedAt: '2024-01-15' },
  { id: 16, name: 'PVC Pipe', category: 'material', unit: 'rft', rate: 45, city: 'lahore', updatedAt: '2024-01-15' },
  { id: 17, name: 'WHT Paint', category: 'material', unit: 'ltr', rate: 450, city: 'lahore', updatedAt: '2024-01-15' },
  { id: 18, name: 'Glass', category: 'material', unit: 'sqft', rate: 120, city: 'lahore', updatedAt: '2024-01-15' },
];

export function RatesView() {
  const gridRef = useRef<AgGridReact>(null);
  const gridApiRef = useRef<GridApi | null>(null);

  // Store state - use simple selectors
  const rates = useRatesStore(selectAllRates);
  const searchQuery = useRatesStore(selectSearchQuery);
  const categoryFilter = useRatesStore(selectCategoryFilter);
  const setSearchQuery = useRatesStore((state) => state.setSearchQuery);
  const setCategoryFilter = useRatesStore((state) => state.setCategoryFilter);
  const addRate = useRatesStore((state) => state.addRate);
  const updateRate = useRatesStore((state) => state.updateRate);
  const setRates = useRatesStore((state) => state.setRates);

  // Projects state
  const projects = useProjectsStore(selectAllProjects);
  const currentProjectId = useProjectsStore(selectCurrentProjectId);
  const addBoqItem = useBoqStore((state) => state.addItem);

  // Find current project
  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === currentProjectId);
  }, [projects, currentProjectId]);

  // Filter rates locally
  const filteredRates = useMemo(() => {
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

  // Load sample rates on first render
  useEffect(() => {
    if (rates.length === 0) {
      setRates(SAMPLE_RATES);
    }
  }, []);

  // Local state for add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRate, setNewRate] = useState({
    name: '',
    category: 'material' as const,
    unit: 'cft',
    rate: 0,
    city: 'Lahore',
  });

  // Column definitions
  const columnDefs = useMemo<ColDef<MaterialRate>[]>(() => [
    {
      headerName: 'Name',
      field: 'name',
      flex: 2,
      minWidth: 150,
      editable: true,
      cellEditor: 'agTextCellEditor',
    },
    {
      headerName: 'Category',
      field: 'category',
      width: 100,
      minWidth: 80,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: RATE_CATEGORY_OPTIONS.map((c) => c.value),
      },
      valueFormatter: (params) => {
        const cat = RATE_CATEGORY_OPTIONS.find((c) => c.value === params.value);
        return cat?.label || params.value;
      },
    },
    {
      headerName: 'Rate',
      field: 'rate',
      width: 130,
      minWidth: 100,
      editable: true,
      cellEditor: 'agNumberCellEditor',
      valueFormatter: (params) => {
        const rate = params.value || 0;
        const unit = params.data?.unit || 'cft';
        return formatCurrency(rate, '') + ' / ' + unit;
      },
    },
    {
      headerName: 'City',
      field: 'city',
      width: 90,
      editable: true,
      cellEditor: 'agTextCellEditor',
    },
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  // Handle cell value changes
  const handleCellValueChanged = useCallback((event: CellValueChangedEvent<MaterialRate>) => {
    const { data, colDef, newValue } = event;
    if (!data) return;
    const field = colDef?.field as keyof MaterialRate;
    if (field) {
      updateRate(data.id, { [field]: newValue });
    }
  }, [updateRate]);

  const handleGridReady = useCallback((params: GridReadyEvent) => {
    gridApiRef.current = params.api;
  }, []);

  // Handle add rate
  const handleAddRate = useCallback(() => {
    if (!newRate.name || newRate.rate <= 0) {
      return;
    }

    const rate: MaterialRate = {
      id: Date.now(),
      ...newRate,
      updatedAt: new Date().toISOString(),
    };

    addRate(rate);
    setNewRate({ name: '', category: 'material', unit: 'cft', rate: 0, city: 'Lahore' });
    setShowAddForm(false);
  }, [newRate, addRate]);

  // Handle insert into BOQ
  const handleInsertToBoq = useCallback((rate: MaterialRate) => {
    if (!currentProject) {
      alert('Please select a project first');
      return;
    }

    const categoryMap: Record<string, BoqItemCategory> = {
      material: 'other',
      labour: 'other',
      equipment: 'other',
      other: 'other',
    };

    const boqItem: BoqItem = {
      id: Date.now(),
      projectId: currentProjectId || 0,
      description: rate.name,
      quantity: 1,
      unit: rate.unit,
      rate: rate.rate,
      category: categoryMap[rate.category] || 'other',
      sortOrder: 0,
      isSectionHeader: false,
    };

    addBoqItem(boqItem);
    alert(`Added "${rate.name}" to BOQ`);
  }, [currentProjectId, addBoqItem]);

  // Handle row double click
  const handleRowDoubleClick = useCallback((event: RowDoubleClickedEvent<MaterialRate>) => {
    if (event.data) {
      handleInsertToBoq(event.data);
    }
  }, [handleInsertToBoq]);

  return (
    <div className="panel">
      {/* Panel Header */}
      <div className="panel-head">
        <div className="title-block">
          <h1 className="panel-title">
            Material Rates
            <small>({filteredRates.length})</small>
          </h1>
        </div>
        <div className="panel-actions">
          <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
            + Add Rate
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="form-grid mt-4">
        <div className="form-field span-4">
          <label className="form-label">Search</label>
          <input
            type="text"
            className="form-control"
            placeholder="Search rates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="form-field span-3">
          <label className="form-label">Category</label>
          <select
            className="form-control"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
          >
            <option value="all">All Categories</option>
            {RATE_CATEGORY_OPTIONS.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      <div style={{ height: '450px', width: '100%' }} className="mt-4">
        <AgGridReact
          ref={gridRef}
          rowData={filteredRates}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onCellValueChanged={handleCellValueChanged}
          onGridReady={handleGridReady}
          onRowDoubleClicked={handleRowDoubleClick}
          rowSelection={{ mode: 'multiRow' }}
          animateRows={true}
          theme={themeQuartz}
        />
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Rate</h3>
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
                />
              </div>
              <div className="form-field span-6 mb-4">
                <label className="form-label">Category</label>
                <select
                  className="form-control"
                  value={newRate.category}
                  onChange={(e) => setNewRate({ ...newRate, category: e.target.value as any })}
                >
                  {RATE_CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-field span-6 mb-4">
                <label className="form-label">Unit</label>
                <input
                  type="text"
                  className="form-control"
                  value={newRate.unit}
                  onChange={(e) => setNewRate({ ...newRate, unit: e.target.value })}
                />
              </div>
              <div className="form-field span-6 mb-4">
                <label className="form-label">Rate (PKR)</label>
                <input
                  type="number"
                  className="form-control"
                  value={newRate.rate || ''}
                  onChange={(e) => setNewRate({ ...newRate, rate: Number(e.target.value) })}
                />
              </div>
              <div className="form-field span-6 mb-4">
                <label className="form-label">City</label>
                <input
                  type="text"
                  className="form-control"
                  value={newRate.city}
                  onChange={(e) => setNewRate({ ...newRate, city: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddRate}>Add Rate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RatesView;