import {
  calculateOperationAverage,
  createSubtotalTransition,
  incrementOperationCount,
} from "./accountingService";

test("incrementOperationCount increments for add and subtract", () => {
  const result = incrementOperationCount(2, "+");

  expect(result).toEqual({
    operationCount: 3,
  });
});

test("incrementOperationCount ignores multiply and divide", () => {
  const result = incrementOperationCount(8, "*");

  expect(result).toEqual({
    operationCount: 8,
  });
});

test("createSubtotalTransition clears running state and accumulates grand total", () => {
  const result = createSubtotalTransition(
    {
      grandTotal: 12,
      subtotalCount: 2,
      operationCount: 4,
    },
    8,
    (value) => value
  );

  expect(result.grandTotal).toBe(20);
  expect(result.displayValue).toBe("0");
  expect(result.operationCount).toBe(0);
  expect(result.subtotalCount).toBe(3);
  expect(result.expressionTokens).toEqual([]);
});

test("calculateOperationAverage returns zero when there are no operations", () => {
  expect(calculateOperationAverage(0, 999)).toBe(0);
});
