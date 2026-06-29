import { CalculatorState, ExpressionToken, Operation } from "../types";

interface SessionStateBase {
  displayValue: string;
  error: string | null;
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
  resetItemCountOnNextOp: boolean;
  totalMemory: number;
  grandTotal: number;
  itemCount: number;
}

export function createClearedEntryState(): Pick<
  CalculatorState,
  "displayValue" | "error"
> {
  return {
    displayValue: "0",
    error: null,
  };
}

export function createClearAllState(): SessionStateBase {
  return {
    displayValue: "0",
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
    totalMemory: 0,
    grandTotal: 0,
    itemCount: 0,
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
> {
  return {
    ...createClearAllState(),
    independentMemory: 0,
    referenceNumber: 0,
    conversionRate: 1,
    taxRate: 16,
    paperTape: [],
  };
}

export function createErrorState(): Pick<
  CalculatorState,
  | "error"
  | "displayValue"
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
