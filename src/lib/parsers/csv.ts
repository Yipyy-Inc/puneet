// Minimal CSV parsing/serialisation (no external dependency). Handles quoted
// fields, escaped quotes ("") and commas/newlines inside quotes.

export interface ParsedCsv {
  columns: string[];
  rows: string[][];
}

export function parseCsv(text: string): ParsedCsv {
  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    records.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushField();
    } else if (c === "\n") {
      pushRow();
    } else if (c === "\r") {
      // ignore (handles \r\n)
    } else {
      field += c;
    }
  }
  // Trailing field/row (if the file doesn't end with a newline).
  if (field.length > 0 || row.length > 0) pushRow();

  // Drop fully-empty trailing rows.
  const cleaned = records.filter(
    (r) => !(r.length === 1 && r[0].trim() === ""),
  );
  if (cleaned.length === 0) return { columns: [], rows: [] };

  const [header, ...rest] = cleaned;
  return { columns: header.map((h) => h.trim()), rows: rest };
}

export function toCsv(columns: string[], rows: string[][]): string {
  const escape = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = [columns.map(escape).join(",")];
  for (const r of rows) lines.push(r.map(escape).join(","));
  return lines.join("\n");
}
