import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the navbar brand', () => {
  render(<App />);
  const brandElements = screen.getAllByText(/restock/i);
  expect(brandElements.length).toBeGreaterThan(0);
  expect(brandElements[0]).toBeInTheDocument();
});

test('renders the chat home by default, not a studio view', () => {
  // v2.0: "/" is the chat home — full-width and calm, no studio forced open.
  // The canvas only opens once a deep link or a chat action asks for one
  // (see useAppStore's `splitMode` default and MainLayout's PATH_TO_STUDIO).
  render(<App />);
  expect(screen.getByText(/a fast way to query your inventory/i)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /^dashboard$/i })).not.toBeInTheDocument();
});
