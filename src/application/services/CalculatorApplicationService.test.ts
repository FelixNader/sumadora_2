import { CalculatorSnapshot } from "../../domain/calculator/Calculator";
import { Calculator } from "../../domain/calculator/Calculator";
import { CalculatorSnapshotRepository } from "../ports/CalculatorSnapshotRepository";
import { CalculatorApplicationService } from "./CalculatorApplicationService";

class InMemorySnapshotRepository implements CalculatorSnapshotRepository {
  saved: CalculatorSnapshot | null = null;
  loadValue: CalculatorSnapshot | null = null;
  cleared = false;

  load() {
    return this.loadValue;
  }

  save(snapshot: ReturnType<Calculator["getSnapshot"]>) {
    this.saved = snapshot;
  }

  clear() {
    this.cleared = true;
  }
}

test("hydrates calculator state from snapshot repository", () => {
  const repository = new InMemorySnapshotRepository();
  const seededCalculator = new Calculator();
  seededCalculator.inputDigit("4");
  seededCalculator.inputDigit("2");
  repository.loadValue = seededCalculator.getSnapshot();

  const service = new CalculatorApplicationService(new Calculator(), repository);
  const state = service.hydrate();

  expect(state.displayValue).toBe("42");
});

test("clears repository when snapshot loading fails", () => {
  const repository: CalculatorSnapshotRepository & { cleared: boolean } = {
    cleared: false,
    load() {
      throw new Error("broken snapshot");
    },
    save() {},
    clear() {
      this.cleared = true;
    },
  };

  const service = new CalculatorApplicationService(new Calculator(), repository);
  service.hydrate();

  expect(repository.cleared).toBe(true);
});

test("persists updated snapshots through the repository", () => {
  const repository = new InMemorySnapshotRepository();
  const service = new CalculatorApplicationService(new Calculator(), repository);

  service.dispatch("7");
  service.dispatch("+");
  service.dispatch("5");
  service.dispatch("=");
  service.persist();

  expect(repository.saved?.state.displayValue).toBe("12");
});
