import {
  reportCardGeneratedSchema,
  type ReportCard,
  type ReportCardGenerated,
  type ReportCardInput,
  type ReportCardService,
  type ReportCardDeliveryStatus,
} from "@/types/report-card";

// ============================================================================
// report_cards row <-> ReportCard.
//
// The joins are for DISPLAY only — a card does not own the pet's name or the
// owner's, and both are read through RLS like everything else, so a caller who
// cannot see the pet gets a card with no name rather than a name they were not
// entitled to.
// ============================================================================

export const REPORT_CARD_SELECT = `
  id, facility_id, pet_id, client_id, booking_id,
  service_type, visit_date, theme,
  input, generated,
  delivery_status, scheduled_for, sent_at,
  viewed_at, favourite, reply_message, replied_at,
  rating_stars, rating_comment, rating_submitted_at,
  created_by, created_at, updated_at,
  pets ( name ),
  clients ( name ),
  report_card_photos ( id, kind, caption, sort_order, storage_path, content_type, size_bytes )
`;

interface PhotoRow {
  id: string;
  kind: string;
  caption: string | null;
  sort_order: number;
  storage_path: string;
  content_type: string;
  size_bytes: number;
}

export interface ReportCardRow {
  id: string;
  facility_id: string;
  pet_id: string;
  client_id: string;
  booking_id: string | null;
  service_type: string;
  visit_date: string;
  theme: string | null;
  input: unknown;
  generated: unknown;
  delivery_status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  favourite: boolean;
  reply_message: string | null;
  replied_at: string | null;
  rating_stars: number | null;
  rating_comment: string | null;
  rating_submitted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // PostgREST returns a to-one relation as an OBJECT, not a one-element array.
  // Reading it as an array is what emptied the kennel board on 2026-08-20, so
  // both shapes are accepted here rather than assumed.
  pets?: { name: string } | { name: string }[] | null;
  clients?: { name: string } | { name: string }[] | null;
  report_card_photos?: PhotoRow[] | null;
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/**
 * The prose, parsed defensively.
 *
 * A card written before a section existed simply has no key for it, and a
 * missing `closingNote` must render as an empty section rather than crashing
 * the owner's page — so the schema's defaults do the work and a malformed
 * document degrades to empty rather than throwing.
 */
function toGenerated(raw: unknown): ReportCardGenerated {
  const parsed = reportCardGeneratedSchema.safeParse(raw ?? {});
  return parsed.success
    ? parsed.data
    : { todaysVibe: "", friendsAndFun: "", careMetrics: "", closingNote: "" };
}

export function rowToReportCard(row: ReportCardRow): ReportCard {
  const pet = one(row.pets);
  const client = one(row.clients);
  const ownerName = client?.name?.trim() ?? "";

  return {
    id: row.id,
    facilityId: row.facility_id,
    petId: row.pet_id,
    clientId: row.client_id,
    bookingId: row.booking_id,

    serviceType: row.service_type as ReportCardService,
    visitDate: row.visit_date,
    theme: row.theme,

    input: (row.input ?? {}) as ReportCardInput,
    generated: toGenerated(row.generated),

    deliveryStatus: row.delivery_status as ReportCardDeliveryStatus,
    scheduledFor: row.scheduled_for,
    sentAt: row.sent_at,

    viewedAt: row.viewed_at,
    favourite: row.favourite,
    replyMessage: row.reply_message,
    repliedAt: row.replied_at,
    ratingStars: row.rating_stars,
    ratingComment: row.rating_comment,
    ratingSubmittedAt: row.rating_submitted_at,

    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    photos: (row.report_card_photos ?? [])
      .map((p) => ({
        id: p.id,
        kind: p.kind as "moment" | "before" | "after",
        caption: p.caption,
        sortOrder: p.sort_order,
        storagePath: p.storage_path,
        contentType: p.content_type,
        sizeBytes: p.size_bytes,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),

    petName: pet?.name ?? undefined,
    ownerName: ownerName || undefined,
  };
}
