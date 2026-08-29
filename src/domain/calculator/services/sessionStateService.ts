import { CalculatorState, ExpressionToken, Operation } from "../types";

interface SessionStateBase {
  displayValue: string;
  error: string | null;
  needsTapeBlockHeader: boolean;
  lastPercentInput: number | null;
  pendingOperation: Operation | null;
  firstOperand: number | null;
  lastOperand: number | null;
  lastOperator: Operation | null;
  waitingForNewEntry: boolean;
  accumulatorContext: CalculatorState["accumulatorContext"];
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
  "displayValue" | "error" | "lastPercentInput" | "accumulatorContext"
> {
  return {
    displayValue: "0",
    error: null,
    lastPercentInput: null,
    accumulatorContext: "entry",
  };
}

export function createClearAllState(): SessionStateBase {
  return {
    displayValue: "0",
    error: null,
    needsTapeBlockHeader: false,
    lastPercentInput: null,
    pendingOperation: null,
    firstOperand: null,
    lastOperand: null,
    lastOperator: null,
    waitingForNewEntry: false,
    accumulatorContext: "idle",
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
  | "needsTapeBlockHeader"
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
    needsTapeBlockHeader: true,
    tapeOperationSequence: 0,
    tapeSubtotalSequence: 0,
  };
}

export function createErrorState(): Pick<
  CalculatorState,
  | "error"
  | "displayValue"
  | "needsTapeBlockHeader"
  | "lastPercentInput"
  | "pendingOperation"
  | "firstOperand"
  | "waitingForNewEntry"
  | "accumulatorContext"
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
    needsTapeBlockHeader: false,
    lastPercentInput: null,
    pendingOperation: null,
    firstOperand: null,
    waitingForNewEntry: false,
    accumulatorContext: "idle",
    pendingBusiness: null,
    businessBase: null,
    businessCost: null,
    businessSell: null,
    businessMargin: null,
    expressionTokens: [],
  };
}
