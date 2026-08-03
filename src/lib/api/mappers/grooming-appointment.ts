import type {
  GroomingAppointment,
  GroomingStatus,
  CoatType,
} from "@/types/grooming";
import type { PetSize } from "@/types/base";
import type { PriceAdjustment } from "@/types/grooming";

// ============================================================================
// bookings + grooming_appointments → the GroomingAppointment the screens read.
//
// ── THE STATUS MAP IS THE WHOLE REASON THIS EXTENSION DESIGN WORKS ─────────
//
// booking_status already spells the grooming lifecycle, 1:1. Written out rather
// than assumed, because it is the load-bearing claim of 20260805140000:
//
//   confirmed  → scheduled          checked_in  → checked-in
//   in_progress→ in-progress        ready       → ready-for-pickup
//   completed  → completed          no_show     → no-show
//   cancelled  → cancelled
//
// The statuses with no grooming meaning (pending, estimate_sent,
// request_submitted, waitlisted, declined) all read as `scheduled`: from a
// groomer's side of the counter, a booking that is not yet confirmed and one
// that is are the same thing — a pet that has not arrived.
//
// ── FIELDS WITH NO COLUMN BEHIND THEM ──────────────────────────────────────
//
// Listed so they are a decision rather than a discovery:
//
//   intake, afterPhotos, expressCheckinSubmission, groomingProgress,
//   additionalPets, additionalStylistIds, stages, alertNotes, ticketComments,
//   history          — none built. All optional; all omitted.
//   lastGroomDate    — derivable from the client's booking history, but that is
//                      a query per row and no screen has asked for it yet.
//   paymentMethod, appliedStoreCredit, appliedPackagePassId
//                    — the payment model does not exist. `paymentStatus` and
//                      `tipAmount` DO map, because bookings already carries
//                      them.
//
// ── stylistId IS THE STAFF LEGACY ID HERE ──────────────────────────────────
//
// The screens compare `appointment.stylistId` against the mock `stylists` list
// (`stylist-001`…), which links to staff via `staffId`. That mapping lives in
// src/lib/api/grooming.ts as `stylistIdForStaff`, on the CLIENT, so the mapper
// emits the staff legacy id and the query factory remaps it. Doing the join
// here would mean teaching the server about a mock array; doing it in the
// factory keeps the seam in one place, next to the function that already owns
// it.
// ============================================================================

const STATUS_MAP: Record<string, GroomingStatus> = {
  confirmed: "scheduled",
  checked_in: "checked-in",
  in_progress: "in-progress",
  ready: "ready-for-pickup",
  completed: "completed",
  no_show: "no-show",
  cancelled: "cancelled",
};

export function toGroomingStatus(bookingStatus: string): GroomingStatus {
  return STATUS_MAP[bookingStatus] ?? "scheduled";
}

/** The reverse, for writes. Only the transitions a groomer performs. */
export const GROOMING_STATUS_TO_BOOKING: Record<string, string> = {
  scheduled: "confirmed",
  "checked-in": "checked_in",
  "in-progress": "in_progress",
  "ready-for-pickup": "ready",
  completed: "completed",
  "no-show": "no_show",
  cancelled: "cancelled",
};

export interface SizeTier {
  id: string;
  label: string;
  maxWeightLbs?: number;
}

/**
 * Weight → the facility's own size label (Decision 2 of 20260805100000).
 *
 * Tiers are ascending and the LAST one has no ceiling ("and everything
 * heavier"), so the loop returns the first tier the weight fits and falls
 * through to the last. A pet with no recorded weight returns undefined rather
 * than guessing `medium` — the booking screens show a size chip, and an
 * invented one is worse than a missing one when it drives the price.
 */
export function sizeForWeight(
  weightLbs: number | null | undefined,
  tiers: SizeTier[],
): PetSize | undefined {
  if (weightLbs == null || tiers.length === 0) return undefined;
  for (const tier of tiers) {
    if (tier.maxWeightLbs == null || weightLbs <= tier.maxWeightLbs) {
      return tier.id as PetSize;
    }
  }
  return tiers[tiers.length - 1].id as PetSize;
}

export interface AppointmentRow {
  ref: number;
  status: string;
  start_at: string;
  end_at: string;
  payment_status: string;
  base_price: number;
  total_cost: number;
  tip_amount: number | null;
  special_requests: string | null;
  created_at: string;
  assigned_staff_id: string | null;
  assigned_staff_name: string | null;
  staff: { legacy_id: string | null } | null;
  client: {
    ref: number;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  booking_pets:
    | {
        pets: {
          ref: number;
          name: string;
          breed: string | null;
          weight: number | null;
          coat_type: string | null;
          allergies: string | null;
          image_url: string | null;
        } | null;
      }[]
    | null;
  grooming_appointments: {
    service_name: string;
    size_label: string | null;
    service_price: number;
    service_duration_min: number;
    check_in_at: string | null;
    check_out_at: string | null;
    estimated_ready_at: string | null;
    owner_eta_notified_at: string | null;
    groomer_notes: string;
    service: { legacy_id: string | null } | null;
    station: { legacy_id: string | null; id: string } | null;
    grooming_appointment_add_ons: { name: string }[] | null;
    grooming_price_adjustments:
      | {
          id: string;
          reason: string;
          amount: number;
          note: string;
          custom_reason: string | null;
          customer_notified: boolean;
          notified_at: string | null;
          created_at: string;
        }[]
      | null;
  } | null;
}

/** HH:MM in the facility's timezone. The screens compare these as strings and
 *  render them directly, so the conversion has to happen once, here, rather
 *  than each component reaching for a different Date method. */
function hhmm(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(iso));
}

/** YYYY-MM-DD in the facility's timezone — the key the board filters today on. */
function ymd(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

export function rowToGroomingAppointment(
  row: AppointmentRow,
  opts: { timeZone: string; tiers: SizeTier[] },
): GroomingAppointment {
  const ext = row.grooming_appointments;
  const pet = row.booking_pets?.[0]?.pets ?? null;

  // The size SOLD is the snapshot on the appointment; only fall back to
  // deriving it when there is no extension row yet (a grooming booking made
  // before this table existed). Deriving over a snapshot would let a later
  // change to the facility's tiers rewrite what a past groom was charged as.
  const size =
    (ext?.size_label as PetSize | undefined) ??
    sizeForWeight(pet?.weight, opts.tiers);

  return {
    id: String(row.ref),
    date: ymd(row.start_at, opts.timeZone),
    startTime: hhmm(row.start_at, opts.timeZone),
    endTime: hhmm(row.end_at, opts.timeZone),

    petId: pet?.ref ?? 0,
    petName: pet?.name ?? "Unknown pet",
    petBreed: pet?.breed ?? "",
    petSize: (size ?? "medium") as PetSize,
    petWeight: pet?.weight != null ? Number(pet.weight) : 0,
    coatType: (pet?.coat_type ?? "medium") as CoatType,
    ...(pet?.image_url ? { petPhotoUrl: pet.image_url } : {}),

    ownerId: row.client?.ref ?? 0,
    ownerName: row.client?.name ?? "",
    ownerPhone: row.client?.phone ?? "",
    ownerEmail: row.client?.email ?? "",

    // The STAFF legacy id. The query factory remaps it to a stylist id — see
    // the header.
    stylistId: row.staff?.legacy_id ?? "",
    stylistName: row.assigned_staff_name ?? "",
    ...(ext?.station?.legacy_id
      ? { stationId: ext.station.legacy_id }
      : ext?.station?.id
        ? { stationId: ext.station.id }
        : {}),

    packageId: ext?.service?.legacy_id ?? "",
    packageName: ext?.service_name ?? row.status,
    addOns: (ext?.grooming_appointment_add_ons ?? []).map((a) => a.name),

    basePrice: Number(ext?.service_price ?? row.base_price),
    // The reasons ARE the app's own enum now — 20260805210000 replaced the set
    // slice 2 invented with priceAdjustmentReasonEnum, so no translation
    // happens here and none should.
    priceAdjustments: (ext?.grooming_price_adjustments ?? []).map((adj) => ({
      id: adj.id,
      amount: Number(adj.amount),
      reason: adj.reason as PriceAdjustment["reason"],
      ...(adj.custom_reason ? { customReason: adj.custom_reason } : {}),
      description: adj.note,
      // The actor is stored as a uuid; resolving it to a name is a profiles
      // lookup no screen has asked for yet, and an empty string renders as
      // nothing rather than as somebody wrong.
      addedBy: "",
      addedAt: adj.created_at,
      customerNotified: adj.customer_notified,
      ...(adj.notified_at ? { notifiedAt: adj.notified_at } : {}),
    })),
    totalPrice: Number(row.total_cost),

    status: toGroomingStatus(row.status),
    checkInTime: ext?.check_in_at ?? null,
    checkOutTime: ext?.check_out_at ?? null,
    ...(ext?.estimated_ready_at
      ? { estimatedReadyTime: hhmm(ext.estimated_ready_at, opts.timeZone) }
      : {}),
    ...(ext?.owner_eta_notified_at
      ? { ownerEtaNotifiedAt: ext.owner_eta_notified_at }
      : {}),

    paymentStatus: row.payment_status as GroomingAppointment["paymentStatus"],
    ...(row.tip_amount != null ? { tipAmount: Number(row.tip_amount) } : {}),

    notes: ext?.groomer_notes ?? "",
    specialInstructions: row.special_requests ?? "",
    // `pets.allergies` is free text, one field. Split so the chips render, and
    // emptied rather than producing [""] for a pet with none.
    allergies: (pet?.allergies ?? "")
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean),

    createdAt: row.created_at,
    // Nothing records the channel yet. False is the safer default: it means the
    // screens treat these as staff-made, which is what they were.
    onlineBooking: false,
  } as GroomingAppointment;
}

/** The select the route issues. Kept beside the row type so the two cannot
 *  drift — a column added here without a field there fails to compile. */
export const APPOINTMENT_SELECT = `
  ref, status, start_at, end_at, payment_status, base_price, total_cost,
  tip_amount, special_requests, created_at,
  assigned_staff_id, assigned_staff_name,
  staff:assigned_staff_id ( legacy_id ),
  client:client_id ( ref, name, email, phone ),
  booking_pets ( pets ( ref, name, breed, weight, coat_type, allergies, image_url ) ),
  grooming_appointments (
    service_name, size_label, service_price, service_duration_min,
    check_in_at, check_out_at, estimated_ready_at, owner_eta_notified_at,
    groomer_notes,
    service:service_id ( legacy_id ),
    station:station_id ( id, legacy_id ),
    grooming_appointment_add_ons ( name ),
    grooming_price_adjustments ( id, reason, amount, note, custom_reason,
                                 customer_notified, notified_at, created_at )
  )
` as const;
