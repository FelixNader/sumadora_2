import { CalculatorSnapshot, CalculatorState } from "../../domain/calculator/Calculator";
import { CalculatorSnapshotFileGateway } from "../../application/ports/CalculatorSnapshotFileGateway";
import { buildReceiptPdfFilename, createReceiptPdfBlob } from "./receiptPdf";

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

  async exportReceiptPdf(state: CalculatorState): Promise<void> {
    const now = new Date();
    const fileName = buildReceiptPdfFilename(now);
    const blob = createReceiptPdfBlob(state);
    const file = new File([blob], fileName, {
      type: "application/pdf",
      lastModified: now.getTime(),
    });
    const navigatorWithShare = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
    };

    if (
      typeof navigatorWithShare.share === "function" &&
      navigatorWithShare.canShare?.({ files: [file] })
    ) {
      try {
        await navigatorWithShare.share({
          files: [file],
          title: "Ticket Sumadora Fenix",
          text: "Ticket PDF generado en Sumadora Fenix",
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async importSnapshot(file: File): Promise<CalculatorSnapshot> {
    const text = await file.text();
    return JSON.parse(text) as CalculatorSnapshot;
  }
}
