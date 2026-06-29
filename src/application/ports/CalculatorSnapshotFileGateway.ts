import { CalculatorSnapshot } from "../../domain/calculator/Calculator";

export interface CalculatorSnapshotFileGateway {
  exportSnapshot(snapshot: CalculatorSnapshot): void;
  importSnapshot(file: File): Promise<CalculatorSnapshot>;
}
