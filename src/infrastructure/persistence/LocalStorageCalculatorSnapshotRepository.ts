import { CalculatorSnapshot } from "../../domain/calculator/Calculator";
import { CalculatorSnapshotRepository } from "../../application/ports/CalculatorSnapshotRepository";

export const DEFAULT_CALCULATOR_STORAGE_KEY = "sumadora-hr100tm-state-v1";

export class LocalStorageCalculatorSnapshotRepository
  implements CalculatorSnapshotRepository {
  constructor(
    private readonly storageKey = DEFAULT_CALCULATOR_STORAGE_KEY
  ) {}

  load(): CalculatorSnapshot | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as CalculatorSnapshot;
  }

  save(snapshot: CalculatorSnapshot): void {
    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));
  }

  clear(): void {
    localStorage.removeItem(this.storageKey);
  }
}
