import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { vaccinationLines } from "@/lib/bookings/wizard/vaccination-check";
import { settingsFromRows } from "@/lib/settings/from-rows";
import type { EvaluationConfig, VaccinationRule } from "@/types/facility";
import type { VaccinationRecord } from "@/types/pet";

// ============================================================================
// What a server does with an evaluation booking that it does with no other
// (the client's mock, 2026-10-02):
//
//   its evaluator   a staff row holding "Run evaluations" here — checked,
//                   never taken on the client's word. A customer's choice
//                   is a preference in `details` until the booking is
//                   confirmed (the database clears staff on a customer's
//                   insert), and is applied then.
//   its vaccines    "Confirm instantly — if the slot is free and vaccines
//                   are on file": the vaccines the services it unlocks ask
//                   for, on file for every pet on the evaluation's day.
// ============================================================================

export interface Evaluator {
  staffId: string;
  name: string;
}

/** The evaluator, if they run evaluations at this facility. */
export async function evaluatorFor(
  client: SupabaseClient,
  facilityId: string,
  evaluatorId: string | null | undefined,
): Promise<Evaluator | null> {
  if (!evaluatorId) return null;
  const { data } = await client.rpc("facility_evaluators", {
    p_facility_id: facilityId,
  });
  const row = (
    (data ?? []) as Array<{
      staff_id: string;
      first_name: string | null;
      last_name: string | null;
    }>
  ).find((evaluator) => evaluator.staff_id === evaluatorId);
  if (!row) return null;
  return {
    staffId: row.staff_id,
    name: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim(),
  };
}

/**
 * Give confirmed evaluation bookings the evaluator their customer chose,
 * where the facility lets clients choose and nobody is assigned yet. Called
 * by whoever confirmed them — staff approving, or the auto-confirm under the
 * service role. Best effort: an evaluation without an evaluator is
 * "Unassigned" on the Evaluations page, and whoever starts it takes it.
 */
export async function applyEvaluatorPreference(
  client: SupabaseClient,
  bookingIds: readonly string[],
): Promise<void> {
  if (bookingIds.length === 0) return;
  const { data } = await client
    .from("bookings")
    .select("id, facility_id, service, assigned_staff_id, details")
    .in("id", bookingIds as string[])
    .eq("service", "evaluation")
    .is("assigned_staff_id", null);
  for (const row of (data ?? []) as Array<{
    id: string;
    facility_id: string;
    details: Record<string, unknown> | null;
  }>) {
    const preferred = row.details?.["evaluatorId"];
    if (typeof preferred !== "string") continue;
    const config = await evaluationConfigOf(client, row.facility_id);
    if (!config.customerPicksEvaluator) continue;
    const evaluator = await evaluatorFor(client, row.facility_id, preferred);
    if (!evaluator) continue;
    // rls-write-ok: best effort — an evaluation left unassigned is a
    // correct state (the page shows "Unassigned"), not a failed request.
    await client
      .from("bookings")
      .update({
        assigned_staff_id: evaluator.staffId,
        assigned_staff_name: evaluator.name,
      })
      .eq("id", row.id)
      .is("assigned_staff_id", null);
  }
}

export async function evaluationConfigOf(
  client: SupabaseClient,
  facilityId: string,
): Promise<EvaluationConfig> {
  const { data } = await client
    .from("facility_settings")
    .select("domain, value")
    .eq("facility_id", facilityId)
    .eq("domain", "evaluation_config");
  return settingsFromRows(
    (data ?? []) as Array<{ domain: string; value: unknown }>,
  ).evaluation_config.value as EvaluationConfig;
}

/**
 * Every pet on the booking has the vaccines the services the evaluation
 * unlocks require, on file on its day. True when the facility asks for none.
 */
export async function evaluationVaccinesOnFile(
  admin: SupabaseClient,
  input: {
    facilityId: string;
    bookingId: string;
    /** The evaluation's day, YYYY-MM-DD. */
    day: string;
    /** The services it unlocks (`details.evaluationFor`). */
    unlocks: readonly string[];
  },
): Promise<boolean> {
  const [{ data: settingRows }, { data: petRows }] = await Promise.all([
    admin
      .from("facility_settings")
      .select("domain, value")
      .eq("facility_id", input.facilityId)
      .eq("domain", "vaccination_rules"),
    admin
      .from("booking_pets")
      .select("pets!inner(id, ref, name, species)")
      .eq("booking_id", input.bookingId),
  ]);
  const rules = settingsFromRows(
    (settingRows ?? []) as Array<{ domain: string; value: unknown }>,
  ).vaccination_rules.value as VaccinationRule[];
  const pets = (
    (petRows ?? []) as unknown as Array<{
      pets: { id: string; ref: number; name: string; species: string | null };
    }>
  ).map((row) => row.pets);
  if (pets.length === 0) return false;

  const { data: records } = await admin
    .from("pet_vaccinations")
    .select("pet_id, vaccine_name, expires_on, status")
    .in(
      "pet_id",
      pets.map((pet) => pet.id),
    );
  const refOf = new Map(pets.map((pet) => [pet.id, pet.ref]));
  const lines = vaccinationLines({
    pets: pets.map(
      (pet) =>
        ({
          id: pet.ref,
          name: pet.name,
          type: pet.species ?? "",
        }) as never,
    ),
    records: (
      (records ?? []) as Array<{
        pet_id: string;
        vaccine_name: string;
        expires_on: string | null;
        status: VaccinationRecord["status"];
      }>
    ).map(
      (record) =>
        ({
          petId: refOf.get(record.pet_id) ?? 0,
          vaccineName: record.vaccine_name,
          expiryDate: record.expires_on ?? "",
          status: record.status,
        }) as VaccinationRecord,
    ),
    rules,
    service: input.unlocks,
    firstDay: input.day,
    lastDay: input.day,
  });
  return lines.every((line) => line.state !== "missing");
}
