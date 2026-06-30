import { Calculator } from "../../domain/calculator/Calculator";
import { CalculatorSnapshotRepository } from "../ports/CalculatorSnapshotRepository";
import { buildPersistedSessionSnapshot } from "./buildPersistedSessionSnapshot";

export function persistCalculatorState(
  calculator: Calculator,
  snapshotRepository: CalculatorSnapshotRepository
): void {
  snapshotRepository.save(buildPersistedSessionSnapshot(calculator.getSnapshot()));
}
