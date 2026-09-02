import { formatForDisplay, formatForTape } from "../policies/numericPolicy";
import { incrementOperationCount } from "../services/accountingService";
import { AccumulatorContext, CalculatorState, ExpressionToken, Operation } from "../types";

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
    private readonly state: CalculatorState,
    private readonly dependencies: MulDivEngineDependencies
  ) {}

  shouldOpenAccumulatorContinuation(operation: Operation): boolean {
    const base = this.state.expressionTokens[0];
    const current = this.dependencies.parseDisplayValue();

    return (
      (operation === "+" || operation === "-") &&
      this.state.waitingForNewEntry &&
      this.state.expressionTokens.length === 1 &&
      typeof base === "number" &&
      current !== null &&
      Math.abs(current - base) < 1e-9 &&
      (this.state.accumulatorContext === "subtotal" ||
        this.state.accumulatorContext === "result")
    );
  }

  shouldOpenMulDivFromResolvedValue(operation: Operation): operation is "*" | "/" {
    const base = this.state.expressionTokens[0];
    const current = this.dependencies.parseDisplayValue();

    return (
      (operation === "*" || operation === "/") &&
      this.state.waitingForNewEntry &&
      this.state.expressionTokens.length === 1 &&
      typeof base === "number" &&
      current !== null &&
      Math.abs(current - base) < 1e-9
    );
  }

  openAccumulatorContinuation(operation: Operation): void {
    const base = this.state.expressionTokens[0];
    if (typeof base !== "number") {
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
      this.state.expressionTokens.length === 1 &&
      typeof this.state.expressionTokens[0] === "number"
    );
  }

  continueFromAccumulatorValue(operation: Operation, rawCurrent: number): void {
    if (operation !== "+" && operation !== "-") {
      return;
    }

    const base = this.state.expressionTokens[0];
    if (typeof base !== "number") {
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
    const base = this.state.expressionTokens[0];
    if (typeof base !== "number") {
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
  }
}
