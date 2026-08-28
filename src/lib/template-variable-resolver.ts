// ========================================
// TEMPLATE VARIABLE RESOLVER — preview data
// ========================================
// The resolver itself moved to `@/lib/messaging/render`, which imports nothing
// but types. What is left here is the PREVIEW fixture and a re-export, because
// this file imports the mock client and booking sets and anything importing it
// pulls them in too. That is fine for the four editor screens that draw a
// preview; it is not fine for a server route about to send a real message.
//
// New callers should import from `@/lib/messaging/render` directly. This file
// stays so the preview screens keep working without a rename in the same
// change — see the header of render.ts for the full reasoning.

import type { Client } from "@/types/client";
import type { Pet } from "@/types/pet";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import type { VariableDataContext } from "@/lib/messaging/render";

export {
  resolveVariable,
  resolveTemplate,
  templateVariableKeys,
  VARIABLE_PATTERN,
} from "@/lib/messaging/render";
export type {
  FacilityInfo,
  PaymentInfo,
  StaffInfo,
  TemplateLinks,
  VariableDataContext,
} from "@/lib/messaging/render";

// ── Mock Preview Data ───────────────────────────────────────

export function getMockPreviewData(): VariableDataContext {
  const mockClient = clients[0]; // Alice Johnson with Buddy + Whiskers
  const mockBooking = bookings[0]; // Daycare for Buddy

  return {
    customer: mockClient as Client,
    pets: mockClient?.pets as Pet[],
    booking: mockBooking,
    facility: {
      name: "Yipyy",
      phone: "(514) 555-0100",
      email: "info@yipyymtl.com",
      address: "456 Bark Avenue, Montreal, QC H2X 1Y4",
      website: "www.yipyymtl.com",
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
    // Illustrative only. A real send resolves these through
    // `facilityCustomerLinkOrigin()` from the facility ROW, so a live message
    // carries `<slug>.yipyy.com` rather than anything written here.
    links: {
      portal: "https://pawradise.yipyy.com",
      bookingDetails: mockBooking?.id
        ? `https://pawradise.yipyy.com/bookings/BK-${mockBooking.id}`
        : undefined,
      yipyyGo: mockBooking?.id
        ? `https://go.yipyy.com/form/${mockBooking.id}`
        : undefined,
      invoice: "https://pawradise.yipyy.com/invoices/10042",
      cancel: mockBooking?.id
        ? `https://pawradise.yipyy.com/bookings/BK-${mockBooking.id}/cancel`
        : undefined,
    },
  };
}
