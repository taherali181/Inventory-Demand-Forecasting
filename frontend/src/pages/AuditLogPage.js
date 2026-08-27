import React, { useState } from 'react';
import DataTable from '../components/DataTable';
import LoadMoreButton from '../components/LoadMoreButton';
import { listStockMovements } from '../api/stock';
import { listUploadHistory } from '../api/upload';
import usePaginatedList from '../hooks/usePaginatedList';

const MOVEMENT_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'product_id', label: 'Product ID' },
  { key: 'warehouse_id', label: 'Warehouse ID' },
  { key: 'movement_type', label: 'Type' },
  { key: 'quantity_delta', label: 'Quantity change' },
  { key: 'created_by', label: 'By user ID' },
  { key: 'created_at', label: 'When', render: (row) => new Date(row.created_at).toLocaleString() },
];

const UPLOAD_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'filename', label: 'Filename' },
  { key: 'status', label: 'Status' },
  { key: 'row_count', label: 'Rows persisted' },
  {
    key: 'validation_summary',
    label: 'Validation',
    render: (row) =>
      row.validation_summary
        ? `${row.validation_summary.valid_rows}/${row.validation_summary.total_rows} valid`
        : '—',
  },
  { key: 'error_message', label: 'Error', render: (row) => row.error_message || '—' },
  { key: 'uploaded_at', label: 'When', render: (row) => new Date(row.uploaded_at).toLocaleString() },
];

/** Combines the two existing audit trails this app already writes but
 * previously had no unified viewer for: stock_movements (adjustments +
 * PO receipts) and upload_history (every CSV upload's outcome). Both
 * endpoints already existed (Change 10.6 / 11.3) — this page just tabs
 * between them rather than introducing new backend surface. */
function AuditLogPage() {
  const [tab, setTab] = useState('movements');

  const movements = usePaginatedList(({ skip, limit }) => listStockMovements({ skip, limit }), []);
  const uploads = usePaginatedList(({ skip, limit }) => listUploadHistory({ skip, limit }), []);

  const active = tab === 'movements' ? movements : uploads;
  const columns = tab === 'movements' ? MOVEMENT_COLUMNS : UPLOAD_COLUMNS;
  const emptyMessage = tab === 'movements' ? 'No stock movements yet.' : 'No uploads yet.';

  return (
    <div className="page">
      <h1>Audit log</h1>
      <p>A combined view of every stock movement and every CSV upload's outcome.</p>

      <div className="row-actions">
        <button type="button" onClick={() => setTab('movements')} disabled={tab === 'movements'}>
          Stock movements
        </button>
        <button type="button" onClick={() => setTab('uploads')} disabled={tab === 'uploads'}>
          Upload history
        </button>
      </div>

      {active.error && <p className="form-error">{active.error}</p>}
      {active.isLoading && active.items.length === 0 ? (
        <p>Loading…</p>
      ) : (
        <DataTable columns={columns} rows={active.items} rowKey="id" emptyMessage={emptyMessage} />
      )}
      <LoadMoreButton
        items={active.items}
        total={active.total}
        hasMore={active.hasMore}
        isLoading={active.isLoading}
        onLoadMore={active.loadMore}
      />
    </div>
  );
}

export default AuditLogPage;
