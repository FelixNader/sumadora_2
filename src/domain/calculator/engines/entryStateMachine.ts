import {
  createClearedEntryState,
  createClearAllState,
  createResetAllState,
} from "../services/sessionStateService";
import { exceedsDigitLimit } from "../policies/numericPolicy";
import { CalculatorState } from "../types";

interface EntryStateMachineDependencies {
  printToTape: (text: string, allowBlockHeader?: boolean) => void;
  resetAccumulatorBaseSuppression: () => void;
  setError: () => void;
}

export class EntryStateMachine {
  constructor(
    private readonly state: CalculatorState,
    private readonly dependencies: EntryStateMachineDependencies
  ) {}

  inputDigit(digit: string): void {
    this.dependencies.resetAccumulatorBaseSuppression();
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
        this.dependencies.setError();
        return;
      }
      this.state.displayValue = next;
    }

    this.state.accumulatorContext = "entry";
  }

  inputDecimal(): void {
    this.dependencies.resetAccumulatorBaseSuppression();
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
    this.dependencies.resetAccumulatorBaseSuppression();
    this.state.lastPercentInput = null;

    this.state.displayValue = this.state.displayValue.startsWith("-")
      ? this.state.displayValue.slice(1)
      : `-${this.state.displayValue}`;
    this.state.accumulatorContext = "entry";
  }

  clearEntry(): void {
    this.dependencies.resetAccumulatorBaseSuppression();
    Object.assign(this.state, createClearedEntryState());
  }

  clearAll(): void {
    this.dependencies.resetAccumulatorBaseSuppression();
    Object.assign(this.state, createClearAllState());
    this.dependencies.printToTape("..0.. CA", false);
    this.state.needsTapeBlockHeader = true;
  }

  resetAll(): void {
    this.dependencies.resetAccumulatorBaseSuppression();
    Object.assign(this.state, createResetAllState());
  }
}
