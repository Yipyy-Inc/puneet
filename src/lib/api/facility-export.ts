import "server-only";

import { createServerClient } from "@/lib/supabase/server";
import { createZip, type ZipEntry } from "@/lib/zip";

// ============================================================================
// Everything a facility holds, as a ZIP of CSVs.
//
// The fourth of the five "nothing stores this yet" tabs. There IS an export in
// the codebase already — src/lib/facility-export.ts — and it reads the mock
// files: `clients` matched by facility NAME, `users`, `bookings` keyed by a
// numeric id. Pointed at a provisioned facility it produces headers and no
// rows, which is the worst possible outcome for a portability request: a file
// that looks like an answer.
//
// This one reads Postgres. It is deliberately a separate module rather than a
// rewrite of that one, because the mock version still backs the facility-side
// screen and converting both at once is two changes wearing one hat.
//
// ── WHAT MAKES THIS DIFFERENT FROM EVERY OTHER READER HERE ────────────────
//
// It is the most sensitive read the platform performs. A GDPR Art. 20 file is
// also, in the wrong hands, the entire customer list with phone numbers. Three
// consequences:
//
//   the route is platform-admin only, and RLS refuses independently
//   the act is recorded (record_facility_export, 20260807640000) — there is no
//     row written, so nothing else would catch it
//   a manifest goes in the ZIP saying what was taken, when, and from where, so
//     the file can be identified months later without being opened
//
// ── PAGINATION IS NOT OPTIONAL HERE ───────────────────────────────────────
//
// PostgREST caps a response at 1000 rows by default. An export that silently
// stopped at a thousand bookings would be the same failure as the mock one —
// a plausible file that is not the truth — so every dataset is read in pages
// until a short page arrives.
// ============================================================================

export interface ExportDataset {
  key: string;
  label: string;
  filename: string;
  rows: number;
}

const PAGE = 1000;

type Client = Awaited<ReturnType<typeof createServerClient>>;

/**
 * Each dataset carries its own reader rather than a table NAME the loop then
 * passes to `.from()`. Generic-over-a-union is what the typed client cannot do:
 * `from(a | b | c).select(string)` makes it try to resolve every column of
 * every table against every shape, and tsc gives up with "type instantiation is
 * excessively deep". A closure per dataset keeps each `from()` on a literal.
 */
interface Dataset {
  key: string;
  label: string;
  filename: string;
  columns: string[];
  // PromiseLike, not Promise: a PostgREST builder is a thenable that only
  // becomes a Promise when awaited, so requiring Promise here would force every
  // one of these into an async wrapper for nothing.
  page: (
    supabase: Client,
    facilityId: string,
    from: number,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  count: (
    supabase: Client,
    facilityId: string,
  ) => PromiseLike<{ count: number | null; error: { message: string } | null }>;
}

const CLIENT_COLUMNS =
  "ref, name, email, phone, status, preferred_language, address, is_blocked, blocked_reason, last_visit_date, outstanding_balance, no_show_count, created_at";
const PET_COLUMNS =
  "ref, name, species, breed, sex, date_of_birth, age_years, weight, color, microchip, allergies, special_needs, spayed_neutered, status, created_at";
const BOOKING_COLUMNS =
  "ref, service, service_type, status, payment_status, start_at, end_at, assigned_staff_name, base_price, discount, extras_total, total_cost, amount_due, amount_paid, tip_amount, created_at";
const PAYMENT_COLUMNS =
  "method, subtotal, tax, tip, store_credit_applied, package_pass_applied, loyalty_discount_applied, amount_charged, grand_total, author_name, created_at";
const STAFF_COLUMNS =
  "legacy_id, first_name, last_name, email, phone, job_title, primary_role, additional_roles, status, status_changed_at, last_active, created_at";

function names(columns: string): string[] {
  return columns.split(",").map((column) => column.trim());
}

/** Datasets that have a real table keyed by facility. */
const DATASETS: Dataset[] = [
  {
    key: "clients",
    label: "Customers",
    filename: "customers.csv",
    columns: names(CLIENT_COLUMNS),
    page: (supabase, facilityId, from) =>
      supabase
        .from("clients")
        .select(CLIENT_COLUMNS)
        .eq("facility_id", facilityId)
        .order("ref")
        .range(from, from + PAGE - 1),
    count: (supabase, facilityId) =>
      supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId),
  },
  {
    key: "pets",
    label: "Pets",
    filename: "pets.csv",
    columns: names(PET_COLUMNS),
    page: (supabase, facilityId, from) =>
      supabase
        .from("pets")
        .select(PET_COLUMNS)
        .eq("facility_id", facilityId)
        .order("ref")
        .range(from, from + PAGE - 1),
    count: (supabase, facilityId) =>
      supabase
        .from("pets")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId),
  },
  {
    key: "bookings",
    label: "Bookings",
    filename: "bookings.csv",
    columns: names(BOOKING_COLUMNS),
    page: (supabase, facilityId, from) =>
      supabase
        .from("bookings")
        .select(BOOKING_COLUMNS)
        .eq("facility_id", facilityId)
        .order("ref")
        .range(from, from + PAGE - 1),
    count: (supabase, facilityId) =>
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId),
  },
  {
    key: "payments",
    label: "Payments",
    filename: "payments.csv",
    columns: names(PAYMENT_COLUMNS),
    page: (supabase, facilityId, from) =>
      supabase
        .from("payments")
        .select(PAYMENT_COLUMNS)
        .eq("facility_id", facilityId)
        .order("created_at")
        .range(from, from + PAGE - 1),
    count: (supabase, facilityId) =>
      supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId),
  },
  {
    key: "staff",
    label: "Staff",
    filename: "staff.csv",
    columns: names(STAFF_COLUMNS),
    page: (supabase, facilityId, from) =>
      supabase
        .from("staff")
        .select(STAFF_COLUMNS)
        .eq("facility_id", facilityId)
        .order("created_at")
        .range(from, from + PAGE - 1),
    count: (supabase, facilityId) =>
      supabase
        .from("staff")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId),
  },
];

function escape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value)
    ? value.join(" | ")
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The header is the column list, so an empty dataset still names its shape. */
function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => escape(row[column])).join(","));
  }
  return lines.join("\r\n");
}

async function readAll(
  supabase: Client,
  dataset: Dataset,
  facilityId: string,
): Promise<Record<string, unknown>[]> {
  const collected: Record<string, unknown>[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await dataset.page(supabase, facilityId, from);

    if (error) throw new Error(`${dataset.label}: ${error.message}`);

    const page = (data ?? []) as Record<string, unknown>[];
    collected.push(...page);
    // A short page is the end. Reading until an EMPTY page would cost one
    // extra round trip per dataset for no new information.
    if (page.length < PAGE) break;
  }

  return collected;
}

export interface FacilityExport {
  zip: Blob;
  datasets: ExportDataset[];
  totalRows: number;
}

export async function buildFacilityExport(
  facilityId: string,
): Promise<FacilityExport> {
  const supabase = await createServerClient();

  const facility = await supabase
    .from("facilities")
    .select("name, slug, created_at")
    .eq("id", facilityId)
    .maybeSingle();

  if (facility.error) throw new Error(facility.error.message);
  if (!facility.data) throw new Error("No such facility.");

  const results = await Promise.all(
    DATASETS.map(async (dataset) => ({
      dataset,
      rows: await readAll(supabase, dataset, facilityId),
    })),
  );

  const encoder = new TextEncoder();
  const producedAt = new Date().toISOString();

  const summary: ExportDataset[] = results.map(({ dataset, rows }) => ({
    key: dataset.key,
    label: dataset.label,
    filename: dataset.filename,
    rows: rows.length,
  }));

  const entries: ZipEntry[] = results.map(({ dataset, rows }) => ({
    name: dataset.filename,
    data: encoder.encode(toCsv(rows, dataset.columns)),
  }));

  // A file found on a laptop in six months should say what it is without
  // being opened, and an empty CSV inside it should be distinguishable from a
  // failed export.
  entries.push({
    name: "MANIFEST.txt",
    data: encoder.encode(
      [
        `Yipyy facility data export`,
        ``,
        `Facility:   ${facility.data.name}`,
        `Address:    ${facility.data.slug}.yipyy.com`,
        `Created:    ${facility.data.created_at}`,
        `Exported:   ${producedAt}`,
        ``,
        `Contents`,
        ...summary.map(
          (dataset) =>
            `  ${dataset.filename.padEnd(16)} ${dataset.rows} row(s) — ${dataset.label}`,
        ),
        ``,
        `A file with 0 rows means this facility holds none of that data, not`,
        `that the export failed — every dataset above was read successfully.`,
        ``,
        `This file contains personal data. Handle it accordingly: the export`,
        `was recorded in the platform audit trail when it was produced.`,
        ``,
      ].join("\r\n"),
    ),
  });

  return {
    zip: createZip(entries),
    datasets: summary,
    totalRows: summary.reduce((total, dataset) => total + dataset.rows, 0),
  };
}

/** Row counts only — what the tab shows before anyone downloads anything. */
export async function facilityExportSummary(
  facilityId: string,
): Promise<ExportDataset[]> {
  const supabase = await createServerClient();

  const counts = await Promise.all(
    DATASETS.map((dataset) => dataset.count(supabase, facilityId)),
  );

  return DATASETS.map((dataset, index) => {
    const result = counts[index];
    if (result.error)
      throw new Error(`${dataset.label}: ${result.error.message}`);
    return {
      key: dataset.key,
      label: dataset.label,
      filename: dataset.filename,
      rows: result.count ?? 0,
    };
  });
}

export function exportFilename(slug: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `yipyy-${slug}-export-${day}.zip`;
}
