import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the navbar brand', () => {
  render(<App />);
  const brandElements = screen.getAllByText(/restock/i);
  expect(brandElements.length).toBeGreaterThan(0);
  expect(brandElements[0]).toBeInTheDocument();
});

test('renders the dashboard by default', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
});
