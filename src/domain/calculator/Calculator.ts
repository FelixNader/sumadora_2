import {
  formatForDisplay,
  formatForTape,
  isOverflow,
  normalizeOperandForOperation,
  roundByMode,
  symbolFor,
  exceedsDigitLimit,
} from "./policies/numericPolicy";
import {
  appendTapeLine,
  canPrintToTape,
} from "./policies/tapePolicy";
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
  Operation,
} from "./types";

export type {
  BusinessMode,
  CalculatorSnapshot,
  CalculatorState,
  DecimalMode,
  ExpressionToken,
  Operation,
} from "./types";

function padTimestampPart(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatTapeBlockTimestamp(date: Date): string {
  return [
    date.getFullYear(),
    padTimestampPart(date.getMonth() + 1),
    padTimestampPart(date.getDate()),
  ].join("-") + ` ${padTimestampPart(date.getHours())}:${padTimestampPart(date.getMinutes())}`;
}

export class Calculator {
  private state: CalculatorState;
  private readonly now: () => Date;

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
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
      version: 2,
      state: this.getState(),
    };
  }

  loadSnapshot(snapshot: CalculatorSnapshot): void {
    if (!snapshot || snapshot.version !== 2) {
      throw new Error("Unsupported snapshot format");
    }

    this.state = sanitizeSnapshot(snapshot);
  }

  setDecimalMode(decimalMode: DecimalMode): void {
    this.resetAccumulatorBaseSuppression();
    this.state.decimalMode = decimalMode;
    this.printToTape(`[DEC ${decimalMode}]`, false);
  }

  inputDigit(digit: string): void {
    if (!this.canOperate() || this.state.error) {
      return;
    }

    this.resetAccumulatorBaseSuppression();
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

    this.state.accumulatorContext = "entry";
  }

  inputDecimal(): void {
    if (!this.canOperate() || this.state.error) {
      return;
    }

    this.resetAccumulatorBaseSuppression();
    this.state.lastPercentInput = null;

    if (this.state.waitingForNewEntry) {
      this.state.displayValue = "0";
      this.state.waitingForNewEntry = false;
    }

    if (!this.state.displayValue.includes(".")) {
      this.state.displayValue += ".";
    }

    this.state.accumulatorContext = "entry";
  }

  toggleSign(): void {
    if (!this.canOperate() || this.state.error || this.state.displayValue === "0") {
      return;
    }

    this.resetAccumulatorBaseSuppression();
    this.state.lastPercentInput = null;

    this.state.displayValue = this.state.displayValue.startsWith("-")
      ? this.state.displayValue.slice(1)
      : `-${this.state.displayValue}`;
    this.state.accumulatorContext = "entry";
  }

  clearEntry(): void {
    this.resetAccumulatorBaseSuppression();
    Object.assign(this.state, createClearedEntryState());
  }

  clearAll(): void {
    this.resetAccumulatorBaseSuppression();
    Object.assign(this.state, createClearAllState());
    this.printToTape("..0.. CA", false);
    this.state.needsTapeBlockHeader = true;
  }

  resetAll(): void {
    this.resetAccumulatorBaseSuppression();
    Object.assign(this.state, createResetAllState());
  }

  add(): void {
    this.performOperation("+");
  }

  plusEquals(): void {
    this.total();
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

    this.resetAccumulatorBaseSuppression();
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
            const postingOperation = this.resolveMulDivPostingOperation(expression);
            if (!this.printClosedMulDivSegment(expression, secondOperand, lastToken, postingOperation)) {
              return;
            }
          } else if (!shouldSuppressAdditiveOperandLine) {
            this.printOperationToTape(this.formatAdditiveTapeLine(secondOperand, lastToken));
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
        this.printOperationToTape(`${formatForTape(result)}`);
      } else if (
        typeof lastToken === "string" &&
        (lastToken === "*" || lastToken === "/") &&
        hasAdditiveOperators
      ) {
        this.printOperationToTape(`${formatForTape(result)}`);
      }

      this.state.displayValue = formatForDisplay(result);
      this.state.totalMemory = result;
      this.state.firstOperand = result;
      this.state.lastPercentInput = null;
      this.state.pendingOperation = null;
      this.state.expressionTokens = [result];
      this.state.waitingForNewEntry = true;
      this.state.accumulatorContext = "result";
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
        this.printOperationToTape(
          this.formatAdditiveTapeLine(this.state.lastOperand, this.state.lastOperator)
        );
        this.printOperationToTape(`${formatForTape(result)}`);
      } else {
        this.printOperationToTape(`${formatForTape(this.state.lastOperand)} =`);
        this.printOperationToTape(`${formatForTape(result)}`);
      }
      this.finalizeResult(result, this.state.lastOperator, this.state.lastOperand, false);
      this.state.firstOperand = result;
      this.state.lastPercentInput = null;
      this.state.expressionTokens = [result];
      this.state.waitingForNewEntry = true;
      this.state.accumulatorContext = "result";
    }
  }

  total(): void {
    if (!this.canOperate() || this.state.error) {
      return;
    }

    this.resetAccumulatorBaseSuppression();
    this.materializeOpenExpressionForTape();
    const totalValue = this.resolveRunningTotal();
    this.printAccumulatorSummary("Total", this.state.operationCount, totalValue, "*");

    this.state.grandTotal = this.roundForCurrentMode(this.state.grandTotal + totalValue, "+");
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

  memoryAdd(): void {
    this.resetAccumulatorBaseSuppression();
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    this.state.independentMemory = this.roundForCurrentMode(this.state.independentMemory + value, "+");
    this.printToTape(`${formatForTape(value)} M+`);
  }

  memorySubtract(): void {
    this.resetAccumulatorBaseSuppression();
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    this.state.independentMemory = this.roundForCurrentMode(this.state.independentMemory - value, "-");
    this.printToTape(`${formatForTape(value)} M-`);
  }

  memoryRecall(): void {
    this.resetAccumulatorBaseSuppression();
    this.state.displayValue = formatForDisplay(this.state.independentMemory);
    this.state.waitingForNewEntry = true;
    this.state.accumulatorContext = "result";
    this.printToTape(`${formatForTape(this.state.independentMemory)} M◇`);
  }

  memoryClear(): void {
    this.resetAccumulatorBaseSuppression();
    this.state.displayValue = formatForDisplay(this.state.independentMemory);
    this.state.waitingForNewEntry = true;
    this.state.accumulatorContext = "result";
    this.printToTape(`${formatForTape(this.state.independentMemory)} M*`);
    this.state.independentMemory = 0;
  }

  grandTotalRecall(): void {
    if (!this.canOperate() || this.state.error) {
      return;
    }

    this.resetAccumulatorBaseSuppression();
    const grandTotalValue = this.state.grandTotal;
    this.printAccumulatorSummary("GrandTotal", this.state.subtotalCount, grandTotalValue, "G*");
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

  printReference(): void {
    this.resetAccumulatorBaseSuppression();
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }

    this.printToTape(`${formatForTape(value)} #`);
    this.state.waitingForNewEntry = true;
    this.state.accumulatorContext = "result";
  }

  subtotal(): void {
    if (!this.canOperate() || this.state.error) {
      return;
    }

    this.resetAccumulatorBaseSuppression();
    this.materializeOpenExpressionForTape();
    const subtotalValue = this.resolveRunningTotal();
    this.printAccumulatorSummary("Sub Total", this.state.operationCount, subtotalValue, "◇");
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

  printOperationAverage(): void {
    this.resetAccumulatorBaseSuppression();
    const average = calculateOperationAverage(
      this.state.operationCount,
      this.state.totalMemory
    );
    this.printToTape("----------------");
    this.printToTape("Average:");
    this.printToTape(`${formatForTape(average)}`);
    this.state.displayValue = formatForDisplay(average);
    this.state.waitingForNewEntry = true;
    this.state.accumulatorContext = "result";
  }

  percent(): void {
    if (!this.canOperate() || this.state.error) {
      return;
    }
    this.resetAccumulatorBaseSuppression();
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
    this.printOperationToTape(
      `${formatForTape(this.formatPercentInputForTape(current, usesBasePercentage))} %`
    );
    if (usesBasePercentage && pendingOperation) {
      this.printOperationToTape(this.formatAdditiveTapeLine(result, pendingOperation));
    } else if (pendingOperation === null) {
      this.printOperationToTape(`${formatForTape(result)}`);
    }
    this.state.totalMemory = result;
    this.state.accumulatorContext = pendingOperation === null ? "result" : "entry";
  }

  setTaxRate(): void {
    this.resetAccumulatorBaseSuppression();
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    this.state.taxRate = normalizeTaxRate(value);
    this.state.waitingForNewEntry = true;
    this.printOperationToTape(`TAX RATE ${formatForTape(value)}%`);
  }

  addTax(): void {
    this.resetAccumulatorBaseSuppression();
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
    this.state.pendingOperation = null;
    this.state.firstOperand = computation.result;
    this.state.lastOperand = null;
    this.state.lastOperator = null;
    this.state.lastPercentInput = null;
    this.state.expressionTokens = [computation.result];
    this.state.suppressNextAccumulatorBasePrint = true;
    this.state.pendingBusiness = null;
    this.state.businessBase = null;
    this.state.businessCost = null;
    this.state.businessSell = null;
    this.state.businessMargin = null;
    this.state.accumulatorContext = "result";
    this.printOperationToTape(`TAX+`);
    this.printOperationToTape(`BASE  ${formatForTape(value)}`);
    this.printOperationToTape(`TAX ${formatForDisplay(this.state.taxRate)}% ${formatForTape(computation.taxAmount)}`);
    this.printOperationToTape(`TOTAL ${formatForTape(computation.result)}`);
  }

  subtractTax(): void {
    this.resetAccumulatorBaseSuppression();
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
    this.state.pendingOperation = null;
    this.state.firstOperand = computation.result;
    this.state.lastOperand = null;
    this.state.lastOperator = null;
    this.state.lastPercentInput = null;
    this.state.expressionTokens = [computation.result];
    this.state.suppressNextAccumulatorBasePrint = true;
    this.state.pendingBusiness = null;
    this.state.businessBase = null;
    this.state.businessCost = null;
    this.state.businessSell = null;
    this.state.businessMargin = null;
    this.state.accumulatorContext = "result";
    this.printOperationToTape(`TAX-`);
    this.printOperationToTape(`TOTAL ${formatForTape(value)}`);
    this.printOperationToTape(`BASE  ${formatForTape(computation.result)}`);
    this.printOperationToTape(`TAX ${formatForDisplay(this.state.taxRate)}% ${formatForTape(computation.taxAmount)}`);
  }

  setConversionRate(): void {
    this.resetAccumulatorBaseSuppression();
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
    this.printOperationToTape(`RATE ${formatForTape(this.state.conversionRate)}`);
  }

  convertDomesticToForeign(): void {
    this.resetAccumulatorBaseSuppression();
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
    this.state.totalMemory = result;
    this.state.pendingOperation = null;
    this.state.firstOperand = result;
    this.state.lastOperand = null;
    this.state.lastOperator = null;
    this.state.lastPercentInput = null;
    this.state.expressionTokens = [result];
    this.state.accumulatorContext = "result";
    this.state.suppressNextAccumulatorBasePrint = true;
    this.printOperationToTape(`${formatForTape(value)} -> ${formatForTape(result)} FC`);
  }

  convertForeignToDomestic(): void {
    this.resetAccumulatorBaseSuppression();
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
    this.state.totalMemory = result;
    this.state.pendingOperation = null;
    this.state.firstOperand = result;
    this.state.lastOperand = null;
    this.state.lastOperator = null;
    this.state.lastPercentInput = null;
    this.state.expressionTokens = [result];
    this.state.accumulatorContext = "result";
    this.state.suppressNextAccumulatorBasePrint = true;
    this.printOperationToTape(`${formatForTape(value)} FC -> ${formatForTape(result)} DC`);
  }

  businessFunction(fn: Exclude<BusinessMode, null>): void {
    this.resetAccumulatorBaseSuppression();
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

    this.printOperationToTape(
      `${fn} IN ${this.formatBusinessValueForTape(fn, value)}`
    );

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

    this.state.displayValue = this.formatBusinessValueForDisplay(
      solution.solvedKey,
      solution.result
    );
    this.state.totalMemory = solution.result;
    this.printOperationToTape(
      `${solution.solvedKey} OUT ${this.formatBusinessValueForTape(solution.solvedKey, solution.result)}`
    );
  }

  clearTape(): void {
    this.resetAccumulatorBaseSuppression();
    this.state.paperTape = [];
    this.state.tapeOperationSequence = 0;
    this.state.tapeSubtotalSequence = 0;
    this.state.needsTapeBlockHeader = true;
  }

  private performOperation(operation: Operation): void {
    if (!this.canOperate() || this.state.error) {
      return;
    }

    if (operation === "*" || operation === "/") {
      this.resetAccumulatorBaseSuppression();
    }

    if (this.shouldOpenAccumulatorContinuation(operation)) {
      this.openAccumulatorContinuation(operation);
      return;
    }

    const rawCurrent = this.parseDisplayValue();
    if (rawCurrent === null) {
      return;
    }

    if (this.state.waitingForNewEntry) {
      const lastToken = this.state.expressionTokens[this.state.expressionTokens.length - 1];
      if (
        (operation === "+" || operation === "-") &&
        lastToken === operation &&
        this.state.lastOperand !== null
      ) {
        this.repeatAdditiveOperation(operation, this.state.lastOperand);
        return;
      }

      if (
        (operation === "*" || operation === "/") &&
        (lastToken === "+" || lastToken === "-")
      ) {
        this.openMulDivFromAccumulatedPreview(operation);
        return;
      }

      if (typeof lastToken === "string") {
        this.state.expressionTokens[this.state.expressionTokens.length - 1] = operation;
        this.state.pendingOperation = operation;
        return;
      }
    }

    if (this.shouldContinueFromAccumulatorValue(operation)) {
      this.continueFromAccumulatorValue(operation, rawCurrent);
      return;
    }

    const operand = this.normalizeOperandForCurrentDisplay(rawCurrent, operation);
    const previousOperator = this.state.expressionTokens[this.state.expressionTokens.length - 1];
    const shouldSuppressAdditivePercentLine =
      (previousOperator === "+" || previousOperator === "-") &&
      this.state.lastPercentInput !== null;

    if (previousOperator === "*" || previousOperator === "/") {
      if (operation === "*" || operation === "/") {
        this.printOperationToTape(`${formatForTape(operand)} ${symbolFor(operation)}`);
      } else if (!this.printClosedMulDivSegment(
        this.state.expressionTokens,
        operand,
        previousOperator,
        operation
      )) {
        return;
      }
    } else if (!shouldSuppressAdditivePercentLine) {
      if (operation === "+" || operation === "-") {
        if (this.state.expressionTokens.length === 0) {
          this.printAdditiveBaseToTape(operand);
        } else {
          this.printOperationToTape(this.formatAdditiveTapeLine(operand, operation));
        }
      } else {
        this.printOperationToTape(`${formatForTape(operand)} ${symbolFor(operation)}`);
      }
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

    const shouldKeepCurrentOperandVisible =
      (operation === "*" || operation === "/") &&
      previousOperator !== "*" &&
      previousOperator !== "/";

    if (shouldKeepCurrentOperandVisible) {
      this.state.displayValue = formatForDisplay(operand);
      this.state.totalMemory = operand;
      this.state.firstOperand = operand;
    } else {
      const preview = this.evaluateExpressionSafely(
        this.state.expressionTokens.slice(0, -1)
      );
      if (preview !== null) {
        this.state.displayValue = formatForDisplay(preview);
        this.state.totalMemory = preview;
        this.state.firstOperand = preview;
      }
    }

    this.state.pendingOperation = operation;
    this.state.waitingForNewEntry = true;
    this.state.lastPercentInput = null;
    this.state.pendingBusiness = null;
    this.state.businessBase = null;
    this.state.businessCost = null;
    this.state.businessSell = null;
    this.state.businessMargin = null;
    this.state.accumulatorContext = "entry";
  }

  private shouldOpenAccumulatorContinuation(operation: Operation): boolean {
    const base = this.state.expressionTokens[0];
    const current = this.parseDisplayValue();

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

  private openAccumulatorContinuation(operation: Operation): void {
    const base = this.state.expressionTokens[0];
    if (typeof base !== "number") {
      return;
    }

    this.printAdditiveBaseToTape(base);
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

    this.state.waitingForNewEntry = true;
    this.state.lastPercentInput = null;
    this.state.pendingBusiness = null;
    this.state.businessBase = null;
    this.state.businessCost = null;
    this.state.businessSell = null;
    this.state.businessMargin = null;
    this.state.accumulatorContext = "entry";
  }

  private shouldContinueFromAccumulatorValue(operation: Operation): boolean {
    return (
      (operation === "+" || operation === "-") &&
      !this.state.waitingForNewEntry &&
      this.state.expressionTokens.length === 1 &&
      typeof this.state.expressionTokens[0] === "number"
    );
  }

  private continueFromAccumulatorValue(operation: Operation, rawCurrent: number): void {
    if (operation !== "+" && operation !== "-") {
      return;
    }

    const base = this.state.expressionTokens[0];
    if (typeof base !== "number") {
      return;
    }

    const operand = this.normalizeOperandForCurrentDisplay(rawCurrent, operation);
    this.printOperationToTape(this.formatAdditiveTapeLine(operand, operation));

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

  private openMulDivFromAccumulatedPreview(operation: "*" | "/"): void {
    const base = this.resolveRunningTotal();
    this.printOperationToTape(`${formatForTape(base)} ${symbolFor(operation)}`);
    this.state.expressionTokens = [base, operation];
    this.state.pendingOperation = operation;
    this.state.firstOperand = base;
    this.state.lastOperator = operation;
    this.state.lastOperand = base;
    this.state.displayValue = formatForDisplay(base);
    this.state.totalMemory = base;
    this.state.waitingForNewEntry = true;
    this.state.lastPercentInput = null;
    this.state.pendingBusiness = null;
    this.state.businessBase = null;
    this.state.businessCost = null;
    this.state.businessSell = null;
    this.state.businessMargin = null;
    this.state.accumulatorContext = "entry";
  }

  private materializeOpenExpressionForTape(): void {
    const lastToken = this.state.expressionTokens[this.state.expressionTokens.length - 1];
    if (typeof lastToken !== "string" || this.state.waitingForNewEntry) {
      return;
    }

    const current = this.parseDisplayValue();
    if (current === null) {
      return;
    }

    const operand = this.normalizeOperandForCurrentDisplay(current, lastToken);
    if (lastToken === "*" || lastToken === "/") {
      const postingOperation = this.resolveMulDivPostingOperation(this.state.expressionTokens);
      if (!this.printClosedMulDivSegment(
        this.state.expressionTokens,
        operand,
        lastToken,
        postingOperation
      )) {
        return;
      }
    } else if (this.state.lastPercentInput === null) {
      this.printOperationToTape(this.formatAdditiveTapeLine(operand, lastToken));
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

    const current = this.parseDisplayValue();
    if (current !== null) {
      return current;
    }

    return this.state.totalMemory;
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

  private printToTape(text: string, allowBlockHeader = true): void {
    if (!canPrintToTape(this.state)) {
      return;
    }

    if (allowBlockHeader) {
      this.ensureTapeBlockHeader();
    }

    this.appendRawTapeLine(text);
  }

  private appendRawTapeLine(text: string): void {
    if (!canPrintToTape(this.state)) {
      return;
    }

    this.state.paperTape = appendTapeLine(this.state.paperTape, text);
  }

  private printOperationToTape(text: string): void {
    this.state.tapeOperationSequence += 1;
    this.printToTape(text);
  }

  private printClosedMulDivSegment(
    expression: ExpressionToken[],
    operand: number,
    operation: Operation,
    postingOperation: "+" | "-" | null
  ): boolean {
    const leftOperand = this.resolveMulDivLeftOperandSafely(expression);
    if (leftOperand === null) {
      return false;
    }

    const mulDivResult = this.executeOperationSafely(leftOperand, operand, operation);
    if (mulDivResult === null) {
      return false;
    }

    this.printOperationToTape(`${formatForTape(operand)} =`);
    if (postingOperation) {
      this.printOperationToTape(`${formatForTape(mulDivResult)} ${postingOperation}`);
    } else {
      this.printOperationToTape(`${formatForTape(mulDivResult)}`);
    }

    return true;
  }

  private repeatAdditiveOperation(operation: "+" | "-", operand: number): void {
    this.printOperationToTape(this.formatAdditiveTapeLine(operand, operation));
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
  }

  private printAccumulatorSummary(
    title: "Sub Total" | "Total" | "GrandTotal",
    itemCount: number,
    value: number,
    marker: "◇" | "*" | "G*"
  ): void {
    this.state.tapeSubtotalSequence += 1;
    this.printToTape("----------------");
    this.printToTape(`ItemNo.: ${itemCount.toString().padStart(3, "0")}`);
    this.printToTape(`${title}:`);
    this.printToTape(`${formatForTape(value)} ${marker}`);
  }

  private ensureTapeBlockHeader(): void {
    if (!this.state.needsTapeBlockHeader) {
      return;
    }

    this.appendRawTapeLine(formatTapeBlockTimestamp(this.now()));
    this.appendRawTapeLine("----------------");
    this.state.needsTapeBlockHeader = false;
  }

  private resolveMulDivPostingOperation(
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

  private formatBusinessValueForDisplay(
    key: Exclude<BusinessMode, null>,
    value: number
  ): string {
    const formatted = formatForDisplay(value);
    return key === "MGN" ? `${formatted}%` : formatted;
  }

  private formatBusinessValueForTape(
    key: Exclude<BusinessMode, null>,
    value: number
  ): string {
    const formatted = formatForTape(value);
    return key === "MGN" ? `${formatted}%` : formatted;
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

  private printAdditiveBaseToTape(value: number): void {
    if (this.state.suppressNextAccumulatorBasePrint) {
      this.state.suppressNextAccumulatorBasePrint = false;
      return;
    }

    this.printOperationToTape(formatForTape(value));
  }

  private formatAdditiveTapeLine(
    operand: number,
    operation: "+" | "-"
  ): string {
    const effectiveOperation = operand < 0
      ? operation === "+" ? "-" : "+"
      : operation;
    const magnitude = operand < 0 ? Math.abs(operand) : operand;

    return `${formatForTape(magnitude)} ${symbolFor(effectiveOperation)}`;
  }

  private formatPercentInputForTape(
    value: number,
    normalizeForAdditiveFlow: boolean
  ): number {
    return normalizeForAdditiveFlow ? Math.abs(value) : value;
  }

  private resetAccumulatorBaseSuppression(): void {
    this.state.suppressNextAccumulatorBasePrint = false;
  }
}
