import { CalculatorState } from "../types";
import { MAX_TAPE_LINES } from "../state";

export function canPrintToTape(_state: CalculatorState): boolean {
  return true;
}

export function appendTapeLine(
  paperTape: string[],
  text: string
): string[] {
  const next = [...paperTape, text];
  if (next.length <= MAX_TAPE_LINES) {
    return next;
  }

  return next.slice(-MAX_TAPE_LINES);
}

export function formatTapeOperationLabel(sequence: number): string {
  return `OP ${sequence.toString().padStart(4, "0")}`;
}

export function formatTapeSubtotalLabel(sequence: number): string {
  return `SUB ${sequence.toString().padStart(4, "0")}`;
}
