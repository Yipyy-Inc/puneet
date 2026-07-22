"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { groomingQueries, getEffectiveAlertNotes } from "@/lib/api/grooming";
import type { GroomingAppointment, GroomingStatus } from "@/types/grooming";
import {
  applyCheckInResult,
  applyMarkReadyResult,
  applyPaymentResult,
  recordStationAssignmentHistory,
} from "@/lib/grooming/check-in-actions";
import { useGroomingStations } from "@/hooks/use-grooming-stations";
import { useMobileGrooming } from "@/hooks/use-mobile-grooming";
import { useGroomingWaitlist } from "@/hooks/use-grooming-waitlist";
import { useLoyaltyEngine } from "@/hooks/use-loyalty-engine";
import { findZipTaxRate } from "@/lib/service-areas";
import { clients as initialClients } from "@/data/clients";
import {
  CheckInConfirmationDialog,
  type CheckInConfirmation,
} from "./check-in-confirmation-dialog";
import {
  MarkReadyDialog,
  type MarkReadyConfirmation,
} from "./mark-ready-dialog";
import { PaymentDialog, type PaymentResult } from "./payment-dialog";
import { NewAppointmentDialog } from "./new-appointment-dialog";
import { StatusBar } from "./check-in-board-status-bar";
import { GroomerColumn } from "./check-in-board-column";
import { WaitlistRow } from "./check-in-board-waitlist";
import { usePermission } from "@/hooks/use-facility-rbac";
import { useAssignedScope } from "@/lib/facility-permissions";
import { stylistIdForStaff } from "@/lib/api/grooming";

type DialogKind = "check-in" | "mark-ready" | "payment" | null;

/** Current local time in minutes-since-midnight, re-rendering every 30s. Null
 *  on first render for SSR/hydration parity. */
function useNowMin(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * Check-In Board — the default operational screen for the Grooming module
 * (spec Tables 12–16). Three stacked zones: today's status bar, one column
 * per active groomer, and the waitlist row. Reuses the existing status engine
 * (check-in-actions) and the same dialogs the calendar uses.
 */
export function CheckInBoard() {
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const nowMin = useNowMin();
  // Section 3C / Table 5 — hide the revenue KPI tiles from staff without
  // view_booking_financials (all-access fallback keeps them for admin).
  const canSeeAmounts = usePermission("view_booking_financials");
  // Section 5A: when view_grooming_queue resolves to assigned_only, every
  // groomer column still renders, but only the VIEWER's column carries cards +
  // action buttons. Undefined for full-access viewers (admin) → unchanged.
  const queueScope = useAssignedScope("view_grooming_queue");
  const viewerStylistId = queueScope
    ? stylistIdForStaff(queueScope)
    : undefined;

  const { data: apptData = [] } = useQuery(groomingQueries.appointments());
  const { data: stylistData = [] } = useQuery(groomingQueries.stylists());
  const { data: packageData = [] } = useQuery(groomingQueries.packages());
  const { data: customerPackages = [] } = useQuery(
    groomingQueries.customerPackages(),
  );

  const { setStationStatus } = useGroomingStations();
  const { zipTaxRates } = useMobileGrooming();
  const { entriesForDate } = useGroomingWaitlist();
  const { recordEvent } = useLoyaltyEngine();

  // Local patches over the query result so status transitions render
  // immediately and deterministically (the mock query returns a static array;
  // the calendar relies on in-place mutation, which the board avoids).
  const [patches, setPatches] = useState<Record<string, GroomingAppointment>>(
    {},
  );
  const appointments = useMemo(
    () => apptData.map((a) => patches[a.id] ?? a),
    [apptData, patches],
  );

  const [packageFilter, setPackageFilter] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertPrefill, setConvertPrefill] = useState<{
    ownerName: string;
    ownerPhone: string;
    ownerEmail: string;
  } | null>(null);

  const activeAppt = activeId
    ? (appointments.find((a) => a.id === activeId) ?? null)
    : null;

  const todayAppointments = useMemo(
    () => appointments.filter((a) => a.date === todayStr),
    [appointments, todayStr],
  );

  // Effective alert counts (own + pet carry-forward) per today appointment.
  const alertCountById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of todayAppointments) {
      const notes = getEffectiveAlertNotes(a, appointments);
      if (notes.length > 0) map[a.id] = notes.length;
    }
    return map;
  }, [todayAppointments, appointments]);

  const counts = useMemo(() => {
    const active = todayAppointments.filter(
      (a) => a.status !== "cancelled" && a.status !== "no-show",
    );
    const by = (s: GroomingStatus) =>
      todayAppointments.filter((a) => a.status === s).length;
    return {
      totalBooked: active.length,
      checkedIn: by("checked-in"),
      inProgress: by("in-progress"),
      ready: by("ready-for-pickup"),
      completed: by("completed"),
      noShows: by("no-show"),
      expectedRevenue: active.reduce((s, a) => s + a.totalPrice, 0),
      collectedRevenue: todayAppointments
        .filter((a) => a.status === "completed")
        .reduce((s, a) => s + a.totalPrice, 0),
    };
  }, [todayAppointments]);

  const activeStylists = useMemo(
    () => stylistData.filter((s) => s.status === "active"),
    [stylistData],
  );

  const packagePills = useMemo(
    () =>
      packageData
        .filter((p) => p.isActive)
        .map((p) => ({ id: p.id, name: p.name })),
    [packageData],
  );

  const waitlistToday = useMemo(
    () =>
      entriesForDate(todayStr).filter(
        (e) => (e.status ?? "waiting") === "waiting" || e.status === "offered",
      ),
    [entriesForDate, todayStr],
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const notify = (title: string, detail: { description: string }) =>
    toast.message(title, detail);

  function patch(next: GroomingAppointment) {
    setPatches((prev) => ({ ...prev, [next.id]: next }));
  }

  function closeDialog() {
    setDialog(null);
    setActiveId(null);
  }

  function handleCheckInConfirm(result: CheckInConfirmation) {
    if (!activeAppt) return;
    if (result.markNoShow) {
      patch({ ...activeAppt, status: "no-show" });
      toast.warning(`${activeAppt.petName} — No-Show`);
      closeDialog();
      return;
    }
    const next = { ...activeAppt };
    applyCheckInResult(next, result, {
      clients: initialClients,
      setStationStatus,
      notify,
    });
    recordStationAssignmentHistory(next, result.stationName, "You");
    next.status = "checked-in";
    patch(next);
    toast.success(`${activeAppt.petName} — Checked In`, {
      description: `Station ${result.stationName}`,
    });
    closeDialog();
  }

  function handleStart(apt: GroomingAppointment) {
    const now = new Date().toISOString();
    const baseIntake = apt.intake ?? {
      coatCondition: "normal" as const,
      behaviorNotes: "",
      allergies: apt.allergies,
      specialInstructions: apt.specialInstructions,
      beforePhotos: [],
      mattingFeeWarning: false,
    };
    patch({
      ...apt,
      status: "in-progress",
      intake: {
        ...baseIntake,
        sessionStartedAt: baseIntake.sessionStartedAt ?? now,
      },
    });
    toast.success(`${apt.petName} — Grooming started`);
  }

  function handleMarkReadyConfirm(result: MarkReadyConfirmation) {
    if (!activeAppt) return;
    const next = { ...activeAppt };
    applyMarkReadyResult(next, result, {
      clients: initialClients,
      setStationStatus,
      notify,
      facilityName: "Yipyy",
    });
    next.status = "ready-for-pickup";
    patch(next);
    toast.success(`${activeAppt.petName} — Ready for Pickup`);
    closeDialog();
  }

  function handlePaymentConfirm(result: PaymentResult) {
    if (!activeAppt) return;
    const next = { ...activeAppt };
    const summary = applyPaymentResult(next, result, {
      clients: initialClients,
      setStationStatus,
      notify,
      facilityName: "Yipyy",
    });
    // applyPaymentResult already sets status = "completed".
    patch(next);
    recordEvent({
      type: "booking_completed",
      id: String(activeAppt.id),
      customerId: activeAppt.ownerId,
      amount: summary.grandTotal,
      serviceType: "grooming",
      isService: true,
    });
    toast.success(`${activeAppt.petName} — Completed`, {
      description: `$${summary.amountCharged.toFixed(2)} charged`,
    });
    closeDialog();
  }

  // Payment dialog dependencies for the active appointment.
  const paymentClient = activeAppt
    ? initialClients.find((c) => c.id === activeAppt.ownerId)
    : undefined;
  const matchedTax = findZipTaxRate(
    zipTaxRates,
    paymentClient?.address?.zip ?? "",
  );
  const paymentTaxRate = matchedTax ? matchedTax.ratePercent / 100 : 0;
  const applicablePasses = activeAppt
    ? customerPackages.filter(
        (p) =>
          p.customerId === activeAppt.ownerId &&
          p.status === "active" &&
          p.passesTotal - p.passesUsed > 0 &&
          p.passes.some((pass) => pass.moduleId === "grooming"),
      )
    : [];

  const columnActions = {
    onCheckIn: (a: GroomingAppointment) => {
      setActiveId(a.id);
      setDialog("check-in");
    },
    onStart: handleStart,
    onMarkReady: (a: GroomingAppointment) => {
      setActiveId(a.id);
      setDialog("mark-ready");
    },
    onCheckOut: (a: GroomingAppointment) => {
      setActiveId(a.id);
      setDialog("payment");
    },
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Check-In Board</h2>
        <p className="text-muted-foreground text-sm">
          Live floor view for today — reception and groomers start the day here.
        </p>
      </div>

      {/* Zone 1 · Today's Status Bar */}
      <StatusBar
        counts={counts}
        packages={packagePills}
        activeFilter={packageFilter}
        onFilter={setPackageFilter}
        canSeeAmounts={canSeeAmounts}
      />

      {/* Zone 2 · Groomer Columns */}
      {activeStylists.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
          No active groomers today.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {activeStylists.map((stylist) => {
            const dayAppts = todayAppointments
              .filter((a) => a.stylistId === stylist.id)
              .filter(
                (a) => packageFilter === "all" || a.packageId === packageFilter,
              )
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            const activeCount = todayAppointments.filter(
              (a) =>
                a.stylistId === stylist.id &&
                a.status !== "cancelled" &&
                a.status !== "no-show",
            ).length;
            // 5A: scoped viewers see every column, but cards + actions only in
            // their own. The column header (name + count) still renders so the
            // board reads the same as admin's.
            const isOwnColumn =
              viewerStylistId == null || stylist.id === viewerStylistId;
            return (
              <GroomerColumn
                key={stylist.id}
                name={stylist.name}
                photoUrl={stylist.photoUrl}
                count={activeCount}
                appointments={isOwnColumn ? dayAppts : []}
                alertCountById={alertCountById}
                nowMin={nowMin}
                actions={columnActions}
                restricted={!isOwnColumn}
              />
            );
          })}
        </div>
      )}

      {/* Zone 3 · Waitlist Row */}
      <WaitlistRow
        entries={waitlistToday}
        onConvert={(e) => {
          setConvertPrefill({
            ownerName: e.ownerName,
            ownerPhone: e.ownerPhone,
            ownerEmail: e.ownerEmail ?? "",
          });
          setConvertOpen(true);
          toast.success(`Booking ${e.petName} from waitlist`);
        }}
      />

      {/* Dialogs (shared with the calendar) */}
      <CheckInConfirmationDialog
        open={dialog === "check-in"}
        onOpenChange={(o) => !o && closeDialog()}
        apt={dialog === "check-in" ? activeAppt : null}
        onConfirm={handleCheckInConfirm}
      />
      <MarkReadyDialog
        open={dialog === "mark-ready"}
        onOpenChange={(o) => !o && closeDialog()}
        apt={dialog === "mark-ready" ? activeAppt : null}
        taxRate={paymentTaxRate}
        facilityName="Yipyy"
        onConfirm={handleMarkReadyConfirm}
      />
      <PaymentDialog
        open={dialog === "payment"}
        onOpenChange={(o) => !o && closeDialog()}
        apt={dialog === "payment" ? activeAppt : null}
        client={paymentClient}
        applicableCustomerPackages={applicablePasses}
        taxRate={paymentTaxRate}
        onConfirm={handlePaymentConfirm}
      />
      <NewAppointmentDialog
        open={convertOpen}
        onOpenChange={(o) => {
          setConvertOpen(o);
          if (!o) setConvertPrefill(null);
        }}
        defaultDate={todayStr}
        prefillClient={convertPrefill ?? undefined}
      />
    </div>
  );
}
