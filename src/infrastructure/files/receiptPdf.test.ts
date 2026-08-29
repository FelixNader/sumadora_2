import { createInitialCalculatorState } from "../../domain/calculator/state";
import {
  buildReceiptPdfFilename,
  createReceiptPdfBlob,
  createReceiptPdfBytes,
} from "./receiptPdf";

test("buildReceiptPdfFilename includes local date and time", () => {
  const fileName = buildReceiptPdfFilename(new Date("2026-08-29T14:37:00"));

  expect(fileName).toBe("sumadora-fenix-ticket-2026-08-29-1437.pdf");
});

test("createReceiptPdfBlob emits a lightweight text pdf with normalized tape symbols", async () => {
  const state = createInitialCalculatorState();
  state.paperTape = ["2026-08-29 14:37", "----------------", "        1,000 ◇"];

  const blob = createReceiptPdfBlob(state);
  const pdfBytes = createReceiptPdfBytes(state.paperTape);
  const pdfText = String.fromCharCode.apply(null, Array.from(pdfBytes));

  expect(blob.type).toBe("application/pdf");
  expect(pdfText).toContain("%PDF-1.4");
  expect(pdfText).toContain("2026-08-29 14:37");
  expect(pdfText).toContain("1,000 <>");
});
