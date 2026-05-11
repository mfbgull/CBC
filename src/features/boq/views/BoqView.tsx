/**
 * BOQ Editor view with AG Grid spreadsheet
 * Uses ERP design system
 * Phase 2: autosave, validation, totals summary
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeQuartz, type ColDef, type CellValueChangedEvent, type GridReadyEvent, type GridApi } from 'ag-grid-community';
import { useBoqStore, CATEGORY_OPTIONS } from '../store';
import { useProjectsStore } from '../../projects/store';
import { useSettingsStore } from '../../settings/store';
import { formatCurrency, calculateTotals } from '../../../lib/calculations';
import type { BoqItem, CalculationResult } from '../../../types/domain';

export function BoqView() {
  const gridRef = useRef<AgGridReact>(null);
  const gridApiRef = useRef<GridApi | null>(null);

  const items = useBoqStore((state) => state.items);
  console.log('[View] BoqView items:', items.length, 'ids:', items.map(i => i.id));
  const addItem = useBoqStore((state) => state.addItem);
  const updateItem = useBoqStore((state) => state.updateItem);
  const deleteItems = useBoqStore((state) => state.deleteItems);
  const selectedItemIds = useBoqStore((state) => state.selectedItemIds);
  const setSelectedItems = useBoqStore((state) => state.setSelectedItems);
  const isDirty = useBoqStore((state) => state.isDirty);

  const currentProjectId = useProjectsStore((state) => state.currentProjectId);

  const settings = useSettingsStore((state) => state.settings);

  // Column definitions
  const columnDefs = useMemo<ColDef<BoqItem>[]>(() => [
    {
      headerName: 'Description',
      field: 'description',
      flex: 2,
      minWidth: 200,
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
        values: CATEGORY_OPTIONS.map((c) => c.value),
      },
      valueFormatter: (params) => {
        const cat = CATEGORY_OPTIONS.find((c) => c.value === params.value);
        return cat?.label || params.value;
      },
    },
    {
      headerName: 'Quantity',
      field: 'quantity',
      width: 120,
      minWidth: 100,
      editable: true,
      cellEditor: 'agNumberCellEditor',
      valueFormatter: (params) => {
        const qty = params.value || 0;
        const unit = params.data?.unit || 'sft';
        return `${qty.toLocaleString('en-PK', { minimumFractionDigits: 2 })} ${unit}`;
      },
    },
    {
      headerName: 'Rate',
      field: 'rate',
      width: 130,
      minWidth: 100,
      editable: true,
      cellEditor: 'agNumberCellEditor',
      valueFormatter: (params) => formatCurrency(params.value || 0, ''),
    },
    {
      headerName: 'Total',
      width: 150,
      minWidth: 120,
      editable: false,
      valueGetter: (params) => {
        const qty = params.data?.quantity || 0;
        const rate = params.data?.rate || 0;
        return qty * rate;
      },
      valueFormatter: (params) => formatCurrency(params.value || 0),
      cellStyle: { fontWeight: '600', backgroundColor: '#f9fafb' },
    },
  ], []);

  // Default column config
  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  // Summary with totals
  const subtotal = useMemo(() =>
    items.reduce((sum, item) => sum + (item.quantity * item.rate), 0),
    [items]
  );

  const totals: CalculationResult = useMemo(() =>
    calculateTotals(
      subtotal,
      settings.defaultTaxRate,
      settings.defaultContingencyRate,
      settings.defaultProfitMarginRate
    ),
    [subtotal, settings.defaultTaxRate, settings.defaultContingencyRate, settings.defaultProfitMarginRate]
  );

  // Autosave effect
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  useEffect(() => {
    if (isDirty && currentProjectId) {
      setSaveStatus('unsaved');
      const timer = setTimeout(() => {
        setSaveStatus('saving');
        localStorage.setItem(`boq-items-${currentProjectId}`, JSON.stringify(items));
        setTimeout(() => setSaveStatus('saved'), 300);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [items, isDirty, currentProjectId]);

  // Validate button handler
  const handleValidate = useCallback(() => {
    const result = useBoqStore.getState().validate();
    if (result.valid) {
      alert('All items are valid!');
    } else {
      alert(`Found ${result.errors.length} validation error(s)`);
    }
  }, []);

  // Handle cell value changes
  const handleCellValueChanged = useCallback((event: CellValueChangedEvent<BoqItem>) => {
    const { data, colDef, newValue } = event;
    if (!data) return;

    const field = colDef?.field as keyof BoqItem;
    if (field) {
      updateItem(data.id, { [field]: newValue });
    }
  }, [updateItem]);

  // Handle grid ready
  const handleGridReady = useCallback((params: GridReadyEvent) => {
    gridApiRef.current = params.api;
  }, []);

  // Handle selection changed
  const handleSelectionChanged = useCallback(() => {
    const api = gridApiRef.current;
    if (!api) return;

    const selectedNodes = api.getSelectedNodes();
    const selectedIds = selectedNodes.map((node) => node.data?.id).filter(Boolean) as number[];
    setSelectedItems(selectedIds);
  }, [setSelectedItems]);

  // Handle add new row
  const handleAddRow = useCallback(async () => {
    if (!currentProjectId) {
      alert('Please select a project first');
      return;
    }

    // Add item to database and get the actual ID
    const newItem = await addItem({
      description: '',
      quantity: 0,
      unit: 'sft',
      rate: 0,
      category: 'other',
      isSectionHeader: false,
    });

    // Focus on the new row after it's added
    setTimeout(() => {
      const api = gridApiRef.current;
      if (api && newItem) {
        const rowNode = api.getRowNode(String(newItem.id));
        if (rowNode && rowNode.rowIndex !== null) {
          const rowIndex = rowNode.rowIndex;
          api.setFocusedCell(rowIndex, 'description');
          api.startEditingCell({
            rowIndex,
            colKey: 'description',
          });
        }
      }
    }, 100);
  }, [currentProjectId, items.length, addItem]);

  // Handle delete selected rows
  const handleDeleteSelected = useCallback(() => {
    if (selectedItemIds.length === 0) return;
    if (confirm(`Delete ${selectedItemIds.length} selected item(s)?`)) {
      deleteItems(selectedItemIds);
    }
  }, [selectedItemIds, deleteItems]);

  // No project selected
  if (!currentProjectId) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">No Project Selected</div>
        <div className="empty-state-desc">Please select a project from the Projects tab to view its BOQ</div>
      </div>
    );
  }

  return (
    <div className="panel">
      {/* Panel Header with Toolbar */}
      <div className="panel-head">
        <div className="flex items-center gap-4">
          <button onClick={handleAddRow} className="btn btn-primary">
            + Add Item
          </button>
          <button onClick={handleValidate} className="btn btn-ghost">
            Validate
          </button>
          {selectedItemIds.length > 0 && (
            <button onClick={handleDeleteSelected} className="btn btn-ghost text-red-600">
              Delete ({selectedItemIds.length})
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-xs ${saveStatus === 'saved' ? 'text-green-600' : saveStatus === 'saving' ? 'text-amber-600' : 'text-muted'}`}>
            {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? 'Saving...' : '• Unsaved'}
          </span>
          <span className="text-sm text-muted">{items.length} items</span>
        </div>
      </div>

      {/* Grid container */}
      <div style={{ height: '450px', width: '100%' }} className="mt-2">
        <AgGridReact
          ref={gridRef}
          rowData={items}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowSelection={{ mode: 'multiRow' }}
          onCellValueChanged={handleCellValueChanged}
          onGridReady={handleGridReady}
          onSelectionChanged={handleSelectionChanged}
          animateRows={true}
          rowHeight={42}
          theme={themeQuartz}
        />
      </div>

      {/* Summary Footer */}
      <div className="mt-4">
        <div className="summary-card">
          <div className="summary-header">
            <span className="summary-title">Summary</span>
            <span className="summary-count">{items.length} items</span>
          </div>
          <div className="summary-body">
            <div className="summary-row">
              <span className="summary-label">Subtotal</span>
              <span className="summary-value">{formatCurrency(subtotal)}</span>
            </div>
            {settings.defaultTaxRate > 0 && (
              <div className="summary-row">
                <span className="summary-label">Tax ({settings.defaultTaxRate}%)</span>
                <span className="summary-value muted">{formatCurrency(totals.tax)}</span>
              </div>
            )}
            {settings.defaultContingencyRate > 0 && (
              <div className="summary-row">
                <span className="summary-label">Contingency ({settings.defaultContingencyRate}%)</span>
                <span className="summary-value muted">{formatCurrency(totals.contingency)}</span>
              </div>
            )}
            {settings.defaultProfitMarginRate > 0 && (
              <div className="summary-row">
                <span className="summary-label">Profit Margin ({settings.defaultProfitMarginRate}%)</span>
                <span className="summary-value muted">{formatCurrency(totals.profitMargin)}</span>
              </div>
            )}
            <div className="summary-divider"></div>
            <div className="summary-row total-row">
              <span className="summary-label">Grand Total</span>
              <span className="summary-value total">{formatCurrency(totals.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BoqView;