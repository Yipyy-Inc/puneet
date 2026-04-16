import { z } from "zod";

export const warningTypeEnum = z.enum([
  "verbal",
  "written",
  "final",
  "suspension",
  "termination",
  "custom",
]);
export type WarningType = z.infer<typeof warningTypeEnum>;

export const issuedWarningStatusEnum = z.enum([
  "pending_signature",
  "signed",
  "appealed",
  "resolved",
]);
export type IssuedWarningStatus = z.infer<typeof issuedWarningStatusEnum>;

export const warningTemplateFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(["text", "textarea", "date", "checkbox"]),
  required: z.boolean(),
  placeholder: z.string().optional(),
});
export type WarningTemplateField = z.infer<typeof warningTemplateFieldSchema>;

export const warningTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  /** The full warning document text shown to the employee. */
  body: z.string(),
  defaultType: warningTypeEnum,
  fields: z.array(warningTemplateFieldSchema),
  requiresSignature: z.boolean(),
  createdAt: z.string(),
  createdBy: z.string(),
  active: z.boolean(),
});
export type WarningTemplate = z.infer<typeof warningTemplateSchema>;

export const issuedWarningSchema = z.object({
  id: z.string(),
  templateId: z.string().optional(),
  templateTitle: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  type: warningTypeEnum,
  /** One-line reason shown in lists. */
  reason: z.string(),
  /** Snapshot of the full warning body at time of issue. */
  body: z.string(),
  /** Values for any custom template fields. */
  fieldValues: z.record(z.string(), z.string()),
  managerNotes: z.string(),
  issuedBy: z.string(),
  issuedByName: z.string(),
  issuedAt: z.string(),
  witnessName: z.string().optional(),
  departmentId: z.string(),
  status: issuedWarningStatusEnum,
  signedAt: z.string().optional(),
  signatureData: z.string().optional(),
  ipAddress: z.string().optional(),
  deviceId: z.string().optional(),
  timezone: z.string().optional(),
});
export type IssuedWarning = z.infer<typeof issuedWarningSchema>;

// UI helpers
export const WARNING_TYPE_META: Record<
  WarningType,
  { label: string; bg: string; text: string }
> = {
  verbal: {
    label: "Verbal Warning",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
  },
  written: {
    label: "Written Warning",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400",
  },
  final: {
    label: "Final Warning",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
  },
  suspension: {
    label: "Suspension",
    bg: "bg-red-200 dark:bg-red-900/50",
    text: "text-red-800 dark:text-red-300",
  },
  termination: {
    label: "Termination",
    bg: "bg-red-300 dark:bg-red-900/70",
    text: "text-red-900 dark:text-red-200",
  },
  custom: {
    label: "Custom",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-400",
  },
};
