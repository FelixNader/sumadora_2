import {
  Calculator,
  CalculatorSnapshot,
  CalculatorState,
  DecimalMode,
} from "../../domain/calculator/Calculator";
import { dispatchCalculatorAction } from "../usecases/dispatchCalculatorAction";
import {
  configureCalculatorDecimalMode,
} from "../usecases/configureCalculatorDecimalMode";
import { ClipboardGateway } from "../ports/ClipboardGateway";
import { copyDisplayValue } from "../usecases/copyDisplayValue";
import { hydrateCalculatorState } from "../usecases/hydrateCalculatorState";
import { persistCalculatorState } from "../usecases/persistCalculatorState";
import {
  exportCalculatorSnapshot,
  importCalculatorSnapshot,
  importCalculatorSnapshotFromFile,
} from "../usecases/transferCalculatorSnapshot";
import { CalculatorSnapshotFileGateway } from "../ports/CalculatorSnapshotFileGateway";
import { CalculatorSnapshotRepository } from "../ports/CalculatorSnapshotRepository";

export class CalculatorApplicationService {
  constructor(
    private readonly calculator: Calculator,
    private readonly snapshotRepository: CalculatorSnapshotRepository,
    private readonly snapshotFileGateway?: CalculatorSnapshotFileGateway,
    private readonly clipboardGateway?: ClipboardGateway
  ) {}

  getState(): CalculatorState {
    return this.calculator.getState();
  }

  hydrate(): CalculatorState {
    return hydrateCalculatorState(this.calculator, this.snapshotRepository);
  }

  persist(): void {
    persistCalculatorState(this.calculator, this.snapshotRepository);
  }

  dispatch(action: string): CalculatorState {
    return dispatchCalculatorAction(this.calculator, action);
  }

  setDecimalMode(decimalMode: DecimalMode): CalculatorState {
    return configureCalculatorDecimalMode(this.calculator, decimalMode);
  }

  exportSnapshot(): void {
    if (!this.snapshotFileGateway) {
      throw new Error("Snapshot file gateway is not configured");
    }

    exportCalculatorSnapshot(this.calculator, this.snapshotFileGateway);
  }

  async importSnapshot(file: File): Promise<CalculatorState> {
    if (!this.snapshotFileGateway) {
      throw new Error("Snapshot file gateway is not configured");
    }

    return importCalculatorSnapshotFromFile(
      this.calculator,
      this.snapshotRepository,
      this.snapshotFileGateway,
      file
    );
  }

  importSnapshotData(snapshot: CalculatorSnapshot): CalculatorState {
    return importCalculatorSnapshot(
      this.calculator,
      this.snapshotRepository,
      snapshot
    );
  }

  async copyDisplayValue(): Promise<string> {
    if (!this.clipboardGateway) {
      throw new Error("Clipboard gateway is not configured");
    }

    return copyDisplayValue(this.calculator, this.clipboardGateway);
  }
}
