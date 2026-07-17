// Mock "Tomorrow's Schedule" evening summary (Spec Tables 77–80).
//
// A real deployment would fire these once each evening (default 6 PM,
// configurable) as an SMS + email to every working groomer. There is no cron
// or real channel here — these pure builders produce the exact SMS string and
// an email-preview HTML from a groomer + date + the appointment book, so the
// Groomers tab can render a "Preview tomorrow's summary" for any stylist.
//
// CRITICAL (Table 80): per-appointment alert notes (bite risk, medication,
// special handling) are pulled from `getEffectiveAlertNotes` and surfaced as
// their own lines — they must never be dropped.

import type { GroomingAppointment } from "@/types/grooming";
import { getEffectiveAlertNotes } from "@/lib/api/grooming";

// Default evening send time (Table 77) — configurable per facility. Kept here
// so the preview header matches what a real scheduled send would stamp.
export const DEFAULT_SUMMARY_SEND_TIME = "18:00";

export interface TomorrowSummaryAppointment {
  /** 1-based position in the day. */
  index: number;
  /** 12-hour start time, e.g. "9:00 AM". */
  time: string;
  petName: string;
  petBreed: string;
  /** The booked package/service name. */
  service: string;
  ownerName: string;
  ownerPhone: string;
  addOns: string[];
  price: number;
  /** Effective alert-note texts for this appointment (own + carried-forward). */
  alerts: string[];
}

export interface TomorrowSummary {
  stylistId: string;
  stylistName: string;
  /** YYYY-MM-DD of the day being summarised (tomorrow). */
  dateStr: string;
  /** Human label, e.g. "Saturday, July 18". */
  dateLabel: string;
  count: number;
  /** Sum of this groomer's appointment totals for the day. */
  groomerEarnings: number;
  /** Sum of every groomer's appointment totals for the day. */
  facilityTotal: number;
  appointments: TomorrowSummaryAppointment[];
  /** Flattened alert lines, e.g. "Buddy — muzzle required (bite risk)". */
  alerts: string[];
  /** The SMS body (Table 78). */
  sms: string;
  /** The email body as self-contained HTML (Table 79). */
  emailHtml: string;
}

// ─── formatting helpers ──────────────────────────────────────────────────────

function to12Hour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
}

function formatDateLabel(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  // Local noon avoids any TZ rollover to the previous day.
  const date = new Date(y, (mo ?? 1) - 1, d ?? 1, 12);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function isActive(a: GroomingAppointment): boolean {
  return a.status !== "cancelled" && a.status !== "no-show";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── builder ─────────────────────────────────────────────────────────────────

export interface BuildTomorrowSummaryInput {
  stylistId: string;
  stylistName: string;
  /** The day to summarise (YYYY-MM-DD) — normally tomorrow. */
  dateStr: string;
  /** The whole appointment book — filtered internally by stylist + date. The
   *  full list is required so alert carry-forward can look across a pet's past
   *  visits. */
  appointments: GroomingAppointment[];
  /** Send-time label for the header (defaults to 6 PM). */
  sendTimeLabel?: string;
}

export function buildTomorrowSummary(
  input: BuildTomorrowSummaryInput,
): TomorrowSummary {
  const { stylistId, stylistName, dateStr, appointments } = input;
  const sendTimeLabel =
    input.sendTimeLabel ?? to12Hour(DEFAULT_SUMMARY_SEND_TIME);
  const dateLabel = formatDateLabel(dateStr);

  const dayAppts = appointments.filter(
    (a) => a.date === dateStr && isActive(a),
  );

  const mine = dayAppts
    .filter((a) => a.stylistId === stylistId)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const groomerEarnings = mine.reduce((sum, a) => sum + (a.totalPrice ?? 0), 0);
  const facilityTotal = dayAppts.reduce(
    (sum, a) => sum + (a.totalPrice ?? 0),
    0,
  );

  const rows: TomorrowSummaryAppointment[] = mine.map((a, i) => ({
    index: i + 1,
    time: to12Hour(a.startTime),
    petName: a.petName,
    petBreed: a.petBreed,
    service: a.packageName,
    ownerName: a.ownerName,
    ownerPhone: a.ownerPhone,
    addOns: a.addOns ?? [],
    price: a.totalPrice ?? 0,
    // Table 80 — pull effective alerts (own + carried-forward) per appointment.
    alerts: getEffectiveAlertNotes(a, appointments).map((n) => n.text),
  }));

  const alertLines = rows.flatMap((r) =>
    r.alerts.map((text) => `${r.petName} — ${text}`),
  );

  const sms = buildSms({
    stylistName,
    dateLabel,
    rows,
    count: mine.length,
    groomerEarnings,
    facilityTotal,
    alertLines,
  });

  const emailHtml = buildEmailHtml({
    stylistName,
    dateLabel,
    sendTimeLabel,
    rows,
    count: mine.length,
    groomerEarnings,
    facilityTotal,
    alertLines,
  });

  return {
    stylistId,
    stylistName,
    dateStr,
    dateLabel,
    count: mine.length,
    groomerEarnings,
    facilityTotal,
    appointments: rows,
    alerts: alertLines,
    sms,
    emailHtml,
  };
}

// ─── SMS (Table 78) ──────────────────────────────────────────────────────────

function buildSms(args: {
  stylistName: string;
  dateLabel: string;
  rows: TomorrowSummaryAppointment[];
  count: number;
  groomerEarnings: number;
  facilityTotal: number;
  alertLines: string[];
}): string {
  const { dateLabel, rows, count, groomerEarnings, facilityTotal, alertLines } =
    args;

  const header = `Tomorrow's Schedule — ${dateLabel}`;

  if (count === 0) {
    return `${header}\nNo appointments scheduled. Enjoy the day off!`;
  }

  const lines = rows.map(
    (r) =>
      `${r.index}. ${r.time} — ${r.petName} (${r.petBreed}, ${r.service}) — ${r.ownerName}`,
  );

  const total =
    `Total: ${count} appointment${count === 1 ? "" : "s"}. ` +
    `Expected earnings: ${money(groomerEarnings)} (yours) from ${money(facilityTotal)} facility total.`;

  const alerts = alertLines.map((a) => `⚠ ${a}`);

  return [header, ...lines, total, ...alerts].join("\n");
}

// ─── Email (Table 79) ────────────────────────────────────────────────────────

function buildEmailHtml(args: {
  stylistName: string;
  dateLabel: string;
  sendTimeLabel: string;
  rows: TomorrowSummaryAppointment[];
  count: number;
  groomerEarnings: number;
  facilityTotal: number;
  alertLines: string[];
}): string {
  const {
    stylistName,
    dateLabel,
    sendTimeLabel,
    rows,
    count,
    groomerEarnings,
    facilityTotal,
    alertLines,
  } = args;

  const wrap = (inner: string) =>
    `
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;background:#f9fafb;padding:16px;border-radius:12px">
  ${inner}
</div>`.trim();

  const head = `
  <div style="margin-bottom:16px">
    <h1 style="margin:0 0 4px;font-size:20px;color:#111827">Tomorrow's Schedule</h1>
    <p style="margin:0;font-size:14px;color:#6b7280">${escapeHtml(dateLabel)} · Hi ${escapeHtml(stylistName)}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#9ca3af">Sent ${escapeHtml(sendTimeLabel)} the evening before</p>
  </div>`;

  if (count === 0) {
    return wrap(
      head +
        `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:20px;text-align:center;font-size:14px;color:#6b7280">
          No appointments scheduled for tomorrow. Enjoy the day off! 🐾
        </div>`,
    );
  }

  const cards = rows
    .map((r) => {
      const addOns =
        r.addOns.length > 0
          ? `<div style="margin-top:6px;font-size:12px;color:#6b7280">Add-ons: ${escapeHtml(r.addOns.join(", "))}</div>`
          : "";
      const alerts =
        r.alerts.length > 0
          ? `<div style="margin-top:8px;padding:8px 10px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px">
              ${r.alerts
                .map(
                  (a) =>
                    `<div style="font-size:12px;color:#b91c1c;font-weight:600">⚠ ${escapeHtml(a)}</div>`,
                )
                .join("")}
             </div>`
          : "";
      return `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <span style="font-size:15px;font-weight:700;color:#111827">${r.index}. ${escapeHtml(r.time)}</span>
          <span style="font-size:13px;color:#059669;font-weight:600">${money(r.price)}</span>
        </div>
        <div style="margin-top:4px;font-size:14px;color:#111827">
          <strong>${escapeHtml(r.petName)}</strong>
          <span style="color:#6b7280">(${escapeHtml(r.petBreed)})</span>
        </div>
        <div style="margin-top:2px;font-size:13px;color:#374151">${escapeHtml(r.service)}</div>
        <div style="margin-top:2px;font-size:12px;color:#6b7280">${escapeHtml(r.ownerName)} · ${escapeHtml(r.ownerPhone)}</div>
        ${addOns}
        ${alerts}
      </div>`;
    })
    .join("");

  const totals = `
  <div style="background:#111827;color:#fff;border-radius:10px;padding:14px;margin-top:4px">
    <div style="font-size:13px;color:#d1d5db">${count} appointment${count === 1 ? "" : "s"} tomorrow</div>
    <div style="margin-top:4px;font-size:16px;font-weight:700">${money(groomerEarnings)} <span style="font-size:12px;font-weight:400;color:#9ca3af">expected (yours)</span></div>
    <div style="margin-top:2px;font-size:12px;color:#9ca3af">from ${money(facilityTotal)} facility total</div>
  </div>`;

  const alertSummary =
    alertLines.length > 0
      ? `<div style="margin-top:12px;font-size:11px;color:#9ca3af">${alertLines.length} handling alert${alertLines.length === 1 ? "" : "s"} flagged above — review before each appointment.</div>`
      : "";

  return wrap(head + cards + totals + alertSummary);
}
