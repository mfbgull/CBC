/**
 * AG Grid Column Definitions for BOQ
 * According to technical spec
 */

import type { ColDef } from 'ag-grid-community';
import type { BoqItem } from '../../types/domain';
import { formatCurrency } from '../../lib/calculations';
import { CATEGORY_OPTIONS } from './store';

/**
 * Default column configuration for BOQ
 * Per spec: no sorting (order is manual), no filtering, resizable
 */
export const defaultColDef: ColDef<BoqItem> = {
  sortable: false,
  filter: false,
  resizable: true,
  suppressMovable: true,
};

/**
 * Main BOQ column definitions
 * Matches technical spec exactly
 */
export const columnDefs: ColDef<BoqItem>[] = [
  {
    field: 'description',
    headerName: 'Description',
    flex: 1,
    minWidth: 200,
    editable: true,
    cellEditor: 'agTextCellEditor',
  },
  {
    field: 'category',
    headerName: 'Category',
    width: 120,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: {
      values: CATEGORY_OPTIONS.map((c: { value: string }) => c.value),
    },
    valueFormatter: (params) => {
      const cat = CATEGORY_OPTIONS.find((c: { value: string }) => c.value === params.value);
      return cat?.label || params.value;
    },
  },
  {
    field: 'quantity',
    headerName: 'Quantity',
    width: 100,
    editable: true,
    cellEditor: 'agNumberCellEditor',
    valueFormatter: (params) => params.value?.toLocaleString('en-PK', { minimumFractionDigits: 2 }) || '0',
  },
  {
    field: 'unit',
    headerName: 'Unit',
    width: 100,
    editable: true,
    cellEditor: 'agSelectCellEditor',
  },
  {
    field: 'rate',
    headerName: 'Rate',
    width: 120,
    editable: true,
    cellEditor: 'agNumberCellEditor',
    valueFormatter: (params) => formatCurrency(params.value || 0, ''),
  },
  {
    headerName: 'Total',
    width: 140,
    editable: false,
    valueGetter: (params) => {
      const qty = params.data?.quantity || 0;
      const rate = params.data?.rate || 0;
      return qty * rate;
    },
    valueFormatter: (params) => formatCurrency(params.value || 0),
    cellStyle: { fontWeight: '600', backgroundColor: '#f9fafb' },
    colId: 'total',
  },
];