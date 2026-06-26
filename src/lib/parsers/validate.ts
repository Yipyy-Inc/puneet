import { requiredFieldIds } from "@/data/import-fields";
import type {
  ImportCounts,
  RowIssue,
  RowSeverity,
  ValidationResult,
} from "@/types/import";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ISSUES = 100;

/** Map a Yipyy field id to the index of the file column mapped to it. */
function fieldColumnIndex(
  columns: string[],
  mapping: Record<string, string>,
  fieldId: string,
): number {
  const col = columns.find((c) => mapping[c] === fieldId);
  return col ? columns.indexOf(col) : -1;
}

export function runValidation(
  columns: string[],
  rows: string[][],
  mapping: Record<string, string>,
): { result: ValidationResult; severities: RowSeverity[] } {
  const requiredCols = requiredFieldIds.map((id) => ({
    fieldId: id,
    index: fieldColumnIndex(columns, mapping, id),
    label: columns.find((c) => mapping[c] === id) ?? id,
  }));
  const emailIdx = fieldColumnIndex(columns, mapping, "customer.email");
  const dateIdx = fieldColumnIndex(columns, mapping, "booking.startDate");

  const issues: RowIssue[] = [];
  const severities: RowSeverity[] = [];
  let clean = 0;
  let warnings = 0;
  let errors = 0;

  rows.forEach((row, r) => {
    let rowError = false;
    let rowWarning = false;
    const rowNo = r + 1;

    for (const req of requiredCols) {
      const value = req.index >= 0 ? (row[req.index] ?? "").trim() : "";
      if (!value) {
        rowError = true;
        if (issues.length < MAX_ISSUES) {
          issues.push({
            rowIndex: rowNo,
            column: req.label,
            severity: "error",
            message: "Required value is missing",
          });
        }
      }
    }

    if (emailIdx >= 0) {
      const v = (row[emailIdx] ?? "").trim();
      if (v && !EMAIL_RE.test(v)) {
        rowWarning = true;
        if (issues.length < MAX_ISSUES) {
          issues.push({
            rowIndex: rowNo,
            column: columns[emailIdx],
            severity: "warning",
            message: `Email "${v}" looks invalid`,
          });
        }
      }
    }

    if (dateIdx >= 0) {
      const v = (row[dateIdx] ?? "").trim();
      if (v && Number.isNaN(new Date(v).getTime())) {
        rowWarning = true;
        if (issues.length < MAX_ISSUES) {
          issues.push({
            rowIndex: rowNo,
            column: columns[dateIdx],
            severity: "warning",
            message: `Date "${v}" couldn't be parsed`,
          });
        }
      }
    }

    if (rowError) {
      errors++;
      severities.push("error");
    } else if (rowWarning) {
      warnings++;
      severities.push("warning");
    } else {
      clean++;
      severities.push("clean");
    }
  });

  return {
    result: {
      total: rows.length,
      clean,
      warnings,
      errors,
      issues,
      level: errors > 0 ? "red" : warnings > 0 ? "amber" : "green",
    },
    severities,
  };
}

/** Counts of distinct entities among rows that will be imported (not errored). */
export function importCounts(
  columns: string[],
  rows: string[][],
  mapping: Record<string, string>,
  severities: RowSeverity[],
): ImportCounts {
  const nameIdx = fieldColumnIndex(columns, mapping, "customer.name");
  const emailIdx = fieldColumnIndex(columns, mapping, "customer.email");
  const petIdx = fieldColumnIndex(columns, mapping, "pet.name");
  const dateIdx = fieldColumnIndex(columns, mapping, "booking.startDate");

  const customers = new Set<string>();
  const pets = new Set<string>();
  let bookings = 0;

  rows.forEach((row, r) => {
    if (severities[r] === "error") return;
    const cust =
      (nameIdx >= 0 ? row[nameIdx] : "") ||
      (emailIdx >= 0 ? row[emailIdx] : "") ||
      "";
    if (cust.trim()) customers.add(cust.trim().toLowerCase());
    const pet = petIdx >= 0 ? (row[petIdx] ?? "").trim() : "";
    if (pet) pets.add(`${cust.trim().toLowerCase()}|${pet.toLowerCase()}`);
    if (dateIdx >= 0 && (row[dateIdx] ?? "").trim()) bookings++;
  });

  return { customers: customers.size, pets: pets.size, bookings };
}
