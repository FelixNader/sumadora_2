export type Mode = "OFF" | "ON" | "PRINT" | "ITEM" | "CONVERSION";
export type DecimalMode = "F" | "3" | "2" | "0" | "ADD2";
export type Operation = "+" | "-" | "*" | "/";
export type BusinessMode = "COST" | "SELL" | "MGN" | null;
export type ExpressionToken = number | Operation;

export interface CalculatorState {
  mode: Mode;
  decimalMode: DecimalMode;
  displayValue: string;
  totalMemory: number;
  grandTotal: number;
  independentMemory: number;
  itemCount: number;
  referenceNumber: number;
  conversionRate: number;
  taxRate: number;
  paperTape: string[];
  error: string | null;
  pendingOperation: Operation | null;
  firstOperand: number | null;
  lastOperand: number | null;
  lastOperator: Operation | null;
  waitingForNewEntry: boolean;
  pendingBusiness: BusinessMode;
  businessBase: number | null;
  businessCost: number | null;
  businessSell: number | null;
  businessMargin: number | null;
  expressionTokens: ExpressionToken[];
  resetItemCountOnNextOp: boolean;
}

export interface CalculatorSnapshot {
  version: 1;
  state: CalculatorState;
}
