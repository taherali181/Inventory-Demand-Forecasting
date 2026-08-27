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
  productsApi.listProducts.mockResolvedValue({ items: [], total: 0 });
  renderPage();
  await waitFor(() => expect(screen.getByText(/no records yet/i)).toBeInTheDocument());
});

test('lists products once loaded', async () => {
  productsApi.listProducts.mockResolvedValue({
    items: [{ id: 1, sku_code: 'SKU-1', name: 'Widget', category: 'Tools', reorder_point: 5, unit_price: 9.99 }],
    total: 1,
  });
  renderPage();
  await waitFor(() => expect(screen.getByText('Widget')).toBeInTheDocument());
  expect(screen.getByText('SKU-1')).toBeInTheDocument();
});

test('shows a login hint instead of the add-product form when logged out', async () => {
  productsApi.listProducts.mockResolvedValue({ items: [], total: 0 });
  renderPage();
  await waitFor(() => expect(screen.getByText(/log in to add or manage products/i)).toBeInTheDocument());
});

test('shows a Load more button when more products exist than are loaded', async () => {
  productsApi.listProducts.mockResolvedValue({
    items: [{ id: 1, sku_code: 'SKU-1', name: 'Widget', category: 'Tools', reorder_point: 5, unit_price: 9.99 }],
    total: 5,
  });
  renderPage();
  await waitFor(() => expect(screen.getByText('Widget')).toBeInTheDocument());
  expect(screen.getByText(/showing 1 of 5/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
});
