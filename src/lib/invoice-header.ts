/**
 * Shared HTML header for invoices, receipts, and estimates.
 * Shows the facility logo (if available), name, address, and contact.
 */

export interface FacilityInfo {
  name: string;
  logo?: string;
  contact?: { email?: string; phone?: string };
  locationsList?: { address: string }[];
  taxConfig?: {
    showRegistrationOnInvoice?: boolean;
    taxes?: { name: string; registrationNumber?: string; enabled: boolean }[];
  };
}

export function invoiceHeaderHtml(facility: FacilityInfo | null | undefined) {
  if (!facility) return "";

  // Use absolute URL so the logo resolves in new windows (about:blank origin)
  const logoSrc =
    facility.logo && typeof window !== "undefined"
      ? `${window.location.origin}${facility.logo}`
      : facility.logo;
  const logo = logoSrc
    ? `<img src="${logoSrc}" alt="${facility.name}" style="max-width:120px;max-height:60px;margin:0 auto 8px;display:block" onerror="this.style.display='none'" />`
    : "";

  const address = facility.locationsList?.[0]?.address ?? "";
  const contact = [facility.contact?.phone, facility.contact?.email]
    .filter(Boolean)
    .join(" · ");

  return `<div style="text-align:center;margin-bottom:24px">
  ${logo}
  <div style="font-weight:700;font-size:16px">${facility.name}</div>
  ${address ? `<div style="color:#666;font-size:12px;margin-top:2px">${address}</div>` : ""}
  ${contact ? `<div style="color:#666;font-size:12px;margin-top:2px">${contact}</div>` : ""}
  ${(() => {
    if (
      !facility.taxConfig?.showRegistrationOnInvoice ||
      !facility.taxConfig.taxes
    )
      return "";
    const regs = facility.taxConfig.taxes
      .filter((t) => t.enabled && t.registrationNumber)
      .map((t) => `${t.name}: ${t.registrationNumber}`)
      .join(" · ");
    return regs
      ? `<div style="color:#888;font-size:10px;margin-top:4px">${regs}</div>`
      : "";
  })()}
</div>
<hr style="border:none;border-top:1px solid #e5e5e5;margin-bottom:20px" />`;
}

/**
 * Shared CSS base styles for print windows.
 */
export const invoiceBaseStyles = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:40px auto;padding:0 24px;color:#1a1a1a;font-size:14px}
table{width:100%;border-collapse:collapse}
td{padding:4px 0}
.amt{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.green{color:#16a34a}
.sep{border-top:1px solid #e5e5e5;margin:12px 0}
.total td{font-weight:700;font-size:16px;padding-top:8px}
@media print{body{margin:0;padding:20px}}
`;

// ============================================================================
// The REAL facility, in the shape this header wants.
//
// Every caller of `invoiceHeaderHtml` passed the same thing:
//
//     const defaultFacility = facilities.find((f) => f.id === 11);
//
// — the FIXTURE. So every printed receipt, invoice, estimate and refund slip
// this product produces was headed "Example Pet Care Facility, 123 Example St,
// Example City", with the fixture's GST and QST registration numbers on it.
// A customer of Pawradise holding one was reading another business's tax
// numbers, which is worse than a cosmetic bug.
//
// `useFacilityProfile()` has returned the facility's own row since
// 20260809120000. This is the adapter nobody wrote.
// ============================================================================

/** Turn the facility's own profile and tax setting into a printable header. */
export function facilityInfoFromProfile(
  profile: {
    businessName: string;
    email?: string;
    phone?: string;
    logo?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  },
  tax?: {
    showRegistrationOnInvoice?: boolean;
    taxes?: { name: string; registrationNumber?: string; enabled: boolean }[];
  },
): FacilityInfo {
  const a = profile.address;
  const address = [
    a?.street,
    a?.city,
    [a?.state, a?.zipCode].filter(Boolean).join(" "),
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  return {
    name: profile.businessName,
    logo: profile.logo || undefined,
    contact: { email: profile.email, phone: profile.phone },
    // `locationsList` is how the header reads an address; one entry, the
    // facility's own, rather than the fixture's list of branches.
    locationsList: address ? [{ address }] : [],
    taxConfig: tax,
  };
}
