import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { buildSubscriptionInvoices } from "@/data/facility-billing";
import { facilities } from "@/data/facilities";
import { users } from "@/data/users";

import { createZip } from "./zip";

// Facility data export — a per-facility ZIP of CSVs (customers, pets, bookings,
// invoices, staff) for GDPR Art. 20 portability, offboarding and backups.
// Clients/staff are keyed by facility NAME, bookings/invoices by facility ID.

export interface ExportType {
  key: string;
  label: string;
  filename: string;
}

export const EXPORT_TYPES: ExportType[] = [
  { key: "customers", label: "Customers", filename: "customers.csv" },
  { key: "pets", label: "Pets", filename: "pets.csv" },
  { key: "bookings", label: "Bookings", filename: "bookings.csv" },
  { key: "invoices", label: "Invoices", filename: "invoices.csv" },
  { key: "staff", label: "Staff", filename: "staff.csv" },
];

export function facilityName(facilityId: number): string {
  return facilities.find((f) => f.id === facilityId)?.name ?? "";
}

function esc(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
}

function customersCsv(name: string): string {
  const rows = clients
    .filter((c) => c.facility === name)
    .map((c) => [
      c.id,
      c.name,
      c.email,
      c.phone ?? "",
      c.status,
      c.pets?.length ?? 0,
      c.lastVisitDate ?? "",
      c.outstandingBalance ?? 0,
    ]);
  return toCsv(
    [
      "Customer ID",
      "Name",
      "Email",
      "Phone",
      "Status",
      "Pets",
      "Last Visit",
      "Outstanding Balance",
    ],
    rows,
  );
}

function petsCsv(name: string): string {
  const rows = clients
    .filter((c) => c.facility === name)
    .flatMap((c) =>
      (c.pets ?? []).map((p) => [
        p.id,
        p.name,
        p.type,
        p.breed,
        p.age,
        p.sex ?? "",
        p.weight ?? "",
        c.name,
        c.id,
      ]),
    );
  return toCsv(
    [
      "Pet ID",
      "Name",
      "Type",
      "Breed",
      "Age",
      "Sex",
      "Weight",
      "Owner",
      "Owner ID",
    ],
    rows,
  );
}

function bookingsCsv(facilityId: number): string {
  const rows = bookings
    .filter((b) => b.facilityId === facilityId)
    .map((b) => [
      b.id,
      b.clientId,
      Array.isArray(b.petId) ? b.petId.join(";") : b.petId,
      b.service,
      b.serviceType,
      b.startDate,
      b.endDate,
      b.status,
      b.basePrice,
      b.discount,
      b.totalCost,
      b.paymentStatus,
    ]);
  return toCsv(
    [
      "Booking ID",
      "Customer ID",
      "Pet ID(s)",
      "Service",
      "Service Type",
      "Start Date",
      "End Date",
      "Status",
      "Base Price",
      "Discount",
      "Total Cost",
      "Payment Status",
    ],
    rows,
  );
}

function invoicesCsv(facilityId: number): string {
  const rows = buildSubscriptionInvoices(facilityId).map((i) => [
    i.number,
    i.periodLabel,
    i.periodStart,
    i.periodEnd,
    i.amount,
    i.currency,
    i.status,
    i.issuedDate,
    i.paidDate ?? "",
  ]);
  return toCsv(
    [
      "Invoice Number",
      "Period",
      "Period Start",
      "Period End",
      "Amount",
      "Currency",
      "Status",
      "Issued Date",
      "Paid Date",
    ],
    rows,
  );
}

function staffCsv(name: string): string {
  const rows = users
    .filter((u) => u.facility === name)
    .map((u) => [
      u.id,
      u.name,
      u.email,
      u.role,
      u.status,
      u.phone,
      u.hireDate,
      u.lastLogin,
    ]);
  return toCsv(
    [
      "Staff ID",
      "Name",
      "Email",
      "Role",
      "Status",
      "Phone",
      "Hire Date",
      "Last Login",
    ],
    rows,
  );
}

function csvFor(key: string, facilityId: number, name: string): string {
  switch (key) {
    case "customers":
      return customersCsv(name);
    case "pets":
      return petsCsv(name);
    case "bookings":
      return bookingsCsv(facilityId);
    case "invoices":
      return invoicesCsv(facilityId);
    case "staff":
      return staffCsv(name);
    default:
      return "";
  }
}

/** Row count per data type (for the export checklist UI). */
export function exportCounts(facilityId: number): Record<string, number> {
  const name = facilityName(facilityId);
  const facilityClients = clients.filter((c) => c.facility === name);
  return {
    customers: facilityClients.length,
    pets: facilityClients.reduce((s, c) => s + (c.pets?.length ?? 0), 0),
    bookings: bookings.filter((b) => b.facilityId === facilityId).length,
    invoices: buildSubscriptionInvoices(facilityId).length,
    staff: users.filter((u) => u.facility === name).length,
  };
}

export function buildFacilityExportZip(
  facilityId: number,
  selectedKeys: string[],
): Blob {
  const name = facilityName(facilityId);
  const enc = new TextEncoder();
  const entries = EXPORT_TYPES.filter((t) => selectedKeys.includes(t.key)).map(
    (t) => ({
      name: t.filename,
      data: enc.encode(csvFor(t.key, facilityId, name)),
    }),
  );
  return createZip(entries);
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "facility"
  );
}

/** Build the ZIP and trigger a browser download. */
export function downloadFacilityExport(
  facilityId: number,
  selectedKeys: string[],
): void {
  const blob = buildFacilityExportZip(facilityId, selectedKeys);
  const stamp = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(facilityName(facilityId))}-export-${stamp}.zip`;
  a.style.visibility = "hidden";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
