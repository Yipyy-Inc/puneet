"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { BookingActionHandlers } from "@/components/bookings/booking-actions/BookingActionBar";
import { useBookingArrival } from "@/lib/api/booking-arrival";
import {
  useEmailReceipt,
  useMarkBookingNoShow,
  useSendPayLink,
} from "@/lib/api/booking-money";
import { useUpdateBookingStatus } from "@/lib/api/booking-status";
import { arrivalFailure } from "@/lib/bookings/arrival-failure";
import { describeVaccineGaps } from "@/lib/bookings/use-vaccine-gaps";
import { formatMoney } from "@/lib/i18n/format";
import { autoTransitionTarget } from "@/lib/settings/booking-statuses";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { Booking } from "@/types/booking";

import type { BookingDetails } from "./use-booking-details";
import type { BookingTill } from "./use-booking-till";
import { useNotifyReady } from "./use-notify-ready";

// ============================================================================
// What the booking page's buttons DO — the lifecycle's actions, moved out of
// the page (2026-10-03) with every write, confirm and toast unchanged.
//
// Checking in and out goes through the service's own write
// (useBookingArrival), so the required forms and the kennel rule apply and the
// boards agree; the database mirrors it into the status. Everything that is
// reversible is confirmed first (§5j) and says what it did (§5s). Taking money
// goes through the till, behind the care gate.
// ============================================================================

/** The page's dialogs. One is open at a time. */
export type DetailDialog =
  | "edit"
  | "cancel"
  | "transfer"
  | "earlyCheckout"
  | "tipSplit"
  | "deposit"
  | "prepayment"
  | "refund"
  | "retail"
  | "serviceCharge"
  | "careSheet"
  | "incident"
  | "moveKennel"
  | "changeGroup"
  | "groomPrefs"
  | "addMedication"
  | "logActivity"
  | "tags";

export interface PendingConfirm {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export function useBookingHandlers(
  d: BookingDetails,
  till: BookingTill,
  extra: {
    onPrintInvoice: () => void;
    canPrintCareSheet: boolean;
  },
) {
  const updateStatus = useUpdateBookingStatus();
  const arrival = useBookingArrival();
  const markNoShow = useMarkBookingNoShow();
  const sendPayLink = useSendPayLink();
  const emailReceipt = useEmailReceipt();
  const notifyReady = useNotifyReady(d);
  const { t: actT, fill: actFill } = useStaffText("bookingActions");
  const { t, fill, locale } = d.text;

  const [dialog, setDialog] = useState<DetailDialog | null>(null);
  // What the open dialog is about, when the opener says: the journal's day
  // for "+ Log activity", the pet whose groom preferences are being edited.
  const [dialogArg, setDialogArg] = useState<string | null>(null);
  const openDialog = (name: DetailDialog, arg?: string) => {
    setDialogArg(arg ?? null);
    setDialog(name);
  };
  // "Review and approve" opens the edit wizard; saving it confirms the request.
  const [approveOnSave, setApproveOnSave] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);

  const booking = d.booking;
  if (!booking || !d.client) {
    return {
      handlers: {} as BookingActionHandlers,
      dialog,
      setDialog,
      openDialog,
      dialogArg,
      approveOnSave,
      setApproveOnSave,
      confirm,
      setConfirm,
    };
  }
  const client = d.client;
  const { bookingRef, petName } = d;

  const confirmThen = (
    title: string,
    description: string,
    confirmLabel: string,
    onConfirm: () => void,
  ) => setConfirm({ title, description, confirmLabel, onConfirm });

  const arrivalProblem = (error: unknown) => {
    const failure = arrivalFailure(error);
    const key =
      failure === "needs_kennel"
        ? "failNeedsKennel"
        : failure === "not_allowed"
          ? "failNotAllowed"
          : failure === "cannot_now"
            ? "failCannotNow"
            : "failFailed";
    toast.error(actFill(key, { pet: petName }), {
      description: error instanceof Error ? error.message : undefined,
    });
  };

  const setStatus = async (
    status: Booking["status"],
    doneKey: string,
    after?: () => void,
  ) => {
    try {
      await updateStatus.mutateAsync({ id: booking.id, status });
      toast.success(actFill(doneKey, { ref: bookingRef, pet: petName }));
      after?.();
    } catch (error) {
      toast.error(fill("statusNotChanged", { ref: bookingRef }), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  // Reversals write the status back: what they reverse is what this page's
  // own check-in, confirm and checkout write.
  const revertTo = async (status: Booking["status"], doneKey: string) => {
    try {
      await updateStatus.mutateAsync({ id: booking.id, status });
      toast.success(fill(doneKey, { ref: bookingRef }));
    } catch (error) {
      toast.error(fill("statusNotChanged", { ref: bookingRef }), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const undoCheckIn = async () => {
    try {
      await arrival.undoCheckIn(booking);
      toast.success(actFill("checkInUndone", { pet: petName }));
    } catch (error) {
      arrivalProblem(error);
    }
  };

  const checkIn = async () => {
    try {
      await arrival.checkIn(booking);
      toast.success(actFill("checkedIn", { pet: petName }), {
        action: { label: actT("undo"), onClick: () => void undoCheckIn() },
      });
    } catch (error) {
      arrivalProblem(error);
      return;
    }
    // A facility's own rule may take a check-in further than checked_in.
    const target = autoTransitionTarget(d.statusRules, booking, "onCheckIn");
    if (target && target !== "checked_in") {
      await updateStatus
        .mutateAsync({ id: booking.id, status: target as Booking["status"] })
        .catch(() => undefined);
    }
  };

  const departWithoutTill = async () => {
    try {
      await arrival.checkOut(booking);
      toast.success(actFill("checkedOut", { pet: petName }));
    } catch (error) {
      arrivalProblem(error);
    }
  };

  const reopenCheckout = async () => {
    try {
      await arrival.reopen(booking);
      toast.success(actFill("checkoutUndone", { pet: petName }));
    } catch (error) {
      arrivalProblem(error);
    }
  };

  const sendPayLinkBy = async (channel: "email" | "sms") => {
    try {
      const result = await sendPayLink.mutateAsync({
        bookingRef: booking.id,
        channel,
      });
      if (result.sent) {
        toast.success(
          fill(channel === "email" ? "payLinkEmailed" : "payLinkTexted", {
            name: client.name,
          }),
        );
      } else {
        toast.warning(t("payLinkNotSent"), { description: result.detail });
      }
    } catch (error) {
      toast.error(t("payLinkNotSent"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  // Says where it went, or why it did not — never "sent" for an email that
  // was not.
  const emailTheReceipt = async () => {
    try {
      const result = await emailReceipt.mutateAsync({ bookingRef: booking.id });
      if (result.sent) {
        toast.success(
          fill("receiptEmailed", { email: result.to ?? client.email }),
        );
      } else {
        toast.warning(t("receiptNotSent"), { description: result.detail });
      }
    } catch (error) {
      toast.error(t("receiptNotSent"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const open = (name: DetailDialog) => () => setDialog(name);

  const handlers: BookingActionHandlers = {
    review_request: () => {
      setApproveOnSave(true);
      setDialog("edit");
    },
    waitlist_request: () => void setStatus("waitlisted", "waitlistedDone"),
    decline_request: () =>
      confirmThen(
        actT("declineTitle"),
        actT("declineBody"),
        actT("declineRequest"),
        () => void setStatus("declined", "declinedDone"),
      ),
    confirm: () => void setStatus("confirmed", "confirmedDone"),
    undo_confirm: () =>
      confirmThen(
        t("undoConfirmTitle"),
        t("undoConfirmBody"),
        t("undoConfirmConfirm"),
        () => void revertTo("pending", "confirmUndone"),
      ),
    charge_deposit: open("deposit"),
    take_prepayment: open("prepayment"),
    check_in: () => {
      const gaps = d.vaccineGaps(booking.service, d.pets);
      if (gaps.length === 0) return void checkIn();
      confirmThen(
        actT("vaccineGapTitle"),
        actFill("vaccineGapBody", {
          gaps: describeVaccineGaps(gaps, locale, (vaccines, name) =>
            actFill("vaccineGapPet", { vaccines, pet: name }),
          ),
        }),
        actFill("vaccineGapConfirm", { pet: petName }),
        () => void checkIn(),
      );
    },
    no_show: () =>
      confirmThen(t("noShowTitle"), t("noShowBody"), t("noShowConfirm"), () =>
        markNoShow.mutate(booking.id, {
          onSuccess: () =>
            toast.success(fill("noShowRecorded", { ref: bookingRef })),
          onError: (error) =>
            toast.error(fill("statusNotChanged", { ref: bookingRef }), {
              description: error.message,
            }),
        }),
      ),
    // With money owed and a person who can take it, checking out IS the till;
    // otherwise it records the departure and the balance stays on the booking.
    check_out: () =>
      d.owed > 0 && d.permissions.canTakePayment
        ? till.toTill()
        : void departWithoutTill(),
    check_out_unpaid: () =>
      confirmThen(
        actFill("checkOutUnpaidTitle", { pet: petName }),
        actFill("checkOutUnpaidBody", {
          pet: petName,
          amount: formatMoney(d.owed, locale),
        }),
        actT("checkOutUnpaid"),
        () => void departWithoutTill(),
      ),
    mark_in_progress: () => void setStatus("in_progress", "inProgressDone"),
    // A groom that is ready: the owner can be told, in one tap, by text.
    mark_ready: () =>
      void setStatus("ready", "readyDone", () => notifyReady.offer()),
    undo_check_in: () =>
      confirmThen(
        t("undoCheckInTitle"),
        t("undoCheckInBody"),
        t("undoCheckInConfirm"),
        () => void undoCheckIn(),
      ),
    finish: () => void setStatus("completed", "finishedDone"),
    take_payment: till.toPayment,
    split_tips: open("tipSplit"),
    refund: open("refund"),
    undo_checkout: () =>
      confirmThen(
        actT("undoCheckoutTitle"),
        actFill("undoCheckoutBody", { pet: petName }),
        t("undoCheckoutConfirm"),
        () => void reopenCheckout(),
      ),
    undo_no_show: () =>
      confirmThen(
        actT("undoNoShowTitle"),
        actT("undoNoShowBody"),
        actT("undoNoShow"),
        () => void setStatus("confirmed", "undoNoShowDone"),
      ),
    reinstate: () =>
      confirmThen(
        actT("reinstateTitle"),
        actT("reinstateBody"),
        actT("reinstate"),
        () => void setStatus("confirmed", "reinstatedDone"),
      ),
    edit: open("edit"),
    add_item: open("retail"),
    add_service_charge: open("serviceCharge"),
    transfer: open("transfer"),
    report_incident: open("incident"),
    // One step: the cancel dialog IS the confirmation.
    cancel: open("cancel"),
    onPayLink: (channel) => void sendPayLinkBy(channel),
    // A receipt says "paid": offered once the booking is, to who may see money.
    ...(d.permissions.canSeeBookingAmounts && booking.paymentStatus === "paid"
      ? { onEmailReceipt: () => void emailTheReceipt() }
      : {}),
    ...(extra.canPrintCareSheet
      ? { onPrintCareSheet: () => setDialog("careSheet") }
      : {}),
    onPrintInvoice: extra.onPrintInvoice,
  };

  return {
    handlers,
    dialog,
    setDialog,
    openDialog,
    dialogArg,
    approveOnSave,
    setApproveOnSave,
    confirm,
    setConfirm,
  };
}

export type BookingHandlers = ReturnType<typeof useBookingHandlers>;
