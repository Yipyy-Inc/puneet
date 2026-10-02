import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeEnrolmentCare } from "@/lib/api/enrolment-care";
import { writeFailure } from "@/lib/api/write-failure";
import { applyBookingCareCharges } from "@/lib/payments/booking-care-charges";
import { autoConfirmCustomerBookings } from "@/lib/bookings/auto-confirm";
import { collectDepositOnConfirm } from "@/lib/payments/booking-deposit-server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { bookingCareSchema, type BookingCare } from "@/types/booking";
import type { RealTrainingSeriesEnrollment } from "@/types/training-series";
import { z } from "zod";

export const dynamic = "force-dynamic";

interface EnrollmentRow {
  id: string;
  series_id: string;
  status: RealTrainingSeriesEnrollment["status"];
  enrolled_at: string;
  pets: { id: string; ref: number; name: string } | null;
  clients: { id: string; ref: number; name: string } | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("training_series_enrollments")
    .select(
      "id, series_id, status, enrolled_at, pets(id, ref, name), clients(id, ref, name)",
    )
    .eq("series_id", id)
    .order("enrolled_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as EnrollmentRow[];

  const enrollments: RealTrainingSeriesEnrollment[] = rows.map((row) => ({
    id: row.id,
    seriesId: row.series_id,
    petId: row.pets?.id ?? "",
    petRef: row.pets?.ref ?? null,
    petName: row.pets?.name ?? null,
    clientId: row.clients?.id ?? "",
    clientRef: row.clients?.ref ?? null,
    clientName: row.clients?.name ?? null,
    status: row.status,
    enrolledAt: row.enrolled_at,
  }));

  return NextResponse.json(enrollments);
}

interface EnrollInput {
  clientId: number;
  petId: number;
  joinWaitlist?: boolean;
  /** The pet's feeding and medications for the class (2026-10-01). */
  care?: unknown;
  intake?: unknown;
  depositCardId?: unknown;
}

/** The booking wizard's Goals step: what the trainer reads first. */
const intakeSchema = z.object({
  goals: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  experience: z.enum(["none", "some", "lots"]).nullable().optional(),
  notes: z.string().max(2000).optional(),
});

interface EnrollRpcResult {
  enrollment: { id: string };
  bookings?: { bookingId: string }[];
}

/**
 * Enroll a pet. Both a staff member (naming any client at their facility) and
 * a customer (only ever naming their own record -- RLS on `clients` admits
 * nothing else) reach this the same way `POST /api/bookings` already
 * resolves a caller's client: by ref, through RLS, never by trusting an id
 * the request supplies directly.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id: seriesId } = await params;

  const input = (await request.json().catch(() => null)) as EnrollInput | null;
  if (!input?.clientId || !input.petId) {
    return NextResponse.json(
      { error: "A client and a pet are both required." },
      { status: 422 },
    );
  }

  // The booking form's care steps, for every session the enrolment books —
  // the four care fields and nothing else (lib/api/enrolment-care.ts).
  let care: BookingCare | undefined;
  if (input.care !== undefined && input.care !== null) {
    const parsed = bookingCareSchema.safeParse(input.care);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "The feeding or medication instructions could not be read." },
        { status: 422 },
      );
    }
    care = parsed.data;
  }

  // What the owner asked the trainer to work on — words, bounded.
  const intake = intakeSchema.safeParse(input.intake ?? {});
  const intakeDetails =
    intake.success && input.intake
      ? {
          ...(intake.data.goals?.length
            ? { trainingGoals: intake.data.goals }
            : {}),
          ...(intake.data.experience
            ? { trainingExperience: intake.data.experience }
            : {}),
          ...(intake.data.notes?.trim()
            ? { trainerNotes: intake.data.notes.trim() }
            : {}),
        }
      : {};

  const supabase = await createServerClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("ref", input.clientId)
    .maybeSingle();
  if (!client) {
    return NextResponse.json(
      { error: `No client ${input.clientId} you can enroll for.` },
      { status: 422 },
    );
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("id, client_id")
    .eq("ref", input.petId)
    .maybeSingle();
  if (!pet) {
    return NextResponse.json(
      { error: `No pet ${input.petId} you can enroll.` },
      { status: 422 },
    );
  }
  if (pet.client_id !== client.id) {
    return NextResponse.json(
      { error: "That pet is not registered to this client." },
      { status: 403 },
    );
  }

  const { data, error } = await supabase.rpc("enroll_in_training_series", {
    p_series_id: seriesId,
    p_pet_id: pet.id,
    p_client_id: client.id,
    p_join_waitlist: input.joinWaitlist ?? false,
  });

  if (error) {
    if (error.code === "22023" && error.message.includes("full")) {
      return NextResponse.json(
        { error: "This series is full. Join the waitlist instead." },
        { status: 409 },
      );
    }
    return writeFailure(error, {
      denied: "Not allowed to enroll in training classes at this facility.",
      duplicate: "This pet is already enrolled (or waitlisted) in this series.",
    });
  }

  // ── THE PET'S CARE, ON EVERY SESSION IT WAS BOOKED INTO ────────────────
  //
  // Then the care charges, from the facility's settings and those sessions —
  // the medication fee once for the enrolment, by the same function the
  // booking form quoted with (lib/payments/booking-care-charges.ts). The
  // enrolment stands if the care does not save: it is said, not undone.
  const result = data as unknown as EnrollRpcResult;
  const bookingIds = (result.bookings ?? []).map(
    (booking) => booking.bookingId,
  );
  // A customer's class request carries the card the deposit is charged to
  // at confirmation — checked against the client and its consent then.
  const depositCardId =
    typeof input.depositCardId === "string" &&
    /^[0-9a-f-]{36}$/i.test(input.depositCardId)
      ? input.depositCardId
      : null;
  if (depositCardId) {
    (intakeDetails as Record<string, unknown>).depositCardId = depositCardId;
  }
  const hasIntake = Object.keys(intakeDetails).length > 0;
  if ((care || hasIntake) && bookingIds.length > 0) {
    const written = await writeEnrolmentCare({
      enrollmentId: result.enrollment.id,
      bookingIds,
      care,
      extra: intakeDetails,
    });
    if (!written.ok) {
      return NextResponse.json(
        { ...result, careNotSaved: true },
        { status: 201 },
      );
    }
    if (care) await applyBookingCareCharges(bookingIds, "initial");
  }

  // ── ONE ENROLMENT IS ONE REQUEST ───────────────────────────────────────
  //
  // Its sessions' bookings carry the enrolment as their group (2026-10-02),
  // as a multi-day booking's parts do: staff approve or decline a customer's
  // class request whole, a deposit is the class's, spread over its sessions,
  // and a facility that confirms training on arrival confirms all of them.
  if (bookingIds.length > 0 && hasServiceRoleKey()) {
    const admin = createAdminClient();
    const { data: rows } = await admin
      .from("bookings")
      .select("id, details, status")
      .in("id", bookingIds);
    const byId = new Map(
      (
        (rows ?? []) as Array<{
          id: string;
          details: Record<string, unknown> | null;
          status: string;
        }>
      ).map((row) => [row.id, row]),
    );
    for (const [index, bookingId] of bookingIds.entries()) {
      const row = byId.get(bookingId);
      if (!row) continue;
      // rls-write-ok: the service role, on bookings this enrolment just made;
      // RLS cannot refuse it, and a missed group is a request decided by day.
      await admin
        .from("bookings")
        .update({
          details: {
            ...(row.details ?? {}),
            bookingGroup: {
              id: result.enrollment.id,
              part: index + 1,
              of: bookingIds.length,
            },
          },
        } as never)
        .eq("id", bookingId);
    }
    // A customer's enrolment is a request; the facility's own rule may
    // confirm it now, and then its deposit is taken.
    if ([...byId.values()].some((row) => row.status === "request_submitted")) {
      const confirmed = await autoConfirmCustomerBookings(bookingIds);
      if (confirmed > 0) {
        await collectDepositOnConfirm({
          bookingIds,
          request,
          createdBy: user.id,
        });
      }
    }
  }

  // The sessions' booking numbers, in order: what a pass from a pack is
  // redeemed against (the booking wizard, 2026-10-01).
  let bookingRefs: number[] = [];
  if (bookingIds.length > 0) {
    const { data: refs } = await supabase
      .from("bookings")
      .select("id, ref")
      .in("id", bookingIds);
    const refOf = new Map(
      ((refs ?? []) as Array<{ id: string; ref: number }>).map((r) => [
        r.id,
        r.ref,
      ]),
    );
    bookingRefs = bookingIds
      .map((id) => refOf.get(id))
      .filter((ref): ref is number => typeof ref === "number");
  }

  return NextResponse.json(
    { ...(data as object), bookingRefs },
    { status: 201 },
  );
}
