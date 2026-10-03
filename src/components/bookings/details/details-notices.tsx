"use client";

import { Check } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import type { BookingActionHandlers } from "@/components/bookings/booking-actions/BookingActionBar";
import { Button } from "@/components/ui/button";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { useCreateBookingFromModal } from "@/components/bookings/use-create-booking";
import { useFacilityProfile } from "@/lib/api/facility-profile";
import { formatDateLong, formatMoney, formatTime } from "@/lib/i18n/format";
import { autoTransitionTarget } from "@/lib/settings/booking-statuses";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { useUpdateBookingStatus } from "@/lib/api/booking-status";

import type { BookingDetails } from "./use-booking-details";

// ============================================================================
// What the booking page says under its header about where the booking stands
// that no part of the mock does: the client cancelled it, agreements are still
// to sign, an evaluation is advised, an estimate waits on the client, it was
// declined, a deposit is due. Each is the old page's notice, worded as it
// was, drawn in the mock's card.
//
// Two of the old ones are gone because the mock says them already: "{amount}
// paid" is the payment card's own Partly paid, and "This booking is finished"
// is the header's green Checked out.
// ============================================================================

export function DetailsNotices({
  d,
  handlers,
}: {
  d: BookingDetails;
  handlers: BookingActionHandlers;
}) {
  const { t, fill, locale } = d.text;
  const { t: actT } = useStaffText("bookingActions");
  const { openBookingModal } = useBookingModal();
  const createBooking = useCreateBookingFromModal();
  const { profile: facilityProfile } = useFacilityProfile();
  const updateStatus = useUpdateBookingStatus();
  const booking = d.booking;
  const client = d.client;
  if (!booking || !client) return null;

  const money = (amount: number) => formatMoney(amount, locale);
  const isCancelled = booking.status === "cancelled";
  const flow = d.settings.bookingFlow;
  const evaluationAdvised =
    !isCancelled &&
    booking.status !== "completed" &&
    flow.evaluationRequired &&
    flow.servicesRequiringEvaluation.includes(booking.service) &&
    !flow.hideServicesUntilEvaluationCompleted;
  const cancellation =
    isCancelled && booking.cancellation?.by === "customer"
      ? booking.cancellation
      : null;
  const awaiting =
    booking.status === "pending" && booking.awaitingAgreements === true;
  const paidSoFar = booking.amountPaid ?? 0;
  const depositDue =
    d.permissions.canSeeBookingAmounts &&
    booking.paymentStatus !== "paid" &&
    !isCancelled &&
    d.depositRule &&
    paidSoFar === 0;
  const declined =
    booking.status === "declined"
      ? d.sourceEstimate
        ? "estimate"
        : "request"
      : null;

  const setStatus = async (status: "confirmed" | "declined", key: string) => {
    try {
      await updateStatus.mutateAsync({ id: booking.id, status });
      toast.success(fill(key, { ref: d.bookingRef }));
    } catch (error) {
      toast.error(fill("statusNotChanged", { ref: d.bookingRef }), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const cancelledAt = cancellation?.at
    ? `${formatDateLong(cancellation.at, locale)}, ${formatTime(cancellation.at, locale)}`
    : "";

  return (
    <>
      {cancellation ? (
        <Notice
          tone={cancellation.late ? "warning" : "neutral"}
          title={
            cancellation.withdrawal
              ? fill("clientWithdrewTitle", { client: client.name })
              : cancellation.late
                ? fill("clientCancelledLateTitle", { client: client.name })
                : fill("clientCancelledTitle", { client: client.name })
          }
          body={[
            cancelledAt,
            cancellation.late && cancellation.noticeHours != null
              ? cancellation.feePercentage
                ? fill("clientCancelledLateFee", {
                    hours: cancellation.noticeHours,
                    fee: cancellation.feePercentage,
                  })
                : fill("clientCancelledLateNoFee", {
                    hours: cancellation.noticeHours,
                  })
              : null,
            cancellation.reason
              ? fill("clientCancelledReason", { reason: cancellation.reason })
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      ) : null}

      {awaiting ? (
        <Notice
          tone="warning"
          title={fill("awaitingTitle", { client: client.name })}
          body={t("awaitingBody")}
          action={
            <SigningLinkButtons
              clientRef={client.id}
              service={booking.service}
              email={client.email?.trim() || null}
              phone={client.phone?.trim() || null}
            />
          }
        />
      ) : null}

      {evaluationAdvised ? (
        <Notice
          tone="neutral"
          title={t("evalTitle")}
          body={fill("evalBody", { pet: d.petName })}
          action={
            <Button
              variant="quiet"
              size="bd-38"
              onClick={() =>
                openBookingModal({
                  clients: [client],
                  facilityId: booking.facilityId,
                  facilityName: facilityProfile.businessName,
                  preSelectedClientId: client.id,
                  preSelectedPetId: d.pet?.id,
                  preSelectedService: "evaluation",
                  onCreateBooking: createBooking,
                })
              }
            >
              {t("evalAction")}
            </Button>
          }
        />
      ) : null}

      {booking.status === "estimate_sent" ? (
        <Notice
          tone="neutral"
          title={t("estimateWaitingTitle")}
          // success-claim-ok: states the booking's recorded status (estimate_sent), not an action taken here
          body={fill("estimateWaitingBody", { client: client.name })}
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="bd-cta"
                size="bd-38"
                onClick={() => void setStatus("confirmed", "bookingConfirmed")}
              >
                {actT("confirm")}
              </Button>
              <Button
                variant="quiet"
                size="bd-38"
                onClick={() => void setStatus("declined", "declinedDone")}
              >
                {t("estimateMarkDeclined")}
              </Button>
            </div>
          }
        />
      ) : null}

      {declined ? (
        <Notice
          tone="danger"
          title={t(
            declined === "estimate"
              ? "estimateDeclinedTitle"
              : "requestDeclinedTitle",
          )}
          body={
            declined === "estimate"
              ? fill("estimateDeclinedBody", { client: client.name })
              : t("requestDeclinedBody")
          }
        />
      ) : null}

      {depositDue ? (
        <Notice
          tone="warning"
          title={t("depositDueTitle")}
          body={[
            fill("depositRuleLine", {
              rule: d.ruleDepositLabel,
              amount: money(d.ruleDepositAmount),
            }),
            autoTransitionTarget(d.statusRules, booking, "onDepositPaid") ===
            "confirmed"
              ? t("depositConfirms")
              : null,
          ]
            .filter(Boolean)
            .join(" ")}
          action={
            d.actions.some((a) => a.id === "charge_deposit") &&
            handlers.charge_deposit ? (
              <Button
                variant="bd-cta"
                size="bd-38"
                onClick={handlers.charge_deposit}
              >
                {actT("chargeDeposit")}
              </Button>
            ) : undefined
          }
        />
      ) : null}
    </>
  );
}

/**
 * "Email signing link" / "Text signing link" — the link the client signs the
 * facility's agreements from (/api/waivers/send-signing-link). Says to whom
 * it went once it did; says why not when it did not.
 */
function SigningLinkButtons({
  clientRef,
  service,
  email,
  phone,
}: {
  clientRef: number;
  service: string;
  email: string | null;
  phone: string | null;
}) {
  const { t, fill } = useStaffText("bookingDetail");
  const [sending, setSending] = useState<"email" | "sms" | null>(null);
  const [sent, setSent] = useState<{ email?: string; sms?: string }>({});

  const send = async (channel: "email" | "sms") => {
    if (sending) return;
    setSending(channel);
    try {
      const response = await fetch("/api/waivers/send-signing-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientRef, service, channel }),
      });
      const body = (await response.json().catch(() => null)) as {
        sent?: boolean;
        to?: string;
        detail?: string;
        error?: string;
      } | null;
      if (!response.ok || !body?.sent) {
        toast.error(t("signingLinkNotSent"), {
          description: body?.error ?? body?.detail,
        });
        return;
      }
      setSent((prev) => ({ ...prev, [channel]: body.to ?? "" }));
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {(["email", "sms"] as const).map((channel) => {
        const to = sent[channel];
        if (to !== undefined) {
          return (
            <span
              key={channel}
              className="text-success inline-flex min-h-[38px] items-center gap-1.5 text-[14px] font-semibold"
            >
              <Check aria-hidden className="size-4" />
              {fill(
                channel === "email"
                  ? "signingLinkEmailed"
                  : "signingLinkTexted",
                { to },
              )}
            </span>
          );
        }
        return (
          <Button
            key={channel}
            variant="quiet"
            size="bd-38"
            disabled={channel === "email" ? !email : !phone}
            loading={sending === channel}
            onClick={() => void send(channel)}
          >
            {t(channel === "email" ? "emailSigningLink" : "textSigningLink")}
          </Button>
        );
      })}
    </div>
  );
}

/** One notice: the mock's card, its title, its sentence and its action. Its
 *  tone is the title's ink — never a line on an edge (§6 rule 1). */
function Notice({
  tone,
  title,
  body,
  action,
}: {
  tone: "neutral" | "warning" | "danger";
  title: string;
  body: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="bg-card border-line flex flex-wrap items-center justify-between gap-3 rounded-[18px] border px-5 py-3.5 shadow-(--bd-sh-card)">
      <div className="min-w-0">
        <p
          className={
            tone === "warning"
              ? "text-warning text-[14px] font-semibold"
              : tone === "danger"
                ? "text-bad text-[14px] font-semibold"
                : "text-body-ink text-[14px] font-semibold"
          }
        >
          {title}
        </p>
        <p className="text-ink-tertiary text-[13px]">{body}</p>
      </div>
      {action}
    </div>
  );
}
