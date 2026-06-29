import { DecimalMode, Operation } from "../types";
import { MAX_INT_DIGITS } from "../state";

export function normalizeOperandForOperation(
  displayValue: string,
  decimalMode: DecimalMode,
  value: number,
  operation: Operation
): number {
  if (
    decimalMode === "ADD2" &&
    (operation === "+" || operation === "-") &&
    !displayValue.includes(".")
  ) {
    return value / 100;
  }

  return value;
}

export function roundByMode(
  decimalMode: DecimalMode,
  value: number,
  operation: Operation | "+" | "-"
): number {
  const placesByMode: Record<DecimalMode, number | null> = {
    F: null,
    "3": 3,
    "2": 2,
    "0": 0,
    ADD2: 2,
  };

  const decimals = placesByMode[decimalMode];
  if (decimals === null) {
    return value;
  }

  if (decimalMode === "ADD2" && operation !== "+" && operation !== "-") {
    return value;
  }

  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function exceedsDigitLimit(value: string): boolean {
  return value.replace(/[-.]/g, "").length > MAX_INT_DIGITS;
}

export function isOverflow(value: number): boolean {
  const integerLength = Math.trunc(Math.abs(value)).toString().length;
  return integerLength > MAX_INT_DIGITS;
}

export function formatForDisplay(value: number): string {
  if (Object.is(value, -0)) {
    return "0";
  }

  return Number(value.toFixed(10)).toString();
}

export function formatForTape(value: number): string {
  return formatForDisplay(value).padStart(14, " ");
}

export function symbolFor(operation: Operation): string {
  if (operation === "*") {
    return "x";
  }

  if (operation === "/") {
    return "/";
  }

  return operation;
}
