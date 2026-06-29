import {
  Calculator,
  CalculatorState,
  DecimalMode,
  Mode,
} from "../../domain/calculator/Calculator";

export function configureCalculatorMode(
  calculator: Calculator,
  mode: Mode
): CalculatorState {
  calculator.setMode(mode);
  return calculator.getState();
}

export function configureCalculatorDecimalMode(
  calculator: Calculator,
  decimalMode: DecimalMode
): CalculatorState {
  calculator.setDecimalMode(decimalMode);
  return calculator.getState();
}
