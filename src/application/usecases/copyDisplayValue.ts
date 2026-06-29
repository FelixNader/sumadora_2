import { Calculator } from "../../domain/calculator/Calculator";
import { ClipboardGateway } from "../ports/ClipboardGateway";

export async function copyDisplayValue(
  calculator: Calculator,
  clipboardGateway: ClipboardGateway
): Promise<string> {
  const value = calculator.getState().displayValue;
  await clipboardGateway.writeText(value);
  return value;
}
