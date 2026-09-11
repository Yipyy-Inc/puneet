import { z } from "zod";

import type { Estimate } from "@/types/booking";

// ============================================================================
// public.estimates ⇄ the `Estimate` every estimate screen already reads.
//
// The screen type keeps its shape, so the list, the card, the drawer, the
// convert dialog and the customer pages change their SOURCE, not their markup.
// What moved:
//
//   id              the row's uuid (was "est-001")
//   estimateId      `estimate_number`, the facility's own numbering
//   clientId        the client's ref, 0 for a guest
//   petIds          the pets' refs, resolved by the route from `pet_ids`
//   estimateToken   the customer's link token
//   status          "expired" is DERIVED — a sent estimate past `expires_at`
//                   reads expired without anything having swept it
//
// Money is numeric in the table and a number here; the route never trusts a
// total it did not recompute (see `estimateTotals`).
// ============================================================================

export const ESTIMATE_SELECT =
  "id, facility_id, estimate_number, client_id, guest, pet_ids, service, service_type, start_date, end_date, check_in_time, check_out_time, room_type, line_items, subtotal, discount, discount_reason, tax_rate, tax_amount, total, deposit_required, status, token, public_note, internal_note, sent_at, sent_via, viewed_at, expires_at, accepted_at, accepted_by, accepted_on_behalf, declined_at, decline_reason, converted_at, duplicated_from, revisions, current_version, activity_log, created_by_name, created_at, updated_at, clients(ref, name, email, phone), bookings!estimates_converted_booking_id_fkey(ref)";

export interface EstimateGuest {
  name?: string;
  email?: string;
  phone?: string;
  pet?: { name?: string; breed?: string; weight?: string; notes?: string };
}

export interface EstimateRow {
  id: string;
  facility_id: string;
  estimate_number: string;
  client_id: string | null;
  guest: EstimateGuest | null;
  pet_ids: string[];
  service: string;
  service_type: string | null;
  start_date: string | null;
  end_date: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  room_type: string | null;
  line_items: Estimate["lineItems"];
  subtotal: number | string;
  discount: number | string;
  discount_reason: string | null;
  tax_rate: number | string;
  tax_amount: number | string;
  total: number | string;
  deposit_required: number | string | null;
  status: Estimate["status"];
  token: string;
  public_note: string | null;
  internal_note: string | null;
  sent_at: string | null;
  sent_via: string | null;
  viewed_at: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  accepted_by: string | null;
  accepted_on_behalf: boolean;
  declined_at: string | null;
  decline_reason: string | null;
  converted_at: string | null;
  duplicated_from: string | null;
  revisions: NonNullable<Estimate["revisions"]>;
  current_version: number;
  activity_log: NonNullable<Estimate["activityLog"]>;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  clients: {
    ref: number;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  bookings: { ref: number } | null;
}

export type PetLookup = Map<string, { ref: number; name: string }>;

const num = (v: number | string | null | undefined) =>
  v === null || v === undefined ? 0 : Number(v);

/** A sent estimate past its expiry reads expired, whatever the column says. */
export function effectiveStatus(
  row: Pick<EstimateRow, "status" | "expires_at">,
  now: number,
): Estimate["status"] {
  if (
    row.status === "sent" &&
    row.expires_at &&
    new Date(row.expires_at).getTime() <= now
  ) {
    return "expired";
  }
  return row.status;
}

export function rowToEstimate(
  row: EstimateRow,
  pets: PetLookup,
  now: number,
): Estimate {
  const guest = row.guest ?? null;
  const ownPets = row.pet_ids
    .map((id) => pets.get(id))
    .filter((p): p is { ref: number; name: string } => Boolean(p));
  const sentVia =
    row.sent_via === "email" ||
    row.sent_via === "sms" ||
    row.sent_via === "both"
      ? row.sent_via
      : undefined;

  return {
    id: row.id,
    estimateId: row.estimate_number,
    clientId: row.clients?.ref ?? 0,
    clientName: row.clients?.name ?? guest?.name ?? "",
    clientEmail: row.clients?.email ?? guest?.email ?? "",
    clientPhone: row.clients?.phone ?? guest?.phone ?? undefined,
    petIds: ownPets.map((p) => p.ref),
    petNames: ownPets.length
      ? ownPets.map((p) => p.name)
      : guest?.pet?.name
        ? [guest.pet.name]
        : [],
    service: row.service,
    serviceType: row.service_type ?? undefined,
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? row.start_date ?? "",
    notes: row.public_note ?? undefined,
    lineItems: Array.isArray(row.line_items) ? row.line_items : [],
    subtotal: num(row.subtotal),
    discount: num(row.discount),
    discountReason: row.discount_reason ?? undefined,
    taxRate: num(row.tax_rate),
    taxAmount: num(row.tax_amount),
    total: num(row.total),
    depositRequired:
      row.deposit_required === null ? undefined : num(row.deposit_required),
    status: effectiveStatus(row, now),
    sentAt: row.sent_at ?? undefined,
    sentVia,
    expiresAt: row.expires_at ?? undefined,
    createdAt: row.created_at,
    createdBy: row.created_by_name ?? "",
    convertedBookingId: row.bookings?.ref ?? undefined,
    isGuestEstimate: row.client_id === null,
    guestName: guest?.name,
    guestEmail: guest?.email,
    guestPhone: guest?.phone,
    estimateToken: row.token,
    viewedAt: row.viewed_at ?? undefined,
    publicNote: row.public_note ?? undefined,
    internalNote: row.internal_note ?? undefined,
    internalNotes: row.internal_note ?? undefined,
    roomType: row.room_type ?? undefined,
    checkInTime: row.check_in_time ?? undefined,
    checkOutTime: row.check_out_time ?? undefined,
    guestPetInfo: guest?.pet?.name
      ? {
          name: guest.pet.name,
          breed: guest.pet.breed,
          weight: guest.pet.weight,
          notes: guest.pet.notes,
        }
      : undefined,
    revisions: Array.isArray(row.revisions) ? row.revisions : [],
    currentVersion: row.current_version,
    duplicatedFrom: row.duplicated_from ?? undefined,
    acceptedAt: row.accepted_at ?? undefined,
    acceptedBy: row.accepted_by ?? undefined,
    acceptedOnBehalf: row.accepted_on_behalf,
    declinedAt: row.declined_at ?? undefined,
    declineReason: row.decline_reason ?? undefined,
    activityLog: Array.isArray(row.activity_log) ? row.activity_log : [],
  };
}

// ── Writes ────────────────────────────────────────────────────────────────

const money = z.number().finite().min(0).max(1_000_000);

export const lineItemSchema = z.object({
  label: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
  amount: z.number().finite().min(-1_000_000).max(1_000_000),
  quantity: z.number().finite().min(0).max(10_000),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** The body of an estimate: everything a quote says. */
export const estimateBodySchema = z.object({
  clientRef: z.number().int().positive().optional(),
  guest: z
    .object({
      name: z.string().trim().min(1).max(200),
      email: z.string().trim().max(320).optional(),
      phone: z.string().trim().max(40).optional(),
      pet: z
        .object({
          name: z.string().trim().max(120).optional(),
          breed: z.string().trim().max(120).optional(),
          weight: z.string().trim().max(40).optional(),
          notes: z.string().trim().max(1000).optional(),
        })
        .optional(),
    })
    .optional(),
  petRefs: z.array(z.number().int().positive()).max(20).default([]),
  service: z.string().trim().min(1).max(60),
  serviceType: z.string().trim().max(120).optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  checkInTime: z.string().trim().max(10).optional(),
  checkOutTime: z.string().trim().max(10).optional(),
  roomType: z.string().trim().max(120).optional(),
  lineItems: z.array(lineItemSchema).max(100).default([]),
  discount: money.default(0),
  discountReason: z.string().trim().max(200).optional(),
  /** A FRACTION (0.05 for 5 %), as every estimate screen already uses it. */
  taxRate: z.number().finite().min(0).max(1).default(0),
  depositRequired: money.optional(),
  publicNote: z.string().trim().max(4000).optional(),
  internalNote: z.string().trim().max(4000).optional(),
});
export type EstimateBody = z.infer<typeof estimateBodySchema>;

export const estimateCreateSchema = estimateBodySchema
  .extend({
    /** Send on creation (the wizard's "Send"), or keep as a draft. */
    send: z.boolean().default(false),
    duplicatedFrom: z.string().uuid().optional(),
  })
  .refine((b) => b.clientRef !== undefined || b.guest !== undefined, {
    message: "An estimate is for a client or a named guest.",
  });

/**
 * The totals, recomputed from the lines. A client-sent total is never stored:
 * the screen's arithmetic is a preview, the row's is the quote.
 */
export function estimateTotals(body: {
  lineItems: { amount: number; quantity: number }[];
  discount: number;
  taxRate: number;
}) {
  const round = (n: number) => Math.round(n * 100) / 100;
  const subtotal = round(
    body.lineItems.reduce((s, l) => s + l.amount * l.quantity, 0),
  );
  const discount = round(Math.min(body.discount, Math.max(subtotal, 0)));
  const taxable = Math.max(subtotal - discount, 0);
  const taxAmount = round(taxable * body.taxRate);
  return {
    subtotal: Math.max(subtotal, 0),
    discount,
    taxAmount,
    total: round(taxable + taxAmount),
  };
}

export function linesWithTotals(lines: z.infer<typeof lineItemSchema>[]) {
  return lines.map((l) => ({
    ...l,
    total: Math.round(l.amount * l.quantity * 100) / 100,
  }));
}

export const estimatePatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send"),
    via: z.enum(["email", "sms", "both", "link"]).default("link"),
  }),
  z.object({
    action: z.literal("accept_on_behalf"),
    note: z.string().trim().max(1000).optional(),
  }),
  z.object({
    action: z.literal("decline"),
    reason: z.string().trim().max(1000).optional(),
  }),
  z.object({
    action: z.literal("convert"),
    bookingRef: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("edit"),
    body: estimateBodySchema.partial(),
    changes: z.string().trim().max(500).optional(),
  }),
]);
export type EstimatePatch = z.infer<typeof estimatePatchSchema>;
