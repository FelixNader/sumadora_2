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

test('rejects old snapshot versions after removing working modes from the model', () => {
  const calculator = new Calculator();

  expect(() =>
    calculator.loadSnapshot({
      version: 1 as never,
      state: calculator.getState(),
    })
  ).toThrow("Unsupported snapshot format");
});

test('conversion and independent memory remain available without a working mode switch', () => {
  const calculator = new Calculator();

  calculator.inputDigit('9');
  calculator.memoryAdd();
  expect(calculator.getState().independentMemory).toBe(9);

  calculator.clearEntry();
  calculator.inputDigit('1');
  calculator.memoryAdd();
  calculator.clearEntry();
  calculator.inputDigit('2');
  calculator.setConversionRate();
  calculator.inputDigit('4');
  calculator.convertDomesticToForeign();

  expect(calculator.getState().independentMemory).toBe(10);
  expect(calculator.getState().displayValue).toBe('2');
});

test('clear entry only clears the active input and preserves the pending operation', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.inputDigit('2');
  calculator.add();
  calculator.inputDigit('9');
  calculator.inputDigit('9');
  calculator.clearEntry();
  calculator.inputDigit('5');
  calculator.equals();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toMatch(/\s+12\s+\+/);
  expect(tape).toMatch(/\s+5\s+\+/);
  expect(calculator.getState().displayValue).toBe('17');
});

test('subtotal keeps the accumulator open and total increments the grand-total counter', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.add();
  calculator.inputDigit('2');
  calculator.equals();
  expect(calculator.getState().operationCount).toBe(1);
  expect(calculator.getState().subtotalCount).toBe(0);

  calculator.subtotal();
  expect(calculator.getState().displayValue).toBe('3');
  expect(calculator.getState().operationCount).toBe(1);
  expect(calculator.getState().subtotalCount).toBe(0);

  calculator.inputDigit('3');
  calculator.add();
  expect(calculator.getState().displayValue).toBe('6');
  expect(calculator.getState().operationCount).toBe(2);

  calculator.total();
  expect(calculator.getState().operationCount).toBe(0);
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
  calculator.total();
  calculator.grandTotalRecall();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toContain('ItemNo.: 002');
  expect(tape).toContain('Sub Total:');
  expect(tape).toContain('30 ◇');
  expect(tape).toContain('Total:');
  expect(tape).toContain('30 *');
  expect(tape).toContain('GrandTotal:');
  expect(tape).toContain('30 G*');
});

test('paper tape follows a Casio-like summary grammar', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.add();
  calculator.inputDigit('2');
  calculator.inputDigit('0');
  calculator.total();
  calculator.grandTotalRecall();

  const tape = calculator.getState().paperTape;
  expect(tape[0]).toContain('10 +');
  expect(tape[1]).toContain('20 +');
  expect(tape[2]).toBe('----------------');
  expect(tape[3]).toBe('ItemNo.: 002');
  expect(tape[4]).toBe('Total:');
  expect(tape[5]).toContain('30 *');
  expect(tape[6]).toBe('----------------');
  expect(tape[7]).toBe('ItemNo.: 001');
  expect(tape[8]).toBe('GrandTotal:');
  expect(tape[9]).toContain('30 G*');
});

test('clear all resets the open accumulator and clears grand total', () => {
  const calculator = new Calculator();

  calculator.inputDigit('5');
  calculator.add();
  calculator.inputDigit('7');
  calculator.total();
  expect(calculator.getState().grandTotal).toBe(12);

  calculator.clearAll();
  expect(calculator.getState().displayValue).toBe('0');
  expect(calculator.getState().grandTotal).toBe(0);
  expect(calculator.getState().subtotalCount).toBe(0);

  calculator.grandTotalRecall();
  expect(calculator.getState().displayValue).toBe('0');
  expect(calculator.getState().grandTotal).toBe(0);
});

test('addition tape prints addends and subtotal shows the live accumulator', () => {
  const calculator = new Calculator();

  calculator.inputDigit('2');
  calculator.add();
  calculator.inputDigit('3');
  calculator.add();
  calculator.inputDigit('4');
  calculator.subtotal();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toMatch(/\s+2\s+\+/);
  expect(tape).toMatch(/\s+3\s+\+/);
  expect(tape).toMatch(/\s+4\s+\+/);
  expect(tape).toContain('Sub Total:');
  expect(tape).toContain('9 ◇');
  expect(calculator.getState().displayValue).toBe('9');
});

test('subtotal commits the last open additive line before printing the subtotal row', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.inputDigit('5');
  calculator.inputDigit('0');
  calculator.add();
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.inputDigit('0');
  calculator.subtotal();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toContain('150 +');
  expect(tape).toContain('100 +');
  expect(tape).toContain('ItemNo.: 002');
  expect(tape).toContain('Sub Total:');
  expect(tape).toContain('250');
  expect(calculator.getState().displayValue).toBe('250');
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

test('equals result can open a new subtractive line directly from the displayed result', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.inputDigit('2');
  calculator.add();
  calculator.inputDigit('5');
  calculator.equals();
  calculator.subtract();
  calculator.inputDigit('7');
  calculator.equals();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toMatch(/\s+17\s+-/);
  expect(tape).toMatch(/\s+7\s+-/);
  expect(tape).toMatch(/\s+10(\s|$)/);
  expect(calculator.getState().displayValue).toBe('10');
});

test('subtotal lets the next additive line continue from the live accumulator', () => {
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
  calculator.subtotal();

  expect(calculator.getState().displayValue).toBe('350');

  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.inputDigit('0');
  calculator.add();

  expect(calculator.getState().displayValue).toBe('450');

  calculator.total();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toContain('350');
  expect(tape).toContain('450');
  expect(calculator.getState().displayValue).toBe('450');
});

test('subtotal can open a subtractive continuation directly from the displayed subtotal', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.inputDigit('9');
  calculator.inputDigit('4');
  calculator.inputDecimal();
  calculator.inputDigit('4');
  calculator.subtract();
  calculator.inputDigit('5');
  calculator.inputDigit('0');
  calculator.subtotal();
  calculator.subtract();
  calculator.inputDigit('1');
  calculator.inputDigit('4');
  calculator.inputDigit('4');
  calculator.subtotal();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toMatch(/\s+194\.4\s+-/);
  expect(tape).toMatch(/\s+50\s+-/);
  expect(tape).toMatch(/\s+144\.4\s+◇/);
  expect(tape).toMatch(/\s+144\.4\s+-/);
  expect(tape).toMatch(/\s+144\s+-/);
  expect(tape).toMatch(/\s+0\.4\s+◇/);
  expect(calculator.getState().displayValue).toBe('0.4');
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
  expect(tape).toMatch(/\s+1\s+\+/);
  expect(tape).toMatch(/\s+11/);
  expect(calculator.getState().displayValue).toBe('11');
});

test('standalone percent prints the realized decimal value on tape', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.percent();

  const tape = calculator.getState().paperTape.join('\n');
  expect(calculator.getState().displayValue).toBe('0.1');
  expect(tape).toMatch(/\s+10\s+%/);
  expect(tape).toMatch(/\s+0\.1(\s|$)/);
});

test('chained additive percent flow prints the materialized percent operand on tape', () => {
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
  expect(tape).toMatch(/\s+1\s+\+/);
  expect(tape).toMatch(/\s+5\s+\+/);
  expect(tape).toMatch(/\s+16/);
  expect(calculator.getState().displayValue).toBe('16');
});

test('repeated additive percent flow keeps accumulated-base math and prints each realized operand', () => {
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
  expect(tape).toMatch(/\s+1\s+\+/);
  expect(tape).toMatch(/\s+1\.1\s+\+/);
  expect(tape).toMatch(/\s+12\.1/);
  expect(calculator.getState().displayValue).toBe('12.1');
});

test('subtractive percent prints the realized discount before subtotal or total', () => {
  const calculator = new Calculator();

  calculator.inputDigit('1');
  calculator.inputDigit('8');
  calculator.inputDigit('0');
  calculator.subtract();
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.percent();

  const tape = calculator.getState().paperTape.join('\n');
  expect(calculator.getState().displayValue).toBe('18');
  expect(tape).toMatch(/\s+180\s+-/);
  expect(tape).toMatch(/\s+10\s+%/);
  expect(tape).toMatch(/\s+18\s+-/);
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
  expect(tape).toMatch(/\s+10\s+x/);
  expect(tape).toMatch(/\s+10\s+%/);
  expect(tape).toMatch(/\s+0\.1\s+=/);
  expect(tape).toMatch(/\s+1(\s|$)/);
  expect(calculator.getState().displayValue).toBe('1');
});

test('grand total accumulates totals and only clears with G*', () => {
  const calculator = new Calculator();

  calculator.inputDigit('2');
  calculator.add();
  calculator.inputDigit('3');
  calculator.total();

  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.add();
  calculator.inputDigit('5');
  calculator.total();

  expect(calculator.getState().grandTotal).toBe(20);
  calculator.grandTotalRecall();
  expect(calculator.getState().displayValue).toBe('20');
  expect(calculator.getState().grandTotal).toBe(0);

  calculator.clearAll();
  calculator.grandTotalRecall();
  expect(calculator.getState().displayValue).toBe('0');
});

test('repeat addition, totals and grand total follow the Casio flow', () => {
  const calculator = new Calculator();

  calculator.inputDigit('3');
  calculator.inputDigit('0');
  calculator.inputDigit('0');
  calculator.add();
  calculator.add();
  calculator.inputDigit('4');
  calculator.inputDigit('0');
  calculator.inputDigit('0');
  calculator.add();
  calculator.total();

  calculator.inputDigit('2');
  calculator.inputDigit('0');
  calculator.add();
  calculator.inputDigit('5');
  calculator.total();
  calculator.grandTotalRecall();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape.match(/300 \+/g)?.length).toBe(2);
  expect(tape).toContain('1000 *');
  expect(tape).toContain('25 *');
  expect(tape).toContain('1025 G*');
  expect(calculator.getState().displayValue).toBe('1025');
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

test('tax addition rebases the active accumulator to the taxed total', () => {
  const calculator = new Calculator();

  calculator.inputDigit('3');
  calculator.inputDigit('6');
  calculator.multiply();
  calculator.inputDigit('5');
  calculator.add();
  calculator.addTax();
  calculator.add();
  calculator.inputDigit('5');
  calculator.subtotal();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toContain('TOTAL          208.8');
  expect(tape).toMatch(/\s+208\.8\s+\+/);
  expect(tape).toMatch(/\s+5\s+\+/);
  expect(tape).toMatch(/\s+213\.8\s+◇/);
  expect(calculator.getState().displayValue).toBe('213.8');
});

test('tax subtraction rebases the active accumulator to the untaxed base', () => {
  const calculator = new Calculator();

  calculator.inputDigit('2');
  calculator.inputDigit('0');
  calculator.inputDigit('8');
  calculator.inputDecimal();
  calculator.inputDigit('8');
  calculator.subtractTax();
  calculator.subtract();
  calculator.inputDigit('8');
  calculator.subtotal();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toContain('BASE             180');
  expect(tape).toMatch(/\s+180\s+-/);
  expect(tape).toMatch(/\s+8\s+-/);
  expect(tape).toMatch(/\s+172\s+◇/);
  expect(calculator.getState().displayValue).toBe('172');
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

  expect(calculator.getState().displayValue).toBe('30%');

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toContain('MGN IN');
  expect(tape).toContain('30%');
  expect(tape).toContain('MGN OUT');
});

test('margin remains explicitly percentage-shaped in display and tape', () => {
  const calculator = new Calculator();

  calculator.inputDigit('7');
  calculator.inputDigit('0');
  calculator.businessFunction('COST');
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.inputDigit('0');
  calculator.businessFunction('SELL');

  expect(calculator.getState().displayValue).toBe('30%');

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toContain('MGN OUT');
  expect(tape).toContain('30%');
});

test('percentage-shaped margin display still participates in numeric operations', () => {
  const calculator = new Calculator();

  calculator.inputDigit('7');
  calculator.inputDigit('0');
  calculator.businessFunction('COST');
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.inputDigit('0');
  calculator.businessFunction('SELL');
  calculator.add();
  calculator.inputDigit('1');
  calculator.inputDigit('0');
  calculator.equals();

  expect(calculator.getState().displayValue).toBe('40');
});

test('multiply chain prints operation result on tape', () => {
  const calculator = new Calculator();

  calculator.inputDigit('2');
  calculator.multiply();
  calculator.inputDigit('3');
  calculator.equals();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toMatch(/\s+2\s+x/);
  expect(tape).toMatch(/\s+3\s+=/);
  expect(tape).toMatch(/\s+6(\s|$)/);
});

test('division prints operands and result on separate tape lines', () => {
  const calculator = new Calculator();

  calculator.inputDigit('6');
  calculator.inputDigit('0');
  calculator.divide();
  calculator.inputDigit('8');
  calculator.equals();

  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toMatch(/\s+60\s+\//);
  expect(tape).toMatch(/\s+8\s+=/);
  expect(tape).toMatch(/\s+7\.5(\s|$)/);
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
  const tape = calculator.getState().paperTape.join('\n');
  expect(tape).toMatch(/\s+5\s+\+/);
  expect(tape).toMatch(/\s+8\s+\+/);
  expect(tape).toMatch(/\s+3\s+x/);
  expect(tape).toMatch(/\s+2\s+=/);
  expect(tape).toMatch(/\s+6\s+\+/);
  expect(tape).toMatch(/\s+19/);
});
