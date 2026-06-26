// Client-side report downloads (PDF + CSV) for facility reports. The PDF reuses
// the hand-built minimal-PDF generator; CSV is a UTF-8 Blob. Swap for a
// server-rendered export when a backend arrives.

import { buildInvoicePdf } from "@/lib/invoice-pdf";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.visibility = "hidden";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadReportPdf(
  filename: string,
  title: string,
  lines: string[],
): void {
  const blob = buildInvoicePdf(title, lines);
  triggerDownload(
    blob,
    filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
  );
}

type CsvCell = string | number;

function escapeCsv(value: CsvCell): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadReportCsv(filename: string, rows: CsvCell[][]): void {
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(
    blob,
    filename.endsWith(".csv") ? filename : `${filename}.csv`,
  );
}
