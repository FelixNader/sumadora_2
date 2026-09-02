import { appendTapeLine, canPrintToTape } from "../policies/tapePolicy";
import { formatForDisplay, formatForTape, symbolFor } from "../policies/numericPolicy";
import { BusinessMode, Operation } from "../types";
import { TapeLedgerState } from "../stateSlices";

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

export class TapeProjector {
  constructor(
    private readonly state: TapeLedgerState,
    private readonly now: () => Date
  ) {}

  printToTape(text: string, allowBlockHeader = true): void {
    if (!canPrintToTape()) {
      return;
    }

    if (allowBlockHeader) {
      this.ensureTapeBlockHeader();
    }

    this.appendRawTapeLine(text);
  }

  appendRawTapeLine(text: string): void {
    if (!canPrintToTape()) {
      return;
    }

    this.state.paperTape = appendTapeLine(this.state.paperTape, text);
  }

  printOperationToTape(text: string): void {
    this.state.tapeOperationSequence += 1;
    this.printToTape(text);
  }

  printAccumulatorSummary(
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

  printAdditiveBaseToTape(value: number): void {
    if (this.state.suppressNextAccumulatorBasePrint) {
      this.state.suppressNextAccumulatorBasePrint = false;
      return;
    }

    this.printOperationToTape(formatForTape(value));
  }

  formatAdditiveTapeLine(
    operand: number,
    operation: "+" | "-"
  ): string {
    const effectiveOperation = operand < 0
      ? operation === "+" ? "-" : "+"
      : operation;
    const magnitude = operand < 0 ? Math.abs(operand) : operand;

    return `${formatForTape(magnitude)} ${symbolFor(effectiveOperation)}`;
  }

  formatBusinessValueForDisplay(
    key: Exclude<BusinessMode, null>,
    value: number
  ): string {
    const formatted = formatForDisplay(value);
    return key === "MGN" ? `${formatted}%` : formatted;
  }

  formatBusinessValueForTape(
    key: Exclude<BusinessMode, null>,
    value: number
  ): string {
    const formatted = formatForTape(value);
    return key === "MGN" ? `${formatted}%` : formatted;
  }

  formatOperatorSymbol(operation: Operation): string {
    return symbolFor(operation);
  }

  startNewTapeBlock(): void {
    this.state.needsTapeBlockHeader = true;
  }

  private ensureTapeBlockHeader(): void {
    if (!this.state.needsTapeBlockHeader) {
      return;
    }

    this.appendRawTapeLine(formatTapeBlockTimestamp(this.now()));
    this.appendRawTapeLine("----------------");
    this.state.needsTapeBlockHeader = false;
  }
}
