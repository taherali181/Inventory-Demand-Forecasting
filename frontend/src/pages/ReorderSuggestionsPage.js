import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable';
import { listReorderSuggestions } from '../api/reorder';
import { listProducts } from '../api/products';
import { listWarehouses } from '../api/warehouses';

/** Links two things the app already computes separately: per-pair demand
 * forecasts and each product's reorder point (Change 11.2). Only shows
 * pairs GET /reorder/suggestions flags as at risk — not a full inventory
 * listing. */
function ReorderSuggestionsPage() {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([]);
  const [productsById, setProductsById] = useState({});
  const [warehousesById, setWarehousesById] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      listReorderSuggestions(),
      listProducts(true, { limit: 200 }),
      listWarehouses(true, { limit: 200 }),
    ])
      .then(([suggestionsData, products, warehouses]) => {
        setSuggestions(suggestionsData);
        setProductsById(Object.fromEntries(products.items.map((p) => [p.id, p])));
        setWarehousesById(Object.fromEntries(warehouses.items.map((w) => [w.id, w])));
      })
      .catch((err) => setError(err.response?.data?.detail || 'Could not load reorder suggestions.'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleCreatePo = (suggestion) => {
    navigate('/purchase-orders', {
      state: {
        initialItem: {
          productId: suggestion.product_id,
          warehouseId: suggestion.warehouse_id,
          quantityOrdered: suggestion.suggested_order_quantity,
        },
      },
    });
  };

  const columns = [
    {
      key: 'product',
      label: 'Product',
      render: (row) => productsById[row.product_id]?.name || `#${row.product_id}`,
    },
    {
      key: 'warehouse',
      label: 'Warehouse',
      render: (row) => warehousesById[row.warehouse_id]?.name || `#${row.warehouse_id}`,
    },
    { key: 'current_stock', label: 'Current stock' },
    { key: 'forecasted_demand', label: 'Forecasted demand', render: (row) => row.forecasted_demand.toFixed(1) },
    { key: 'reorder_point', label: 'Reorder point' },
    { key: 'suggested_order_quantity', label: 'Suggested order qty' },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button type="button" onClick={() => handleCreatePo(row)}>
          Create PO
        </button>
      ),
    },
  ];

  return (
    <div className="page">
      <h1>Reorder suggestions</h1>
      <p>
        Products/warehouses where forecasted demand would push stock below the reorder point before the next
        likely restock.
      </p>

      {error && <p className="form-error">{error}</p>}
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          // DataTable keys rows by a single field — synthesize a composite
          // id since a product can appear more than once (one row per
          // warehouse it's at risk in).
          rows={suggestions.map((s) => ({ ...s, id: `${s.product_id}-${s.warehouse_id}` }))}
          emptyMessage="No products are currently at risk of running out."
        />
      )}
    </div>
  );
}

export default ReorderSuggestionsPage;
