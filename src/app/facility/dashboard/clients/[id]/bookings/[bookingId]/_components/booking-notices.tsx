"use client";

import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ClipboardList,
  Clock,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { formatDateLong, formatMoney, formatTime } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// What the booking page says above the fold about where the booking stands:
// an evaluation to book, an estimate waiting on the client, a declined one, a
// deposit due or part-paid, a finished booking.
//
// Moved out of the page as it was translated, and four of them corrected on
// the way:
//
//   · "Deposit Collected — $X" counted ANY payment as the deposit, a
//     prepayment included. It says what was paid and what is still owed.
//   · "Paying the deposit will auto-confirm this booking" said so whatever
//     the facility's own rule was; it is said only when the rule confirms.
//   · "Estimate Declined — {client} declined this estimate" was shown on a
//     request the FACILITY declined too. The two read differently now.
//   · "This booking is finished" was shown on a booking paid in full before
//     the pet had even arrived. It waits for the booking to be completed.
// ============================================================================

export interface BookingNoticesProps {
  clientName: string;
  petName: string;
  /** The facility's booking flow recommends an evaluation for this service. */
  evaluationAdvised: boolean;
  onBookEvaluation: () => void;
  estimateSent: boolean;
  onConfirmEstimate: () => void;
  onDeclineEstimate: () => void;
  declined: "estimate" | "request" | null;
  /** A deposit rule applies and nothing has been paid; null otherwise. */
  depositDue: {
    rule: string;
    amount: number;
    /** The facility's rule confirms the booking when the deposit is paid. */
    confirms: boolean;
    /** The lifecycle offers the charge to this viewer. */
    onCharge?: () => void;
  } | null;
  /** Money taken and still owed, when some but not all has been paid. */
  partPaid: { paid: number; owed: number } | null;
  finished: boolean;
  /** The client cancelled it themselves (details.cancellation, written by
   * the database with the terms it was made under). */
  customerCancellation?: {
    at?: string;
    reason?: string | null;
    withdrawal?: boolean;
    late?: boolean;
    noticeHours?: number | null;
    feePercentage?: number | null;
  } | null;
}

export function BookingNotices({
  clientName,
  petName,
  evaluationAdvised,
  onBookEvaluation,
  estimateSent,
  onConfirmEstimate,
  onDeclineEstimate,
  declined,
  depositDue,
  partPaid,
  finished,
  customerCancellation,
}: BookingNoticesProps) {
  const { t, fill, locale } = useStaffText("bookingDetail");
  const { t: actT } = useStaffText("bookingActions");
  const money = (amount: number) => formatMoney(amount, locale);

  const cancelledAt = customerCancellation?.at
    ? `${formatDateLong(customerCancellation.at, locale)}, ${formatTime(customerCancellation.at, locale)}`
    : "";

  return (
    <>
      {customerCancellation && (
        <Notice
          icon={
            customerCancellation.late ? (
              <AlertTriangle className="text-warning size-4" />
            ) : (
              <XCircle className="size-4" />
            )
          }
          title={
            customerCancellation.withdrawal
              ? fill("clientWithdrewTitle", { client: clientName })
              : customerCancellation.late
                ? fill("clientCancelledLateTitle", { client: clientName })
                : fill("clientCancelledTitle", { client: clientName })
          }
          body={
            <>
              {cancelledAt}
              {customerCancellation.late &&
                customerCancellation.noticeHours != null && (
                  <>
                    {" · "}
                    {customerCancellation.feePercentage
                      ? fill("clientCancelledLateFee", {
                          hours: customerCancellation.noticeHours,
                          fee: customerCancellation.feePercentage,
                        })
                      : fill("clientCancelledLateNoFee", {
                          hours: customerCancellation.noticeHours,
                        })}
                  </>
                )}
              {customerCancellation.reason && (
                <>
                  {" · "}
                  {fill("clientCancelledReason", {
                    reason: customerCancellation.reason,
                  })}
                </>
              )}
            </>
          }
        />
      )}

      {evaluationAdvised && (
        <Notice
          icon={<ClipboardList className="size-4" />}
          title={t("evalTitle")}
          body={fill("evalBody", { pet: petName })}
          action={
            // It toasted "Evaluation appointment created" and created
            // nothing. It opens the booking wizard on an evaluation for this
            // pet, and the wizard creates it.
            <Button size="sm" variant="outline" onClick={onBookEvaluation}>
              <ClipboardList className="size-3.5" />
              {t("evalAction")}
            </Button>
          }
        />
      )}

      {estimateSent && (
        <Notice
          icon={<Clock className="size-4" />}
          title={t("estimateWaitingTitle")}
          // success-claim-ok: states the booking's recorded status (estimate_sent), not an action taken here
          body={fill("estimateWaitingBody", { client: clientName })}
          action={
            // "Resend" opened a modal whose Send was a toast. An estimate is
            // its own record now, resent from the Estimates screen.
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={onConfirmEstimate}>
                <CheckCircle2 className="size-3.5" />
                {actT("confirm")}
              </Button>
              <Button size="sm" variant="outline" onClick={onDeclineEstimate}>
                <XCircle className="size-3.5" />
                {t("estimateMarkDeclined")}
              </Button>
            </div>
          }
        />
      )}

      {declined && (
        <Notice
          icon={<XCircle className="text-destructive size-4" />}
          title={t(
            declined === "estimate"
              ? "estimateDeclinedTitle"
              : "requestDeclinedTitle",
          )}
          body={
            declined === "estimate"
              ? fill("estimateDeclinedBody", { client: clientName })
              : t("requestDeclinedBody")
          }
        />
      )}

      {depositDue && (
        <Notice
          icon={<Banknote className="size-4" />}
          title={t("depositDueTitle")}
          body={
            <>
              {fill("depositRuleLine", {
                rule: depositDue.rule,
                amount: money(depositDue.amount),
              })}
              {depositDue.confirms && <> {t("depositConfirms")}</>}
            </>
          }
          action={
            depositDue.onCharge ? (
              <Button size="sm" onClick={depositDue.onCharge}>
                <Banknote className="size-3.5" />
                {actT("chargeDeposit")}
              </Button>
            ) : undefined
          }
        />
      )}

      {partPaid && (
        <Notice
          icon={<CheckCircle2 className="text-success size-4" />}
          title={fill("paidSoFarTitle", { amount: money(partPaid.paid) })}
          body={fill("stillOwedLine", { amount: money(partPaid.owed) })}
        />
      )}

      {finished && (
        <Notice
          icon={<CheckCircle2 className="text-success size-4" />}
          title={t("finishedTitle")}
          body={t("finishedBody")}
        />
      )}
    </>
  );
}

// One shape for every notice: a white card with a hairline, the glyph in its
// own ink, and the words — §6 rule 2 allows no tint behind them.
function Notice({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="border-line bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="text-ink-secondary mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-body-ink text-sm font-semibold">{title}</p>
          <p className="text-ink-secondary text-sm">{body}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
