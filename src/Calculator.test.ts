import { Calculator } from './Calculator';

test('ADD2 treats integer input as cents for add/sub operations', () => {
  const calculator = new Calculator();

  calculator.setDecimalMode('ADD2');
  calculator.inputDigit('1');
  calculator.add();
  calculator.inputDigit('2');
  calculator.equals();

  expect(calculator.getState().displayValue).toBe('0.03');
});

test('CONVERSION mode disables independent memory operations', () => {
  const calculator = new Calculator();

  calculator.inputDigit('9');
  calculator.memoryAdd();
  expect(calculator.getState().independentMemory).toBe(9);

  calculator.setMode('CONVERSION');
  calculator.inputDigit('1');
  calculator.memoryAdd();

  expect(calculator.getState().independentMemory).toBe(9);
});

test('ITEM subtotal resets item count on next add/sub sequence', () => {
  const calculator = new Calculator();

  calculator.setMode('ITEM');
  calculator.inputDigit('1');
  calculator.add();
  calculator.inputDigit('2');
  calculator.equals();
  expect(calculator.getState().itemCount).toBe(1);

  calculator.subtotal();
  calculator.inputDigit('3');
  calculator.add();
  calculator.inputDigit('4');
  calculator.equals();

  expect(calculator.getState().itemCount).toBe(1);
});

test('addition tape prints addends and subtotal prints total', () => {
  const calculator = new Calculator();

  calculator.inputDigit('2');
  calculator.add();
  calculator.inputDigit('3');
  calculator.add();
  calculator.inputDigit('4');
  calculator.add();

  const beforeSubtotalTape = calculator.getState().paperTape.join('\n');
  expect(beforeSubtotalTape).toMatch(/\s+2\s+\+/);
  expect(beforeSubtotalTape).toMatch(/\s+3\s+\+/);
  expect(beforeSubtotalTape).toMatch(/\s+4\s+\+/);
  expect(beforeSubtotalTape).not.toContain('=');

  calculator.subtotal();

  const afterSubtotalTape = calculator.getState().paperTape.join('\n');
  expect(afterSubtotalTape).toContain('SUBTOTAL');
  expect(calculator.getState().displayValue).toBe('0');
});

test('grand total accumulates subtotals and clears with CA', () => {
  const calculator = new Calculator();

  calculator.inputDigit('2');
  calculator.add();
  calculator.inputDigit('3');
  calculator.add();
  calculator.subtotal();

  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.add();
  calculator.inputDigit('5');
  calculator.add();
  calculator.subtotal();

  calculator.grandTotalRecall();
  expect(calculator.getState().displayValue).toBe('20');

  calculator.clearAll();
  calculator.grandTotalRecall();
  expect(calculator.getState().displayValue).toBe('0');
});

test('tax operations print full breakdown on tape', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.inputDigit('0');
  calculator.addTax();

  let tape = calculator.getState().paperTape.join('\n');
  expect(tape).toContain('TAX+');
  expect(tape).toContain('BASE');
  expect(tape).toContain('TAX 16%');
  expect(tape).toContain('TOTAL');

  calculator.clearEntry();
  calculator.inputDigit('1');
  calculator.inputDigit('1');
  calculator.inputDigit('6');
  calculator.subtractTax();

  tape = calculator.getState().paperTape.join('\n');
  expect(tape).toContain('TAX-');
  expect(tape).toContain('TOTAL');
  expect(tape).toContain('BASE');
  expect(tape).toContain('TAX 16%');
});

test('business keys solve with chained different keys', () => {
  const calculator = new Calculator();

  calculator.inputDigit('7');
  calculator.inputDigit('0');
  calculator.businessFunction('COST');

  calculator.inputDigit('3');
  calculator.inputDigit('0');
  calculator.businessFunction('MGN');

  expect(calculator.getState().displayValue).toBe('100');

  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.inputDigit('0');
  calculator.businessFunction('SELL');

  expect(calculator.getState().displayValue).toBe('30');
});

test('multiply chain prints operation result on tape', () => {
  const calculator = new Calculator();

  calculator.inputDigit('2');
  calculator.multiply();
  calculator.inputDigit('3');
  calculator.multiply();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toMatch(/\s+2\s+x/);
  expect(tape).toMatch(/\s+2\s+x\s+3\s+=\s+6/);
});

test('respects multiplication precedence in mixed expression', () => {
  const calculator = new Calculator();

  calculator.inputDigit('5');
  calculator.add();
  calculator.inputDigit('8');
  calculator.add();
  calculator.inputDigit('3');
  calculator.multiply();
  calculator.inputDigit('2');
  calculator.equals();

  expect(calculator.getState().displayValue).toBe('19');
});
