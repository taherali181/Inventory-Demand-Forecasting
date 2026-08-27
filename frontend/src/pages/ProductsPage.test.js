import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import * as productsApi from '../api/products';
import ProductsPage from './ProductsPage';

// Mocks the API module so this test never makes a real network call — the
// backend isn't running in CI/jest, and without this the useEffect fetch in
// ProductsPage would hang/reject against http://127.0.0.1:8000.
jest.mock('../api/products');

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ProductsPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

test('shows the empty state when there are no products', async () => {
  productsApi.listProducts.mockResolvedValue([]);
  renderPage();
  await waitFor(() => expect(screen.getByText(/no records yet/i)).toBeInTheDocument());
});

test('lists products once loaded', async () => {
  productsApi.listProducts.mockResolvedValue([
    { id: 1, sku_code: 'SKU-1', name: 'Widget', category: 'Tools', reorder_point: 5, unit_price: 9.99 },
  ]);
  renderPage();
  await waitFor(() => expect(screen.getByText('Widget')).toBeInTheDocument());
  expect(screen.getByText('SKU-1')).toBeInTheDocument();
});

test('shows a login hint instead of the add-product form when logged out', async () => {
  productsApi.listProducts.mockResolvedValue([]);
  renderPage();
  await waitFor(() => expect(screen.getByText(/log in to add or manage products/i)).toBeInTheDocument());
});
