import { CalculatorState } from "./types";

/** State owned by typing and clear-key transitions. */
export type EntryState = Pick<
  CalculatorState,
  | "displayValue"
  | "error"
  | "waitingForNewEntry"
  | "lastPercentInput"
  | "accumulatorContext"
  | "needsTapeBlockHeader"
>;

/** State owned by the paper-tape ledger. */
export type TapeLedgerState = Pick<
  CalculatorState,
  | "paperTape"
  | "tapeOperationSequence"
  | "tapeSubtotalSequence"
  | "needsTapeBlockHeader"
  | "error"
>;

/** State needed to open and continue arithmetic expressions. */
export type WorkingExpressionState = Pick<
  CalculatorState,
  | "expressionTokens"
  | "displayValue"
  | "totalMemory"
  | "pendingOperation"
  | "firstOperand"
  | "lastOperator"
  | "lastOperand"
  | "waitingForNewEntry"
  | "lastPercentInput"
  | "pendingBusiness"
  | "businessBase"
  | "businessCost"
  | "businessSell"
  | "businessMargin"
  | "accumulatorContext"
  | "operationCount"
  | "continuationSource"
>;

/** State needed for subtotals, totals, and grand-total accounting. */
export type AccountingAccumulatorState = Pick<
  CalculatorState,
  | "expressionTokens"
  | "displayValue"
  | "totalMemory"
  | "grandTotal"
  | "operationCount"
  | "subtotalCount"
  | "pendingOperation"
  | "firstOperand"
  | "lastOperator"
  | "lastOperand"
  | "waitingForNewEntry"
  | "lastPercentInput"
  | "pendingBusiness"
  | "businessBase"
  | "businessCost"
  | "businessSell"
  | "businessMargin"
  | "accumulatorContext"
  | "needsTapeBlockHeader"
  | "continuationSource"
>;
