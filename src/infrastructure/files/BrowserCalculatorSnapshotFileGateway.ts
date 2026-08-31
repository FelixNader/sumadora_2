import { CalculatorSnapshot, CalculatorState } from "../../domain/calculator/Calculator";
import { CalculatorSnapshotFileGateway } from "../../application/ports/CalculatorSnapshotFileGateway";
import { buildReceiptPdfFilename, createReceiptPdfBlob } from "./receiptPdf";

export class BrowserCalculatorSnapshotFileGateway
  implements CalculatorSnapshotFileGateway {
  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  exportSnapshot(snapshot: CalculatorSnapshot): void {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    this.downloadBlob(blob, `sumadora-backup-${Date.now()}.json`);
  }

  async exportReceiptPdf(state: CalculatorState): Promise<void> {
    const now = new Date();
    const fileName = buildReceiptPdfFilename(now);
    const blob = createReceiptPdfBlob(state);
    const url = URL.createObjectURL(blob);
    const previewWindow = window.open(url, "_blank", "noopener,noreferrer");

    if (previewWindow) {
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }

    URL.revokeObjectURL(url);
    this.downloadBlob(blob, fileName);
  }

  async importSnapshot(file: File): Promise<CalculatorSnapshot> {
    const text = await file.text();
    return JSON.parse(text) as CalculatorSnapshot;
  }
}
