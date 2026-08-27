import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as warehousesApi from '../api/warehouses';
import StockAdjustModal from './StockAdjustModal';

jest.mock('../api/warehouses');

const product = { id: 1, name: 'Widget' };

function renderModal(onClose = jest.fn()) {
  warehousesApi.listWarehouses.mockResolvedValue({
    items: [{ id: 1, name: 'WH1' }, { id: 2, name: 'WH2' }],
    total: 2,
  });
  render(<StockAdjustModal product={product} onClose={onClose} onAdjusted={jest.fn()} />);
  return onClose;
}

test('renders with an accessible dialog role and label', async () => {
  renderModal();
  const dialog = await screen.findByRole('dialog', { name: /adjust stock — widget/i });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
});

test('pressing Escape calls onClose', async () => {
  const onClose = renderModal();
  await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

  fireEvent.keyDown(document, { key: 'Escape' });

  expect(onClose).toHaveBeenCalled();
});

test('Tab from the last focusable element wraps to the first', async () => {
  renderModal();
  await waitFor(() => expect(screen.getByLabelText(/warehouse/i)).toBeInTheDocument());

  const applyButton = screen.getByRole('button', { name: /apply/i });
  await waitFor(() => expect(applyButton).not.toBeDisabled()); // disabled while !warehouseId — can't receive focus until then
  applyButton.focus();
  expect(document.activeElement).toBe(applyButton);

  await userEvent.tab();

  const warehouseSelect = screen.getByLabelText(/warehouse/i);
  expect(document.activeElement).toBe(warehouseSelect);
});
