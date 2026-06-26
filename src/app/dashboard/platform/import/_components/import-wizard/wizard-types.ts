import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  Database,
  ShieldCheck,
  Upload,
} from "lucide-react";

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  columns: string[];
  rows: string[][];
}

export interface ImportDraft {
  sourceId: string | null;
  facilityId: number | null;
  files: UploadedFile[];
  /** fileColumn → Yipyy field id (or the skip sentinel). */
  mapping: Record<string, string>;
}

export interface WizardStepProps {
  draft: ImportDraft;
  update: (patch: Partial<ImportDraft>) => void;
  onNext: () => void;
  onBack?: () => void;
  onCancel: () => void;
}

export function createDraft(): ImportDraft {
  return { sourceId: null, facilityId: null, files: [], mapping: {} };
}

export interface StepMeta {
  id: string;
  title: string;
  summary: string;
  icon: LucideIcon;
}

export const STEP_META: StepMeta[] = [
  {
    id: "source",
    title: "Select Source",
    summary: "Which software are you importing from?",
    icon: Database,
  },
  {
    id: "facility",
    title: "Select Facility",
    summary: "Which facility is this import for?",
    icon: Building2,
  },
  {
    id: "upload",
    title: "Upload File",
    summary: "Upload the export file(s) from your old system.",
    icon: Upload,
  },
  {
    id: "map",
    title: "Map Fields",
    summary: "Match each file column to a Yipyy field.",
    icon: ArrowLeftRight,
  },
  {
    id: "validate",
    title: "Validate",
    summary: "Review what will import and what will be skipped.",
    icon: ShieldCheck,
  },
  {
    id: "complete",
    title: "Import & Complete",
    summary: "Run the import and review the results.",
    icon: CheckCircle2,
  },
];

/** Primary (first) uploaded file, which drives mapping and validation. */
export function primaryFile(draft: ImportDraft): UploadedFile | null {
  return draft.files[0] ?? null;
}
