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

test('legacy PRINT, ON, OFF and ITEM snapshots are normalized to NORMAL mode', () => {
  const calculator = new Calculator();

  calculator.loadSnapshot({
    version: 1,
    state: {
      ...calculator.getState(),
      mode: "PRINT" as never,
    },
  });
  expect(calculator.getState().mode).toBe('NORMAL');

  calculator.loadSnapshot({
    version: 1,
    state: {
      ...calculator.getState(),
      mode: "ON" as never,
    },
  });
  expect(calculator.getState().mode).toBe('NORMAL');

  calculator.loadSnapshot({
    version: 1,
    state: {
      ...calculator.getState(),
      mode: "OFF" as never,
    },
  });
  expect(calculator.getState().mode).toBe('NORMAL');

  calculator.loadSnapshot({
    version: 1,
    state: {
      ...calculator.getState(),
      mode: "ITEM" as never,
    },
  });
  expect(calculator.getState().mode).toBe('NORMAL');
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

test('subtotal resets operation count and increments subtotal count', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.add();
  calculator.inputDigit('2');
  calculator.equals();
  expect(calculator.getState().operationCount).toBe(1);
  expect(calculator.getState().subtotalCount).toBe(0);

  calculator.subtotal();
  expect(calculator.getState().operationCount).toBe(0);
  expect(calculator.getState().subtotalCount).toBe(1);

  calculator.inputDigit('3');
  calculator.add();
  calculator.inputDigit('4');
  calculator.equals();

  expect(calculator.getState().operationCount).toBe(1);
  expect(calculator.getState().subtotalCount).toBe(1);
});

test('operation counter updates as each add line is committed', () => {
  const calculator = new Calculator();

  calculator.setDecimalMode('2');
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.inputDigit('0');
  calculator.add();
  expect(calculator.getState().operationCount).toBe(1);

  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.inputDigit('0');
  calculator.add();
  expect(calculator.getState().operationCount).toBe(2);

  calculator.inputDigit('1');
  calculator.inputDigit('5');
  calculator.inputDigit('0');
  calculator.add();
  expect(calculator.getState().operationCount).toBe(3);
  expect(calculator.getState().displayValue).toBe('350');
});

test('subtotal and grand total summaries print to tape', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.add();
  calculator.inputDigit('2');
  calculator.inputDigit('0');
  calculator.add();
  calculator.subtotal();
  calculator.grandTotalRecall();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toContain('SUBTOTAL 1 OPS 2');
  expect(tape).toContain('SUBTOTALS 1 GT');
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

test('add chain does not print running total until equals', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.inputDigit('5');
  calculator.inputDigit('2');
  calculator.add();
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.inputDigit('0');
  calculator.add();
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.inputDigit('0');
  calculator.add();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toContain('152 +');
  expect(tape).toContain('100 +');
  expect(calculator.getState().displayValue).toBe('352');

  calculator.equals();

  const finalizedTape = calculator.getState().paperTape.join('\n');
  expect(finalizedTape).toContain('352');
});

test('subtract chain does not print running total until equals', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.inputDigit('5');
  calculator.inputDigit('2');
  calculator.subtract();
  calculator.inputDigit('2');
  calculator.inputDigit('0');
  calculator.subtract();
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.subtract();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toContain('152 -');
  expect(tape).toContain('20 -');
  expect(calculator.getState().displayValue).toBe('122');

  calculator.equals();

  const finalizedTape = calculator.getState().paperTape.join('\n');
  expect(finalizedTape).toContain('122');
});

test('additive total can continue accumulating from the printed total', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.inputDigit('5');
  calculator.inputDigit('0');
  calculator.add();
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.inputDigit('0');
  calculator.add();
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.inputDigit('0');
  calculator.equals();

  expect(calculator.getState().displayValue).toBe('350');

  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.inputDigit('0');
  calculator.add();

  expect(calculator.getState().displayValue).toBe('450');

  calculator.equals();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toContain('350');
  expect(tape).toContain('450');
  expect(calculator.getState().displayValue).toBe('450');
});

test('percent in additive flow uses the first operand as base and equals resolves the total', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.add();
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.percent();

  expect(calculator.getState().displayValue).toBe('1');

  calculator.equals();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toMatch(/\s+10\s+%/);
  expect(tape).not.toMatch(/\s+1\s+\+/);
  expect(tape).toMatch(/\s+11/);
  expect(calculator.getState().displayValue).toBe('11');
});

test('chained additive percent flow does not print the materialized percent operand on tape', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.add();
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.percent();
  calculator.add();
  calculator.inputDigit('5');
  calculator.equals();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toMatch(/\s+10\s+\+/);
  expect(tape).toMatch(/\s+10\s+%/);
  expect(tape).not.toMatch(/\s+1\s+\+/);
  expect(tape).toMatch(/\s+5\s+\+/);
  expect(tape).toMatch(/\s+16/);
  expect(calculator.getState().displayValue).toBe('16');
});

test('repeated additive percent flow keeps accumulated-base math but preserves percent intent on tape', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.add();
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.percent();
  calculator.add();
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.percent();
  calculator.equals();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toMatch(/\s+10\s+\+/);
  expect(tape.match(/\s+10\s+%/g)?.length).toBe(2);
  expect(tape).not.toMatch(/\s+1\s+\+/);
  expect(tape).toMatch(/\s+12\.1/);
  expect(calculator.getState().displayValue).toBe('12.1');
});

test('percent in multiplicative flow uses the current operand percentage', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.multiply();
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.percent();

  expect(calculator.getState().displayValue).toBe('0.1');

  calculator.equals();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toMatch(/\s+10\s+%/);
  expect(tape).toMatch(/10\s+x\s+0\.1\s+=\s+1/);
  expect(calculator.getState().displayValue).toBe('1');
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

test('subtotal and grand total reflect each additive block independently after subtotal reset', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.inputDigit('5');
  calculator.inputDigit('0');
  calculator.plusEquals();
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.inputDigit('0');
  calculator.plusEquals();
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.inputDigit('0');
  calculator.plusEquals();
  calculator.subtotal();

  calculator.inputDigit('1');
  calculator.inputDigit('5');
  calculator.inputDigit('0');
  calculator.plusEquals();
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.inputDigit('0');
  calculator.plusEquals();
  calculator.subtotal();
  calculator.grandTotalRecall();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toMatch(/SUBTOTAL 1 OPS 3\s+350/);
  expect(tape).toMatch(/SUBTOTAL 2 OPS 2\s+250/);
  expect(tape).toMatch(/SUBTOTALS 2 GT\s+600/);
  expect(calculator.getState().displayValue).toBe('600');
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
