// ========================================
// TEMPLATE VARIABLE RESOLVER
// ========================================
// Resolves {{variable}} placeholders in templates using
// provided data context. Supports fallback syntax: {{key|fallback}}.

import type { Booking } from "@/types/booking";
import type { Client } from "@/types/client";
import type { Pet } from "@/types/pet";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";

// ── Data Context ────────────────────────────────────────────

export interface FacilityInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  checkinHours?: string;
}

export interface PaymentInfo {
  invoiceId: string;
  invoiceTotal: string;
  amountDue: string;
  amountPaid: string;
  paymentLink: string;
  receiptLink: string;
  dueDate: string;
}

export interface StaffInfo {
  assignedName?: string;
  groomerName?: string;
  trainerName?: string;
}

export interface VariableDataContext {
  customer?: Partial<Client>;
  pets?: Partial<Pet>[];
  booking?: Partial<Booking>;
  facility?: Partial<FacilityInfo>;
  staff?: StaffInfo;
  payment?: Partial<PaymentInfo>;
}

// ── Helpers ─────────────────────────────────────────────────

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr: string | undefined): string {
  if (!timeStr) return "";
  if (/^\d{2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
  }
  return timeStr;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getWeightSize(weight: number | undefined): string {
  if (!weight) return "";
  // Thresholds from facilityConfig.petCategories.weightLimits
  if (weight <= 15) return "Small";
  if (weight <= 50) return "Medium";
  if (weight <= 100) return "Large";
  return "Extra Large";
}

// ── Variable Resolution ─────────────────────────────────────

export function resolveVariable(
  key: string,
  data: VariableDataContext,
): string | null {
  const { customer, pets, booking, facility, staff, payment } = data;
  const primaryPet = pets?.[0];

  switch (key) {
    // Customer
    case "customer_first_name":
      return customer?.name?.split(" ")[0] ?? null;
    case "customer_last_name":
      return customer?.name?.split(" ").slice(1).join(" ") ?? null;
    case "customer_full_name":
      return customer?.name ?? null;
    case "customer_phone":
      return customer?.phone ?? null;
    case "customer_email":
      return customer?.email ?? null;
    case "customer_address": {
      const a = customer?.address;
      if (!a) return null;
      return `${a.street}, ${a.city}, ${a.state} ${a.zip}`;
    }
    case "customer_city":
      return customer?.address?.city ?? null;

    // Pet
    case "pet_name":
      return primaryPet?.name ?? null;
    case "pet_breed":
      return primaryPet?.breed ?? null;
    case "pet_size":
      return getWeightSize(primaryPet?.weight) || null;
    case "pet_age":
      return primaryPet?.age?.toString() ?? null;
    case "pet_gender":
      return null; // not in Pet type
    case "pet_names":
      return pets && pets.length > 0
        ? pets.map((p) => p.name).join(", ")
        : null;
    case "pet_count":
      return pets ? pets.length.toString() : null;

    // Booking
    case "booking_id":
      return booking?.id ? `BK-${booking.id}` : null;
    case "service_name":
      return booking?.service ? capitalize(booking.service) : null;
    case "service_category":
      return booking?.serviceType ? capitalize(booking.serviceType) : null;
    case "booking_date":
      return formatDate(booking?.startDate) || null;
    case "booking_time":
      return formatTime(booking?.checkInTime) || null;
    case "booking_start_datetime": {
      const d = formatDate(booking?.startDate);
      const t = formatTime(booking?.checkInTime);
      return d && t ? `${d} at ${t}` : d || null;
    }
    case "booking_end_datetime": {
      const d = formatDate(booking?.endDate);
      const t = formatTime(booking?.checkOutTime);
      return d && t ? `${d} at ${t}` : d || null;
    }
    case "check_in_date":
      return formatDate(booking?.startDate) || null;
    case "check_in_time":
      return formatTime(booking?.checkInTime) || null;
    case "check_out_date":
      return formatDate(booking?.endDate) || null;
    case "check_out_time":
      return formatTime(booking?.checkOutTime) || null;
    case "booking_status":
      return booking?.status ? capitalize(booking.status) : null;
    case "booking_addons":
      return booking?.extraServices
        ? booking.extraServices
            .map((s) => (typeof s === "string" ? s : s.serviceId))
            .join(", ")
        : null;

    // Facility
    case "facility_name":
      return facility?.name ?? null;
    case "facility_phone":
      return facility?.phone ?? null;
    case "facility_email":
      return facility?.email ?? null;
    case "facility_address":
      return facility?.address ?? null;
    case "facility_website":
      return facility?.website ?? null;
    case "facility_checkin_hours":
      return facility?.checkinHours ?? null;

    // Staff
    case "assigned_staff_name":
      return staff?.assignedName ?? null;
    case "groomer_name":
      return staff?.groomerName ?? null;
    case "trainer_name":
      return staff?.trainerName ?? null;

    // Payment
    case "invoice_id":
      return payment?.invoiceId ?? null;
    case "invoice_total":
      return payment?.invoiceTotal ?? null;
    case "amount_due":
      return payment?.amountDue ?? null;
    case "amount_paid":
      return payment?.amountPaid ?? null;
    case "payment_link":
      return payment?.paymentLink ?? null;
    case "receipt_link":
      return payment?.receiptLink ?? null;
    case "due_date":
      return payment?.dueDate ?? null;

    // Links
    case "portal_link":
      return "https://portal.yipyy.com";
    case "booking_details_link":
      return booking?.id
        ? `https://portal.yipyy.com/bookings/BK-${booking.id}`
        : null;
    case "yipyygo_link":
      return booking?.id ? `https://go.yipyy.com/form/${booking.id}` : null;
    case "invoice_link":
      return payment?.invoiceId
        ? `https://portal.yipyy.com/invoices/${payment.invoiceId}`
        : null;
    case "cancel_link":
      return booking?.id
        ? `https://portal.yipyy.com/bookings/BK-${booking.id}/cancel`
        : null;

    default:
      return null;
  }
}

// ── Template Resolution ─────────────────────────────────────

const VARIABLE_PATTERN = /\{\{([a-z_]+)(?:\|([^}]*))?\}\}/g;

export function resolveTemplate(
  template: string,
  data: VariableDataContext,
): string {
  return template.replace(VARIABLE_PATTERN, (match, key, fallback) => {
    const resolved = resolveVariable(key, data);
    if (resolved !== null) return resolved;
    if (fallback !== undefined) return fallback;
    return match; // leave raw tag if no data and no fallback
  });
}

// ── Mock Preview Data ───────────────────────────────────────

export function getMockPreviewData(): VariableDataContext {
  const mockClient = clients[0]; // Alice Johnson with Buddy + Whiskers
  const mockBooking = bookings[0]; // Daycare for Buddy

  return {
    customer: mockClient as Client,
    pets: mockClient?.pets as Pet[],
    booking: mockBooking,
    facility: {
      name: "Doggieville MTL",
      phone: "(514) 555-0100",
      email: "info@doggievillemtl.com",
      address: "456 Bark Avenue, Montreal, QC H2X 1Y4",
      website: "www.doggievillemtl.com",
      checkinHours: "7:00 AM - 10:00 AM",
    },
    staff: {
      assignedName: "Emma Wilson",
      groomerName: "Lisa Chen",
      trainerName: "Mike Torres",
    },
    payment: {
      invoiceId: "10042",
      invoiceTotal: "$150.00",
      amountDue: "$75.00",
      amountPaid: "$75.00",
      paymentLink: "https://pay.yipyy.com/inv-0042",
      receiptLink: "https://yipyy.com/receipt/inv-0042",
      dueDate: "April 1, 2026",
    },
  };
}
