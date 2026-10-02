import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  bookedServiceSince,
  passRateOf,
  sortAllRows,
  viewerMayReview,
  visitReason,
} from "@/lib/evaluations/board";
import type {
  AllRow,
  BoardClient,
  BoardPet,
  BoardViewer,
  CardStatus,
  EvaluationStatus,
  EvaluationsBoard,
  QueueRow,
  SentRow,
  TodayVisit,
} from "@/lib/evaluations/board-types";
import { evaluationServicesRequired } from "@/lib/evaluations/requirement-server";
import type { EvaluationResult } from "@/lib/evaluations/questions";
import {
  DEFAULT_TIMEZONE,
  instantFromWallClock,
  wallClockParts,
} from "@/lib/time/facility-time";

// ============================================================================
// Operations › Evaluations for ONE facility — the client's mock (2026-10-02):
//
//   Today              each pet of each evaluation booked today, with its
//                      evaluation if one was started
//   To review          cards finished and waiting for a reviewer
//   Sent to owners     the last cards out, opened or not, booked since or not
//   All evaluations    every evaluation, and the pets only booked so far
//
// Read through the member's own session: RLS says which rows they may see,
// and every query names the facility, so someone in two facilities — or a
// platform admin — sees this one only.
// ============================================================================

/** A booking in these states is on the day's list. */
const ON_THE_DAY = [
  "pending",
  "confirmed",
  "checked_in",
  "in_progress",
  "ready",
  "completed",
];

const PET = "id, ref, name, breed, species, image_url";
const CLIENT = "id, ref, name";

interface PetRow {
  id: string;
  ref: number;
  name: string;
  breed: string | null;
  species: string | null;
  image_url: string | null;
}

interface ClientRow {
  id: string;
  ref: number;
  name: string;
}

interface EvaluationRow {
  id: string;
  booking_id: string | null;
  pet_id: string;
  evaluator_staff_id: string | null;
  evaluator_name: string;
  status: EvaluationStatus;
  card_status: CardStatus;
  result: EvaluationResult | null;
  approved_services: string[] | null;
  returned_comment: string | null;
  completed_at: string | null;
  submitted_at: string | null;
  sent_at: string | null;
  sent_by_name: string | null;
  auto_sent: boolean;
  opened_at: string | null;
  pets: PetRow | null;
  clients: ClientRow | null;
}

interface BookingRow {
  id: string;
  ref: number;
  start_at: string;
  assigned_staff_name: string | null;
  details: Record<string, unknown> | null;
  clients: ClientRow | null;
  booking_pets: Array<{ pets: PetRow | null }> | null;
}

const EVALUATION_COLUMNS = `id, booking_id, pet_id, evaluator_staff_id, evaluator_name, status,
  card_status, result, approved_services, returned_comment, completed_at, submitted_at,
  sent_at, sent_by_name, auto_sent, opened_at, pets(${PET}), clients(${CLIENT})`;

const BOOKING_COLUMNS = `id, ref, start_at, assigned_staff_name, details,
  clients(${CLIENT}), booking_pets(pets(${PET}))`;

function pet(row: PetRow): BoardPet {
  return {
    id: row.id,
    ref: Number(row.ref),
    name: row.name,
    breed: row.breed,
    species: row.species,
    imageUrl: row.image_url,
  };
}

function client(row: ClientRow): BoardClient {
  return { id: row.id, ref: Number(row.ref), name: row.name };
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function evaluationsBoard(
  supabase: SupabaseClient,
  facilityId: string,
  now: Date = new Date(),
): Promise<EvaluationsBoard> {
  const { data: facility } = await supabase
    .from("facilities")
    .select("timezone")
    .eq("id", facilityId)
    .maybeSingle();
  const timeZone =
    (facility as { timezone?: string | null } | null)?.timezone ||
    DEFAULT_TIMEZONE;
  const today = wallClockParts(now.toISOString(), timeZone).date;
  const tomorrow = new Date(`${today}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const dayStart = instantFromWallClock(today, "00:00", timeZone);
  const dayEnd = instantFromWallClock(
    tomorrow.toISOString().slice(0, 10),
    "00:00",
    timeZone,
  );
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86_400_000).toISOString();

  const [
    todayBookings,
    upcomingBookings,
    waitingRows,
    sentRows,
    allRows,
    recentResults,
    viewerRows,
    required,
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select(BOOKING_COLUMNS)
      .eq("facility_id", facilityId)
      .eq("service", "evaluation")
      .in("status", ON_THE_DAY)
      .gte("start_at", dayStart)
      .lt("start_at", dayEnd)
      .order("start_at"),
    supabase
      .from("bookings")
      .select(BOOKING_COLUMNS)
      .eq("facility_id", facilityId)
      .eq("service", "evaluation")
      .in("status", ON_THE_DAY)
      .gte("start_at", dayStart)
      .order("start_at")
      .limit(200),
    supabase
      .from("evaluations")
      .select(EVALUATION_COLUMNS)
      .eq("facility_id", facilityId)
      .eq("card_status", "in_review")
      .order("submitted_at")
      .limit(200),
    supabase
      .from("evaluations")
      .select(EVALUATION_COLUMNS)
      .eq("facility_id", facilityId)
      .eq("card_status", "sent")
      .order("sent_at", { ascending: false })
      .limit(50),
    supabase
      .from("evaluations")
      .select(EVALUATION_COLUMNS)
      .eq("facility_id", facilityId)
      .order("started_at", { ascending: false })
      .limit(500),
    supabase
      .from("evaluations")
      .select("result")
      .eq("facility_id", facilityId)
      .eq("status", "completed")
      .gte("completed_at", ninetyDaysAgo),
    supabase.rpc("evaluation_viewer", { p_facility_id: facilityId }),
    evaluationServicesRequired(supabase, facilityId),
  ]);

  const viewerRow = (
    (viewerRows.data ?? []) as Array<{
      may_run: boolean;
      may_review: boolean;
      may_self_send: boolean;
      staff_id: string | null;
    }>
  )[0];
  const viewer: BoardViewer = {
    mayRun: viewerRow?.may_run ?? false,
    mayReview: viewerRow?.may_review ?? false,
    maySelfSend: viewerRow?.may_self_send ?? false,
    staffId: viewerRow?.staff_id ?? null,
  };

  const evaluations = (allRows.data ?? []) as unknown as EvaluationRow[];
  const byBookingPet = new Map(
    evaluations
      .filter((row) => row.booking_id)
      .map((row) => [`${row.booking_id}:${row.pet_id}`, row]),
  );

  // How many times each pet of today's was evaluated before: earlier rows,
  // and the results recorded on the pet before evaluations were rows.
  const todays = (todayBookings.data ?? []) as unknown as BookingRow[];
  const todayPetIds = [
    ...new Set(
      todays.flatMap((booking) =>
        (booking.booking_pets ?? []).flatMap((link) =>
          link.pets ? [link.pets.id] : [],
        ),
      ),
    ),
  ];
  const earlier = new Map<string, number>();
  if (todayPetIds.length > 0) {
    const { data: recorded } = await supabase
      .from("pets")
      .select("id, evaluations:details->evaluations")
      .in("id", todayPetIds);
    for (const row of (recorded ?? []) as Array<{
      id: string;
      evaluations: unknown;
    }>) {
      earlier.set(
        row.id,
        Array.isArray(row.evaluations) ? row.evaluations.length : 0,
      );
    }
  }

  const visits: TodayVisit[] = todays.flatMap((booking) =>
    (booking.booking_pets ?? []).flatMap((link) => {
      if (!link.pets || !booking.clients) return [];
      const row = byBookingPet.get(`${booking.id}:${link.pets.id}`);
      const before =
        (earlier.get(link.pets.id) ?? 0) +
        evaluations.filter(
          (other) =>
            other.pet_id === link.pets!.id &&
            other.booking_id !== booking.id &&
            other.status === "completed",
        ).length;
      const own = stringList(booking.details?.["evaluationFor"]);
      return [
        {
          bookingId: booking.id,
          bookingRef: Number(booking.ref),
          startAt: booking.start_at,
          pet: pet(link.pets),
          client: client(booking.clients),
          unlocks: own.length > 0 ? own : required,
          reason: visitReason(before),
          assignedName: booking.assigned_staff_name,
          evaluation: row
            ? {
                id: row.id,
                status: row.status,
                cardStatus: row.card_status,
                evaluatorName: row.evaluator_name,
                returnedComment: row.returned_comment,
                result: row.result,
              }
            : null,
        },
      ];
    }),
  );

  const waiting: QueueRow[] = (
    (waitingRows.data ?? []) as unknown as EvaluationRow[]
  ).flatMap((row) =>
    row.pets && row.clients
      ? [
          {
            id: row.id,
            pet: pet(row.pets),
            client: client(row.clients),
            evaluatorName: row.evaluator_name,
            submittedAt: row.submitted_at ?? row.completed_at ?? "",
            result: row.result,
            mayReview: viewerMayReview(viewer, row.evaluator_staff_id),
          },
        ]
      : [],
  );

  // What each pet sent a card was booked for since.
  const sentEvaluations = (sentRows.data ?? []) as unknown as EvaluationRow[];
  const sentPetIds = [...new Set(sentEvaluations.map((row) => row.pet_id))];
  const oldestSent = sentEvaluations
    .map((row) => row.sent_at ?? "")
    .filter(Boolean)
    .sort()[0];
  const bookedSince = new Map<
    string,
    Array<{ service: string; createdAt: string }>
  >();
  if (sentPetIds.length > 0 && oldestSent) {
    const { data: later } = await supabase
      .from("bookings")
      .select("service, created_at, booking_pets!inner(pet_id)")
      .eq("facility_id", facilityId)
      .neq("service", "evaluation")
      .not("status", "in", "(cancelled,declined)")
      .gte("created_at", oldestSent)
      .in("booking_pets.pet_id", sentPetIds)
      .limit(500);
    for (const booking of (later ?? []) as Array<{
      service: string;
      created_at: string;
      booking_pets: Array<{ pet_id: string }>;
    }>) {
      for (const link of booking.booking_pets ?? []) {
        const list = bookedSince.get(link.pet_id) ?? [];
        list.push({ service: booking.service, createdAt: booking.created_at });
        bookedSince.set(link.pet_id, list);
      }
    }
  }

  const sent: SentRow[] = sentEvaluations.flatMap((row) =>
    row.pets && row.clients && row.sent_at
      ? [
          {
            id: row.id,
            pet: pet(row.pets),
            client: client(row.clients),
            sentAt: row.sent_at,
            sentByName: row.auto_sent ? null : row.sent_by_name,
            autoSent: row.auto_sent,
            result: row.result,
            openedAt: row.opened_at,
            bookedService: bookedServiceSince({
              sentAt: row.sent_at,
              approvedServices: row.approved_services ?? [],
              bookings: bookedSince.get(row.pet_id) ?? [],
            }),
          },
        ]
      : [],
  );

  const all: AllRow[] = evaluations.flatMap((row) =>
    row.pets && row.clients
      ? [
          {
            key: row.id,
            evaluationId: row.id,
            pet: pet(row.pets),
            client: client(row.clients),
            state:
              row.card_status === "sent"
                ? "sent"
                : row.card_status === "in_review"
                  ? "in_review"
                  : "in_progress",
            result: row.status === "completed" ? row.result : null,
            completedAt: row.completed_at,
            scheduledAt: null,
            evaluatorName: row.evaluator_name || null,
            approvedServices: row.approved_services ?? [],
          } satisfies AllRow,
        ]
      : [],
  );
  for (const booking of (upcomingBookings.data ??
    []) as unknown as BookingRow[]) {
    for (const link of booking.booking_pets ?? []) {
      if (!link.pets || !booking.clients) continue;
      if (byBookingPet.has(`${booking.id}:${link.pets.id}`)) continue;
      all.push({
        key: `${booking.id}:${link.pets.id}`,
        evaluationId: null,
        pet: pet(link.pets),
        client: client(booking.clients),
        state: "scheduled",
        result: null,
        completedAt: null,
        scheduledAt: booking.start_at,
        evaluatorName: booking.assigned_staff_name,
        approvedServices: [],
      });
    }
  }

  const results = (
    (recentResults.data ?? []) as Array<{ result: EvaluationResult | null }>
  ).map((row) => row.result);

  return {
    timeZone,
    today,
    visits,
    stats: {
      scheduled: visits.length,
      completed: visits.filter(
        (visit) => visit.evaluation?.status === "completed",
      ).length,
      toReview: waiting.length,
      passRate: passRateOf(results),
    },
    waiting,
    sent,
    all: sortAllRows(all),
    viewer,
  };
}
