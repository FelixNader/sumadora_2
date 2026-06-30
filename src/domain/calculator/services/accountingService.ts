import { CalculatorState, ExpressionToken, Operation } from "../types";

export interface OperationCounterUpdate {
  operationCount: number;
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
  operationCount: number;
  subtotalCount: number;
}

export function incrementOperationCount(
  operationCount: number,
  operation: Operation
): OperationCounterUpdate {
  if (operation !== "+" && operation !== "-") {
    return { operationCount };
  }

  return {
    operationCount: operationCount + 1,
  };
}

export function createSubtotalTransition(
  state: Pick<
    CalculatorState,
    | "grandTotal"
    | "subtotalCount"
    | "operationCount"
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
    operationCount: 0,
    subtotalCount: state.subtotalCount + 1,
  };
}

export function calculateOperationAverage(
  operationCount: number,
  totalMemory: number
): number {
  return operationCount > 0 ? totalMemory / operationCount : 0;
}
