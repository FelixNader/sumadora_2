import { Calculator } from "../../domain/calculator/Calculator";
import { CalculatorSnapshotRepository } from "../ports/CalculatorSnapshotRepository";

export function persistCalculatorState(
  calculator: Calculator,
  snapshotRepository: CalculatorSnapshotRepository
): void {
  snapshotRepository.save(calculator.getSnapshot());
}
