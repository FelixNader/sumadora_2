import { CalculatorSnapshot } from "../../domain/calculator/Calculator";
import { Calculator } from "../../domain/calculator/Calculator";
import { ClipboardGateway } from "../ports/ClipboardGateway";
import { CalculatorSnapshotFileGateway } from "../ports/CalculatorSnapshotFileGateway";
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

class InMemorySnapshotFileGateway implements CalculatorSnapshotFileGateway {
  exported: CalculatorSnapshot | null = null;
  imported: CalculatorSnapshot | null = null;

  exportSnapshot(snapshot: CalculatorSnapshot) {
    this.exported = snapshot;
  }

  async importSnapshot() {
    if (!this.imported) {
      throw new Error("missing import payload");
    }

    return this.imported;
  }
}

class InMemoryClipboardGateway implements ClipboardGateway {
  written: string | null = null;

  async writeText(value: string) {
    this.written = value;
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

test("exports snapshots through the configured file gateway", () => {
  const repository = new InMemorySnapshotRepository();
  const fileGateway = new InMemorySnapshotFileGateway();
  const service = new CalculatorApplicationService(
    new Calculator(),
    repository,
    fileGateway
  );

  service.dispatch("9");
  service.exportSnapshot();

  expect(fileGateway.exported?.state.displayValue).toBe("9");
});

test("imports snapshots from the file gateway and persists them", async () => {
  const repository = new InMemorySnapshotRepository();
  const fileGateway = new InMemorySnapshotFileGateway();
  const seededCalculator = new Calculator();
  seededCalculator.inputDigit("7");
  seededCalculator.inputDigit("3");
  fileGateway.imported = seededCalculator.getSnapshot();

  const service = new CalculatorApplicationService(
    new Calculator(),
    repository,
    fileGateway
  );
  const file = new File(["{}"], "backup.json", { type: "application/json" });

  const state = await service.importSnapshot(file);

  expect(state.displayValue).toBe("73");
  expect(repository.saved?.state.displayValue).toBe("73");
});

test("copies current display value through the configured clipboard gateway", async () => {
  const repository = new InMemorySnapshotRepository();
  const fileGateway = new InMemorySnapshotFileGateway();
  const clipboardGateway = new InMemoryClipboardGateway();
  const service = new CalculatorApplicationService(
    new Calculator(),
    repository,
    fileGateway,
    clipboardGateway
  );

  service.dispatch("4");
  service.dispatch("2");
  const copiedValue = await service.copyDisplayValue();

  expect(copiedValue).toBe("42");
  expect(clipboardGateway.written).toBe("42");
});
