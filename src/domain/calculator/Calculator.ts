import {
  formatForDisplay,
  formatForTape,
  isOverflow,
  normalizeOperandForOperation,
  roundByMode,
  symbolFor,
  exceedsDigitLimit,
} from "./policies/numericPolicy";
import { appendTapeLine, canPrintToTape } from "./policies/tapePolicy";
import {
  evaluateExpression,
  executeOperation,
  resolveMulDivLeftOperand,
} from "./services/expressionEvaluator";
import {
  createInitialCalculatorState,
  sanitizeSnapshot,
} from "./state";
import { solveBusinessValues } from "./services/businessMath";
import {
  calculateOperationAverage,
  createSubtotalTransition,
  incrementOperationCount,
} from "./services/accountingService";
import {
  convertDomesticToForeign,
  convertForeignToDomestic,
  normalizeConversionRate,
} from "./services/currencyConversionService";
import {
  createClearedEntryState,
  createClearAllState,
  createErrorState,
  createResetAllState,
} from "./services/sessionStateService";
import {
  calculateTaxAddition,
  calculateTaxSubtraction,
  normalizeTaxRate,
} from "./services/taxService";
import {
  BusinessMode,
  CalculatorSnapshot,
  CalculatorState,
  DecimalMode,
  ExpressionToken,
  Mode,
  Operation,
} from "./types";

export type {
  BusinessMode,
  CalculatorSnapshot,
  CalculatorState,
  DecimalMode,
  ExpressionToken,
  Mode,
  Operation,
} from "./types";

export class Calculator {
  private state: CalculatorState;

  constructor() {
    this.state = createInitialCalculatorState();
  }

  getState(): CalculatorState {
    return {
      ...this.state,
      paperTape: [...this.state.paperTape],
    };
  }

  getSnapshot(): CalculatorSnapshot {
    return {
      version: 1,
      state: this.getState(),
    };
  }

  loadSnapshot(snapshot: CalculatorSnapshot): void {
    if (!snapshot || snapshot.version !== 1) {
      throw new Error("Unsupported snapshot format");
    }

    this.state = sanitizeSnapshot(snapshot);
  }

  setMode(mode: Mode): void {
    this.state.mode = mode;
    this.printToTape(`[MODE ${mode}]`);
  }

  setDecimalMode(decimalMode: DecimalMode): void {
    this.state.decimalMode = decimalMode;
    this.printToTape(`[DEC ${decimalMode}]`);
  }

  inputDigit(digit: string): void {
    if (!this.canOperate() || this.state.error) {
      return;
    }

    this.state.lastPercentInput = null;

    if (this.state.waitingForNewEntry || this.state.displayValue === "E") {
      this.state.displayValue = "0";
      this.state.waitingForNewEntry = false;
    }

    if (this.state.displayValue === "0") {
      this.state.displayValue = digit;
    } else if (this.state.displayValue === "-0") {
      this.state.displayValue = `-${digit}`;
    } else {
      const next = `${this.state.displayValue}${digit}`;
      if (exceedsDigitLimit(next)) {
        this.setError();
        return;
      }
      this.state.displayValue = next;
    }
  }

  inputDecimal(): void {
    if (!this.canOperate() || this.state.error) {
      return;
    }

    this.state.lastPercentInput = null;

    if (this.state.waitingForNewEntry) {
      this.state.displayValue = "0";
      this.state.waitingForNewEntry = false;
    }

    if (!this.state.displayValue.includes(".")) {
      this.state.displayValue += ".";
    }
  }

  toggleSign(): void {
    if (!this.canOperate() || this.state.error || this.state.displayValue === "0") {
      return;
    }

    this.state.lastPercentInput = null;

    this.state.displayValue = this.state.displayValue.startsWith("-")
      ? this.state.displayValue.slice(1)
      : `-${this.state.displayValue}`;
  }

  clearEntry(): void {
    Object.assign(this.state, createClearedEntryState());
  }

  clearAll(): void {
    Object.assign(this.state, createClearAllState());
    this.printToTape("[AC]");
  }

  resetAll(): void {
    Object.assign(this.state, createResetAllState());
  }

  add(): void {
    this.performOperation("+");
  }

  plusEquals(): void {
    if (this.state.waitingForNewEntry && this.hasOpenAdditiveSequence()) {
      this.equals();
      return;
    }

    this.add();
  }

  subtract(): void {
    this.performOperation("-");
  }

  multiply(): void {
    this.performOperation("*");
  }

  divide(): void {
    this.performOperation("/");
  }

  equals(): void {
    if (!this.canOperate() || this.state.error) {
      return;
    }

    const current = this.parseDisplayValue();
    if (current === null) {
      return;
    }

    if (this.state.expressionTokens.length > 0) {
      const expression = [...this.state.expressionTokens];
      const lastToken = expression[expression.length - 1];

      if (typeof lastToken === "string") {
        if (this.state.waitingForNewEntry && (lastToken === "+" || lastToken === "-")) {
          expression.pop();
          this.state.lastOperator = lastToken;
        } else {
          const secondOperand = this.state.waitingForNewEntry
            ? this.state.lastOperand ?? this.normalizeOperandForCurrentDisplay(current, lastToken)
            : this.normalizeOperandForCurrentDisplay(current, lastToken);

          const shouldSuppressAdditiveOperandLine =
            (lastToken === "+" || lastToken === "-") &&
            this.state.lastPercentInput !== null;

          if (lastToken === "*" || lastToken === "/") {
            const leftOperand = this.resolveMulDivLeftOperandSafely(expression);
            if (leftOperand === null) {
              return;
            }
            const mulDivResult = this.executeOperationSafely(leftOperand, secondOperand, lastToken);
            if (mulDivResult === null) {
              return;
            }
            this.printToTape(
              `${formatForTape(leftOperand)} ${symbolFor(lastToken)} ${formatForTape(secondOperand)} = ${formatForTape(mulDivResult)}`
            );
          } else if (!shouldSuppressAdditiveOperandLine) {
            this.printToTape(`${formatForTape(secondOperand)} ${symbolFor(lastToken)}`);
          }

          expression.push(secondOperand);
          this.state.lastOperator = lastToken;
          this.state.lastOperand = secondOperand;
        }
      }

      const result = this.evaluateExpressionSafely(expression);
      if (result === null) {
        return;
      }

      const hasAdditiveOperators = expression.some(
        (token) => token === "+" || token === "-"
      );

      if (typeof lastToken === "string" && (lastToken === "+" || lastToken === "-")) {
        this.printToTape(`${formatForTape(result)}`);
      } else if (
        typeof lastToken === "string" &&
        (lastToken === "*" || lastToken === "/") &&
        hasAdditiveOperators
      ) {
        this.printToTape(`${formatForTape(result)}`);
      }

      this.state.displayValue = formatForDisplay(result);
      this.state.totalMemory = result;
      this.state.firstOperand = result;
      this.state.lastPercentInput = null;
      this.state.pendingOperation = null;
      this.state.expressionTokens = [result];
      this.state.waitingForNewEntry = true;
      return;
    }

    if (this.state.lastOperator && this.state.lastOperand !== null) {
      const result = this.executeOperationSafely(
        current,
        this.state.lastOperand,
        this.state.lastOperator
      );
      if (result === null) {
        return;
      }

      if (this.state.lastOperator === "+" || this.state.lastOperator === "-") {
        this.printToTape(
          `${formatForTape(this.state.lastOperand)} ${symbolFor(this.state.lastOperator)}`
        );
        this.printToTape(`${formatForTape(result)}`);
      } else {
        this.printToTape(
          `${formatForTape(current)} ${symbolFor(this.state.lastOperator)} ${formatForTape(this.state.lastOperand)} = ${formatForTape(result)}`
        );
      }
      this.finalizeResult(result, this.state.lastOperator, this.state.lastOperand, false);
      this.state.firstOperand = result;
      this.state.lastPercentInput = null;
      this.state.expressionTokens = [result];
      this.state.waitingForNewEntry = true;
    }
  }

  memoryAdd(): void {
    if (!this.canIndependentMemory()) {
      return;
    }
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    this.state.independentMemory = this.roundForCurrentMode(this.state.independentMemory + value, "+");
    this.printToTape(`M+ ${formatForTape(value)} => ${formatForTape(this.state.independentMemory)}`);
  }

  memorySubtract(): void {
    if (!this.canIndependentMemory()) {
      return;
    }
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    this.state.independentMemory = this.roundForCurrentMode(this.state.independentMemory - value, "-");
    this.printToTape(`M- ${formatForTape(value)} => ${formatForTape(this.state.independentMemory)}`);
  }

  memoryRecall(): void {
    if (!this.canIndependentMemory()) {
      return;
    }
    this.state.displayValue = formatForDisplay(this.state.independentMemory);
    this.state.waitingForNewEntry = true;
  }

  memoryClear(): void {
    if (!this.canIndependentMemory()) {
      return;
    }
    this.state.independentMemory = 0;
    this.printToTape("MC");
  }

  grandTotalRecall(): void {
    this.state.displayValue = formatForDisplay(this.state.grandTotal);
    this.state.waitingForNewEntry = true;
    this.printToTape(`SUBTOTALS ${this.state.subtotalCount} GT ${formatForTape(this.state.grandTotal)}`);
  }

  printReference(): void {
    this.state.referenceNumber += 1;
    this.printToTape(`REF# ${this.state.referenceNumber.toString().padStart(4, "0")}`);
  }

  subtotal(): void {
    const subtotalValue = this.resolveRunningTotal();
    this.printToTape(`SUBTOTAL ${this.state.subtotalCount + 1} OPS ${this.state.operationCount} ${formatForTape(subtotalValue)}`);
    const transition = createSubtotalTransition(this.state, subtotalValue, (value, operation) =>
      this.roundForCurrentMode(value, operation)
    );
    this.state.grandTotal = transition.grandTotal;
    this.state.displayValue = transition.displayValue;
    this.state.waitingForNewEntry = transition.waitingForNewEntry;
    this.state.pendingOperation = transition.pendingOperation;
    this.state.firstOperand = transition.firstOperand;
    this.state.lastOperator = transition.lastOperator;
    this.state.lastOperand = transition.lastOperand;
    this.state.expressionTokens = transition.expressionTokens;
    this.state.totalMemory = transition.totalMemory;
    this.state.operationCount = transition.operationCount;
    this.state.subtotalCount = transition.subtotalCount;
  }

  printOperationAverage(): void {
    const average = calculateOperationAverage(
      this.state.operationCount,
      this.state.totalMemory
    );
    this.printToTape(`AVG ${formatForTape(average)}`);
    this.state.displayValue = formatForDisplay(average);
    this.state.waitingForNewEntry = true;
  }

  percent(): void {
    if (!this.canOperate() || this.state.error) {
      return;
    }
    const current = this.parseDisplayValue();
    if (current === null) {
      return;
    }

    const pendingOperation = this.state.pendingOperation;
    const firstOperand = this.state.firstOperand;
    const usesBasePercentage =
      firstOperand !== null &&
      (pendingOperation === "+" || pendingOperation === "-");

    let result = current / 100;
    if (usesBasePercentage) {
      result = (firstOperand * current) / 100;
    }

    result = this.roundForCurrentMode(result, pendingOperation ?? "+");
    if (isOverflow(result)) {
      this.setError();
      return;
    }

    this.state.displayValue = formatForDisplay(result);
    this.state.waitingForNewEntry = pendingOperation === null;
    this.state.lastPercentInput = current;
    this.printToTape(`${formatForTape(current)} %`);
    this.state.totalMemory = result;
  }

  setTaxRate(): void {
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    this.state.taxRate = normalizeTaxRate(value);
    this.state.waitingForNewEntry = true;
    this.printToTape(`TAX RATE ${formatForTape(value)}%`);
  }

  addTax(): void {
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    let computation;
    try {
      computation = calculateTaxAddition(value, this.state.taxRate, {
        isOverflow,
        round: (numericValue, operation) =>
          this.roundForCurrentMode(numericValue, operation),
      });
    } catch {
      this.setError();
      return;
    }
    this.state.displayValue = formatForDisplay(computation.result);
    this.state.waitingForNewEntry = true;
    this.state.totalMemory = computation.result;
    this.printToTape(`TAX+`);
    this.printToTape(`BASE  ${formatForTape(value)}`);
    this.printToTape(`TAX ${formatForDisplay(this.state.taxRate)}% ${formatForTape(computation.taxAmount)}`);
    this.printToTape(`TOTAL ${formatForTape(computation.result)}`);
  }

  subtractTax(): void {
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    let computation;
    try {
      computation = calculateTaxSubtraction(value, this.state.taxRate, {
        isOverflow,
        round: (numericValue, operation) =>
          this.roundForCurrentMode(numericValue, operation),
      });
    } catch {
      this.setError();
      return;
    }
    this.state.displayValue = formatForDisplay(computation.result);
    this.state.waitingForNewEntry = true;
    this.state.totalMemory = computation.result;
    this.printToTape(`TAX-`);
    this.printToTape(`TOTAL ${formatForTape(value)}`);
    this.printToTape(`BASE  ${formatForTape(computation.result)}`);
    this.printToTape(`TAX ${formatForDisplay(this.state.taxRate)}% ${formatForTape(computation.taxAmount)}`);
  }

  setConversionRate(): void {
    if (!this.canConvertCurrency()) {
      return;
    }
    const rate = this.parseDisplayValue();
    if (rate === null) {
      return;
    }
    try {
      this.state.conversionRate = normalizeConversionRate(rate);
    } catch {
      this.setError();
      return;
    }
    this.state.waitingForNewEntry = true;
    this.printToTape(`RATE ${formatForTape(this.state.conversionRate)}`);
  }

  convertDomesticToForeign(): void {
    if (!this.canConvertCurrency()) {
      return;
    }
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    let result;
    try {
      result = convertDomesticToForeign(value, this.state.conversionRate, {
        isOverflow,
        round: (numericValue, operation) =>
          this.roundForCurrentMode(numericValue, operation),
      });
    } catch {
      this.setError();
      return;
    }
    this.state.displayValue = formatForDisplay(result);
    this.state.waitingForNewEntry = true;
    this.printToTape(`${formatForTape(value)} -> ${formatForTape(result)} FC`);
  }

  convertForeignToDomestic(): void {
    if (!this.canConvertCurrency()) {
      return;
    }
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    let result;
    try {
      result = convertForeignToDomestic(value, this.state.conversionRate, {
        isOverflow,
        round: (numericValue, operation) =>
          this.roundForCurrentMode(numericValue, operation),
      });
    } catch {
      this.setError();
      return;
    }
    this.state.displayValue = formatForDisplay(result);
    this.state.waitingForNewEntry = true;
    this.printToTape(`${formatForTape(value)} FC -> ${formatForTape(result)} DC`);
  }

  businessFunction(fn: Exclude<BusinessMode, null>): void {
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }

    if (fn === "COST") {
      this.state.businessCost = value;
    } else if (fn === "SELL") {
      this.state.businessSell = value;
    } else {
      this.state.businessMargin = value;
    }

    this.printToTape(`${fn} IN ${formatForTape(value)}`);

    let solution;
    try {
      solution = solveBusinessValues(
        {
          cost: this.state.businessCost,
          sell: this.state.businessSell,
          margin: this.state.businessMargin,
        },
        (numericValue, operation) =>
          this.roundForCurrentMode(numericValue, operation)
      );
    } catch {
      this.setError();
      return;
    }

    this.state.waitingForNewEntry = true;

    if (!solution) {
      return;
    }

    if (!Number.isFinite(solution.result) || isOverflow(solution.result)) {
      this.setError();
      return;
    }

    if (solution.solvedKey === "COST") {
      this.state.businessCost = solution.result;
    } else if (solution.solvedKey === "SELL") {
      this.state.businessSell = solution.result;
    } else {
      this.state.businessMargin = solution.result;
    }

    this.state.displayValue = formatForDisplay(solution.result);
    this.state.totalMemory = solution.result;
    this.printToTape(`${solution.solvedKey} OUT ${formatForTape(solution.result)}`);
  }

  clearTape(): void {
    this.state.paperTape = [];
  }

  private performOperation(operation: Operation): void {
    if (!this.canOperate() || this.state.error) {
      return;
    }

    const rawCurrent = this.parseDisplayValue();
    if (rawCurrent === null) {
      return;
    }

    if (this.state.waitingForNewEntry) {
      const lastToken = this.state.expressionTokens[this.state.expressionTokens.length - 1];
      if (typeof lastToken === "string") {
        this.state.expressionTokens[this.state.expressionTokens.length - 1] = operation;
        this.state.pendingOperation = operation;
        return;
      }
    }

    if (this.shouldContinueFromClosedResult(operation)) {
      this.continueFromClosedResult(operation, rawCurrent);
      return;
    }

    const operand = this.normalizeOperandForCurrentDisplay(rawCurrent, operation);
    const previousOperator = this.state.expressionTokens[this.state.expressionTokens.length - 1];
    const shouldSuppressAdditivePercentLine =
      (previousOperator === "+" || previousOperator === "-") &&
      this.state.lastPercentInput !== null;

    if (previousOperator === "*" || previousOperator === "/") {
      const leftOperand = this.resolveMulDivLeftOperandSafely(this.state.expressionTokens);
      if (leftOperand === null) {
        return;
      }
      const mulDivResult = this.executeOperationSafely(
        leftOperand,
        operand,
        previousOperator
      );
      if (mulDivResult === null) {
        return;
      }
      this.printToTape(
        `${formatForTape(leftOperand)} ${symbolFor(previousOperator)} ${formatForTape(operand)} = ${formatForTape(mulDivResult)}`
      );
    } else if (!shouldSuppressAdditivePercentLine) {
      this.printToTape(`${formatForTape(operand)} ${symbolFor(operation)}`);
    }

    this.state.expressionTokens.push(operand);
    this.state.expressionTokens.push(operation);
    this.state.lastOperator = operation;
    this.state.lastOperand = operand;

    const operationCounterUpdate = incrementOperationCount(
      this.state.operationCount,
      operation
    );
    this.state.operationCount = operationCounterUpdate.operationCount;

    const preview = this.evaluateExpressionSafely(
      this.state.expressionTokens.slice(0, -1)
    );
    if (preview !== null) {
      this.state.displayValue = formatForDisplay(preview);
      this.state.totalMemory = preview;
      this.state.firstOperand = preview;
    }

    this.state.pendingOperation = operation;
    this.state.waitingForNewEntry = true;
    this.state.lastPercentInput = null;
    this.state.pendingBusiness = null;
    this.state.businessBase = null;
    this.state.businessCost = null;
    this.state.businessSell = null;
    this.state.businessMargin = null;
  }

  private shouldContinueFromClosedResult(operation: Operation): boolean {
    return (
      (operation === "+" || operation === "-") &&
      !this.state.waitingForNewEntry &&
      this.state.expressionTokens.length === 1 &&
      typeof this.state.expressionTokens[0] === "number"
    );
  }

  private continueFromClosedResult(operation: Operation, rawCurrent: number): void {
    if (operation !== "+" && operation !== "-") {
      return;
    }

    const base = this.state.expressionTokens[0];
    if (typeof base !== "number") {
      return;
    }

    const operand = this.normalizeOperandForCurrentDisplay(rawCurrent, operation);
    this.printToTape(`${formatForTape(operand)} ${symbolFor(operation)}`);

    this.state.expressionTokens = [base, operation, operand, operation];
    this.state.lastOperator = operation;
    this.state.lastOperand = operand;

    const operationCounterUpdate = incrementOperationCount(
      this.state.operationCount,
      operation
    );
    this.state.operationCount = operationCounterUpdate.operationCount;

    const preview = this.evaluateExpressionSafely(
      this.state.expressionTokens.slice(0, -1)
    );
    if (preview !== null) {
      this.state.displayValue = formatForDisplay(preview);
      this.state.totalMemory = preview;
      this.state.firstOperand = preview;
    }

    this.state.pendingOperation = operation;
    this.state.waitingForNewEntry = true;
    this.state.lastPercentInput = null;
    this.state.pendingBusiness = null;
    this.state.businessBase = null;
    this.state.businessCost = null;
    this.state.businessSell = null;
    this.state.businessMargin = null;
  }

  private hasOpenAdditiveSequence(): boolean {
    const lastToken = this.state.expressionTokens[this.state.expressionTokens.length - 1];
    return lastToken === "+" || lastToken === "-";
  }

  private finalizeResult(
    result: number,
    operation: Operation,
    secondOperand: number,
    accumulateGrandTotal: boolean
  ): void {
    this.state.displayValue = formatForDisplay(result);
    this.state.totalMemory = result;
    this.state.lastOperator = operation;
    this.state.lastOperand = secondOperand;
    this.state.lastPercentInput = null;

    if (accumulateGrandTotal) {
      this.state.grandTotal = this.roundForCurrentMode(this.state.grandTotal + result, "+");
    }
  }

  private canOperate(): boolean {
    return true;
  }

  private canIndependentMemory(): boolean {
    return this.state.mode !== "CONVERSION";
  }

  private canConvertCurrency(): boolean {
    return this.state.mode === "CONVERSION";
  }

  private resolveRunningTotal(): number {
    if (this.state.expressionTokens.length > 0) {
      const tokens = [...this.state.expressionTokens];
      const lastToken = tokens[tokens.length - 1];
      if (typeof lastToken === "string") {
        if (this.state.waitingForNewEntry) {
          tokens.pop();
        } else {
          const current = this.parseDisplayValue();
          if (current !== null) {
            tokens.push(this.normalizeOperandForCurrentDisplay(current, lastToken));
          }
        }
      }

      const resolved = this.evaluateExpressionSafely(tokens);
      if (resolved !== null) {
        return resolved;
      }
    }

    if (this.state.pendingOperation && this.state.firstOperand !== null) {
      if (this.state.waitingForNewEntry) {
        return this.state.firstOperand;
      }

      const current = this.parseDisplayValue();
      if (current === null) {
        return this.state.totalMemory;
      }

      const secondOperand = this.normalizeOperandForCurrentDisplay(current, this.state.pendingOperation);
      const computed = this.executeOperationSafely(
        this.state.firstOperand,
        secondOperand,
        this.state.pendingOperation
      );
      if (computed === null) {
        return this.state.totalMemory;
      }
      return computed;
    }

    if (this.state.totalMemory !== 0) {
      return this.state.totalMemory;
    }

    const current = this.parseDisplayValue();
    return current ?? 0;
  }

  private normalizeOperandForCurrentDisplay(value: number, operation: Operation): number {
    return normalizeOperandForOperation(
      this.state.displayValue,
      this.state.decimalMode,
      value,
      operation
    );
  }

  private parseDisplayValue(): number | null {
    const parsed = parseFloat(this.state.displayValue);
    if (Number.isNaN(parsed)) {
      this.setError();
      return null;
    }
    return parsed;
  }

  private printToTape(text: string): void {
    if (!canPrintToTape(this.state)) {
      return;
    }

    this.state.paperTape = appendTapeLine(this.state.paperTape, text);
  }

  private setError(): void {
    Object.assign(this.state, createErrorState());
  }

  private roundForCurrentMode(
    value: number,
    operation: Operation | "+" | "-"
  ): number {
    return roundByMode(this.state.decimalMode, value, operation);
  }

  private executeOperationSafely(
    first: number,
    second: number,
    operation: Operation
  ): number | null {
    try {
      return executeOperation(first, second, operation, {
        isOverflow,
        round: (value, currentOperation) =>
          this.roundForCurrentMode(value, currentOperation),
      });
    } catch {
      this.setError();
      return null;
    }
  }

  private evaluateExpressionSafely(tokens: ExpressionToken[]): number | null {
    try {
      return evaluateExpression(tokens, {
        isOverflow,
        round: (value, operation) => this.roundForCurrentMode(value, operation),
      });
    } catch {
      this.setError();
      return null;
    }
  }

  private resolveMulDivLeftOperandSafely(
    tokens: ExpressionToken[]
  ): number | null {
    try {
      return resolveMulDivLeftOperand(tokens, {
        isOverflow,
        round: (value, operation) => this.roundForCurrentMode(value, operation),
      });
    } catch {
      this.setError();
      return null;
    }
  }
}
