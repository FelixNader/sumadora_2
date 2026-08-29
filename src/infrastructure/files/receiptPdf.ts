import { CalculatorState } from "../../domain/calculator/Calculator";

const PDF_HEADER = "%PDF-1.4\n";
const PAGE_WIDTH = 226.77;
const PAGE_HEIGHT = 792;
const PAGE_MARGIN_X = 18;
const PAGE_MARGIN_TOP = 26;
const PAGE_MARGIN_BOTTOM = 26;
const FONT_SIZE = 10.5;
const LINE_HEIGHT = 13;

function encodeAscii(value: string): Uint8Array {
  return Uint8Array.from(value, (character) => character.charCodeAt(0));
}

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function normalizePdfLine(line: string): string {
  return line
    .replace(/◇/g, "<>")
    .replace(/–/g, "-")
    .replace(/—/g, "-");
}

function chunkLines(lines: string[], chunkSize: number): string[][] {
  const chunks: string[][] = [];

  for (let index = 0; index < lines.length; index += chunkSize) {
    chunks.push(lines.slice(index, index + chunkSize));
  }

  return chunks;
}

function buildContentStream(lines: string[]): string {
  const startY = PAGE_HEIGHT - PAGE_MARGIN_TOP - FONT_SIZE;
  const safeLines = lines.length > 0 ? lines : ["Sin movimientos"];
  const commands = [
    "BT",
    `/F1 ${FONT_SIZE} Tf`,
    `${LINE_HEIGHT} TL`,
    `1 0 0 1 ${PAGE_MARGIN_X} ${startY} Tm`,
  ];

  safeLines.forEach((line, index) => {
    commands.push(`(${escapePdfText(normalizePdfLine(line))}) Tj`);
    if (index < safeLines.length - 1) {
      commands.push("T*");
    }
  });

  commands.push("ET");
  return commands.join("\n");
}

export function createReceiptPdfBytes(lines: string[]): Uint8Array {
  const linesPerPage = Math.max(
    1,
    Math.floor((PAGE_HEIGHT - PAGE_MARGIN_TOP - PAGE_MARGIN_BOTTOM) / LINE_HEIGHT)
  );
  const pages = chunkLines(lines, linesPerPage);
  const contents = pages.map((pageLines) => buildContentStream(pageLines));
  const totalObjects = 3 + pages.length * 2;
  const fontObjectNumber = totalObjects;
  const objects = new Array<string>(totalObjects + 1);

  const pageObjectNumbers: number[] = [];

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";

  let nextObjectNumber = 3;
  pages.forEach((_, pageIndex) => {
    const pageObjectNumber = nextObjectNumber;
    const contentObjectNumber = nextObjectNumber + 1;
    pageObjectNumbers.push(pageObjectNumber);
    nextObjectNumber += 2;

    objects[pageObjectNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;

    const stream = contents[pageIndex];
    objects[contentObjectNumber] =
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  objects[2] = `<< /Type /Pages /Count ${pageObjectNumbers.length} /Kids [${pageObjectNumbers.map((id) => `${id} 0 R`).join(" ")}] >>`;
  objects[fontObjectNumber] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

  let pdf = PDF_HEADER;
  const offsets: number[] = [0];

  for (let objectNumber = 1; objectNumber < objects.length; objectNumber += 1) {
    offsets[objectNumber] = pdf.length;
    pdf += `${objectNumber} 0 obj\n${objects[objectNumber]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";

  for (let objectNumber = 1; objectNumber < objects.length; objectNumber += 1) {
    pdf += `${offsets[objectNumber].toString().padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return encodeAscii(pdf);
}

function padFilenamePart(value: number): string {
  return value.toString().padStart(2, "0");
}

export function buildReceiptPdfFilename(now: Date): string {
  const datePart = [
    now.getFullYear(),
    padFilenamePart(now.getMonth() + 1),
    padFilenamePart(now.getDate()),
  ].join("-");
  const timePart = `${padFilenamePart(now.getHours())}${padFilenamePart(now.getMinutes())}`;

  return `sumadora-fenix-ticket-${datePart}-${timePart}.pdf`;
}

export function createReceiptPdfBlob(state: CalculatorState): Blob {
  const lines = state.paperTape.length > 0 ? state.paperTape : ["Sin movimientos"];
  return new Blob([createReceiptPdfBytes(lines)], {
    type: "application/pdf",
  });
}
