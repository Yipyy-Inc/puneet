"use client";

import type { CustomerYipyyGoBooking } from "@/lib/api/customer-yipyy-go";
import type { YipyyGoAddOnRequest } from "@/lib/api/mappers/yipyy-go";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatMoney } from "@/lib/i18n/format";
import { addOnLine } from "@/lib/yipyy-go/charges-preview";

// What the form will add to the bill, shown before it is sent: the chosen
// add-ons at the facility's prices, and the medication fee when medications
// are listed. An estimate by construction — the server prices every line when
// the form is sent, and the sent panel then shows exactly what reached the
// bill. The review this replaces added invented prices and called it a total.
export function BillEstimate({
  data,
  requests,
  stayDays,
  hasMedications,
}: {
  data: CustomerYipyyGoBooking;
  requests: YipyyGoAddOnRequest[];
  stayDays: number;
  hasMedications: boolean;
}) {
  const { t, locale } = useCustomerText("yipyygo");
  const lines = requests.flatMap((request) => {
    const offer = data.offeredAddOns.find(
      (candidate) => candidate.id === request.addOnId,
    );
    return offer
      ? [{ offer, line: addOnLine(offer, request.quantity ?? 1, stayDays) }]
      : [];
  });
  const fee =
    data.medicationFee?.enabled &&
    data.medicationFee.amount > 0 &&
    hasMedications
      ? data.medicationFee
      : null;
  if (lines.length === 0 && !fee) return null;

  return (
    <section
      aria-labelledby="yipyy-go-bill-estimate"
      className="border-line space-y-2 rounded-xl border p-4"
    >
      <h3
        id="yipyy-go-bill-estimate"
        className="text-ink-tertiary text-[12px] font-bold tracking-[.06em] uppercase"
      >
        {t("billEstimateTitle")}
      </h3>
      <ul className="space-y-1">
        {lines.map(({ offer, line }) => (
          <li
            key={offer.id}
            className="text-body-ink flex justify-between gap-3 text-[14.5px] tabular-nums"
          >
            <span className="min-w-0">
              {offer.name} × {line.quantity}
            </span>
            <span>{formatMoney(line.total, locale)}</span>
          </li>
        ))}
        {fee && (
          <li className="text-body-ink flex flex-wrap justify-between gap-x-3 text-[14.5px]">
            <span className="min-w-0">
              {fee.label?.trim() || t("medicationFee")}
            </span>
            <span className="text-ink-secondary">{t("feeOnSend")}</span>
          </li>
        )}
      </ul>
      <p className="text-ink-secondary text-[13.5px]">
        {data.addOnsApproval === "staff_approval"
          ? t("billEstimateApproval")
          : t("billEstimateNote")}
      </p>
    </section>
  );
}
