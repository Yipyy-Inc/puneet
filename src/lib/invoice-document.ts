import type {
  InvoiceTemplate,
  InvoiceNumberFormat,
  InvoicePaymentTerms,
} from "@/types/invoice-template";

/** Human-readable payment-terms line shown on the invoice. */
export function paymentTermsLabel(terms: InvoicePaymentTerms): string {
  switch (terms.type) {
    case "due_on_receipt":
      return "Due on receipt";
    case "net_7":
      return "Net 7 — payment due within 7 days";
    case "net_14":
      return "Net 14 — payment due within 14 days";
    case "net_30":
      return "Net 30 — payment due within 30 days";
    case "custom":
      return terms.customText.trim();
  }
}

/**
 * Build an invoice number from a configured format, e.g.
 * { prefix: "INV", yearFormat: "YYYY", monthFormat: "MM", padding: 4 } with
 * year 2026, month 6, seq 1 → "INV-2026-06-0001". Pure — the caller supplies
 * the date parts so this stays deterministic.
 */
export function formatInvoiceNumber(
  fmt: InvoiceNumberFormat,
  year: number,
  month: number,
  seq: number,
): string {
  const parts: string[] = [];
  if (fmt.prefix.trim()) parts.push(fmt.prefix.trim());
  if (fmt.yearFormat === "YYYY") parts.push(String(year));
  else if (fmt.yearFormat === "YY") parts.push(String(year).slice(-2));
  if (fmt.monthFormat === "MM") parts.push(String(month).padStart(2, "0"));
  parts.push(String(Math.max(0, seq)).padStart(fmt.padding, "0"));
  return parts.join("-");
}

export interface InvoiceDocumentLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  price: number;
  staffName?: string;
}

export interface InvoiceDocumentTax {
  name: string;
  rate: number;
  amount: number;
}

export interface InvoiceDocumentPayment {
  date: string;
  method: string;
  amount: number;
  kind?: string;
  collectedBy?: string;
}

export interface InvoiceDocumentData {
  invoiceNumber: string;
  invoiceStatus?: "estimate" | "open" | "closed";
  issuedDate: string;
  bookingDateRange?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  petName?: string;
  serviceLabel: string;
  items: InvoiceDocumentLineItem[];
  fees?: InvoiceDocumentLineItem[];
  subtotal: number;
  discount?: number;
  discountLabel?: string;
  taxes?: InvoiceDocumentTax[];
  taxAmount?: number;
  taxRate?: number;
  /**
   * When true, the tax configuration has not loaded yet: render skeleton
   * placeholders for the tax lines and dependent totals rather than a value.
   */
  taxesLoading?: boolean;
  tipTotal?: number;
  total: number;
  depositCollected?: number;
  remainingDue?: number;
  payments?: InvoiceDocumentPayment[];
  variant?: "invoice" | "receipt";
}

function escapeHtml(input: string | undefined | null): string {
  if (!input) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function fmt(n: number | undefined): string {
  return (n ?? 0).toFixed(2);
}

export function buildInvoiceDocumentHtml(
  template: InvoiceTemplate,
  data: InvoiceDocumentData,
  origin = typeof window !== "undefined" ? window.location.origin : "",
): string {
  const variant = data.variant ?? "invoice";
  const isReceipt = variant === "receipt";
  const accent = template.accentColor || "#0f172a";

  const logoSrc = template.logoUrl
    ? template.logoUrl.startsWith("http") ||
      template.logoUrl.startsWith("data:")
      ? template.logoUrl
      : `${origin}${template.logoUrl}`
    : "";

  const logoHtml = logoSrc
    ? `<img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(template.facilityName)}" style="max-height:64px;max-width:200px;object-fit:contain" onerror="this.style.display='none'" />`
    : `<div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:${accent}">${escapeHtml(template.facilityName)}</div>`;

  const addressLines = [template.addressLine1, template.addressLine2]
    .filter(Boolean)
    .map((l) => escapeHtml(l!))
    .join("<br />");

  const contactLine = [template.phone, template.email, template.website]
    .filter(Boolean)
    .map((l) => escapeHtml(l!))
    .join(" &middot; ");

  const taxRegistrationsText = (template.taxRegistrations ?? [])
    .filter((r) => r.value.trim())
    .map(
      (r) =>
        `${r.label.trim() ? `${escapeHtml(r.label)}: ` : ""}${escapeHtml(r.value)}`,
    )
    .join(" &middot; ");
  const taxNumbersLine = taxRegistrationsText
    ? `<div style="color:#64748b;font-size:10px;margin-top:6px;letter-spacing:0.04em">${taxRegistrationsText}</div>`
    : "";

  // Payment terms — only on invoices (a receipt is already paid).
  const paymentTermsText = template.paymentTerms
    ? paymentTermsLabel(template.paymentTerms)
    : "";
  const paymentTermsLine =
    !isReceipt && paymentTermsText
      ? `<div style="margin-top:6px;color:#475569;font-size:11px"><span style="color:#64748b">Payment terms:</span> ${escapeHtml(paymentTermsText)}</div>`
      : "";

  const statusBadge = data.invoiceStatus
    ? (() => {
        const tones: Record<string, { bg: string; fg: string; label: string }> =
          {
            estimate: { bg: "#f4f4f5", fg: "#52525b", label: "Estimate" },
            open: { bg: "#fef3c7", fg: "#92400e", label: "Open" },
            closed: { bg: "#d1fae5", fg: "#065f46", label: "Paid" },
          };
        const t = tones[data.invoiceStatus] ?? tones.estimate;
        return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${t.bg};color:${t.fg};font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">${t.label}</span>`;
      })()
    : "";

  const itemsRows = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9">
        <div style="font-weight:500;color:#0f172a">${escapeHtml(item.name)}</div>
        <div style="color:#64748b;font-size:11px;margin-top:2px">$${fmt(item.unitPrice)} &times; ${item.quantity}${item.staffName ? ` &middot; ${escapeHtml(item.staffName)}` : ""}</div>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-variant-numeric:tabular-nums;font-weight:500">$${fmt(item.price)}</td>
    </tr>`,
    )
    .join("");

  const feesRows = (data.fees ?? [])
    .map(
      (fee) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#475569;font-size:13px">${escapeHtml(fee.name)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-variant-numeric:tabular-nums;color:#475569">$${fmt(fee.price)}</td>
    </tr>`,
    )
    .join("");

  const summaryRow = (
    label: string,
    value: string,
    opts?: { muted?: boolean; emphasize?: boolean; color?: string },
  ) => `
    <tr>
      <td style="padding:5px 0;color:${opts?.color ?? (opts?.muted ? "#64748b" : "#0f172a")};${opts?.emphasize ? "font-weight:700;font-size:16px" : "font-size:13px"}">${label}</td>
      <td style="padding:5px 0;text-align:right;font-variant-numeric:tabular-nums;color:${opts?.color ?? (opts?.muted ? "#64748b" : "#0f172a")};${opts?.emphasize ? "font-weight:700;font-size:16px" : ""}">${value}</td>
    </tr>`;

  // Skeleton bar used while the tax configuration is still loading.
  const skeletonBar = (width: number, height = 12) =>
    `<span style="display:inline-block;width:${width}px;height:${height}px;border-radius:4px;background:#e2e8f0;animation:invSkeleton 1.2s ease-in-out infinite;vertical-align:middle"></span>`;
  const skeletonRow = (
    labelWidth: number,
    valueWidth: number,
    tall = false,
  ) => `
    <tr>
      <td style="padding:5px 0">${skeletonBar(labelWidth, tall ? 16 : 12)}</td>
      <td style="padding:5px 0;text-align:right">${skeletonBar(valueWidth, tall ? 16 : 12)}</td>
    </tr>`;

  const taxes = data.taxes ?? [];
  const taxRows = data.taxesLoading
    ? skeletonRow(96, 56) + skeletonRow(84, 52)
    : taxes.length > 0
      ? taxes
          .map((t) =>
            summaryRow(
              `${escapeHtml(t.name)} (${(t.rate * 100).toFixed(t.rate < 0.1 ? 1 : 3)}%)`,
              `$${fmt(t.amount)}`,
              { muted: true },
            ),
          )
          .join("")
      : (data.taxAmount ?? 0) > 0
        ? summaryRow(
            `Tax${data.taxRate ? ` (${(data.taxRate * 100).toFixed(2)}%)` : ""}`,
            `$${fmt(data.taxAmount)}`,
            { muted: true },
          )
        : "";

  // When taxes are still loading, the total and its dependents are unknown —
  // show skeletons rather than a total that omits tax (a fake value).
  const totalTailHtml = data.taxesLoading
    ? skeletonRow(60, 72, true)
    : `${summaryRow("Total", `$${fmt(data.total)}`, { emphasize: true })}
      ${(data.depositCollected ?? 0) > 0 ? summaryRow("Deposit collected", `-$${fmt(data.depositCollected)}`, { color: "#16a34a" }) : ""}
      ${(data.remainingDue ?? 0) > 0 ? summaryRow("Remaining due", `$${fmt(data.remainingDue)}`, { emphasize: true, color: "#b91c1c" }) : ""}`;

  const summaryHtml = `
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      ${summaryRow("Subtotal", `$${fmt(data.subtotal)}`, { muted: true })}
      ${(data.discount ?? 0) > 0 ? summaryRow(`Discount${data.discountLabel ? ` (${escapeHtml(data.discountLabel)})` : ""}`, `-$${fmt(data.discount)}`, { color: "#16a34a" }) : ""}
      ${taxRows}
      ${(data.tipTotal ?? 0) > 0 ? summaryRow("Tip", `$${fmt(data.tipTotal)}`, { muted: true }) : ""}
      <tr><td colspan="2" style="border-top:2px solid ${accent};padding-top:6px"></td></tr>
      ${totalTailHtml}
    </table>`;

  const paymentsHtml =
    (data.payments ?? []).length > 0
      ? `
    <div style="margin-top:24px">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:#64748b;text-transform:uppercase;margin-bottom:8px">Payment History</div>
      <table style="width:100%;border-collapse:collapse">
        ${data
          .payments!.map(
            (p) => `
          <tr>
            <td style="padding:6px 0;border-bottom:1px solid #f1f5f9">
              <span style="text-transform:capitalize;font-weight:500">${escapeHtml(p.method)}</span>
              ${p.kind ? `<span style="margin-left:6px;display:inline-block;padding:1px 6px;border-radius:4px;background:#f1f5f9;color:#475569;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">${escapeHtml(p.kind)}</span>` : ""}
              <div style="color:#64748b;font-size:10px;margin-top:1px">${escapeHtml(new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}${p.collectedBy ? ` &middot; by ${escapeHtml(p.collectedBy)}` : ""}</div>
            </td>
            <td style="padding:6px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-variant-numeric:tabular-nums;font-weight:500">$${fmt(p.amount)}</td>
          </tr>`,
          )
          .join("")}
      </table>
    </div>`
      : "";

  const signatureHtml = template.signatureEnabled
    ? `
    <div style="margin-top:48px;display:flex;gap:32px">
      <div style="flex:1;border-top:1px solid #94a3b8;padding-top:6px">
        <div style="font-size:10px;color:#64748b;letter-spacing:0.08em;text-transform:uppercase;font-weight:600">${escapeHtml(template.signatureLabel || "Client Signature")}</div>
      </div>
      <div style="width:140px;border-top:1px solid #94a3b8;padding-top:6px">
        <div style="font-size:10px;color:#64748b;letter-spacing:0.08em;text-transform:uppercase;font-weight:600">Date</div>
      </div>
    </div>`
    : "";

  const footerHtml = template.footerText
    ? `<div style="margin-top:32px;padding:16px;background:#f8fafc;border-left:3px solid ${accent};border-radius:4px;color:#334155;font-size:12px;line-height:1.6;font-style:italic">${escapeHtml(template.footerText)}</div>`
    : "";

  const thankYouHtml =
    template.showThankYou && template.thankYouMessage
      ? `<div style="margin-top:24px;text-align:center;font-size:11px;color:#64748b">${escapeHtml(template.thankYouMessage)}</div>`
      : "";

  const paidStamp = isReceipt
    ? `<div style="margin-top:16px;padding:10px;text-align:center;background:#ecfdf5;color:#059669;border-radius:6px;font-weight:700;letter-spacing:0.1em;font-size:12px">PAYMENT COMPLETE</div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${isReceipt ? "Receipt" : "Invoice"} ${escapeHtml(data.invoiceNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 720px; margin: 0 auto; padding: 40px 32px; color: #0f172a; font-size: 14px; line-height: 1.5; background: #ffffff; }
    @keyframes invSkeleton { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    @media print { body { padding: 24px; max-width: none; } }
  </style>
</head>
<body>
  <!-- Header band -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:24px;border-bottom:3px solid ${accent}">
    <div style="flex:1;min-width:0">
      ${logoHtml}
      <div style="margin-top:10px;color:#475569;font-size:11px;line-height:1.5">
        ${addressLines ? `<div>${addressLines}</div>` : ""}
        ${contactLine ? `<div style="margin-top:2px">${contactLine}</div>` : ""}
        ${taxNumbersLine}
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:24px;font-weight:800;letter-spacing:-0.02em;color:${accent}">${isReceipt ? "RECEIPT" : "INVOICE"}</div>
      <div style="margin-top:4px;color:#64748b;font-size:12px;font-variant-numeric:tabular-nums">#${escapeHtml(data.invoiceNumber)}</div>
      <div style="margin-top:2px;color:#64748b;font-size:11px">${escapeHtml(data.issuedDate)}</div>
      ${statusBadge ? `<div style="margin-top:8px">${statusBadge}</div>` : ""}
      ${paymentTermsLine}
    </div>
  </div>

  <!-- Bill-to / service block -->
  <div style="display:flex;gap:32px;margin-top:24px;padding:16px;background:#f8fafc;border-radius:6px">
    <div style="flex:1">
      <div style="font-size:9px;font-weight:700;letter-spacing:0.12em;color:#64748b;text-transform:uppercase">Bill To</div>
      <div style="margin-top:4px;font-size:14px;font-weight:600">${escapeHtml(data.clientName)}</div>
      ${data.clientEmail ? `<div style="color:#475569;font-size:12px;margin-top:1px">${escapeHtml(data.clientEmail)}</div>` : ""}
      ${data.clientPhone ? `<div style="color:#475569;font-size:12px">${escapeHtml(data.clientPhone)}</div>` : ""}
    </div>
    <div style="flex:1">
      <div style="font-size:9px;font-weight:700;letter-spacing:0.12em;color:#64748b;text-transform:uppercase">Service</div>
      <div style="margin-top:4px;font-size:14px;font-weight:600;text-transform:capitalize">${escapeHtml(data.serviceLabel)}${data.petName ? ` &middot; <span style="font-weight:400">${escapeHtml(data.petName)}</span>` : ""}</div>
      ${data.bookingDateRange ? `<div style="color:#475569;font-size:12px;margin-top:1px">${escapeHtml(data.bookingDateRange)}</div>` : ""}
    </div>
  </div>

  <!-- Line items -->
  <div style="margin-top:24px">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:#64748b;text-transform:uppercase;margin-bottom:8px">Services</div>
    <table style="width:100%;border-collapse:collapse">
      ${itemsRows}
      ${feesRows}
    </table>
  </div>

  ${summaryHtml}
  ${paymentsHtml}
  ${paidStamp}
  ${footerHtml}
  ${signatureHtml}
  ${thankYouHtml}
</body>
</html>`;
}
