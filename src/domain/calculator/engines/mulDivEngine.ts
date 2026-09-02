import { formatForDisplay, formatForTape } from "../policies/numericPolicy";
import { incrementOperationCount } from "../services/accountingService";
import { AccumulatorContext, ExpressionToken, Operation } from "../types";
import { WorkingExpressionState } from "../stateSlices";

interface MulDivEngineDependencies {
  evaluateExpressionSafely: (tokens: ExpressionToken[]) => number | null;
  normalizeOperandForCurrentDisplay: (value: number, operation: Operation) => number;
  parseDisplayValue: () => number | null;
  printAdditiveBaseToTape: (value: number) => void;
  printOperationToTape: (text: string) => void;
  resolveRunningTotal: () => number;
  formatAdditiveTapeLine: (operand: number, operation: "+" | "-") => string;
  formatOperatorSymbol: (operation: Operation) => string;
}

export class MulDivEngine {
  constructor(
    private readonly state: WorkingExpressionState,
    private readonly dependencies: MulDivEngineDependencies
  ) {}

  shouldOpenAccumulatorContinuation(operation: Operation): boolean {
    return (
      (operation === "+" || operation === "-") &&
      this.state.waitingForNewEntry &&
      this.state.continuationSource.value !== null
    );
  }

  shouldOpenMulDivFromResolvedValue(operation: Operation): operation is "*" | "/" {
    return (
      (operation === "*" || operation === "/") &&
      this.state.waitingForNewEntry &&
      this.state.continuationSource.value !== null
    );
  }

  openAccumulatorContinuation(operation: Operation): void {
    const base = this.state.continuationSource.value;
    if (base === null) {
      return;
    }

    this.dependencies.printAdditiveBaseToTape(base);
    this.state.expressionTokens = [base, operation];
    this.state.pendingOperation = operation;
    this.state.firstOperand = base;
    this.state.lastOperator = operation;
    this.state.lastOperand = null;
    this.state.displayValue = formatForDisplay(base);
    this.state.totalMemory = base;

    const operationCounterUpdate = incrementOperationCount(
      this.state.operationCount,
      operation
    );
    this.state.operationCount = operationCounterUpdate.operationCount;

    this.prepareEntryTransition("entry");
  }

  shouldContinueFromAccumulatorValue(operation: Operation): boolean {
    return (
      (operation === "+" || operation === "-") &&
      !this.state.waitingForNewEntry &&
      this.state.continuationSource.value !== null
    );
  }

  continueFromAccumulatorValue(operation: Operation, rawCurrent: number): void {
    if (operation !== "+" && operation !== "-") {
      return;
    }

    const base = this.state.continuationSource.value;
    if (base === null) {
      return;
    }

    const operand = this.dependencies.normalizeOperandForCurrentDisplay(rawCurrent, operation);
    this.dependencies.printOperationToTape(
      this.dependencies.formatAdditiveTapeLine(operand, operation)
    );

    this.state.expressionTokens = [base, operation, operand, operation];
    this.state.lastOperator = operation;
    this.state.lastOperand = operand;

    const operationCounterUpdate = incrementOperationCount(
      this.state.operationCount,
      operation
    );
    this.state.operationCount = operationCounterUpdate.operationCount;

    const preview = this.dependencies.evaluateExpressionSafely(
      this.state.expressionTokens.slice(0, -1)
    );
    if (preview !== null) {
      this.state.displayValue = formatForDisplay(preview);
      this.state.totalMemory = preview;
      this.state.firstOperand = preview;
    }

    this.prepareEntryTransition(this.state.accumulatorContext);
    this.state.pendingOperation = operation;
  }

  openMulDivFromAccumulatedPreview(operation: "*" | "/"): void {
    const base = this.dependencies.resolveRunningTotal();
    this.dependencies.printOperationToTape(
      `${formatForTape(base)} ${this.dependencies.formatOperatorSymbol(operation)}`
    );
    this.state.expressionTokens = [base, operation];
    this.state.pendingOperation = operation;
    this.state.firstOperand = base;
    this.state.lastOperator = operation;
    this.state.lastOperand = base;
    this.state.displayValue = formatForDisplay(base);
    this.state.totalMemory = base;
    this.prepareEntryTransition("entry");
  }

  openMulDivFromResolvedValue(operation: "*" | "/"): void {
    const base = this.state.continuationSource.value;
    if (base === null) {
      return;
    }

    this.dependencies.printOperationToTape(
      `${formatForTape(base)} ${this.dependencies.formatOperatorSymbol(operation)}`
    );
    this.state.expressionTokens = [base, operation];
    this.state.pendingOperation = operation;
    this.state.firstOperand = base;
    this.state.lastOperator = operation;
    this.state.lastOperand = base;
    this.state.displayValue = formatForDisplay(base);
    this.state.totalMemory = base;
    this.prepareEntryTransition("entry");
  }

  resolveMulDivPostingOperation(
    tokens: ExpressionToken[]
  ): "+" | "-" | null {
    for (let index = tokens.length - 1; index >= 0; index -= 1) {
      const token = tokens[index];
      if (token === "+" || token === "-") {
        return token;
      }
    }

    return null;
  }

  private prepareEntryTransition(context: AccumulatorContext): void {
    this.state.waitingForNewEntry = true;
    this.state.lastPercentInput = null;
    this.state.pendingBusiness = null;
    this.state.businessBase = null;
    this.state.businessCost = null;
    this.state.businessSell = null;
    this.state.businessMargin = null;
    this.state.accumulatorContext = context;
    this.state.continuationSource = { origin: "none", value: null };
  }
}
