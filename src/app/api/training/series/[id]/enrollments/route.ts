import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import type { RealTrainingSeriesEnrollment } from "@/types/training-series";

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

  return NextResponse.json(data, { status: 201 });
}
