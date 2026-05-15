"use client";

import { useEffect, useMemo, useState } from "react";
import type { GroomingAppointment } from "@/types/grooming";
import { getEffectiveAlertNotes } from "@/lib/api/grooming";
import type { TimeBlock } from "./time-block-dialog";

type PrintableStylist = { id: string; name: string; status: string };

function formatDateLong(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

type Row =
  | {
      kind: "appointment";
      sortKey: number;
      time: string;
      petName: string;
      petBreed: string;
      service: string;
      ownerName: string;
      ownerPhone: string;
      price: number;
      alertCount: number;
      alertSummary: string;
      notes: string;
    }
  | {
      kind: "block";
      sortKey: number;
      time: string;
      reason: string;
      notes?: string;
    };

/**
 * Compact daily summary — one row per appointment with totals header. Gated
 * by `active` so the calendar's print picker can choose between the day
 * summary and the per-card layout without one bleeding into the other.
 */
export function PrintableDaySheet({
  date,
  appointments,
  timeBlocks,
  stylists,
  active = true,
  allAppointments,
}: {
  date: string;
  appointments: GroomingAppointment[];
  timeBlocks: TimeBlock[];
  stylists: PrintableStylist[];
  /**
   * When false, the section is excluded from `print:block` rendering so
   * other printable layouts (appointment cards) can take over the print
   * surface without producing two printouts at once.
   */
  active?: boolean;
  /**
   * Full appointments list — used for alert-note carry-forward resolution
   * when displaying alert counts. Defaults to the filtered `appointments`
   * list when not provided.
   */
  allAppointments?: GroomingAppointment[];
}) {
  const dayAppointments = appointments.filter(
    (a) => a.date === date && a.status !== "cancelled" && a.status !== "no-show",
  );
  const dayBlocks = timeBlocks.filter((b) => b.date === date);

  const activeStylists = stylists.filter((s) => s.status === "active");

  // Summary totals — appointments, distinct pets, expected revenue.
  const totals = useMemo(() => {
    const distinctPetIds = new Set(dayAppointments.map((a) => a.petId));
    const revenue = dayAppointments.reduce((s, a) => s + a.totalPrice, 0);
    return {
      appointments: dayAppointments.length,
      pets: distinctPetIds.size,
      revenue,
    };
  }, [dayAppointments]);

  // Printed-at footer string. Gated by mount so SSR and first client render
  // agree (new Date() drifts between server render and hydration).
  const [printedAt, setPrintedAt] = useState("");
  useEffect(() => {
    setPrintedAt(new Date().toLocaleString("en-CA"));
  }, []);

  if (!active) return null;

  return (
    <div
      // Visible only when printing; the regular calendar gets print:hidden.
      className="hidden print:block bg-white text-black"
    >
      <header className="mb-4 border-b-2 border-black pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold leading-tight">
              Daily Grooming Schedule
            </h1>
            <p className="text-base">{formatDateLong(date)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-gray-600">
              Totals
            </p>
            <p className="text-sm font-semibold tabular-nums">
              {totals.appointments} appt
              {totals.appointments === 1 ? "" : "s"} · {totals.pets} pet
              {totals.pets === 1 ? "" : "s"}
            </p>
            <p className="text-sm font-semibold tabular-nums">
              Revenue ${totals.revenue.toFixed(0)}
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-5">
        {activeStylists.map((stylist) => {
          const stylistAppts = dayAppointments.filter(
            (a) => a.stylistId === stylist.id,
          );
          const stylistBlocks = dayBlocks.filter(
            (b) => b.stylistId === stylist.id,
          );
          if (stylistAppts.length === 0 && stylistBlocks.length === 0) {
            return null;
          }

          const rows: Row[] = [
            ...stylistAppts.map<Row>((a) => {
              const effectiveAlerts = getEffectiveAlertNotes(
                a,
                allAppointments ?? appointments,
              );
              return {
                kind: "appointment",
                sortKey: timeToMinutes(a.startTime),
                time: `${a.startTime}–${a.endTime}`,
                petName: a.petName,
                petBreed: a.petBreed,
                service: a.packageName,
                ownerName: a.ownerName,
                ownerPhone: a.ownerPhone,
                price: a.totalPrice,
                alertCount: effectiveAlerts.length,
                alertSummary: effectiveAlerts
                  .map((n) => n.text)
                  .join(" · "),
                notes: [
                  a.allergies.length > 0
                    ? `Allergies: ${a.allergies.join(", ")}`
                    : "",
                  a.specialInstructions,
                ]
                  .filter(Boolean)
                  .join(" · "),
              };
            }),
            ...stylistBlocks.map<Row>((b) => ({
              kind: "block",
              sortKey: timeToMinutes(b.startTime),
              time: `${b.startTime}–${b.endTime}`,
              reason: b.reason,
              notes: b.notes,
            })),
          ].sort((a, b) => a.sortKey - b.sortKey);

          return (
            <section
              key={stylist.id}
              className="break-inside-avoid"
            >
              <h2 className="mb-1 border-b border-black pb-0.5 text-lg font-bold">
                {stylist.name}
                <span className="ml-2 text-sm font-normal text-gray-700">
                  ({stylistAppts.length} appt
                  {stylistAppts.length === 1 ? "" : "s"})
                </span>
              </h2>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-black text-left">
                    <th className="w-[10%] py-1 pr-2">Time</th>
                    <th className="w-[18%] py-1 pr-2">Pet</th>
                    <th className="w-[18%] py-1 pr-2">Service</th>
                    <th className="w-[16%] py-1 pr-2">Owner</th>
                    <th className="w-[14%] py-1 pr-2">Phone</th>
                    <th className="w-[8%] py-1 pr-2 text-right">$</th>
                    <th className="w-[16%] py-1">Alerts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    if (row.kind === "block") {
                      return (
                        <tr
                          key={`b-${i}`}
                          className="border-b border-gray-300 italic text-gray-700"
                        >
                          <td className="py-1 pr-2 align-top tabular-nums">
                            {row.time}
                          </td>
                          <td className="py-1 pr-2 align-top" colSpan={6}>
                            BLOCKED · <span className="capitalize">{row.reason}</span>
                            {row.notes ? ` — ${row.notes}` : ""}
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr
                        key={`a-${i}`}
                        className="border-b border-gray-300 align-top"
                      >
                        <td className="py-1 pr-2 tabular-nums">{row.time}</td>
                        <td className="py-1 pr-2">
                          <div className="font-semibold">{row.petName}</div>
                          <div className="text-[10px] text-gray-600">
                            {row.petBreed}
                          </div>
                        </td>
                        <td className="py-1 pr-2">{row.service}</td>
                        <td className="py-1 pr-2">{row.ownerName}</td>
                        <td className="py-1 pr-2 tabular-nums">
                          {row.ownerPhone}
                        </td>
                        <td className="py-1 pr-2 text-right tabular-nums font-semibold">
                          ${row.price}
                        </td>
                        <td className="py-1">
                          {row.alertCount > 0 ? (
                            <span
                              className="font-bold text-black"
                              title={row.alertSummary}
                            >
                              ⚠ {row.alertCount}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {rows.some(
                    (r) =>
                      r.kind === "appointment" && (r.notes || r.alertSummary),
                  ) && (
                    <tr>
                      <td colSpan={7} className="pt-1 text-[10px] text-gray-600">
                        {rows
                          .filter(
                            (r): r is Extract<Row, { kind: "appointment" }> =>
                              r.kind === "appointment" &&
                              (!!r.notes || !!r.alertSummary),
                          )
                          .map((r) => {
                            const parts = [r.notes, r.alertSummary].filter(
                              Boolean,
                            );
                            return `${r.petName}: ${parts.join(" · ")}`;
                          })
                          .join(" | ")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          );
        })}

        {dayAppointments.length === 0 && dayBlocks.length === 0 && (
          <p className="text-sm italic text-gray-600">
            No appointments scheduled for this day.
          </p>
        )}
      </div>

      <footer className="mt-6 border-t border-gray-400 pt-2 text-[10px] text-gray-500">
        Printed {printedAt}
      </footer>
    </div>
  );
}
