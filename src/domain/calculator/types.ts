export type DecimalMode = "F" | "3" | "2" | "0" | "ADD2";
export type Operation = "+" | "-" | "*" | "/";
export type BusinessMode = "COST" | "SELL" | "MGN" | null;
export type ExpressionToken = number | Operation;
export type AccumulatorContext =
  | "idle"
  | "entry"
  | "result"
  | "subtotal"
  | "total"
  | "grand-total";

export interface CalculatorState {
  decimalMode: DecimalMode;
  displayValue: string;
  totalMemory: number;
  grandTotal: number;
  independentMemory: number;
  tapeOperationSequence: number;
  tapeSubtotalSequence: number;
  operationCount: number;
  subtotalCount: number;
  referenceNumber: number;
  conversionRate: number;
  taxRate: number;
  paperTape: string[];
  needsTapeBlockHeader: boolean;
  error: string | null;
  lastPercentInput: number | null;
  pendingOperation: Operation | null;
  firstOperand: number | null;
  lastOperand: number | null;
  lastOperator: Operation | null;
  waitingForNewEntry: boolean;
  accumulatorContext: AccumulatorContext;
  pendingBusiness: BusinessMode;
  businessBase: number | null;
  businessCost: number | null;
  businessSell: number | null;
  businessMargin: number | null;
  expressionTokens: ExpressionToken[];
}

export interface CalculatorSnapshot {
  version: 2;
  state: CalculatorState;
}
