import {
  Calculator,
  CalculatorSnapshot,
  CalculatorState,
  DecimalMode,
  Mode,
} from "../../domain/calculator/Calculator";
import { CalculatorSnapshotRepository } from "../ports/CalculatorSnapshotRepository";

export type CalculatorAction = string;

export class CalculatorApplicationService {
  constructor(
    private readonly calculator: Calculator,
    private readonly snapshotRepository: CalculatorSnapshotRepository
  ) {}

  getState(): CalculatorState {
    return this.calculator.getState();
  }

  hydrate(): CalculatorState {
    try {
      const snapshot = this.snapshotRepository.load();
      if (snapshot) {
        this.calculator.loadSnapshot(snapshot);
      }
    } catch {
      this.snapshotRepository.clear();
    }

    return this.getState();
  }

  persist(): void {
    this.snapshotRepository.save(this.calculator.getSnapshot());
  }

  dispatch(action: CalculatorAction): CalculatorState {
    switch (action) {
      case "0":
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
        this.calculator.inputDigit(action);
        break;
      case ".":
        this.calculator.inputDecimal();
        break;
      case "+/-":
        this.calculator.toggleSign();
        break;
      case "CE":
        this.calculator.clearEntry();
        break;
      case "CA":
        this.calculator.clearAll();
        break;
      case "+":
      case "+=":
        this.calculator.add();
        break;
      case "-":
        this.calculator.subtract();
        break;
      case "x":
        this.calculator.multiply();
        break;
      case "/":
        this.calculator.divide();
        break;
      case "=":
        this.calculator.equals();
        break;
      case "M+":
        this.calculator.memoryAdd();
        break;
      case "M-":
        this.calculator.memorySubtract();
        break;
      case "MR":
        this.calculator.memoryRecall();
        break;
      case "MC":
        this.calculator.memoryClear();
        break;
      case "REF":
        this.calculator.printReference();
        break;
      case "GT":
        this.calculator.grandTotalRecall();
        break;
      case "ITM":
        this.calculator.addSpecifiedItemCount();
        break;
      case "ITM TOTAL":
        this.calculator.printItemTotal();
        break;
      case "SUBT":
        this.calculator.subtotal();
        break;
      case "AVG":
        this.calculator.printItemAverage();
        break;
      case "%":
        this.calculator.percent();
        break;
      case "TAX+":
        this.calculator.addTax();
        break;
      case "TAX-":
        this.calculator.subtractTax();
        break;
      case "TAX SET":
        this.calculator.setTaxRate();
        break;
      case "RATE":
        this.calculator.setConversionRate();
        break;
      case "CONV ->":
        this.calculator.convertDomesticToForeign();
        break;
      case "<- CONV":
        this.calculator.convertForeignToDomestic();
        break;
      case "COST":
        this.calculator.businessFunction("COST");
        break;
      case "SELL":
        this.calculator.businessFunction("SELL");
        break;
      case "MGN":
        this.calculator.businessFunction("MGN");
        break;
      case "TAPE CLR":
        this.calculator.clearTape();
        break;
      default:
        break;
    }

    return this.getState();
  }

  setMode(mode: Mode): CalculatorState {
    this.calculator.setMode(mode);
    return this.getState();
  }

  setDecimalMode(decimalMode: DecimalMode): CalculatorState {
    this.calculator.setDecimalMode(decimalMode);
    return this.getState();
  }

  exportSnapshot(): CalculatorSnapshot {
    return this.calculator.getSnapshot();
  }

  importSnapshot(snapshot: CalculatorSnapshot): CalculatorState {
    this.calculator.loadSnapshot(snapshot);
    this.persist();
    return this.getState();
  }
}
