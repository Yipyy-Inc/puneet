/**
 * Shared HTML header for invoices, receipts, and estimates.
 * Shows the facility logo (if available), name, address, and contact.
 */

interface FacilityInfo {
  name: string;
  logo?: string;
  contact?: { email?: string; phone?: string };
  locationsList?: { address: string }[];
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
