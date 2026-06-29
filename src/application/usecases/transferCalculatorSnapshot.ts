import {
  Calculator,
  CalculatorSnapshot,
  CalculatorState,
} from "../../domain/calculator/Calculator";
import { CalculatorSnapshotFileGateway } from "../ports/CalculatorSnapshotFileGateway";
import { CalculatorSnapshotRepository } from "../ports/CalculatorSnapshotRepository";

export function exportCalculatorSnapshot(
  calculator: Calculator,
  fileGateway: CalculatorSnapshotFileGateway
): void {
  fileGateway.exportSnapshot(calculator.getSnapshot());
}

export async function importCalculatorSnapshotFromFile(
  calculator: Calculator,
  snapshotRepository: CalculatorSnapshotRepository,
  fileGateway: CalculatorSnapshotFileGateway,
  file: File
): Promise<CalculatorState> {
  const snapshot = await fileGateway.importSnapshot(file);
  return importCalculatorSnapshot(calculator, snapshotRepository, snapshot);
}

export function importCalculatorSnapshot(
  calculator: Calculator,
  snapshotRepository: CalculatorSnapshotRepository,
  snapshot: CalculatorSnapshot
): CalculatorState {
  calculator.loadSnapshot(snapshot);
  snapshotRepository.save(calculator.getSnapshot());
  return calculator.getState();
}
