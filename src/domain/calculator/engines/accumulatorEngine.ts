import { formatForDisplay, formatForTape } from "../policies/numericPolicy";
import { calculateOperationAverage, incrementOperationCount } from "../services/accountingService";
import { CalculatorState, ExpressionToken, Operation } from "../types";

interface AccumulatorEngineDependencies {
  evaluateExpressionSafely: (tokens: ExpressionToken[]) => number | null;
  executeOperationSafely: (first: number, second: number, operation: Operation) => number | null;
  normalizeOperandForCurrentDisplay: (value: number, operation: Operation) => number;
  parseDisplayValue: () => number | null;
  printAccumulatorSummary: (
    title: "Sub Total" | "Total" | "GrandTotal",
    itemCount: number,
    value: number,
    marker: "◇" | "*" | "G*"
  ) => void;
  printClosedMulDivSegment: (
    expression: ExpressionToken[],
    operand: number,
    operation: Operation,
    postingOperation: "+" | "-" | null
  ) => boolean;
  printOperationToTape: (text: string) => void;
  formatAdditiveTapeLine: (operand: number, operation: "+" | "-") => string;
  resolveMulDivPostingOperation: (tokens: ExpressionToken[]) => "+" | "-" | null;
  roundForCurrentMode: (value: number, operation: Operation | "+" | "-") => number;
}

export class AccumulatorEngine {
  constructor(
    private readonly state: CalculatorState,
    private readonly dependencies: AccumulatorEngineDependencies
  ) {}

  subtotal(): void {
    this.materializeOpenExpressionForTape();
    const subtotalValue = this.resolveRunningTotal();
    this.dependencies.printAccumulatorSummary(
      "Sub Total",
      this.state.operationCount,
      subtotalValue,
      "◇"
    );
    this.state.displayValue = formatForDisplay(subtotalValue);
    this.state.totalMemory = subtotalValue;
    this.state.pendingOperation = null;
    this.state.firstOperand = subtotalValue;
    this.state.lastOperator = null;
    this.state.lastOperand = null;
    this.state.expressionTokens = [subtotalValue];
    this.state.waitingForNewEntry = true;
    this.state.lastPercentInput = null;
    this.state.pendingBusiness = null;
    this.state.businessBase = null;
    this.state.businessCost = null;
    this.state.businessSell = null;
    this.state.businessMargin = null;
    this.state.accumulatorContext = "subtotal";
  }

  total(): void {
    this.materializeOpenExpressionForTape();
    const totalValue = this.resolveRunningTotal();
    this.dependencies.printAccumulatorSummary(
      "Total",
      this.state.operationCount,
      totalValue,
      "*"
    );

    this.state.grandTotal = this.dependencies.roundForCurrentMode(
      this.state.grandTotal + totalValue,
      "+"
    );
    this.state.subtotalCount += 1;
    this.state.displayValue = formatForDisplay(totalValue);
    this.state.totalMemory = totalValue;
    this.state.pendingOperation = null;
    this.state.firstOperand = null;
    this.state.lastOperand = null;
    this.state.lastOperator = null;
    this.state.waitingForNewEntry = true;
    this.state.pendingBusiness = null;
    this.state.businessBase = null;
    this.state.businessCost = null;
    this.state.businessSell = null;
    this.state.businessMargin = null;
    this.state.expressionTokens = [];
    this.state.operationCount = 0;
    this.state.lastPercentInput = null;
    this.state.accumulatorContext = "total";
    this.state.needsTapeBlockHeader = true;
  }

  grandTotalRecall(): void {
    const grandTotalValue = this.state.grandTotal;
    this.dependencies.printAccumulatorSummary(
      "GrandTotal",
      this.state.subtotalCount,
      grandTotalValue,
      "G*"
    );
    this.state.displayValue = formatForDisplay(grandTotalValue);
    this.state.totalMemory = grandTotalValue;
    this.state.grandTotal = 0;
    this.state.subtotalCount = 0;
    this.state.waitingForNewEntry = true;
    this.state.pendingOperation = null;
    this.state.firstOperand = null;
    this.state.lastOperand = null;
    this.state.lastOperator = null;
    this.state.pendingBusiness = null;
    this.state.businessBase = null;
    this.state.businessCost = null;
    this.state.businessSell = null;
    this.state.businessMargin = null;
    this.state.expressionTokens = [];
    this.state.lastPercentInput = null;
    this.state.accumulatorContext = "grand-total";
    this.state.needsTapeBlockHeader = true;
  }

  printOperationAverage(): void {
    const average = calculateOperationAverage(
      this.state.operationCount,
      this.state.totalMemory
    );
    this.dependencies.printOperationToTape("----------------");
    this.dependencies.printOperationToTape("Average:");
    this.dependencies.printOperationToTape(`${formatForTape(average)}`);
    this.state.displayValue = formatForDisplay(average);
    this.state.waitingForNewEntry = true;
    this.state.accumulatorContext = "result";
  }

  resolveRunningTotal(): number {
    if (this.state.expressionTokens.length > 0) {
      const tokens = [...this.state.expressionTokens];
      const lastToken = tokens[tokens.length - 1];
      if (typeof lastToken === "string") {
        if (this.state.waitingForNewEntry) {
          tokens.pop();
        } else {
          const current = this.dependencies.parseDisplayValue();
          if (current !== null) {
            tokens.push(this.dependencies.normalizeOperandForCurrentDisplay(current, lastToken));
          }
        }
      }

      const resolved = this.dependencies.evaluateExpressionSafely(tokens);
      if (resolved !== null) {
        return resolved;
      }
    }

    if (this.state.pendingOperation && this.state.firstOperand !== null) {
      if (this.state.waitingForNewEntry) {
        return this.state.firstOperand;
      }

      const current = this.dependencies.parseDisplayValue();
      if (current === null) {
        return this.state.totalMemory;
      }

      const secondOperand = this.dependencies.normalizeOperandForCurrentDisplay(
        current,
        this.state.pendingOperation
      );
      const computed = this.dependencies.executeOperationSafely(
        this.state.firstOperand,
        secondOperand,
        this.state.pendingOperation
      );
      if (computed === null) {
        return this.state.totalMemory;
      }
      return computed;
    }

    const current = this.dependencies.parseDisplayValue();
    if (current !== null) {
      return current;
    }

    return this.state.totalMemory;
  }

  materializeOpenExpressionForTape(): void {
    const lastToken = this.state.expressionTokens[this.state.expressionTokens.length - 1];
    if (typeof lastToken !== "string" || this.state.waitingForNewEntry) {
      return;
    }

    const current = this.dependencies.parseDisplayValue();
    if (current === null) {
      return;
    }

    const operand = this.dependencies.normalizeOperandForCurrentDisplay(current, lastToken);
    if (lastToken === "*" || lastToken === "/") {
      const postingOperation = this.dependencies.resolveMulDivPostingOperation(
        this.state.expressionTokens
      );
      if (!this.dependencies.printClosedMulDivSegment(
        this.state.expressionTokens,
        operand,
        lastToken,
        postingOperation
      )) {
        return;
      }
    } else if (this.state.lastPercentInput === null) {
      this.dependencies.printOperationToTape(
        this.dependencies.formatAdditiveTapeLine(operand, lastToken)
      );
    }

    this.state.expressionTokens.push(operand);
    this.state.lastOperator = lastToken;
    this.state.lastOperand = operand;

    if (lastToken === "+" || lastToken === "-") {
      const operationCounterUpdate = incrementOperationCount(
        this.state.operationCount,
        lastToken
      );
      this.state.operationCount = operationCounterUpdate.operationCount;
    }

    this.state.waitingForNewEntry = true;
    this.state.lastPercentInput = null;
  }
}
