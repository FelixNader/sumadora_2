import { CalculatorState, ExpressionToken, Mode, Operation } from "../types";

export interface ItemCountUpdate {
  itemCount: number;
  resetItemCountOnNextOp: boolean;
}

export interface SubtotalTransition {
  grandTotal: number;
  displayValue: string;
  waitingForNewEntry: boolean;
  pendingOperation: Operation | null;
  firstOperand: number | null;
  lastOperator: Operation | null;
  lastOperand: number | null;
  expressionTokens: ExpressionToken[];
  totalMemory: number;
  itemCount: number;
  resetItemCountOnNextOp: boolean;
}

export function applyExpressionItemCount(
  mode: Mode,
  itemCount: number,
  resetItemCountOnNextOp: boolean,
  expression: ExpressionToken[]
): ItemCountUpdate {
  if (mode !== "ITEM") {
    return { itemCount, resetItemCountOnNextOp };
  }

  const itemOps = expression.filter(
    (token) => token === "+" || token === "-"
  ).length;

  if (itemOps === 0) {
    return { itemCount, resetItemCountOnNextOp };
  }

  if (resetItemCountOnNextOp) {
    return {
      itemCount: itemOps,
      resetItemCountOnNextOp: false,
    };
  }

  return {
    itemCount: itemCount + itemOps,
    resetItemCountOnNextOp,
  };
}

export function applyFinalizedOperationItemCount(
  mode: Mode,
  itemCount: number,
  resetItemCountOnNextOp: boolean,
  operation: Operation
): ItemCountUpdate {
  if (mode !== "ITEM" || (operation !== "+" && operation !== "-")) {
    return { itemCount, resetItemCountOnNextOp };
  }

  if (resetItemCountOnNextOp) {
    return {
      itemCount: 1,
      resetItemCountOnNextOp: false,
    };
  }

  return {
    itemCount: itemCount + 1,
    resetItemCountOnNextOp,
  };
}

export function createSubtotalTransition(
  state: Pick<
    CalculatorState,
    | "mode"
    | "grandTotal"
    | "resetItemCountOnNextOp"
    | "itemCount"
  >,
  subtotalValue: number,
  round: (value: number, operation: "+" | "-") => number
): SubtotalTransition {
  return {
    grandTotal: round(state.grandTotal + subtotalValue, "+"),
    displayValue: "0",
    waitingForNewEntry: true,
    pendingOperation: null,
    firstOperand: null,
    lastOperator: null,
    lastOperand: null,
    expressionTokens: [],
    totalMemory: 0,
    itemCount: state.mode === "ITEM" ? 0 : state.itemCount,
    resetItemCountOnNextOp:
      state.mode === "ITEM" ? false : state.resetItemCountOnNextOp,
  };
}

export function calculateItemAverage(
  itemCount: number,
  totalMemory: number
): number {
  return itemCount > 0 ? totalMemory / itemCount : 0;
}

export function addSpecifiedItemCount(
  currentItemCount: number,
  value: number
): number {
  const integerPart = Math.trunc(Math.abs(value));
  const addValue = integerPart % 1000;
  return currentItemCount + addValue;
}
