import { Calculator, CalculatorState } from "../../domain/calculator/Calculator";
import { CalculatorSnapshotRepository } from "../ports/CalculatorSnapshotRepository";
import { buildPersistedSessionSnapshot } from "./buildPersistedSessionSnapshot";

export function hydrateCalculatorState(
  calculator: Calculator,
  snapshotRepository: CalculatorSnapshotRepository
): CalculatorState {
  try {
    const snapshot = snapshotRepository.load();
    if (snapshot) {
      calculator.loadSnapshot(buildPersistedSessionSnapshot(snapshot));
    }
  } catch {
    snapshotRepository.clear();
  }

  return calculator.getState();
}
