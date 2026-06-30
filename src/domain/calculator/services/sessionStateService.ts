import { CalculatorState, ExpressionToken, Operation } from "../types";

interface SessionStateBase {
  displayValue: string;
  error: string | null;
  lastPercentInput: number | null;
  pendingOperation: Operation | null;
  firstOperand: number | null;
  lastOperand: number | null;
  lastOperator: Operation | null;
  waitingForNewEntry: boolean;
  pendingBusiness: CalculatorState["pendingBusiness"];
  businessBase: number | null;
  businessCost: number | null;
  businessSell: number | null;
  businessMargin: number | null;
  expressionTokens: ExpressionToken[];
  totalMemory: number;
  grandTotal: number;
  operationCount: number;
  subtotalCount: number;
}

export function createClearedEntryState(): Pick<
  CalculatorState,
  "displayValue" | "error" | "lastPercentInput"
> {
  return {
    displayValue: "0",
    error: null,
    lastPercentInput: null,
  };
}

export function createClearAllState(): SessionStateBase {
  return {
    displayValue: "0",
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
    totalMemory: 0,
    grandTotal: 0,
    operationCount: 0,
    subtotalCount: 0,
  };
}

export function createResetAllState(): Pick<
  CalculatorState,
  | keyof SessionStateBase
  | "independentMemory"
  | "referenceNumber"
  | "conversionRate"
  | "taxRate"
  | "paperTape"
  | "tapeOperationSequence"
  | "tapeSubtotalSequence"
> {
  return {
    ...createClearAllState(),
    independentMemory: 0,
    referenceNumber: 0,
    conversionRate: 1,
    taxRate: 16,
    paperTape: [],
    tapeOperationSequence: 0,
    tapeSubtotalSequence: 0,
  };
}

export function createErrorState(): Pick<
  CalculatorState,
  | "error"
  | "displayValue"
  | "lastPercentInput"
  | "pendingOperation"
  | "firstOperand"
  | "waitingForNewEntry"
  | "pendingBusiness"
  | "businessBase"
  | "businessCost"
  | "businessSell"
  | "businessMargin"
  | "expressionTokens"
> {
  return {
    error: "E",
    displayValue: "E",
    lastPercentInput: null,
    pendingOperation: null,
    firstOperand: null,
    waitingForNewEntry: false,
    pendingBusiness: null,
    businessBase: null,
    businessCost: null,
    businessSell: null,
    businessMargin: null,
    expressionTokens: [],
  };
}
