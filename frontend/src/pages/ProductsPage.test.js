import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import * as productsApi from '../api/products';
import * as authApi from '../api/auth';
import ProductsPage from './ProductsPage';

// Mocks the API modules so these tests never make a real network call — the
// backend isn't running in CI/jest, and without this the useEffect fetches in
// ProductsPage/AuthContext would hang/reject against http://127.0.0.1:8000.
jest.mock('../api/products');
jest.mock('../api/auth');

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ProductsPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

/** Simulates an already-logged-in user by seeding the token AuthContext
 * reads on mount and mocking the /auth/me call it then makes to resolve
 * the user — the write actions (add/edit/deactivate) this page conditions
 * on `useAuth().user` only render once that resolves. */
function renderPageLoggedIn() {
  localStorage.setItem('accessToken', 'test-access-token');
  authApi.getCurrentUser.mockResolvedValue({ id: 1, email: 'admin@example.com', role: 'admin' });
  return renderPage();
}

afterEach(() => {
  localStorage.clear();
});

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

test('every add-product form field has an accessible label', async () => {
  productsApi.listProducts.mockResolvedValue({ items: [], total: 0 });
  renderPageLoggedIn();
  await waitFor(() => expect(screen.getByText(/add product/i)).toBeInTheDocument());

  // getByLabelText throws if the label/input association is broken — a
  // real regression guard, not just a smoke test (Change 10.4).
  expect(screen.getByLabelText(/sku code/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/reorder point/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/unit price/i)).toBeInTheDocument();
});

test('shows an error message when deactivating a product fails', async () => {
  productsApi.listProducts.mockResolvedValue({
    items: [{ id: 1, sku_code: 'SKU-1', name: 'Widget', category: 'Tools', reorder_point: 5, unit_price: 9.99 }],
    total: 1,
  });
  productsApi.deactivateProduct.mockRejectedValue({ response: { data: { detail: 'Not allowed.' } } });
  renderPageLoggedIn();

  await waitFor(() => expect(screen.getByText('Widget')).toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: /deactivate/i }));

  await waitFor(() => expect(screen.getByText('Not allowed.')).toBeInTheDocument());
});

test('clicking Edit pre-fills the form and submitting calls updateProduct', async () => {
  productsApi.listProducts.mockResolvedValue({
    items: [{ id: 1, sku_code: 'SKU-1', name: 'Widget', category: 'Tools', reorder_point: 5, unit_price: 9.99 }],
    total: 1,
  });
  productsApi.updateProduct.mockResolvedValue({});
  renderPageLoggedIn();

  await waitFor(() => expect(screen.getByText('Widget')).toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));

  // Form is pre-filled with the row's values, and the submit button
  // switches to "Save changes" (Change 10.3).
  expect(screen.getByLabelText(/sku code/i)).toHaveValue('SKU-1');
  expect(screen.getByLabelText(/^name$/i)).toHaveValue('Widget');
  expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();

  await userEvent.clear(screen.getByLabelText(/^name$/i));
  await userEvent.type(screen.getByLabelText(/^name$/i), 'Widget v2');
  await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

  await waitFor(() =>
    expect(productsApi.updateProduct).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ sku_code: 'SKU-1', name: 'Widget v2' })
    )
  );
});
