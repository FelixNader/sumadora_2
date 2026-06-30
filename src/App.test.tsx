import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  window.localStorage.clear();
});

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

test('combined + = key closes additive chain on second consecutive press and prints total to tape', () => {
  const { container } = render(<App />);
  const keypad = container.querySelector('.hr-keypad');
  expect(keypad).not.toBeNull();

  const keypadQueries = within(keypad as HTMLElement);
  fireEvent.click(keypadQueries.getByRole('button', { name: '1' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '5' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '2' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '+ =' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '1' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '0' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '0' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '+ =' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '1' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '0' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '0' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '+ =' }));

  const tapeBeforeClose = container.querySelector('.hr-tape-content');
  expect(tapeBeforeClose?.textContent).toContain('152 +');
  expect(tapeBeforeClose?.textContent).toContain('100 +');
  expect(tapeBeforeClose?.textContent).not.toContain('352');

  fireEvent.click(keypadQueries.getByRole('button', { name: '+ =' }));

  const display = container.querySelector('.hr-display');
  expect(display?.textContent).toBe('352');

  const tapeAfterClose = container.querySelector('.hr-tape-content');
  expect(tapeAfterClose?.textContent).toContain('352');
});

test('combined + = key can continue accumulating from a printed total', () => {
  const { container } = render(<App />);
  const keypad = container.querySelector('.hr-keypad');
  expect(keypad).not.toBeNull();

  const keypadQueries = within(keypad as HTMLElement);
  fireEvent.click(keypadQueries.getByRole('button', { name: '1' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '5' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '0' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '+ =' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '1' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '0' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '0' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '+ =' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '1' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '0' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '0' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '+ =' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '+ =' }));

  let display = container.querySelector('.hr-display');
  expect(display?.textContent).toBe('350');

  fireEvent.click(keypadQueries.getByRole('button', { name: '1' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '0' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '0' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '+ =' }));

  display = container.querySelector('.hr-display');
  expect(display?.textContent).toBe('450');

  fireEvent.click(keypadQueries.getByRole('button', { name: '+ =' }));

  const tape = container.querySelector('.hr-tape-content');
  expect(display?.textContent).toBe('450');
  expect(tape?.textContent).toContain('350');
  expect(tape?.textContent).toContain('450');
});
