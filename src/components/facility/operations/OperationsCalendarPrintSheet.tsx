"use client";

import {
  formatPetLabel,
  formatTimeLabel,
  getEventsForDay,
  type OperationsCalendarEvent,
} from "@/lib/operations-calendar";
import { useStaffText } from "@/lib/staff/use-staff-text";

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

// A function rather than a const: the labels are translated, and a module
// -level array is evaluated before any translator exists.
function printColumns(
  t: (key: string) => string,
): Array<{ key: keyof DayPrintRow; label: string }> {
  return [
    { key: "time", label: t("colTime") },
    { key: "pet", label: t("colPet") },
    { key: "owner", label: t("colOwner") },
    { key: "service", label: t("colService") },
    { key: "addOns", label: t("colAddOns") },
    { key: "staff", label: t("colStaff") },
    { key: "status", label: t("colStatus") },
  ];
}

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
  const { t, fill, locale } = useStaffText("opsCalendar");
  const columns = printColumns(t);
  // Was "en-US": a French reader got "Monday, September 20" on a sheet they
  // print and hand to somebody. §5q — the reader's locale, never a literal.
  const dateLabel = day.toLocaleDateString(
    locale === "fr" ? "fr-CA" : "en-CA",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  );

  return (
    <div id="ops-print-sheet" className="hidden text-black print:block">
      <style>{PRINT_CSS}</style>
      <div className="mb-2 border-b border-black pb-1">
        <p className="text-[13px] font-bold">
          {facilityName} · {t("dailySchedule")} · {dateLabel}
        </p>
        <p className="text-[10px]">
          {fill(rows.length === 1 ? "appointmentsOne" : "appointmentsMany", {
            count: rows.length,
          })}
          {" · "}
          {fill("printedAtLabel", { when: printedAt || "—" })}
          {printedBy ? ` ${fill("printedByLabel", { who: printedBy })}` : ""}
        </p>
      </div>

      <table className="w-full border-collapse text-[11px] leading-snug">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="border-b border-black p-1 text-left font-bold"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="align-top">
              {columns.map((column) => (
                <td key={column.key} className="border-b border-black/30 p-1">
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-4 text-center italic">
                {t("noAppointmentsToday")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
