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
  expect(screen.getByRole('button', { name: 'TAX+' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'GT G*' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Impuesto y conversion' }));
  expect(screen.getByRole('button', { name: 'RATE' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Negocio' }));
  expect(screen.getByRole('button', { name: 'COST' })).toBeInTheDocument();
});

test('executes a Casio-style add and total flow from the main keypad', () => {
  const { container } = render(<App />);
  const keypad = container.querySelector('.hr-keypad-primary');
  expect(keypad).not.toBeNull();

  const keypadQueries = within(keypad as HTMLElement);
  fireEvent.click(keypadQueries.getByRole('button', { name: '2' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '+' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '3' }));
  fireEvent.click(screen.getByRole('button', { name: 'TOTAL *' }));

  const display = container.querySelector('.hr-display');
  expect(display?.textContent).toBe('5');
});

test('subtotal prints the live accumulator without closing it', () => {
  const { container } = render(<App />);
  const keypad = container.querySelector('.hr-keypad-primary');
  expect(keypad).not.toBeNull();

  const keypadQueries = within(keypad as HTMLElement);
  fireEvent.click(keypadQueries.getByRole('button', { name: '1' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '5' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '2' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '+' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '1' }));
  fireEvent.click(keypadQueries.getAllByRole('button', { name: '0' })[0]);
  fireEvent.click(keypadQueries.getAllByRole('button', { name: '0' })[0]);
  fireEvent.click(keypadQueries.getByRole('button', { name: 'SUBT ◇' }));

  const display = container.querySelector('.hr-display');
  expect(display?.textContent).toBe('252');

  const tape = container.querySelector('.hr-tape-content');
  expect(tape?.textContent).toMatch(/\s152(\s|$)/);
  expect(tape?.textContent).toContain('100 +');
  expect(tape?.textContent).toContain('Sub Total:');
  expect(tape?.textContent).toContain('252 ◇');
});

test('grand total closes only after totals are posted and G* is pressed', () => {
  const { container } = render(<App />);
  const keypad = container.querySelector('.hr-keypad-primary');
  expect(keypad).not.toBeNull();

  const keypadQueries = within(keypad as HTMLElement);
  fireEvent.click(keypadQueries.getByRole('button', { name: '1' }));
  fireEvent.click(keypadQueries.getAllByRole('button', { name: '0' })[0]);
  fireEvent.click(keypadQueries.getByRole('button', { name: '+' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '5' }));
  fireEvent.click(screen.getByRole('button', { name: 'TOTAL *' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '2' }));
  fireEvent.click(keypadQueries.getAllByRole('button', { name: '0' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'TOTAL *' }));
  fireEvent.click(screen.getByRole('button', { name: 'GT G*' }));

  const display = container.querySelector('.hr-display');
  expect(display?.textContent).toBe('35');

  const tape = container.querySelector('.hr-tape-content');
  expect(tape?.textContent).toContain('15 *');
  expect(tape?.textContent).toContain('20 *');
  expect(tape?.textContent).toContain('35 G*');
});

test('repeat addition creates another committed line on the tape', () => {
  const { container } = render(<App />);
  const keypad = container.querySelector('.hr-keypad-primary');
  expect(keypad).not.toBeNull();

  const keypadQueries = within(keypad as HTMLElement);
  fireEvent.click(keypadQueries.getByRole('button', { name: '3' }));
  fireEvent.click(keypadQueries.getAllByRole('button', { name: '0' })[0]);
  fireEvent.click(keypadQueries.getAllByRole('button', { name: '0' })[0]);
  fireEvent.click(keypadQueries.getByRole('button', { name: '+' }));
  fireEvent.click(keypadQueries.getByRole('button', { name: '+' }));
  fireEvent.click(screen.getByRole('button', { name: 'TOTAL *' }));

  const display = container.querySelector('.hr-display');
  expect(display?.textContent).toBe('600');

  const tape = container.querySelector('.hr-tape-content');
  expect(tape?.textContent).toMatch(/\s300(\s|$)/);
  expect(tape?.textContent?.match(/300 \+/g)?.length).toBe(1);
  expect(tape?.textContent).toContain('600 *');
});
