"use client";

import type { GroomingAppointment } from "@/types/grooming";
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
      notes: string;
    }
  | {
      kind: "block";
      sortKey: number;
      time: string;
      reason: string;
      notes?: string;
    };

export function PrintableDaySheet({
  date,
  appointments,
  timeBlocks,
  stylists,
}: {
  date: string;
  appointments: GroomingAppointment[];
  timeBlocks: TimeBlock[];
  stylists: PrintableStylist[];
}) {
  const dayAppointments = appointments.filter(
    (a) => a.date === date && a.status !== "cancelled" && a.status !== "no-show",
  );
  const dayBlocks = timeBlocks.filter((b) => b.date === date);

  const activeStylists = stylists.filter((s) => s.status === "active");

  return (
    <div
      // Visible only when printing; the regular calendar gets print:hidden.
      className="hidden print:block bg-white text-black"
    >
      <header className="mb-5 border-b-2 border-black pb-3">
        <h1 className="text-2xl font-bold leading-tight">
          Daily Grooming Schedule
        </h1>
        <p className="text-base">{formatDateLong(date)}</p>
        <p className="text-xs text-gray-600">
          {dayAppointments.length} appointment
          {dayAppointments.length === 1 ? "" : "s"}
          {dayBlocks.length > 0 &&
            ` · ${dayBlocks.length} blocked slot${dayBlocks.length === 1 ? "" : "s"}`}
        </p>
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
            ...stylistAppts.map<Row>((a) => ({
              kind: "appointment",
              sortKey: timeToMinutes(a.startTime),
              time: `${a.startTime}–${a.endTime}`,
              petName: a.petName,
              petBreed: a.petBreed,
              service: a.packageName,
              ownerName: a.ownerName,
              ownerPhone: a.ownerPhone,
              notes: [
                a.allergies.length > 0
                  ? `Allergies: ${a.allergies.join(", ")}`
                  : "",
                a.specialInstructions,
              ]
                .filter(Boolean)
                .join(" · "),
            })),
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
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black text-left">
                    <th className="w-[15%] py-1 pr-2">Time</th>
                    <th className="w-[22%] py-1 pr-2">Pet</th>
                    <th className="w-[23%] py-1 pr-2">Service</th>
                    <th className="w-[20%] py-1 pr-2">Owner</th>
                    <th className="w-[20%] py-1">Phone</th>
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
                          <td className="py-1 pr-2 align-top" colSpan={4}>
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
                          <div className="text-xs text-gray-600">
                            {row.petBreed}
                          </div>
                        </td>
                        <td className="py-1 pr-2">{row.service}</td>
                        <td className="py-1 pr-2">{row.ownerName}</td>
                        <td className="py-1 tabular-nums">{row.ownerPhone}</td>
                      </tr>
                    );
                  })}
                  {rows.some((r) => r.kind === "appointment" && r.notes) && (
                    <tr>
                      <td colSpan={5} className="pt-1 text-xs text-gray-600">
                        {rows
                          .filter(
                            (r): r is Extract<Row, { kind: "appointment" }> =>
                              r.kind === "appointment" && !!r.notes,
                          )
                          .map((r) => `${r.petName}: ${r.notes}`)
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
        Printed {new Date().toLocaleString("en-CA")}
      </footer>
    </div>
  );
}
