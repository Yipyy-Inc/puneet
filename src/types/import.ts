// Types for the platform Data Import module.

export type ImportEntity = "customer" | "pet" | "booking";

export type ImportStatus =
  | "completed"
  | "partial"
  | "failed"
  | "undone"
  | "in_progress";

export interface ImportSource {
  id: string;
  name: string;
  /** Short monogram shown in the logo tile (no brand assets bundled). */
  monogram: string;
  /** Tailwind gradient classes for the logo tile. */
  gradient: string;
  importableData: string[];
  exportGuideUrl: string;
  /** Some platforms export customers and appointments as separate files. */
  separateFiles: boolean;
  /** Which built-in column parser auto-maps this source (null = manual). */
  parser:
    | "moego"
    | "gingr"
    | "pawpartner"
    | "propetware"
    | "generic-csv"
    | null;
}

export interface YipyyField {
  id: string; // e.g. "customer.name"
  label: string;
  entity: ImportEntity;
  required: boolean;
}

export interface ImportHistoryRecord {
  id: string;
  facilityId: number;
  facilityName: string;
  sourceId: string;
  sourceName: string;
  date: string; // ISO
  customers: number;
  pets: number;
  bookings: number;
  status: ImportStatus;
  importedBy: string;
}

// --- validation -----------------------------------------------------------

export type RowSeverity = "clean" | "warning" | "error";
export type ValidationLevel = "green" | "amber" | "red";

export interface RowIssue {
  rowIndex: number; // 1-based data row
  column: string;
  severity: "warning" | "error";
  message: string;
}

export interface ValidationResult {
  total: number;
  clean: number;
  warnings: number;
  errors: number;
  issues: RowIssue[];
  level: ValidationLevel;
}

export interface ImportCounts {
  customers: number;
  pets: number;
  bookings: number;
}
