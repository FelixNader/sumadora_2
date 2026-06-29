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
  createInitialCalculatorState,
  sanitizeSnapshot,
} from "./state";
import { solveBusinessValues } from "./services/businessMath";
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
    if (mode === "OFF") {
      this.state.displayValue = "0";
    }
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

    this.state.displayValue = this.state.displayValue.startsWith("-")
      ? this.state.displayValue.slice(1)
      : `-${this.state.displayValue}`;
  }

  clearEntry(): void {
    this.state.displayValue = "0";
    this.state.error = null;
  }

  clearAll(): void {
    this.state.displayValue = "0";
    this.state.error = null;
    this.state.pendingOperation = null;
    this.state.firstOperand = null;
    this.state.lastOperand = null;
    this.state.lastOperator = null;
    this.state.waitingForNewEntry = false;
    this.state.pendingBusiness = null;
    this.state.businessBase = null;
    this.state.businessCost = null;
    this.state.businessSell = null;
    this.state.businessMargin = null;
    this.state.expressionTokens = [];
    this.state.resetItemCountOnNextOp = false;
    this.state.totalMemory = 0;
    this.state.grandTotal = 0;
    this.state.itemCount = 0;
    this.printToTape("[AC]");
  }

  resetAll(): void {
    this.clearAll();
    this.state.independentMemory = 0;
    this.state.grandTotal = 0;
    this.state.referenceNumber = 0;
    this.state.conversionRate = 1;
    this.state.taxRate = 16;
    this.state.paperTape = [];
  }

  add(): void {
    this.performOperation("+");
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
        const secondOperand = this.state.waitingForNewEntry
          ? this.state.lastOperand ?? this.normalizeOperandForCurrentDisplay(current, lastToken)
          : this.normalizeOperandForCurrentDisplay(current, lastToken);

        if (lastToken === "*" || lastToken === "/") {
          const leftOperand = this.resolveMulDivLeftOperand(expression);
          const mulDivResult = this.executeOperation(leftOperand, secondOperand, lastToken);
          if (mulDivResult === null) {
            return;
          }
          this.printToTape(
            `${formatForTape(leftOperand)} ${symbolFor(lastToken)} ${formatForTape(secondOperand)} = ${formatForTape(mulDivResult)}`
          );
        } else {
          this.printToTape(`${formatForTape(secondOperand)} ${symbolFor(lastToken)}`);
        }

        expression.push(secondOperand);
        this.state.lastOperator = lastToken;
        this.state.lastOperand = secondOperand;
      }

      const result = this.evaluateExpression(expression);
      if (result === null) {
        return;
      }

      if (this.state.mode === "ITEM") {
        const itemOps = expression.filter((token) => token === "+" || token === "-").length;
        if (itemOps > 0) {
          if (this.state.resetItemCountOnNextOp) {
            this.state.itemCount = 0;
            this.state.resetItemCountOnNextOp = false;
          }
          this.state.itemCount += itemOps;
        }
      }

      this.state.displayValue = formatForDisplay(result);
      this.state.totalMemory = result;
      this.state.firstOperand = result;
      this.state.pendingOperation = null;
      this.state.expressionTokens = [result];
      this.state.waitingForNewEntry = true;
      return;
    }

    if (this.state.lastOperator && this.state.lastOperand !== null) {
      const result = this.executeOperation(current, this.state.lastOperand, this.state.lastOperator);
      if (result === null) {
        return;
      }

      if (this.state.lastOperator === "+" || this.state.lastOperator === "-") {
        this.printToTape(
          `${formatForTape(this.state.lastOperand)} ${symbolFor(this.state.lastOperator)}`
        );
      } else {
        this.printToTape(
          `${formatForTape(current)} ${symbolFor(this.state.lastOperator)} ${formatForTape(this.state.lastOperand)} = ${formatForTape(result)}`
        );
      }
      this.finalizeResult(result, this.state.lastOperator, this.state.lastOperand, false);
      this.state.firstOperand = result;
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
    this.printToTape(`GRAND TOTAL ${formatForTape(this.state.grandTotal)}`);
  }

  printReference(): void {
    this.state.referenceNumber += 1;
    this.printToTape(`REF# ${this.state.referenceNumber.toString().padStart(4, "0")}`, true);
  }

  printItemTotal(): void {
    if (this.state.mode !== "ITEM") {
      return;
    }
    this.printToTape(`ITEMS ${this.state.itemCount} TOTAL ${formatForTape(this.state.totalMemory)}`);
    this.state.displayValue = formatForDisplay(this.state.totalMemory);
    this.state.waitingForNewEntry = true;
    this.state.resetItemCountOnNextOp = true;
  }

  subtotal(): void {
    const subtotalValue = this.resolveRunningTotal();
    this.printToTape(`SUBTOTAL ${formatForTape(subtotalValue)}`);
    this.state.grandTotal = this.roundForCurrentMode(this.state.grandTotal + subtotalValue, "+");

    this.state.displayValue = "0";
    this.state.waitingForNewEntry = true;
    this.state.pendingOperation = null;
    this.state.firstOperand = null;
    this.state.lastOperator = null;
    this.state.lastOperand = null;
    this.state.expressionTokens = [];
    this.state.totalMemory = 0;

    if (this.state.mode === "ITEM") {
      this.state.itemCount = 0;
      this.state.resetItemCountOnNextOp = false;
    }
  }

  printItemAverage(): void {
    if (this.state.mode !== "ITEM") {
      return;
    }
    const average = this.state.itemCount > 0
      ? this.state.totalMemory / this.state.itemCount
      : 0;
    this.printToTape(`AVG ${formatForTape(average)}`);
    this.state.displayValue = formatForDisplay(average);
    this.state.waitingForNewEntry = true;
  }

  addSpecifiedItemCount(): void {
    if (this.state.mode !== "ITEM") {
      return;
    }
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    const integerPart = Math.trunc(Math.abs(value));
    const addValue = integerPart % 1000;
    this.state.itemCount += addValue;
    this.printToTape(`ITEM +${addValue} => ${this.state.itemCount}`);
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

    let result = current / 100;
    if (this.state.firstOperand !== null) {
      result = (this.state.firstOperand * current) / 100;
    }

    result = this.roundForCurrentMode(result, this.state.pendingOperation ?? "+");
    if (isOverflow(result)) {
      this.setError();
      return;
    }

    this.state.displayValue = formatForDisplay(result);
    this.state.waitingForNewEntry = true;
    this.printToTape(`% ${formatForTape(result)}`);
    this.state.totalMemory = result;
  }

  setTaxRate(): void {
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    this.state.taxRate = value;
    this.state.waitingForNewEntry = true;
    this.printToTape(`TAX RATE ${formatForTape(value)}%`);
  }

  addTax(): void {
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    const taxAmount = this.roundForCurrentMode(value * (this.state.taxRate / 100), "+");
    const result = this.roundForCurrentMode(value * (1 + this.state.taxRate / 100), "+");
    if (isOverflow(result)) {
      this.setError();
      return;
    }
    this.state.displayValue = formatForDisplay(result);
    this.state.waitingForNewEntry = true;
    this.state.totalMemory = result;
    this.printToTape(`TAX+`);
    this.printToTape(`BASE  ${formatForTape(value)}`);
    this.printToTape(`TAX ${formatForDisplay(this.state.taxRate)}% ${formatForTape(taxAmount)}`);
    this.printToTape(`TOTAL ${formatForTape(result)}`);
  }

  subtractTax(): void {
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    const baseValue = this.roundForCurrentMode(value / (1 + this.state.taxRate / 100), "-");
    const taxAmount = this.roundForCurrentMode(value - baseValue, "-");
    const result = baseValue;
    if (isOverflow(result)) {
      this.setError();
      return;
    }
    this.state.displayValue = formatForDisplay(result);
    this.state.waitingForNewEntry = true;
    this.state.totalMemory = result;
    this.printToTape(`TAX-`);
    this.printToTape(`TOTAL ${formatForTape(value)}`);
    this.printToTape(`BASE  ${formatForTape(baseValue)}`);
    this.printToTape(`TAX ${formatForDisplay(this.state.taxRate)}% ${formatForTape(taxAmount)}`);
  }

  setConversionRate(): void {
    if (!this.canConvertCurrency()) {
      return;
    }
    const rate = this.parseDisplayValue();
    if (rate === null || rate === 0) {
      this.setError();
      return;
    }
    this.state.conversionRate = rate;
    this.state.waitingForNewEntry = true;
    this.printToTape(`RATE ${formatForTape(rate)}`);
  }

  convertDomesticToForeign(): void {
    if (!this.canConvertCurrency()) {
      return;
    }
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    const result = this.roundForCurrentMode(value / this.state.conversionRate, "/");
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
    const result = this.roundForCurrentMode(value * this.state.conversionRate, "*");
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

    const operand = this.normalizeOperandForCurrentDisplay(rawCurrent, operation);
    const previousOperator = this.state.expressionTokens[this.state.expressionTokens.length - 1];

    if (previousOperator === "*" || previousOperator === "/") {
      const leftOperand = this.resolveMulDivLeftOperand(this.state.expressionTokens);
      const mulDivResult = this.executeOperation(leftOperand, operand, previousOperator);
      if (mulDivResult === null) {
        return;
      }
      this.printToTape(
        `${formatForTape(leftOperand)} ${symbolFor(previousOperator)} ${formatForTape(operand)} = ${formatForTape(mulDivResult)}`
      );
    } else {
      this.printToTape(`${formatForTape(operand)} ${symbolFor(operation)}`);
    }

    this.state.expressionTokens.push(operand);
    this.state.expressionTokens.push(operation);
    this.state.lastOperator = operation;
    this.state.lastOperand = operand;

    const preview = this.evaluateExpression(this.state.expressionTokens.slice(0, -1));
    if (preview !== null) {
      this.state.displayValue = formatForDisplay(preview);
      this.state.totalMemory = preview;
      this.state.firstOperand = preview;
    }

    this.state.pendingOperation = operation;
    this.state.waitingForNewEntry = true;
    this.state.pendingBusiness = null;
    this.state.businessBase = null;
    this.state.businessCost = null;
    this.state.businessSell = null;
    this.state.businessMargin = null;
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

    if (this.state.mode === "ITEM" && (operation === "+" || operation === "-")) {
      if (this.state.resetItemCountOnNextOp) {
        this.state.itemCount = 1;
        this.state.resetItemCountOnNextOp = false;
      } else {
        this.state.itemCount += 1;
      }
    }

    if (accumulateGrandTotal) {
      this.state.grandTotal = this.roundForCurrentMode(this.state.grandTotal + result, "+");
    }
  }

  private executeOperation(first: number, second: number, operation: Operation): number | null {
    if (operation === "/" && second === 0) {
      this.setError();
      return null;
    }

    let rawResult = second;
    if (operation === "+") {
      rawResult = first + second;
    } else if (operation === "-") {
      rawResult = first - second;
    } else if (operation === "*") {
      rawResult = first * second;
    } else if (operation === "/") {
      rawResult = first / second;
    }

    const result = this.roundForCurrentMode(rawResult, operation);
    if (!Number.isFinite(result) || isOverflow(result)) {
      this.setError();
      return null;
    }
    return result;
  }

  private canOperate(): boolean {
    return this.state.mode !== "OFF";
  }

  private canIndependentMemory(): boolean {
    return this.canOperate() && this.state.mode !== "CONVERSION";
  }

  private canConvertCurrency(): boolean {
    return this.canOperate() && this.state.mode === "CONVERSION";
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

      const resolved = this.evaluateExpression(tokens);
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
      const computed = this.executeOperation(this.state.firstOperand, secondOperand, this.state.pendingOperation);
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

  private resolveMulDivLeftOperand(expressionWithTrailingOperator: ExpressionToken[]): number {
    const tokens = [...expressionWithTrailingOperator];
    if (tokens.length > 0 && typeof tokens[tokens.length - 1] === "string") {
      tokens.pop();
    }

    let segmentStart = 0;
    for (let i = tokens.length - 1; i >= 0; i -= 1) {
      const token = tokens[i];
      if (token === "+" || token === "-") {
        segmentStart = i + 1;
        break;
      }
    }

    const segment = tokens.slice(segmentStart);
    const evaluated = this.evaluateExpression(segment);
    if (evaluated === null) {
      return 0;
    }
    return evaluated;
  }

  private evaluateExpression(tokens: ExpressionToken[]): number | null {
    if (tokens.length === 0) {
      return 0;
    }

    const noMulDiv: ExpressionToken[] = [];
    let index = 0;

    while (index < tokens.length) {
      const token = tokens[index];
      if (typeof token !== "number") {
        this.setError();
        return null;
      }

      if (index + 1 < tokens.length && (tokens[index + 1] === "*" || tokens[index + 1] === "/")) {
        let current = token;
        let cursor = index;
        while (cursor + 1 < tokens.length && (tokens[cursor + 1] === "*" || tokens[cursor + 1] === "/")) {
          const operator = tokens[cursor + 1] as Operation;
          const nextToken = tokens[cursor + 2];
          if (typeof nextToken !== "number") {
            this.setError();
            return null;
          }
          const result = this.executeOperation(current, nextToken, operator);
          if (result === null) {
            return null;
          }
          current = result;
          cursor += 2;
        }
        noMulDiv.push(current);
        if (cursor + 1 < tokens.length) {
          noMulDiv.push(tokens[cursor + 1] as Operation);
        }
        index = cursor + 2;
      } else {
        noMulDiv.push(token);
        if (index + 1 < tokens.length) {
          noMulDiv.push(tokens[index + 1] as Operation);
        }
        index += 2;
      }
    }

    let result = noMulDiv[0] as number;
    for (let i = 1; i < noMulDiv.length; i += 2) {
      const operator = noMulDiv[i] as Operation;
      const next = noMulDiv[i + 1] as number;
      if (operator !== "+" && operator !== "-") {
        continue;
      }
      const partial = this.executeOperation(result, next, operator);
      if (partial === null) {
        return null;
      }
      result = partial;
    }

    return result;
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

  private printToTape(text: string, forceOn = false): void {
    if (!canPrintToTape(this.state, forceOn)) {
      return;
    }

    this.state.paperTape = appendTapeLine(this.state.paperTape, text);
  }

  private setError(): void {
    this.state.error = "E";
    this.state.displayValue = "E";
    this.state.pendingOperation = null;
    this.state.firstOperand = null;
    this.state.waitingForNewEntry = false;
    this.state.pendingBusiness = null;
    this.state.businessBase = null;
    this.state.businessCost = null;
    this.state.businessSell = null;
    this.state.businessMargin = null;
    this.state.expressionTokens = [];
  }

  private roundForCurrentMode(
    value: number,
    operation: Operation | "+" | "-"
  ): number {
    return roundByMode(this.state.decimalMode, value, operation);
  }
}
