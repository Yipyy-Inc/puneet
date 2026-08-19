"use client";

import { useQuery } from "@tanstack/react-query";

import type { CustomerFacility } from "@/app/api/customer/facility/route";
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

/**
 * Put a facility's identity into a stored template.
 *
 * Shared by the facility-side and customer-side hooks below so the invoice a
 * facility prints and the one its customer downloads cannot describe two
 * different businesses.
 */
function withIdentity(
  stored: InvoiceTemplate,
  identity: {
    name: string;
    logoUrl: string | null;
    street: string | null;
    cityLine: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    taxRegistrations: { id: string; label: string; value: string }[];
  } | null,
): InvoiceTemplate {
  if (!identity) return stored;
  return {
    ...stored,
    // Falling back where the facility has not filled a field in: an empty
    // header is worse than a stale one, and a facility that has customised its
    // template should not lose it on the day this shipped.
    facilityName: identity.name || stored.facilityName,
    logoUrl: identity.logoUrl || stored.logoUrl,
    addressLine1: identity.street || stored.addressLine1,
    addressLine2: identity.cityLine || stored.addressLine2,
    phone: identity.phone || stored.phone,
    email: identity.email || stored.email,
    website: identity.website || stored.website,
    // NOT falling back here. The fixture's "123456789 RT0001" is a fabricated
    // registration number; showing somebody else's on a tax document is worse
    // than showing none, so a facility with none configured gets none.
    taxRegistrations: identity.taxRegistrations,
  };
}

export function useInvoiceTemplate(): InvoiceTemplate {
  const { profile } = useFacilityProfile();
  const settings = useFacilitySettings();
  const tax = settings.settings.tax_config.value as TaxConfig;

  const stored = loadInvoiceTemplate();
  const address = profile.address;

  return withIdentity(stored, {
    name: profile.businessName,
    logoUrl: profile.logo || null,
    street: address?.street || null,
    cityLine:
      [address?.city, address?.state, address?.zipCode]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(", ") || null,
    phone: profile.phone || null,
    email: profile.email || null,
    website: profile.website || null,
    taxRegistrations: tax.taxes
      .filter((entry) => entry.enabled && entry.registrationNumber.trim())
      .map((entry) => ({
        id: entry.id,
        label: `${entry.name} Number`,
        value: entry.registrationNumber,
      })),
  });
}

// ============================================================================
// The same document, from the CUSTOMER's side.
//
// `useInvoiceTemplate()` above cannot be used here. It reads the facility
// through the caller's MEMBERSHIP, and a customer has none — `getFacilityContext`
// falls back to the demo facility for such a caller, so a pet owner's invoice
// would have been headed with a different business's name and tax registration
// number. Confidently, which is the dangerous kind.
//
// /api/customer/facility resolves it through the client row instead, and RLS
// refuses that row to anyone else.
// ============================================================================

export function useCustomerInvoiceTemplate(): InvoiceTemplate {
  const { data } = useQuery({
    queryKey: ["customer", "facility"],
    queryFn: async (): Promise<CustomerFacility> => {
      const response = await fetch("/api/customer/facility");
      if (!response.ok) throw new Error("Could not load your facility.");
      return (await response.json()) as CustomerFacility;
    },
    staleTime: 5 * 60_000,
  });

  // `data` is undefined while it loads, and withIdentity returns the stored
  // template untouched for null. The fixture header shows for a moment rather
  // than an empty one — the same trade the facility side makes.
  return withIdentity(loadInvoiceTemplate(), data ?? null);
}
