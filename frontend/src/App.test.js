import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the navbar brand', () => {
  render(<App />);
  expect(screen.getByText(/restock/i)).toBeInTheDocument();
});

test('renders the dashboard by default', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
});
