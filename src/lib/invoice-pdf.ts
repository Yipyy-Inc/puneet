// Minimal client-side PDF generator for invoice downloads. There is no PDF
// library in the project and no billing backend, so we hand-build a valid
// single-page PDF (Helvetica text) with a correct byte-offset xref table.
// Replace with a server-rendered PDF when a billing backend arrives.

/** PDF content streams are Latin-1; normalize unicode to ASCII. Diacritics are
 *  transliterated (é→e) so accented names stay readable; en-dashes → "-". */
function toAscii(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[‒-―]/g, "-")
    .replace(/[^\x20-\x7E]/g, "");
}

function escapePdfText(s: string): string {
  return toAscii(s)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function buildInvoicePdf(title: string, lines: string[]): Blob {
  const fontSize = 12;
  const leading = 18;

  const ops: string[] = [
    "BT",
    "/F1 18 Tf",
    "72 760 Td",
    `(${escapePdfText(title)}) Tj`,
    `/F1 ${fontSize} Tf`,
  ];
  let first = true;
  for (const line of lines) {
    ops.push(`0 ${first ? -32 : -leading} Td`, `(${escapePdfText(line)}) Tj`);
    first = false;
  }
  ops.push("ET");
  const content = ops.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];

  // Everything emitted is ASCII, so JS string length == byte offset.
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  const size = objects.length + 1;
  pdf += `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (const off of offsets)
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadInvoicePdf(
  filename: string,
  title: string,
  lines: string[],
): void {
  const blob = buildInvoicePdf(title, lines);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  a.style.visibility = "hidden";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
