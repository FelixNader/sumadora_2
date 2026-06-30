import { CalculatorSnapshot, CalculatorState } from "./types";

export const MAX_INT_DIGITS = 12;
export const MAX_TAPE_LINES = 800;

export function createInitialCalculatorState(): CalculatorState {
  return {
    decimalMode: "F",
    displayValue: "0",
    totalMemory: 0,
    grandTotal: 0,
    independentMemory: 0,
    operationCount: 0,
    subtotalCount: 0,
    referenceNumber: 0,
    conversionRate: 1,
    taxRate: 16,
    paperTape: [],
    error: null,
    lastPercentInput: null,
    pendingOperation: null,
    firstOperand: null,
    lastOperand: null,
    lastOperator: null,
    waitingForNewEntry: false,
    pendingBusiness: null,
    businessBase: null,
    businessCost: null,
    businessSell: null,
    businessMargin: null,
    expressionTokens: [],
  };
}

export function sanitizeSnapshot(snapshot: CalculatorSnapshot): CalculatorState {
  return {
    ...snapshot.state,
    operationCount:
      typeof snapshot.state.operationCount === "number"
        ? snapshot.state.operationCount
        : 0,
    subtotalCount:
      typeof snapshot.state.subtotalCount === "number"
        ? snapshot.state.subtotalCount
        : 0,
    paperTape: Array.isArray(snapshot.state.paperTape)
      ? [...snapshot.state.paperTape].slice(-MAX_TAPE_LINES)
      : [],
    lastPercentInput:
      typeof snapshot.state.lastPercentInput === "number"
        ? snapshot.state.lastPercentInput
        : null,
    businessCost:
      typeof snapshot.state.businessCost === "number"
        ? snapshot.state.businessCost
        : null,
    businessSell:
      typeof snapshot.state.businessSell === "number"
        ? snapshot.state.businessSell
        : null,
    businessMargin:
      typeof snapshot.state.businessMargin === "number"
        ? snapshot.state.businessMargin
        : null,
    expressionTokens: Array.isArray(snapshot.state.expressionTokens)
      ? snapshot.state.expressionTokens.filter(
          (token) =>
            typeof token === "number" ||
            token === "+" ||
            token === "-" ||
            token === "*" ||
            token === "/"
        )
      : [],
  };
}
