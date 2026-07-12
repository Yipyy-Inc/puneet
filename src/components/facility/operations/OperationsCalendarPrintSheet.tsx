"use client";

import {
  formatPetLabel,
  formatTimeLabel,
  getEventsForDay,
  type OperationsCalendarEvent,
} from "@/lib/operations-calendar";

// Scoped print rules — mirrors the Daily Care print sheet. This <style> only
// exists in the DOM while the calendar is mounted, so the "hide everything but
// the sheet" rules never affect printing on other pages. The <thead> gives a
// running header the browser repeats on every printed page.
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #ops-print-sheet, #ops-print-sheet * { visibility: visible !important; }
  #ops-print-sheet {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    color: #000;
  }
  #ops-print-sheet table { page-break-inside: auto; }
  #ops-print-sheet tr { page-break-inside: avoid; }
  @page { margin: 14mm 12mm; }
}
`;

export interface DayPrintRow {
  time: string;
  pet: string;
  owner: string;
  service: string;
  addOns: string;
  staff: string;
  status: string;
}

// The day's schedulable appointments (bookings + evaluations), sorted by time.
export function buildDayPrintRows(
  events: OperationsCalendarEvent[],
  day: Date,
): DayPrintRow[] {
  return getEventsForDay(events, day)
    .filter((event) => event.type === "booking" && !event.isSubEvent)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((event) => ({
      time: event.allDay ? "All day" : formatTimeLabel(event.start),
      pet: formatPetLabel(event.petNames) || event.title,
      owner: event.customerName ?? "—",
      service: event.service,
      addOns:
        event.addOns.length > 0
          ? event.addOns.map((addOn) => addOn.name).join(", ")
          : "—",
      staff: event.staff && event.staff !== "Unassigned" ? event.staff : "—",
      status: event.status,
    }));
}

const PRINT_COLUMNS: Array<{ key: keyof DayPrintRow; label: string }> = [
  { key: "time", label: "Time" },
  { key: "pet", label: "Pet" },
  { key: "owner", label: "Owner" },
  { key: "service", label: "Service" },
  { key: "addOns", label: "Add-Ons" },
  { key: "staff", label: "Staff" },
  { key: "status", label: "Status" },
];

// Flatten the day's rows into text lines for the minimal-PDF generator.
export function buildDayPdfLines(rows: DayPrintRow[]): string[] {
  if (rows.length === 0) return ["No appointments scheduled for this day."];
  return rows.map((row) =>
    [
      row.time,
      row.pet,
      row.owner,
      row.service,
      row.addOns !== "—" ? `+ ${row.addOns}` : "",
      row.staff,
      row.status,
    ]
      .filter(Boolean)
      .join("  ·  "),
  );
}

/**
 * Print-only day sheet (spec 8.8 / Task 48 / Table 93). Hidden on screen
 * (`hidden`) and shown only for print (`print:block`); the scoped CSS excludes
 * all app chrome so `window.print()` yields a clean B&W table.
 */
export function OperationsCalendarPrintSheet({
  facilityName,
  day,
  printedAt,
  printedBy,
  rows,
}: {
  facilityName: string;
  day: Date;
  printedAt: string;
  printedBy: string;
  rows: DayPrintRow[];
}) {
  const dateLabel = day.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div id="ops-print-sheet" className="hidden text-black print:block">
      <style>{PRINT_CSS}</style>
      <div className="mb-2 border-b-2 border-black pb-1">
        <p className="text-[13px] font-bold">
          {facilityName} · Daily Schedule · {dateLabel}
        </p>
        <p className="text-[10px]">
          {rows.length} appointment{rows.length === 1 ? "" : "s"} · Printed{" "}
          {printedAt || "—"}
          {printedBy ? ` by ${printedBy}` : ""}
        </p>
      </div>

      <table className="w-full border-collapse text-[11px] leading-snug">
        <thead>
          <tr>
            {PRINT_COLUMNS.map((column) => (
              <th
                key={column.key}
                className="border-b-2 border-black p-1 text-left font-bold"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="align-top">
              {PRINT_COLUMNS.map((column) => (
                <td key={column.key} className="border-b border-black/30 p-1">
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={PRINT_COLUMNS.length}
                className="py-4 text-center italic"
              >
                No appointments scheduled for this day.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
