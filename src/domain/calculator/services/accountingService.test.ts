import {
  addSpecifiedItemCount,
  applyExpressionItemCount,
  applyFinalizedOperationItemCount,
  calculateItemAverage,
  createSubtotalTransition,
} from "./accountingService";

test("applyExpressionItemCount resets and recounts after subtotal in ITEM mode", () => {
  const result = applyExpressionItemCount("ITEM", 5, true, [3, "+", 4]);

  expect(result).toEqual({
    itemCount: 1,
    resetItemCountOnNextOp: false,
  });
});

test("applyFinalizedOperationItemCount increments item count for add and subtract", () => {
  const result = applyFinalizedOperationItemCount("ITEM", 2, false, "+");

  expect(result).toEqual({
    itemCount: 3,
    resetItemCountOnNextOp: false,
  });
});

test("createSubtotalTransition clears running state and accumulates grand total", () => {
  const result = createSubtotalTransition(
    {
      mode: "ITEM",
      grandTotal: 12,
      resetItemCountOnNextOp: true,
      itemCount: 4,
    },
    8,
    (value) => value
  );

  expect(result.grandTotal).toBe(20);
  expect(result.displayValue).toBe("0");
  expect(result.itemCount).toBe(0);
  expect(result.resetItemCountOnNextOp).toBe(false);
  expect(result.expressionTokens).toEqual([]);
});

test("calculateItemAverage returns zero when there are no items", () => {
  expect(calculateItemAverage(0, 999)).toBe(0);
});

test("addSpecifiedItemCount uses the last three digits of the integer part", () => {
  expect(addSpecifiedItemCount(2, 1234.56)).toBe(236);
});
