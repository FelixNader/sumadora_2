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
  createErrorState,
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
import { TapeProjector } from "./engines/tapeProjector";
import { EntryStateMachine } from "./engines/entryStateMachine";
import { MulDivEngine } from "./engines/mulDivEngine";
import { AccumulatorEngine } from "./engines/accumulatorEngine";
import { CalculatorSession, createCalculatorSession, createCalculatorStateFacade } from "./session";

export type {
  BusinessMode,
  CalculatorSnapshot,
  CalculatorState,
  DecimalMode,
  ExpressionToken,
  Operation,
} from "./types";

export class Calculator {
  private state: CalculatorState;
  private session: CalculatorSession;
  private readonly now: () => Date;
  private tapeProjector: TapeProjector;
  private entryStateMachine: EntryStateMachine;
  private mulDivEngine: MulDivEngine;
  private accumulatorEngine: AccumulatorEngine;

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
    this.session = createCalculatorSession(createInitialCalculatorState());
    this.state = createCalculatorStateFacade(this.session);
    this.tapeProjector = this.createTapeProjector();
    this.entryStateMachine = this.createEntryStateMachine();
    this.mulDivEngine = this.createMulDivEngine();
    this.accumulatorEngine = this.createAccumulatorEngine();
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

    this.session = createCalculatorSession(sanitizeSnapshot(snapshot));
    this.state = createCalculatorStateFacade(this.session);
    this.rebuildEngines();
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
    this.entryStateMachine.inputDigit(digit);
  }

  inputDecimal(): void {
    if (!this.canOperate() || this.state.error) {
      return;
    }
    this.entryStateMachine.inputDecimal();
  }

  toggleSign(): void {
    if (!this.canOperate() || this.state.error || this.state.displayValue === "0") {
      return;
    }
    this.entryStateMachine.toggleSign();
  }

  clearEntry(): void {
    this.entryStateMachine.clearEntry();
  }

  clearAll(): void {
    this.entryStateMachine.clearAll();
  }

  resetAll(): void {
    this.entryStateMachine.resetAll();
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
      this.setContinuationSource("resolved-result", result);
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
      this.setContinuationSource("resolved-result", result);
    }
  }

  total(): void {
    if (!this.canOperate() || this.state.error) {
      return;
    }

    this.resetAccumulatorBaseSuppression();
    this.accumulatorEngine.total();
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
    this.setContinuationSource("resolved-result", this.state.independentMemory);
    this.printToTape(`${formatForTape(this.state.independentMemory)} M◇`);
  }

  memoryClear(): void {
    this.resetAccumulatorBaseSuppression();
    this.state.displayValue = formatForDisplay(this.state.independentMemory);
    this.state.waitingForNewEntry = true;
    this.state.accumulatorContext = "result";
    this.setContinuationSource("resolved-result", this.state.independentMemory);
    this.printToTape(`${formatForTape(this.state.independentMemory)} M*`);
    this.state.independentMemory = 0;
  }

  grandTotalRecall(): void {
    if (!this.canOperate() || this.state.error) {
      return;
    }

    this.resetAccumulatorBaseSuppression();
    this.accumulatorEngine.grandTotalRecall();
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
    this.setContinuationSource("none", null);
  }

  subtotal(): void {
    if (!this.canOperate() || this.state.error) {
      return;
    }

    this.resetAccumulatorBaseSuppression();
    this.accumulatorEngine.subtotal();
  }

  printOperationAverage(): void {
    this.resetAccumulatorBaseSuppression();
    this.accumulatorEngine.printOperationAverage();
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
    this.setContinuationSource(
      pendingOperation === null ? "resolved-result" : "none",
      pendingOperation === null ? result : null
    );
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
    this.setContinuationSource("resolved-result", computation.result);
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
    this.setContinuationSource("resolved-result", computation.result);
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
    this.setContinuationSource("resolved-result", result);
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
    this.setContinuationSource("resolved-result", result);
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
    this.setContinuationSource("resolved-result", solution.result);
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

    if (this.mulDivEngine.shouldOpenAccumulatorContinuation(operation)) {
      this.mulDivEngine.openAccumulatorContinuation(operation);
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
        this.mulDivEngine.openMulDivFromAccumulatedPreview(operation);
        return;
      }

      if (this.mulDivEngine.shouldOpenMulDivFromResolvedValue(operation)) {
        this.mulDivEngine.openMulDivFromResolvedValue(operation);
        return;
      }

      if (typeof lastToken === "string") {
        this.state.expressionTokens[this.state.expressionTokens.length - 1] = operation;
        this.state.pendingOperation = operation;
        return;
      }
    }

    if (this.mulDivEngine.shouldContinueFromAccumulatorValue(operation)) {
      this.mulDivEngine.continueFromAccumulatorValue(operation, rawCurrent);
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
    this.setContinuationSource("none", null);
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
    return this.accumulatorEngine.resolveRunningTotal();
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
    this.tapeProjector.printToTape(text, allowBlockHeader);
  }

  private appendRawTapeLine(text: string): void {
    this.tapeProjector.appendRawTapeLine(text);
  }

  private printOperationToTape(text: string): void {
    this.tapeProjector.printOperationToTape(text);
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
    this.tapeProjector.printAccumulatorSummary(title, itemCount, value, marker);
  }

  private resolveMulDivPostingOperation(
    tokens: ExpressionToken[]
  ): "+" | "-" | null {
    return this.mulDivEngine.resolveMulDivPostingOperation(tokens);
  }

  private formatBusinessValueForDisplay(
    key: Exclude<BusinessMode, null>,
    value: number
  ): string {
    return this.tapeProjector.formatBusinessValueForDisplay(key, value);
  }

  private formatBusinessValueForTape(
    key: Exclude<BusinessMode, null>,
    value: number
  ): string {
    return this.tapeProjector.formatBusinessValueForTape(key, value);
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
    this.tapeProjector.printAdditiveBaseToTape(value);
  }

  private formatAdditiveTapeLine(
    operand: number,
    operation: "+" | "-"
  ): string {
    return this.tapeProjector.formatAdditiveTapeLine(operand, operation);
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

  private setContinuationSource(
    origin: CalculatorState["continuationSource"]["origin"],
    value: number | null
  ): void {
    this.state.continuationSource = { origin, value };
  }

  private createTapeProjector(): TapeProjector {
    return new TapeProjector(this.state, this.now);
  }

  private createEntryStateMachine(): EntryStateMachine {
    return new EntryStateMachine(this.state, {
      printToTape: (text, allowBlockHeader) =>
        this.tapeProjector.printToTape(text, allowBlockHeader),
      resetAccumulatorBaseSuppression: () => this.resetAccumulatorBaseSuppression(),
      setError: () => this.setError(),
    });
  }

  private createMulDivEngine(): MulDivEngine {
    return new MulDivEngine(this.state, {
      evaluateExpressionSafely: (tokens) => this.evaluateExpressionSafely(tokens),
      normalizeOperandForCurrentDisplay: (value, operation) =>
        this.normalizeOperandForCurrentDisplay(value, operation),
      parseDisplayValue: () => this.parseDisplayValue(),
      printAdditiveBaseToTape: (value) => this.printAdditiveBaseToTape(value),
      printOperationToTape: (text) => this.printOperationToTape(text),
      resolveRunningTotal: () => this.resolveRunningTotal(),
      formatAdditiveTapeLine: (operand, operation) =>
        this.formatAdditiveTapeLine(operand, operation),
      formatOperatorSymbol: (operation) => this.tapeProjector.formatOperatorSymbol(operation),
    });
  }

  private createAccumulatorEngine(): AccumulatorEngine {
    return new AccumulatorEngine(this.state, {
      evaluateExpressionSafely: (tokens) => this.evaluateExpressionSafely(tokens),
      executeOperationSafely: (first, second, operation) =>
        this.executeOperationSafely(first, second, operation),
      normalizeOperandForCurrentDisplay: (value, operation) =>
        this.normalizeOperandForCurrentDisplay(value, operation),
      parseDisplayValue: () => this.parseDisplayValue(),
      printAccumulatorSummary: (title, itemCount, value, marker) =>
        this.printAccumulatorSummary(title, itemCount, value, marker),
      printClosedMulDivSegment: (expression, operand, operation, postingOperation) =>
        this.printClosedMulDivSegment(expression, operand, operation, postingOperation),
      printOperationToTape: (text) => this.printToTape(text),
      formatAdditiveTapeLine: (operand, operation) =>
        this.formatAdditiveTapeLine(operand, operation),
      resolveMulDivPostingOperation: (tokens) =>
        this.resolveMulDivPostingOperation(tokens),
      roundForCurrentMode: (value, operation) =>
        this.roundForCurrentMode(value, operation),
    });
  }

  private rebuildEngines(): void {
    this.tapeProjector = this.createTapeProjector();
    this.entryStateMachine = this.createEntryStateMachine();
    this.mulDivEngine = this.createMulDivEngine();
    this.accumulatorEngine = this.createAccumulatorEngine();
  }
}
