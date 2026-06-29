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
