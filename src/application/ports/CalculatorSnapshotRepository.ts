import { CalculatorSnapshot } from "../../domain/calculator/Calculator";

export interface CalculatorSnapshotRepository {
  load(): CalculatorSnapshot | null;
  save(snapshot: CalculatorSnapshot): void;
  clear(): void;
}
