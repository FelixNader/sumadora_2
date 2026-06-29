import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';

test('renders calculator heading', () => {
  render(<App />);
  const titleElement = screen.getByText(/Sumadora Contable V1/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders keyboard actions on main panel', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: 'COST' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'TAX+' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'RATE' })).toBeInTheDocument();
});

test('executes addition with combined + = key', () => {
  const { container } = render(<App />);
  const keypad = container.querySelector('.hr-keypad');
  expect(keypad).not.toBeNull();

  const keypadQueries = within(keypad as HTMLElement);
  fireEvent.click(keypadQueries.getByRole('button', { name: '2' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '+ =' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '3' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '+ =' }));

  const display = container.querySelector('.hr-display');
  expect(display?.textContent).toBe('5');
});
