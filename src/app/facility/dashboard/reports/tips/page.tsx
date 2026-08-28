import type { Metadata } from "next";
import { forbidden } from "next/navigation";

import { activeAdminFacility } from "@/lib/api/facility-context";
import { createServerClient } from "@/lib/supabase/server";
import { paymentChannel } from "@/lib/payments/channel";

import {
  TipsReport,
  type TipRow,
  type StaffRow,
} from "./_components/tips-report";

export const metadata: Metadata = { title: "Tips — Reports — Yipyy" };
export const dynamic = "force-dynamic";

// ============================================================================
// What was tipped, who earned it, and whether they have been paid.
//
// ── A SERVER COMPONENT, READ THROUGH THE CALLER'S OWN CLIENT ──────────────
//
// Never the service role. This is a screen, and RLS is the authorisation
// boundary — reading a facility's payroll with a key that bypasses it would
// mean the page decided who may see it, which is exactly the mistake
// `check:facility-from-session` exists to prevent one layer up.
//
// ── THE SOURCE IS DERIVED, NOT STORED ─────────────────────────────────────
//
// The specification asked for a "source" flag on the tip, Terminal or Online.
// `paymentChannel()` already answers that from the processor and entry method
// (lib/payments/channel.ts), and it asks the PROCESSOR rather than `method` —
// which matters, because a card taken on the terminal and a card taken online
// are both `method = 'card'`. Adding a column would have been a second answer
// to a question already answered, free to drift.
//
// ── UNASSIGNED IS A NUMBER, NOT AN ABSENCE ────────────────────────────────
//
// A tip on a booking with nobody assigned gets no allocation row at all (see
// the trigger in 20260827140000). If this page joined allocations and dropped
// the misses, that money would silently vanish from every total — so the tips
// are the spine of the query and the allocations hang off them.
// ============================================================================

/** Six months, matching the Reports hub it is opened from. */
const WINDOW_MONTHS = 6;

interface PaymentRow {
  id: string;
  tip: number | string;
  method: string | null;
  processor: string | null;
  entry_method: string | null;
  created_at: string;
  booking_id: string | null;
  bookings: {
    ref: number;
    service: string | null;
    total_cost: number | string | null;
    clients: { name: string | null } | null;
    booking_pets: { pets: { name: string | null } | null }[] | null;
  } | null;
}

interface AllocationRow {
  booking_id: string;
  staff_id: string;
  amount: number | string;
  source: string;
  paid_at: string | null;
  staff: { first_name: string | null; last_name: string | null } | null;
}

export default async function TipsReportPage() {
  const active = await activeAdminFacility();
  if (active.kind !== "resolved") forbidden();

  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - WINDOW_MONTHS);

  const supabase = await createServerClient();

  // `!inner` on bookings: a tip with no booking cannot be attributed to a
  // service or a groomer and has no place on this report. Without it PostgREST
  // returns the payment with a null relation and the row renders as a blank.
  const { data: paymentsData } = await supabase
    .from("payments")
    .select(
      "id, tip, method, processor, entry_method, created_at, booking_id, " +
        "bookings!inner(ref, service, total_cost, clients(name), booking_pets(pets(name)))",
    )
    .eq("facility_id", active.facility.id)
    .neq("tip", 0)
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .order("created_at", { ascending: false })
    .limit(2000);

  const payments = (paymentsData ?? []) as unknown as PaymentRow[];

  const bookingIds = [
    ...new Set(payments.map((p) => p.booking_id).filter(Boolean)),
  ] as string[];

  const { data: allocationData } = bookingIds.length
    ? await supabase
        .from("booking_tip_allocations")
        .select(
          "booking_id, staff_id, amount, source, paid_at, staff(first_name, last_name)",
        )
        .in("booking_id", bookingIds)
    : { data: [] };

  const allocations = (allocationData ?? []) as unknown as AllocationRow[];
  const byBooking = new Map<string, AllocationRow[]>();
  for (const a of allocations) {
    byBooking.set(a.booking_id, [...(byBooking.get(a.booking_id) ?? []), a]);
  }

  const staffName = (a: AllocationRow) =>
    [a.staff?.first_name, a.staff?.last_name].filter(Boolean).join(" ") ||
    "Unknown";

  // ── One row per PAYMENT, because that is where the money is ─────────────
  //
  // Not per booking: two payments on one booking are two tips, taken at
  // different moments and possibly through different channels, and collapsing
  // them would hide a terminal top-up behind an online tip.
  const rows: TipRow[] = payments.map((p) => {
    const allocated = p.booking_id ? (byBooking.get(p.booking_id) ?? []) : [];
    const channel = paymentChannel({
      processor: p.processor,
      entry_method: p.entry_method,
      method: p.method,
    });
    return {
      id: p.id,
      date: p.created_at,
      bookingRef: p.bookings?.ref ?? null,
      clientName: p.bookings?.clients?.name ?? null,
      petName:
        p.bookings?.booking_pets
          ?.map((bp) => bp.pets?.name)
          .filter(Boolean)[0] ?? null,
      service: p.bookings?.service ?? null,
      tip: Number(p.tip),
      bookingTotal: Number(p.bookings?.total_cost ?? 0),
      source:
        channel === "in_person"
          ? "Terminal"
          : channel === "online"
            ? "Online"
            : "Other",
      // Every name owed a share of this booking's tips. Usually one.
      attributedTo: allocated.map(staffName),
    };
  });

  // ── The payout view ────────────────────────────────────────────────────
  //
  // Built from the ALLOCATIONS, not from the tips: what a facility owes a
  // groomer is the sum of what was attributed to them, which is not the same as
  // the sum of tips on bookings they appear on once a manual split exists.
  const staffTotals = new Map<string, StaffRow>();
  for (const a of allocations) {
    const key = a.staff_id;
    const existing = staffTotals.get(key) ?? {
      staffId: key,
      name: staffName(a),
      bookings: 0,
      total: 0,
      unpaid: 0,
    };
    existing.bookings += 1;
    existing.total += Number(a.amount);
    if (!a.paid_at) existing.unpaid += Number(a.amount);
    staffTotals.set(key, existing);
  }

  return (
    <TipsReport
      facilityId={active.facility.id}
      rows={rows}
      staff={[...staffTotals.values()].sort((a, b) => b.total - a.total)}
      rangeLabel={`${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}`}
    />
  );
}
