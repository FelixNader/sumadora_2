import {
  createClearedEntryState,
  createClearAllState,
  createErrorState,
  createResetAllState,
} from "./sessionStateService";

test("createClearedEntryState resets only entry and error", () => {
  expect(createClearedEntryState()).toEqual({
    displayValue: "0",
    error: null,
  });
});

test("createClearAllState clears arithmetic and accounting session state", () => {
  expect(createClearAllState()).toMatchObject({
    displayValue: "0",
    error: null,
    pendingOperation: null,
    firstOperand: null,
    lastOperand: null,
    lastOperator: null,
    waitingForNewEntry: false,
    businessCost: null,
    businessSell: null,
    businessMargin: null,
    expressionTokens: [],
    totalMemory: 0,
    grandTotal: 0,
    itemCount: 0,
  });
});

test("createResetAllState also clears registers and persisted tape", () => {
  expect(createResetAllState()).toMatchObject({
    independentMemory: 0,
    referenceNumber: 0,
    conversionRate: 1,
    taxRate: 16,
    paperTape: [],
  });
});

test("createErrorState forces calculator error display and clears flow state", () => {
  expect(createErrorState()).toEqual({
    error: "E",
    displayValue: "E",
    pendingOperation: null,
    firstOperand: null,
    waitingForNewEntry: false,
    pendingBusiness: null,
    businessBase: null,
    businessCost: null,
    businessSell: null,
    businessMargin: null,
    expressionTokens: [],
  });
});
