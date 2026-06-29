export type Mode = "OFF" | "ON" | "PRINT" | "ITEM" | "CONVERSION";
export type DecimalMode = "F" | "3" | "2" | "0" | "ADD2";
type Operation = "+" | "-" | "*" | "/";
type BusinessMode = "COST" | "SELL" | "MGN" | null;

export interface CalculatorState {
  mode: Mode;
  decimalMode: DecimalMode;
  displayValue: string;
  totalMemory: number;
  grandTotal: number;
  independentMemory: number;
  itemCount: number;
  referenceNumber: number;
  conversionRate: number;
  taxRate: number;
  paperTape: string[];
  error: string | null;
  pendingOperation: Operation | null;
  firstOperand: number | null;
  lastOperand: number | null;
  lastOperator: Operation | null;
  waitingForNewEntry: boolean;
  pendingBusiness: BusinessMode;
  businessBase: number | null;
  businessCost: number | null;
  businessSell: number | null;
  businessMargin: number | null;
  expressionTokens: Array<number | Operation>;
  resetItemCountOnNextOp: boolean;
}

export interface CalculatorSnapshot {
  version: 1;
  state: CalculatorState;
}

const MAX_INT_DIGITS = 12;
const MAX_TAPE_LINES = 800;

export class Calculator {
  private state: CalculatorState;

  constructor() {
    this.state = {
      mode: "PRINT",
      decimalMode: "F",
      displayValue: "0",
      totalMemory: 0,
      grandTotal: 0,
      independentMemory: 0,
      itemCount: 0,
      referenceNumber: 0,
      conversionRate: 1,
      taxRate: 16,
      paperTape: [],
      error: null,
      pendingOperation: null,
      firstOperand: null,
      lastOperand: null,
      lastOperator: null,
      waitingForNewEntry: false,
      pendingBusiness: null,
      businessBase: null,
      businessCost: null,
      businessSell: null,
      businessMargin: null,
      expressionTokens: [],
      resetItemCountOnNextOp: false,
    };
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

    this.state = {
      ...snapshot.state,
      paperTape: Array.isArray(snapshot.state.paperTape)
        ? [...snapshot.state.paperTape].slice(-MAX_TAPE_LINES)
        : [],
      businessCost:
        typeof snapshot.state.businessCost === "number"
          ? snapshot.state.businessCost
          : null,
      businessSell:
        typeof snapshot.state.businessSell === "number"
          ? snapshot.state.businessSell
          : null,
      businessMargin:
        typeof snapshot.state.businessMargin === "number"
          ? snapshot.state.businessMargin
          : null,
      expressionTokens: Array.isArray(snapshot.state.expressionTokens)
        ? snapshot.state.expressionTokens.filter((token) =>
          typeof token === "number" || token === "+" || token === "-" || token === "*" || token === "/"
        )
        : [],
      resetItemCountOnNextOp:
        typeof snapshot.state.resetItemCountOnNextOp === "boolean"
          ? snapshot.state.resetItemCountOnNextOp
          : false,
    };
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
      if (this.checkDigitLimit(next)) {
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
          ? this.state.lastOperand ?? this.normalizeOperandForOperation(current, lastToken)
          : this.normalizeOperandForOperation(current, lastToken);

        if (lastToken === "*" || lastToken === "/") {
          const leftOperand = this.resolveMulDivLeftOperand(expression);
          const mulDivResult = this.executeOperation(leftOperand, secondOperand, lastToken);
          if (mulDivResult === null) {
            return;
          }
          this.printToTape(
            `${this.formatForTape(leftOperand)} ${this.symbolFor(lastToken)} ${this.formatForTape(secondOperand)} = ${this.formatForTape(mulDivResult)}`
          );
        } else {
          this.printToTape(`${this.formatForTape(secondOperand)} ${this.symbolFor(lastToken)}`);
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

      this.state.displayValue = this.formatForDisplay(result);
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
          `${this.formatForTape(this.state.lastOperand)} ${this.symbolFor(this.state.lastOperator)}`
        );
      } else {
        this.printToTape(
          `${this.formatForTape(current)} ${this.symbolFor(this.state.lastOperator)} ${this.formatForTape(this.state.lastOperand)} = ${this.formatForTape(result)}`
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
    this.state.independentMemory = this.roundByMode(this.state.independentMemory + value, "+");
    this.printToTape(`M+ ${this.formatForTape(value)} => ${this.formatForTape(this.state.independentMemory)}`);
  }

  memorySubtract(): void {
    if (!this.canIndependentMemory()) {
      return;
    }
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    this.state.independentMemory = this.roundByMode(this.state.independentMemory - value, "-");
    this.printToTape(`M- ${this.formatForTape(value)} => ${this.formatForTape(this.state.independentMemory)}`);
  }

  memoryRecall(): void {
    if (!this.canIndependentMemory()) {
      return;
    }
    this.state.displayValue = this.formatForDisplay(this.state.independentMemory);
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
    this.state.displayValue = this.formatForDisplay(this.state.grandTotal);
    this.state.waitingForNewEntry = true;
    this.printToTape(`GRAND TOTAL ${this.formatForTape(this.state.grandTotal)}`);
  }

  printReference(): void {
    this.state.referenceNumber += 1;
    this.printToTape(`REF# ${this.state.referenceNumber.toString().padStart(4, "0")}`, true);
  }

  printItemTotal(): void {
    if (this.state.mode !== "ITEM") {
      return;
    }
    this.printToTape(`ITEMS ${this.state.itemCount} TOTAL ${this.formatForTape(this.state.totalMemory)}`);
    this.state.displayValue = this.formatForDisplay(this.state.totalMemory);
    this.state.waitingForNewEntry = true;
    this.state.resetItemCountOnNextOp = true;
  }

  subtotal(): void {
    const subtotalValue = this.resolveRunningTotal();
    this.printToTape(`SUBTOTAL ${this.formatForTape(subtotalValue)}`);
    this.state.grandTotal = this.roundByMode(this.state.grandTotal + subtotalValue, "+");

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
    this.printToTape(`AVG ${this.formatForTape(average)}`);
    this.state.displayValue = this.formatForDisplay(average);
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

    result = this.roundByMode(result, this.state.pendingOperation ?? "+");
    if (this.checkOverflow(result)) {
      this.setError();
      return;
    }

    this.state.displayValue = this.formatForDisplay(result);
    this.state.waitingForNewEntry = true;
    this.printToTape(`% ${this.formatForTape(result)}`);
    this.state.totalMemory = result;
  }

  setTaxRate(): void {
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    this.state.taxRate = value;
    this.state.waitingForNewEntry = true;
    this.printToTape(`TAX RATE ${this.formatForTape(value)}%`);
  }

  addTax(): void {
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    const taxAmount = this.roundByMode(value * (this.state.taxRate / 100), "+");
    const result = this.roundByMode(value * (1 + this.state.taxRate / 100), "+");
    if (this.checkOverflow(result)) {
      this.setError();
      return;
    }
    this.state.displayValue = this.formatForDisplay(result);
    this.state.waitingForNewEntry = true;
    this.state.totalMemory = result;
    this.printToTape(`TAX+`);
    this.printToTape(`BASE  ${this.formatForTape(value)}`);
    this.printToTape(`TAX ${this.formatForDisplay(this.state.taxRate)}% ${this.formatForTape(taxAmount)}`);
    this.printToTape(`TOTAL ${this.formatForTape(result)}`);
  }

  subtractTax(): void {
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    const baseValue = this.roundByMode(value / (1 + this.state.taxRate / 100), "-");
    const taxAmount = this.roundByMode(value - baseValue, "-");
    const result = baseValue;
    if (this.checkOverflow(result)) {
      this.setError();
      return;
    }
    this.state.displayValue = this.formatForDisplay(result);
    this.state.waitingForNewEntry = true;
    this.state.totalMemory = result;
    this.printToTape(`TAX-`);
    this.printToTape(`TOTAL ${this.formatForTape(value)}`);
    this.printToTape(`BASE  ${this.formatForTape(baseValue)}`);
    this.printToTape(`TAX ${this.formatForDisplay(this.state.taxRate)}% ${this.formatForTape(taxAmount)}`);
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
    this.printToTape(`RATE ${this.formatForTape(rate)}`);
  }

  convertDomesticToForeign(): void {
    if (!this.canConvertCurrency()) {
      return;
    }
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    const result = this.roundByMode(value / this.state.conversionRate, "/");
    this.state.displayValue = this.formatForDisplay(result);
    this.state.waitingForNewEntry = true;
    this.printToTape(`${this.formatForTape(value)} -> ${this.formatForTape(result)} FC`);
  }

  convertForeignToDomestic(): void {
    if (!this.canConvertCurrency()) {
      return;
    }
    const value = this.parseDisplayValue();
    if (value === null) {
      return;
    }
    const result = this.roundByMode(value * this.state.conversionRate, "*");
    this.state.displayValue = this.formatForDisplay(result);
    this.state.waitingForNewEntry = true;
    this.printToTape(`${this.formatForTape(value)} FC -> ${this.formatForTape(result)} DC`);
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

    this.printToTape(`${fn} IN ${this.formatForTape(value)}`);

    const cost = this.state.businessCost;
    const sell = this.state.businessSell;
    const margin = this.state.businessMargin;

    let result: number | null = null;
    let solvedKey: "COST" | "SELL" | "MGN" | null = null;

    if (cost !== null && sell !== null) {
      if (sell === 0) {
        this.setError();
        return;
      }
      result = this.roundByMode(((sell - cost) / sell) * 100, "+");
      solvedKey = "MGN";
      this.state.businessMargin = result;
    } else if (cost !== null && margin !== null) {
      if (margin >= 100) {
        this.setError();
        return;
      }
      result = this.roundByMode(cost / (1 - margin / 100), "/");
      solvedKey = "SELL";
      this.state.businessSell = result;
    } else if (sell !== null && margin !== null) {
      if (margin >= 100) {
        this.setError();
        return;
      }
      result = this.roundByMode(sell * (1 - margin / 100), "-");
      solvedKey = "COST";
      this.state.businessCost = result;
    }

    this.state.waitingForNewEntry = true;

    if (result === null || solvedKey === null) {
      return;
    }

    if (!Number.isFinite(result) || this.checkOverflow(result)) {
      this.setError();
      return;
    }

    this.state.displayValue = this.formatForDisplay(result);
    this.state.totalMemory = result;
    this.printToTape(`${solvedKey} OUT ${this.formatForTape(result)}`);
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

    const operand = this.normalizeOperandForOperation(rawCurrent, operation);
    const previousOperator = this.state.expressionTokens[this.state.expressionTokens.length - 1];

    if (previousOperator === "*" || previousOperator === "/") {
      const leftOperand = this.resolveMulDivLeftOperand(this.state.expressionTokens);
      const mulDivResult = this.executeOperation(leftOperand, operand, previousOperator);
      if (mulDivResult === null) {
        return;
      }
      this.printToTape(
        `${this.formatForTape(leftOperand)} ${this.symbolFor(previousOperator)} ${this.formatForTape(operand)} = ${this.formatForTape(mulDivResult)}`
      );
    } else {
      this.printToTape(`${this.formatForTape(operand)} ${this.symbolFor(operation)}`);
    }

    this.state.expressionTokens.push(operand);
    this.state.expressionTokens.push(operation);
    this.state.lastOperator = operation;
    this.state.lastOperand = operand;

    const preview = this.evaluateExpression(this.state.expressionTokens.slice(0, -1));
    if (preview !== null) {
      this.state.displayValue = this.formatForDisplay(preview);
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
    this.state.displayValue = this.formatForDisplay(result);
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
      this.state.grandTotal = this.roundByMode(this.state.grandTotal + result, "+");
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

    const result = this.roundByMode(rawResult, operation);
    if (!Number.isFinite(result) || this.checkOverflow(result)) {
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
            tokens.push(this.normalizeOperandForOperation(current, lastToken));
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

      const secondOperand = this.normalizeOperandForOperation(current, this.state.pendingOperation);
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

  private resolveMulDivLeftOperand(expressionWithTrailingOperator: Array<number | Operation>): number {
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

  private evaluateExpression(tokens: Array<number | Operation>): number | null {
    if (tokens.length === 0) {
      return 0;
    }

    const noMulDiv: Array<number | Operation> = [];
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

  private normalizeOperandForOperation(value: number, operation: Operation): number {
    if (this.state.decimalMode === "ADD2" && (operation === "+" || operation === "-") && !this.state.displayValue.includes(".")) {
      return value / 100;
    }
    return value;
  }

  private roundByMode(value: number, operation: Operation | "+" | "-"): number {
    const placesByMode: Record<DecimalMode, number | null> = {
      F: null,
      "3": 3,
      "2": 2,
      "0": 0,
      ADD2: 2,
    };

    const decimals = placesByMode[this.state.decimalMode];
    if (decimals === null) {
      return value;
    }

    if (this.state.decimalMode === "ADD2" && operation !== "+" && operation !== "-") {
      return value;
    }

    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  private parseDisplayValue(): number | null {
    const parsed = parseFloat(this.state.displayValue);
    if (Number.isNaN(parsed)) {
      this.setError();
      return null;
    }
    return parsed;
  }

  private checkDigitLimit(value: string): boolean {
    return value.replace(/[-.]/g, "").length > MAX_INT_DIGITS;
  }

  private checkOverflow(value: number): boolean {
    const integerLength = Math.trunc(Math.abs(value)).toString().length;
    return integerLength > MAX_INT_DIGITS;
  }

  private formatForDisplay(value: number): string {
    if (Object.is(value, -0)) {
      return "0";
    }
    return Number(value.toFixed(10)).toString();
  }

  private formatForTape(value: number): string {
    return this.formatForDisplay(value).padStart(14, " ");
  }

  private symbolFor(operation: Operation): string {
    if (operation === "*") {
      return "x";
    }
    if (operation === "/") {
      return "/";
    }
    return operation;
  }

  private printToTape(text: string, forceOn = false): void {
    if (this.state.mode === "OFF") {
      return;
    }

    const canPrintByMode = this.state.mode === "PRINT" || this.state.mode === "ITEM" || this.state.mode === "CONVERSION";
    if (!canPrintByMode && !(forceOn && this.state.mode === "ON")) {
      return;
    }

    this.state.paperTape.push(text);
    if (this.state.paperTape.length > MAX_TAPE_LINES) {
      this.state.paperTape = this.state.paperTape.slice(-MAX_TAPE_LINES);
    }
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
}
