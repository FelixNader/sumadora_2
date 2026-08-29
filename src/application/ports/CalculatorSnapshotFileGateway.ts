import { CalculatorSnapshot, CalculatorState } from "../../domain/calculator/Calculator";

export interface CalculatorSnapshotFileGateway {
  exportSnapshot(snapshot: CalculatorSnapshot): void;
  exportReceiptPdf(state: CalculatorState): Promise<void>;
  importSnapshot(file: File): Promise<CalculatorSnapshot>;
}
