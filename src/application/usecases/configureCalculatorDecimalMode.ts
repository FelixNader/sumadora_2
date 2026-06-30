import {
  Calculator,
  CalculatorState,
  DecimalMode,
} from "../../domain/calculator/Calculator";

export function configureCalculatorDecimalMode(
  calculator: Calculator,
  decimalMode: DecimalMode
): CalculatorState {
  calculator.setDecimalMode(decimalMode);
  return calculator.getState();
}
