import { z } from "zod";

import { sanitizeAnnouncementHtml } from "@/lib/announcements/sanitize-html";
import type {
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementTarget,
  EnhancedAnnouncement,
  FacilityAnnouncement,
} from "@/types/announcement";

// Rows of public.platform_announcements (20260918103842) to the screen's shape
// and back. Pure: the routes and the unit tests both use it.

export const ANNOUNCEMENT_SELECT =
  "id, title, body, priority, status, target, plan_tier_ids, business_types, facility_ids, starts_at, auto_archive_days, published_at, author_name, created_at";

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  priority: "normal" | "high" | "urgent";
  status: "draft" | "published" | "archived";
  target: "all" | "plan_tier" | "business_type" | "facilities";
  plan_tier_ids: string[];
  business_types: string[];
  facility_ids: string[];
  starts_at: string | null;
  auto_archive_days: number | null;
  published_at: string | null;
  author_name: string | null;
  created_at: string;
}

export interface ActiveAnnouncementRow {
  id: string;
  title: string;
  body: string;
  priority: "normal" | "high" | "urgent";
  published_at: string | null;
  starts_at: string | null;
  read_at: string | null;
  dismissed_at: string | null;
}

const PRIORITY_FROM_ROW: Record<
  AnnouncementRow["priority"],
  AnnouncementPriority
> = { normal: "Normal", high: "High", urgent: "Urgent" };

const TARGET_FROM_ROW: Record<AnnouncementRow["target"], AnnouncementTarget> = {
  all: "All Facilities",
  plan_tier: "By Plan Tier",
  business_type: "By Business Type",
  facilities: "Specific Facilities",
};

const TARGET_TO_ROW: Record<AnnouncementTarget, AnnouncementRow["target"]> = {
  "All Facilities": "all",
  "By Plan Tier": "plan_tier",
  "By Business Type": "business_type",
  "Specific Facilities": "facilities",
};

const DAY_MS = 86_400_000;

/** The same live window as private.platform_announcement_is_live. */
export function displayStatus(
  row: Pick<
    AnnouncementRow,
    "status" | "starts_at" | "published_at" | "auto_archive_days"
  >,
  nowMs: number,
): AnnouncementStatus {
  if (row.status === "draft") return "Draft";
  if (row.status === "archived") return "Archived";
  const start = Date.parse(row.starts_at ?? row.published_at ?? "");
  if (Number.isNaN(start)) return "Draft";
  if (start > nowMs) return "Scheduled";
  if (
    row.auto_archive_days != null &&
    start + row.auto_archive_days * DAY_MS <= nowMs
  ) {
    return "Archived";
  }
  return "Published";
}

export function rowToAnnouncement(
  row: AnnouncementRow,
  nowMs: number,
): EnhancedAnnouncement {
  return {
    id: row.id,
    title: row.title,
    body: sanitizeAnnouncementHtml(row.body),
    priority: PRIORITY_FROM_ROW[row.priority],
    status: displayStatus(row, nowMs),
    target: TARGET_FROM_ROW[row.target],
    planTierIds: row.plan_tier_ids ?? [],
    businessTypes: row.business_types ?? [],
    facilityIds: row.facility_ids ?? [],
    startsAt: row.starts_at ?? undefined,
    autoArchiveDays: row.auto_archive_days,
    author: row.author_name ?? "",
    createdAt: row.created_at,
    publishedAt: row.published_at ?? undefined,
  };
}

export function activeRowToAnnouncement(
  row: ActiveAnnouncementRow,
): FacilityAnnouncement {
  return {
    id: row.id,
    title: row.title,
    body: sanitizeAnnouncementHtml(row.body),
    priority: PRIORITY_FROM_ROW[row.priority],
    shownFrom: row.starts_at ?? row.published_at ?? "",
    read: row.read_at != null,
    dismissed: row.dismissed_at != null,
  };
}

// ── what the composer sends ─────────────────────────────────────────────────

export const announcementInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    body: z.string().max(50_000),
    priority: z.enum(["Normal", "High", "Urgent"]),
    /** Draft keeps it off every screen; publish makes it live at its start. */
    intent: z.enum(["draft", "publish"]),
    target: z.enum([
      "All Facilities",
      "By Plan Tier",
      "By Business Type",
      "Specific Facilities",
    ]),
    planTierIds: z.array(z.string().min(1)).max(50).default([]),
    businessTypes: z.array(z.string().min(1)).max(20).default([]),
    facilityIds: z.array(z.guid()).max(500).default([]),
    startsAt: z.iso.datetime({ offset: true }).nullable().default(null),
    autoArchiveDays: z.number().int().min(1).max(365).nullable().default(null),
  })
  .refine(
    (v) =>
      v.target === "All Facilities" ||
      (v.target === "By Plan Tier" && v.planTierIds.length > 0) ||
      (v.target === "By Business Type" && v.businessTypes.length > 0) ||
      (v.target === "Specific Facilities" && v.facilityIds.length > 0),
    { message: "Choose who this announcement is for." },
  );

export type AnnouncementInput = z.infer<typeof announcementInputSchema>;

/** Columns for an insert or a full update. The body is sanitised here, on write. */
export function inputToColumns(
  input: AnnouncementInput,
  existingPublishedAt: string | null,
  nowIso: string,
) {
  const publish = input.intent === "publish";
  return {
    title: input.title,
    body: sanitizeAnnouncementHtml(input.body),
    priority: input.priority.toLowerCase() as AnnouncementRow["priority"],
    status: (publish ? "published" : "draft") as AnnouncementRow["status"],
    target: TARGET_TO_ROW[input.target],
    plan_tier_ids: input.target === "By Plan Tier" ? input.planTierIds : [],
    business_types:
      input.target === "By Business Type" ? input.businessTypes : [],
    facility_ids:
      input.target === "Specific Facilities" ? input.facilityIds : [],
    starts_at: input.startsAt,
    auto_archive_days: input.autoArchiveDays,
    published_at: publish ? (existingPublishedAt ?? nowIso) : null,
  };
}
