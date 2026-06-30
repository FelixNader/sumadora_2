import { Calculator, CalculatorState } from "../../domain/calculator/Calculator";

export type CalculatorAction = string;

export function dispatchCalculatorAction(
  calculator: Calculator,
  action: CalculatorAction
): CalculatorState {
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
      calculator.inputDigit(action);
      break;
    case ".":
      calculator.inputDecimal();
      break;
    case "+/-":
      calculator.toggleSign();
      break;
    case "CE":
      calculator.clearEntry();
      break;
    case "CA":
      calculator.clearAll();
      break;
    case "+":
      calculator.add();
      break;
    case "+=":
      calculator.plusEquals();
      break;
    case "-":
      calculator.subtract();
      break;
    case "x":
      calculator.multiply();
      break;
    case "/":
      calculator.divide();
      break;
    case "=":
      calculator.equals();
      break;
    case "M+":
      calculator.memoryAdd();
      break;
    case "M-":
      calculator.memorySubtract();
      break;
    case "MR":
      calculator.memoryRecall();
      break;
    case "MC":
      calculator.memoryClear();
      break;
    case "REF":
      calculator.printReference();
      break;
    case "GT":
      calculator.grandTotalRecall();
      break;
    case "SUBT":
      calculator.subtotal();
      break;
    case "AVG":
      calculator.printOperationAverage();
      break;
    case "%":
      calculator.percent();
      break;
    case "TAX+":
      calculator.addTax();
      break;
    case "TAX-":
      calculator.subtractTax();
      break;
    case "TAX SET":
      calculator.setTaxRate();
      break;
    case "RATE":
      calculator.setConversionRate();
      break;
    case "CONV ->":
      calculator.convertDomesticToForeign();
      break;
    case "<- CONV":
      calculator.convertForeignToDomestic();
      break;
    case "COST":
      calculator.businessFunction("COST");
      break;
    case "SELL":
      calculator.businessFunction("SELL");
      break;
    case "MGN":
      calculator.businessFunction("MGN");
      break;
    case "TAPE CLR":
      calculator.clearTape();
      break;
    default:
      break;
  }

  return calculator.getState();
}
