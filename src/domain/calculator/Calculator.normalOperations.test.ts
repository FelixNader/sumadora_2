import { Calculator } from "./Calculator";

type Operation = "+" | "-" | "*" | "/";

interface NormalOperationCase {
  name: string;
  left: number;
  operation: Operation;
  right: number;
  expected: number;
  tapeOperator: string;
}

function enterInteger(calculator: Calculator, value: number): void {
  String(value).split("").forEach((digit) => calculator.inputDigit(digit));
}

function applyOperation(calculator: Calculator, operation: Operation): void {
  if (operation === "+") calculator.add();
  if (operation === "-") calculator.subtract();
  if (operation === "*") calculator.multiply();
  if (operation === "/") calculator.divide();
}

const normalOperationCases: NormalOperationCase[] = Array.from(
  { length: 25 },
  (_, index) => {
    const step = index + 1;

    return [
      {
        name: `${String(step).padStart(2, "0")} suma`,
        left: step * 7 + 1,
        operation: "+" as const,
        right: step * 3 + 2,
        expected: step * 10 + 3,
        tapeOperator: "+",
      },
      {
        name: `${String(step).padStart(2, "0")} resta`,
        left: step * 7 + 20,
        operation: "-" as const,
        right: step * 3 + 1,
        expected: step * 4 + 19,
        tapeOperator: "-",
      },
      {
        name: `${String(step).padStart(2, "0")} multiplicacion`,
        left: step + 1,
        operation: "*" as const,
        right: step + 2,
        expected: (step + 1) * (step + 2),
        tapeOperator: "x",
      },
      {
        name: `${String(step).padStart(2, "0")} division`,
        left: (step + 1) * (step + 2),
        operation: "/" as const,
        right: step + 1,
        expected: step + 2,
        tapeOperator: "/",
      },
    ];
  }
).flat();

describe("100 operaciones normales con impresion en cinta", () => {
  test.each(normalOperationCases)(
    "$name: $left $operation $right = $expected",
    ({ left, operation, right, expected, tapeOperator }) => {
      const calculator = new Calculator(() => new Date("2026-09-01T13:09:00"));

      enterInteger(calculator, left);
      applyOperation(calculator, operation);
      enterInteger(calculator, right);
      calculator.equals();

      const state = calculator.getState();
      const tape = state.paperTape.join("\n");

      expect(state.displayValue).toBe(String(expected));
      expect(tape).toContain(String(left));
      expect(tape).toContain(`${right} ${operation === "*" || operation === "/" ? "=" : tapeOperator}`);
      expect(tape).toContain(String(expected));
    }
  );
});

expect(normalOperationCases).toHaveLength(100);
