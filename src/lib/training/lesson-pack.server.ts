import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { trainingProgramsSchema } from "@/lib/settings/training-programs";
import { packOptions } from "@/lib/training/program-offer";
import type { TrainingPackage } from "@/types/training";

// ============================================================================
// A lesson pack's sessions still to book, as passes the client owns (the
// booking wizard, 2026-10-01). The first session is booked at the pack's
// price, so the money sits on a booking; the rest are a package at $0 with a
// training pool of (sessions − 1) passes per dog. Written by staff's wizard
// (/api/training/lesson-packs) and when staff approve a customer's request
// for a pack (/api/bookings/{ref}/decision).
//
// The sessions are the PROGRAM's own: a pack the facility does not sell is
// refused, whatever was asked for. Inserted as the caller — RLS lets a
// package through for `financial_take_payment`, as for any sale.
// ============================================================================

export type LessonPackResult =
  | { ok: true; id: string; passes: number }
  | { ok: false; status: number; error: string };

/** The facility's program, from its own settings. */
async function facilityProgram(
  supabase: SupabaseClient,
  facilityId: string,
  programId: string,
): Promise<TrainingPackage | null> {
  const { data } = await supabase
    .from("facility_settings")
    .select("value")
    .eq("facility_id", facilityId)
    .eq("domain", "training_programs")
    .maybeSingle();
  const parsed = trainingProgramsSchema.safeParse(data?.value ?? {});
  return parsed.success
    ? (parsed.data.programs.find((p) => p.id === programId) ?? null)
    : null;
}

export async function grantLessonPack(input: {
  supabase: SupabaseClient;
  facilityId: string;
  /** The client row's uuid. */
  clientId: string;
  programId: string;
  sessions: number;
  pets: number;
  packageName: string;
}): Promise<LessonPackResult> {
  const program = await facilityProgram(
    input.supabase,
    input.facilityId,
    input.programId,
  );
  if (!program) return { ok: false, status: 404, error: "No such program." };
  if (!packOptions(program).some((p) => p.sessions === input.sessions)) {
    return {
      ok: false,
      status: 422,
      error: "That program is not sold in packs of that size.",
    };
  }

  const expires = new Date();
  expires.setDate(expires.getDate() + Math.max(1, program.validityDays || 90));
  const { data: owned, error } = await input.supabase
    .from("customer_packages")
    .insert({
      facility_id: input.facilityId,
      client_id: input.clientId,
      package_name: input.packageName.trim().slice(0, 160) || program.name,
      price_paid: 0,
      expires_at: expires.toISOString(),
    })
    .select("id")
    .single();
  if (error || !owned) {
    return {
      ok: false,
      status: error?.code === "42501" ? 403 : 500,
      error:
        error?.code === "42501"
          ? "Not allowed to sell packages at this facility."
          : (error?.message ?? "The pack was not saved."),
    };
  }

  const passes = (input.sessions - 1) * Math.max(1, input.pets);
  const { error: lineError } = await input.supabase
    .from("customer_package_lines")
    .insert({
      customer_package_id: (owned as { id: string }).id,
      service_id: program.id,
      service_name: program.name,
      passes_total: passes,
      module: "training",
    });
  if (lineError) {
    return { ok: false, status: 500, error: lineError.message };
  }
  return { ok: true, id: (owned as { id: string }).id, passes };
}
