"use client";

import { loadInvoiceTemplate } from "@/data/invoice-template";
import { useFacilityProfile } from "@/lib/api/facility-profile";
import { useFacilitySettings } from "@/lib/api/facility-settings";
import type { TaxConfig } from "@/lib/settings/tax";
import type { InvoiceTemplate } from "@/types/invoice-template";

// ============================================================================
// The invoice/receipt template, with the facility's OWN identity in it.
//
// ── THE THIRD FIXTURE ─────────────────────────────────────────────────────
//
// `loadInvoiceTemplate()` reads localStorage and falls back to:
//
//     facilityName: "Example Pet Care Facility"
//     addressLine1: "123 Example St"
//     phone:        "(555) 111-2222"
//     logoUrl:      "/yipyy-transparent.png"
//     taxRegistrations: [{ label: "GST/HST Number", value: "123456789 RT0001" }]
//
// So Print → Invoice / Receipt handed a customer a document naming another
// business, with a fabricated tax registration number on it. This is the same
// fault as the five `invoiceHeaderHtml` callers and the tax settings screen —
// the third place a facility's identity was a constant — and it is the one a
// customer is most likely to keep, because it is the formal document.
//
// ── WHAT THE TEMPLATE STILL DECIDES ───────────────────────────────────────
//
// Everything that is genuinely a template: accent colour, footer text, the
// thank-you message, the signature block, the invoice-number format, payment
// terms. Those are design choices and stay where they are.
//
// Identity is not a design choice. Name, address, contact, logo and tax
// registration numbers are facts about the business, they live on `facilities`
// and in `tax_config`, and they are read from there.
//
// ── AND THE REGISTRATIONS COME FROM THE TAX SETTING ───────────────────────
//
// One place, so a facility that enters its GST number on the tax screen does
// not have to enter it again here — and so the number on the printed invoice
// cannot disagree with the number on the thermal receipt.
// ============================================================================

export function useInvoiceTemplate(): InvoiceTemplate {
  const { profile } = useFacilityProfile();
  const settings = useFacilitySettings();
  const tax = settings.settings.tax_config.value as TaxConfig;

  const stored = loadInvoiceTemplate();
  const address = profile.address;

  const registrations = tax.taxes
    .filter((entry) => entry.enabled && entry.registrationNumber.trim())
    .map((entry) => ({
      id: entry.id,
      label: `${entry.name} Number`,
      value: entry.registrationNumber,
    }));

  return {
    ...stored,
    // Falling back to the stored value where the facility has not filled a
    // field in: an empty header is worse than a stale one, and a facility that
    // has customised its template should not lose it on the day this shipped.
    facilityName: profile.businessName || stored.facilityName,
    logoUrl: profile.logo || stored.logoUrl,
    addressLine1: address?.street || stored.addressLine1,
    addressLine2:
      [address?.city, address?.state, address?.zipCode]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(", ") || stored.addressLine2,
    phone: profile.phone || stored.phone,
    email: profile.email || stored.email,
    website: profile.website || stored.website,
    // NOT falling back here. The fixture's "123456789 RT0001" is a fabricated
    // registration number; showing somebody else's on a tax document is worse
    // than showing none, so a facility with no numbers configured gets none.
    taxRegistrations: registrations,
  };
}
