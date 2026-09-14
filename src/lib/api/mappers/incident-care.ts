import { z } from "zod";

import {
  careActionDurationEnum,
  careActionFrequencyEnum,
  careActionStartEnum,
  incidentMedFeeTypeEnum,
  incidentMedTypeEnum,
  type IncidentCareAction,
  type IncidentCareLog,
  type IncidentMedication,
} from "@/types/incidents";

// ============================================================================
// public.incident_care_items / incident_care_logs ⇄ an incident's in-stay care
// (20260914130556).
//
// A care item is a care action or a medication. What differs between the two
// rides in `detail`; the columns are what every item has. A log is one
// administration of an item, append-only. Ids are the rows' uuids — neither
// has a ref, and nothing routes by them but these writes.
// ============================================================================

export const INCIDENT_CARE_ITEM_SELECT =
  "id, incident_id, kind, name, detail, active, created_by_name, created_at";
export const INCIDENT_CARE_LOG_SELECT =
  "id, incident_id, care_item_id, note, photo_url, logged_by_name, logged_at";

export type IncidentCareItemRow = {
  id: string;
  incident_id: string;
  kind: "action" | "medication";
  name: string;
  detail: Record<string, unknown> | null;
  active: boolean;
  created_by_name: string | null;
  created_at: string;
};

export type IncidentCareLogRow = {
  id: string;
  incident_id: string;
  care_item_id: string;
  note: string | null;
  photo_url: string | null;
  logged_by_name: string | null;
  logged_at: string;
};

export interface IncidentCare {
  careActions: IncidentCareAction[];
  incidentMedications: IncidentMedication[];
  careLogs: IncidentCareLog[];
}

export const NO_INCIDENT_CARE: IncidentCare = {
  careActions: [],
  incidentMedications: [],
  careLogs: [],
};

const actionDetailSchema = z.object({
  frequency: careActionFrequencyEnum,
  everyXHours: z.number().int().min(1).max(24).optional(),
  customSchedule: z.string().max(200).optional(),
  duration: careActionDurationEnum,
  days: z.number().int().min(1).max(60).optional(),
  starts: careActionStartEnum,
  staffInstructions: z.string().max(2000).default(""),
  requiresPhoto: z.boolean().default(false),
});

const medicationDetailSchema = z.object({
  medType: incidentMedTypeEnum,
  dosage: z.string().max(200).default(""),
  frequency: z.string().max(200).default(""),
  instructions: z.string().max(2000).default(""),
  critical: z.boolean().default(false),
  chargeFee: z.boolean().default(false),
  feeType: incidentMedFeeTypeEnum.optional(),
  feeAmount: z.number().min(0).max(1000).optional(),
});

/** What the in-stay care tab sends to add an item. */
export const incidentCareItemWriteSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("action"),
    name: z.string().trim().min(1).max(200),
    detail: actionDetailSchema,
  }),
  z.object({
    kind: z.literal("medication"),
    name: z.string().trim().min(1).max(200),
    detail: medicationDetailSchema,
  }),
]);
export type IncidentCareItemWrite = z.input<typeof incidentCareItemWriteSchema>;

export const incidentCareItemPatchSchema = z.object({ active: z.boolean() });

/** One administration, logged from Daily Care or the incident. */
export const incidentCareLogWriteSchema = z.object({
  careItemId: z.string().uuid(),
  note: z.string().trim().max(2000).optional(),
  // Only a stored photo's address; a browser's blob: URL means nothing later.
  photoUrl: z
    .string()
    .url()
    .refine((v) => v.startsWith("https://"))
    .optional(),
});
export type IncidentCareLogWrite = z.input<typeof incidentCareLogWriteSchema>;

/** An incident's items and logs, in the shapes its screens read. */
export function toIncidentCare(
  incidentRef: string,
  items: IncidentCareItemRow[],
  logs: IncidentCareLogRow[],
): IncidentCare {
  const careActions: IncidentCareAction[] = [];
  const incidentMedications: IncidentMedication[] = [];
  const kindOf = new Map<string, IncidentCareItemRow["kind"]>();

  for (const item of items) {
    kindOf.set(item.id, item.kind);
    const base = {
      id: item.id,
      incidentId: incidentRef,
      name: item.name,
      createdBy: item.created_by_name ?? "",
      createdAt: item.created_at,
    };
    if (item.kind === "action") {
      const detail = actionDetailSchema.safeParse(item.detail ?? {});
      if (!detail.success) continue;
      careActions.push({ ...base, ...detail.data, active: item.active });
    } else {
      // IncidentMedication has no `active`: a stopped one is left off.
      if (!item.active) continue;
      const detail = medicationDetailSchema.safeParse(item.detail ?? {});
      if (!detail.success) continue;
      incidentMedications.push({ ...base, ...detail.data });
    }
  }

  const careLogs: IncidentCareLog[] = logs.map((log) => ({
    id: log.id,
    incidentId: incidentRef,
    ...(kindOf.get(log.care_item_id) === "medication"
      ? { medicationId: log.care_item_id }
      : { careActionId: log.care_item_id }),
    loggedBy: log.logged_by_name ?? "",
    loggedAt: log.logged_at,
    note: log.note ?? undefined,
    photoUrl: log.photo_url ?? undefined,
  }));

  return { careActions, incidentMedications, careLogs };
}
