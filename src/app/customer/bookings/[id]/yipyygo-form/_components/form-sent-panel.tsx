"use client";

import { CircleCheck } from "lucide-react";

import { RouteState } from "@/components/ui/route-state";
import type {
  CustomerYipyyGoBooking,
  CustomerYipyyGoPet,
  YipyyGoSubmitResult,
} from "@/lib/api/customer-yipyy-go";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatMoney } from "@/lib/i18n/format";

const SENT = new Set(["submitted", "approved", "completed_by_staff"]);

// The confirmation after a form is sent (§5d2: `success`, in the panel, never
// the toast). It says only what the server answered: the form is in; a
// confirmation email went out only when the submit route reports it did; and
// the bill shows exactly the lines the server put on it and the tip it
// recorded — the old screen announced an email nothing sent and a total it
// had added up itself. The one next step is the next pet still waiting for a
// form, or the booking.
export function FormSentPanel({
  data,
  pet,
  result,
  email,
  onSelectPet,
}: {
  data: CustomerYipyyGoBooking;
  pet: CustomerYipyyGoPet;
  result: YipyyGoSubmitResult;
  email: string | undefined;
  onSelectPet: (ref: number) => void;
}) {
  const { t, fill, locale } = useCustomerText("yipyygo");
  const nextPet = data.pets.find(
    (other) =>
      other.ref !== pet.ref &&
      other.editable &&
      !SENT.has(other.submission?.status ?? ""),
  );
  const onBill = result.charges.filter((charge) => charge.onBill);
  const tip = result.tipAmount ?? 0;
  const answers = result.submission.answers;
  // Where the facility approves forms first, nothing this one asked for is on
  // the bill until it does.
  const awaitingApproval =
    data.addOnsApproval === "staff_approval" &&
    (result.submission.addOnRequests.length > 0 ||
      (Boolean(data.medicationFee?.enabled) &&
        !answers.noMedications &&
        answers.medications.length > 0));

  return (
    <div className="space-y-4">
      <RouteState
        surface="card"
        pose="success"
        icon={CircleCheck}
        inkClassName="text-success"
        title={fill("sentTitle", { pet: pet.name })}
        description={
          result.confirmationSent && email
            ? fill("sentWithEmail", { email })
            : t("sentNoEmail")
        }
        action={
          nextPet
            ? {
                label: fill("nextPetForm", { pet: nextPet.name }),
                onClick: () => onSelectPet(nextPet.ref),
              }
            : {
                label: t("backToBooking"),
                href: `/customer/bookings/${data.booking.ref}`,
              }
        }
        className="min-h-0 p-0"
      />

      {(onBill.length > 0 || tip > 0 || awaitingApproval) && (
        <section
          aria-labelledby="yipyy-go-sent-bill"
          className="border-line bg-card shadow-card mx-auto w-full max-w-2xl space-y-3 rounded-2xl border p-[22px]"
        >
          <h2
            id="yipyy-go-sent-bill"
            className="text-heading text-[17px] font-bold"
          >
            {t("sentBillTitle")}
          </h2>
          {(onBill.length > 0 || tip > 0) && (
            <ul className="space-y-1">
              {onBill.map((charge) => (
                <li
                  key={charge.key}
                  className="text-body-ink flex justify-between gap-3 text-[14.5px] tabular-nums"
                >
                  <span className="min-w-0">
                    {charge.name} × {charge.quantity}
                  </span>
                  <span>
                    {formatMoney(charge.unitPrice * charge.quantity, locale)}
                  </span>
                </li>
              ))}
              {tip > 0 && (
                <li className="text-body-ink flex justify-between gap-3 text-[14.5px] tabular-nums">
                  <span className="min-w-0">{t("sentTip")}</span>
                  <span>{formatMoney(tip, locale)}</span>
                </li>
              )}
            </ul>
          )}
          {awaitingApproval && (
            <p className="text-ink-secondary text-[13.5px]">
              {t("billEstimateApproval")}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
