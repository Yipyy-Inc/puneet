import { invoiceHeaderHtml, type FacilityInfo } from "@/lib/invoice-header";
import { escapeHtml } from "@/lib/email/shell";
import { formatDateLong, formatMoney, formatPercent } from "@/lib/i18n/format";
import { computeTax } from "@/lib/settings/tax";
import { taxableOwedForBooking } from "@/lib/payments/service-tax";

import type { TakePayment } from "./use-take-payment";

// ============================================================================
// The printed receipt — moved from PaymentCheckoutFlow with the dialog it
// belonged to (2026-10-03), and printed from what was REALLY taken.
//
// Ink only: on paper every colour drops out except the mark (§6 rule 10).
// Every value the facility, the client or staff typed is escaped rather than
// written into the page as markup.
// ============================================================================

const RECEIPT_CSS =
  "body{font-family:-apple-system,sans-serif;padding:40px;color:#111;max-width:420px;margin:0 auto}h1{font-size:18px;margin:0}h2{font-size:12px;color:#444;margin:4px 0 20px;font-weight:400}.row{display:flex;justify-content:space-between;gap:16px;padding:5px 0;font-size:13px;border-bottom:1px solid #ccc}.row.total{border-top:2px solid #111;border-bottom:none;font-weight:700;font-size:15px;padding-top:10px}.row.sub{color:#444}.badge{border:1px solid #111;padding:8px 16px;text-align:center;margin-top:16px;font-weight:700;font-size:13px}.footer{margin-top:24px;text-align:center;font-size:10px;color:#444}@media print{body{padding:20px}}";

export function printTakePaymentReceipt(
  tp: TakePayment,
  facility: FacilityInfo | null,
) {
  const done = tp.done;
  if (!done) return;
  const { t, locale } = tp;
  const props = tp.props;
  const money = (value: number) => formatMoney(value, locale);
  const rate = (value: number) => {
    const pct = Number((value * 100).toFixed(3));
    const digits = Number.isInteger(pct) ? 0 : String(pct).split(".")[1].length;
    return formatPercent(pct, locale, digits);
  };
  const supply = tp.figures.collect.subtotalCents;
  const taxLines = tp.data.taxConfig.pricesIncludeTax
    ? []
    : computeTax(
        taxableOwedForBooking(props.booking, supply),
        tp.data.taxConfig,
      ).lines;
  const row = (label: string, value: string, sub = false) =>
    `<div class="row${sub ? " sub" : ""}"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`;

  const w = window.open("", "_blank", "width=500,height=600");
  if (!w) return;
  w.document.write(
    [
      `<!DOCTYPE html><html lang="${locale}"><head><title>${escapeHtml(t("printTitle"))}</title><style>${RECEIPT_CSS}</style></head><body>`,
      invoiceHeaderHtml(facility),
      `<h1>${escapeHtml(t("printTitle"))}</h1>`,
      `<h2>${escapeHtml(formatDateLong(new Date(), locale))}</h2>`,
      row(t("printReference"), props.bookingLabel, true),
      props.receiptServiceWindow
        ? row(t("printService"), props.receiptServiceWindow, true)
        : "",
      props.receiptLines
        .map((line) => row(line.label, money(line.amount)))
        .join(""),
      row(t("printSubtotal"), money(supply / 100)),
      taxLines
        .map((line) =>
          row(
            `${line.name} ${rate(line.rate)}`,
            money(line.amountCents / 100),
            true,
          ),
        )
        .join(""),
      done.creditCents > 0
        ? row(t("accountCredit"), `−${money(done.creditCents / 100)}`, true)
        : "",
      tp.figures.tipCents > 0
        ? row(t("tip"), money(tp.figures.tipCents / 100), true)
        : "",
      `<div class="row total"><span>${escapeHtml(t("printCharged"))}</span><span>${escapeHtml(money(done.result.taken))}</span></div>`,
      done.lines
        .map((line) => row(line.label, money(line.cents / 100), true))
        .join(""),
      done.remainingCents > 0
        ? row(t("remainingBalance"), money(done.remainingCents / 100), true)
        : "",
      tp.note ? row(t("printNote"), tp.note, true) : "",
      `<div class="badge">${escapeHtml(t(done.pending ? "donePending" : "printRecorded"))}</div>`,
      `<div class="footer">${escapeHtml(t("printThanks"))}<br>${escapeHtml(facility?.name ?? "")}</div>`,
      "</body></html>",
    ].join("\n"),
  );
  w.document.close();
  w.print();
}
