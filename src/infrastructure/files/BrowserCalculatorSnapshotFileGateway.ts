import { CalculatorSnapshot } from "../../domain/calculator/Calculator";
import { CalculatorSnapshotFileGateway } from "../../application/ports/CalculatorSnapshotFileGateway";

export class BrowserCalculatorSnapshotFileGateway
  implements CalculatorSnapshotFileGateway {
  exportSnapshot(snapshot: CalculatorSnapshot): void {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `sumadora-backup-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async importSnapshot(file: File): Promise<CalculatorSnapshot> {
    const text = await file.text();
    return JSON.parse(text) as CalculatorSnapshot;
  }
}
