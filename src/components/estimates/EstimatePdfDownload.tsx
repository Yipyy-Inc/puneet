"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { Estimate } from "@/types/booking";
import { businessProfile } from "@/data/settings";

interface EstimatePdfDownloadProps {
  estimate: Estimate;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function EstimatePdfDownload({
  estimate,
  size = "sm",
  variant = "outline",
}: EstimatePdfDownloadProps) {
  const handleDownload = useCallback(() => {
    const e = estimate;
    const p = businessProfile;
    const nights =
      e.service === "boarding" && e.startDate && e.endDate
        ? Math.max(
            1,
            Math.round(
              (new Date(e.endDate).getTime() -
                new Date(e.startDate).getTime()) /
                86400000,
            ),
          )
        : null;

    const lineItemsHtml = e.lineItems
      .map(
        (li) =>
          `<tr>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9">${li.label}${li.description ? `<br><span style="color:#94a3b8;font-size:12px">${li.description}</span>` : ""}</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:center">${li.quantity}</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right">$${li.amount.toFixed(2)}</td>
            <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600">$${li.total.toFixed(2)}</td>
          </tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Estimate ${e.id} — ${p.businessName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 40px; color: #1e293b; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .facility { font-size: 20px; font-weight: 700; }
    .facility-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    .estimate-tag { background: #eff6ff; color: #2563eb; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .title { font-size: 24px; font-weight: 700; margin: 24px 0 8px; }
    .meta { font-size: 13px; color: #64748b; margin-bottom: 24px; }
    .service-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
    .service-name { font-size: 16px; font-weight: 600; text-transform: capitalize; }
    .service-detail { font-size: 13px; color: #64748b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; padding: 8px 0; border-bottom: 2px solid #e2e8f0; }
    th:nth-child(2) { text-align: center; }
    th:nth-child(3), th:nth-child(4) { text-align: right; }
    .totals { border-top: 2px solid #e2e8f0; padding-top: 12px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .total-row.grand { font-size: 18px; font-weight: 700; border-top: 2px solid #1e293b; padding-top: 12px; margin-top: 8px; }
    .note { background: #fffbeb; border-radius: 8px; padding: 12px 16px; font-style: italic; color: #92400e; font-size: 13px; margin-top: 20px; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="facility">${p.businessName}</div>
      <div class="facility-sub">${p.phone} · ${p.email}</div>
      <div class="facility-sub">${p.website}</div>
    </div>
    <span class="estimate-tag">ESTIMATE</span>
  </div>

  <div class="title">Estimate for ${e.petNames.length > 0 ? e.petNames.join(", ") : (e.guestPetInfo?.name ?? "Your Pet")}</div>
  <div class="meta">
    Prepared for ${e.clientName} · ${fmtDate(e.createdAt.split("T")[0])}
    ${e.currentVersion ? ` · Rev ${e.currentVersion}` : ""}
  </div>

  <div class="service-box">
    <div class="service-name">${e.service}${e.serviceType ? ` — ${e.serviceType}` : ""}</div>
    <div class="service-detail">
      ${fmtDate(e.startDate)}${e.endDate && e.endDate !== e.startDate ? ` to ${fmtDate(e.endDate)}` : ""}
      ${nights ? ` · ${nights} night${nights !== 1 ? "s" : ""}` : ""}
    </div>
    ${e.checkInTime ? `<div class="service-detail">Check-in: ${fmtTime(e.checkInTime)}${e.checkOutTime ? ` · Check-out: ${fmtTime(e.checkOutTime)}` : ""}</div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Qty</th>
        <th>Rate</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHtml}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>$${e.subtotal.toFixed(2)}</span></div>
    ${e.discount > 0 ? `<div class="total-row" style="color:#059669"><span>Discount${e.discountReason ? ` (${e.discountReason})` : ""}</span><span>-$${e.discount.toFixed(2)}</span></div>` : ""}
    <div class="total-row"><span>Tax (${(e.taxRate * 100).toFixed(0)}%)</span><span>$${e.taxAmount.toFixed(2)}</span></div>
    <div class="total-row grand"><span>Estimated Total</span><span>$${e.total.toFixed(2)}</span></div>
    ${e.depositRequired ? `<div class="total-row" style="color:#2563eb"><span>Deposit Required</span><span>$${e.depositRequired.toFixed(2)}</span></div>` : ""}
  </div>

  ${e.publicNote ? `<div class="note">"${e.publicNote}"</div>` : ""}

  ${e.expiresAt ? `<div style="margin-top:20px;font-size:12px;color:#94a3b8">This estimate expires on ${fmtDate(e.expiresAt.split("T")[0])}</div>` : ""}

  <div class="footer">
    ${p.businessName} · ${p.address?.street ?? ""}, ${p.address?.city ?? ""}, ${p.address?.state ?? ""} ${p.address?.zipCode ?? ""}
    <br>Powered by Yipyy
  </div>
</body>
</html>`;

    // Open in new window for print/save as PDF
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 300);
    }
  }, [estimate]);

  return (
    <Button
      variant={variant}
      size={size}
      className="gap-1.5"
      onClick={handleDownload}
    >
      <Download className="size-3.5" />
      PDF
    </Button>
  );
}
