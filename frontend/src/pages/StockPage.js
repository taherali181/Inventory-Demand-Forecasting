import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import { listStock } from '../api/stock';
import { listProducts } from '../api/products';
import { listWarehouses } from '../api/warehouses';

function StockPage() {
  const [stockLevels, setStockLevels] = useState([]);
  const [productsById, setProductsById] = useState({});
  const [warehousesById, setWarehousesById] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([listStock(), listProducts(true), listWarehouses(true)])
      .then(([stock, products, warehouses]) => {
        setStockLevels(stock);
        setProductsById(Object.fromEntries(products.map((p) => [p.id, p])));
        setWarehousesById(Object.fromEntries(warehouses.map((w) => [w.id, w])));
      })
      .catch(() => setError('Could not load stock levels.'))
      .finally(() => setIsLoading(false));
  }, []);

  const columns = [
    { key: 'product', label: 'Product', render: (row) => productsById[row.product_id]?.name || `#${row.product_id}` },
    {
      key: 'warehouse',
      label: 'Warehouse',
      render: (row) => warehousesById[row.warehouse_id]?.name || `#${row.warehouse_id}`,
    },
    { key: 'quantity_on_hand', label: 'On hand' },
    { key: 'quantity_reserved', label: 'Reserved' },
    { key: 'quantity_available', label: 'Available' },
  ];

  return (
    <div className="page">
      <h1>Stock levels</h1>
      <p>Adjust stock from the Products page (each product has an “Adjust stock” action once logged in).</p>
      {error && <p className="form-error">{error}</p>}
      {isLoading ? <p>Loading…</p> : <DataTable columns={columns} rows={stockLevels} rowKey="id" />}
    </div>
  );
}

export default StockPage;
