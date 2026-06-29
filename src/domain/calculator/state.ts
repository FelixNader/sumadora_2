import { CalculatorSnapshot, CalculatorState } from "./types";

export const MAX_INT_DIGITS = 12;
export const MAX_TAPE_LINES = 800;

export function createInitialCalculatorState(): CalculatorState {
  return {
    mode: "NORMAL",
    decimalMode: "F",
    displayValue: "0",
    totalMemory: 0,
    grandTotal: 0,
    independentMemory: 0,
    itemCount: 0,
    referenceNumber: 0,
    conversionRate: 1,
    taxRate: 16,
    paperTape: [],
    error: null,
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
    resetItemCountOnNextOp: false,
  };
}

export function sanitizeSnapshot(snapshot: CalculatorSnapshot): CalculatorState {
  const legacyMode = snapshot.state.mode as string;
  const sanitizedMode =
    legacyMode === "ITEM" ||
    legacyMode === "CONVERSION"
      ? legacyMode
      : "NORMAL";

  return {
    ...snapshot.state,
    mode: sanitizedMode,
    paperTape: Array.isArray(snapshot.state.paperTape)
      ? [...snapshot.state.paperTape].slice(-MAX_TAPE_LINES)
      : [],
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
    resetItemCountOnNextOp:
      typeof snapshot.state.resetItemCountOnNextOp === "boolean"
        ? snapshot.state.resetItemCountOnNextOp
        : false,
  };
}
