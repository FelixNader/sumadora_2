import { CalculatorState } from "../types";
import { MAX_TAPE_LINES } from "../state";

export function canPrintToTape(state: CalculatorState, forceOn = false): boolean {
  if (state.mode === "OFF") {
    return false;
  }

  const canPrintByMode =
    state.mode === "PRINT" ||
    state.mode === "ITEM" ||
    state.mode === "CONVERSION";

  return canPrintByMode || (forceOn && state.mode === "ON");
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
