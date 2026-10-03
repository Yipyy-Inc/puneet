"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { toast } from "sonner";

import { AddRetailItemModal } from "@/components/bookings/AddRetailItemModal";
import { AddServiceChargeDialog } from "@/components/bookings/AddServiceChargeDialog";
import { CareCompletionGateDialog } from "@/components/bookings/CareCompletionWarning";
import { DepositChargeModal } from "@/components/bookings/DepositChargeModal";
import { PrepaymentModal } from "@/components/bookings/PrepaymentModal";
import { RefundModal } from "@/components/bookings/RefundModal";
import { TipSplitModal } from "@/components/bookings/TipSplitModal";
import { CancelBookingModal } from "@/components/bookings/modals/CancelBookingModal";
import { MoveBookingLocationDialog } from "@/components/bookings/modals/MoveBookingLocationDialog";
import { useCancelWithRefund } from "@/components/bookings/use-cancel-with-refund";
import { PrintKennelCardsModal } from "@/components/facility/boarding/kennel-card-print";
import { CheckOutDialog } from "@/components/facility/dashboard/check-out-dialog";
import { CreateIncidentModal } from "@/components/incidents/CreateIncidentModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { bookingMutations } from "@/lib/api/booking";
import { useBoardingStayUpdate } from "@/lib/api/boarding-attendance";
import {
  refundTender,
  useChargeBooking,
  useRefundBooking,
  useRefundBookingToCard,
  type Tender,
} from "@/lib/api/booking-money";
import { useAddLineItems } from "@/lib/api/booking-line-items";
import { useUpdateBookingStatus } from "@/lib/api/booking-status";
import { useSetTipSplit } from "@/lib/api/booking-tips";
import { staffQueries } from "@/lib/api/staff";
import { bookingValue } from "@/lib/bookings/booking-value";
import {
  formatDateLong,
  formatMoney,
  formatStayRange,
} from "@/lib/i18n/format";
import { autoTransitionTarget } from "@/lib/settings/booking-statuses";
import { useShellText } from "@/lib/shell/use-shell-text";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { Booking } from "@/types/booking";

import { DetailsSmallDialogs } from "./details-small-dialogs";
import { earlyCheckoutSubject, kennelCardGuest } from "./dialog-subjects";
import { TakePaymentDialog } from "./take-payment/take-payment-dialog";
import type { BookingDetails } from "./use-booking-details";
import type { BookingHandlers } from "./use-booking-handlers";
import type { BookingTill } from "./use-booking-till";
import type { ServiceFacts } from "./use-service-facts";

// ~4,700 lines of wizard; only a person who edits should load it.
const BookingEditDialog = dynamic(
  () =>
    import("@/components/bookings/BookingEditDialog").then(
      (m) => m.BookingEditDialog,
    ),
  { ssr: false },
);

// ============================================================================
// Every dialog the booking page opens, moved out of the page (2026-10-03) with
// every write unchanged — each one awaited, each one saying what it did. The
// mocks draw none of them except Take payment; the rest keep their own design
// and take the page's look from the overlay stamp.
// ============================================================================

export function BookingDialogs({
  d,
  facts,
  h,
  till,
}: {
  d: BookingDetails;
  facts: ServiceFacts;
  h: BookingHandlers;
  till: BookingTill;
}) {
  const queryClient = useQueryClient();
  const words = useShellText("booking");
  const { t, fill, locale } = d.text;
  const { t: actT } = useStaffText("bookingActions");
  const cancelWithRefund = useCancelWithRefund();
  const refundBooking = useRefundBooking();
  const refundToCard = useRefundBookingToCard();
  const chargeBooking = useChargeBooking();
  const addLineItems = useAddLineItems();
  const setTipSplit = useSetTipSplit();
  const updateStatus = useUpdateBookingStatus();
  const boardingStay = useBoardingStayUpdate();
  const { data: staffProfiles } = useQuery({
    ...staffQueries.profiles(),
    enabled: h.dialog === "tipSplit",
  });
  // The facility's actual people, with a row id a tip can be paid to.
  const tipStaff = useMemo(
    () =>
      (staffProfiles ?? [])
        .filter((p) => p.status === "active" && p.rowId)
        .map((p) => ({
          id: p.rowId!,
          name: `${p.firstName} ${p.lastName}`.trim(),
        })),
    [staffProfiles],
  );
  const addItems = useMutation({
    mutationFn: (input: Parameters<typeof addLineItems.mutateAsync>[0]) =>
      addLineItems.mutateAsync(input),
    onSuccess: (result) =>
      toast.success(
        fill(result.items.length === 1 ? "itemsAddedOne" : "itemsAddedMany", {
          n: result.items.length,
          ref: d.bookingRef,
        }),
      ),
    onError: (error) => toast.error(error.message),
  });

  const booking = d.booking;
  const client = d.client;
  if (!booking || !client) return null;
  const close = (open: boolean) => {
    if (!open) h.setDialog(null);
  };
  const is = (name: typeof h.dialog) => h.dialog === name;

  return (
    <>
      {is("edit") ? (
        <BookingEditDialog
          booking={booking}
          client={client}
          open
          mode={h.approveOnSave ? "approve" : "edit"}
          onOpenChange={(open) => {
            if (!open) {
              h.setDialog(null);
              h.setApproveOnSave(false);
            }
          }}
        />
      ) : null}

      <CancelBookingModal
        booking={booking}
        clientName={client.name}
        petName={d.pet?.name}
        open={is("cancel")}
        onOpenChange={close}
        // Refund first, then cancel — see use-cancel-with-refund.ts.
        onConfirm={cancelWithRefund}
      />

      <MoveBookingLocationDialog
        open={is("transfer")}
        onOpenChange={close}
        bookingId={booking.id}
        currentLocationId={booking.locationId}
      />

      {d.pet ? (
        <CheckOutDialog
          booking={earlyCheckoutSubject(booking, d.pet, client)}
          open={is("earlyCheckout")}
          onOpenChange={close}
          isEarlyCheckout
          // The stay is shortened to the day they left, a boarding guest's
          // departure is stamped, and the till opens on the balance.
          onConfirm={async ({ timestamp, reason, earlyCheckout }) => {
            const left = new Date(timestamp);
            const leftOn = [
              left.getFullYear(),
              String(left.getMonth() + 1).padStart(2, "0"),
              String(left.getDate()).padStart(2, "0"),
            ].join("-");
            try {
              await bookingMutations.update(booking.id, {
                endDate: leftOn,
                earlyCheckout: {
                  at: timestamp,
                  reason: reason || undefined,
                  unusedNights: earlyCheckout?.unusedNights,
                },
              } as Partial<Booking>);
              if (booking.service === "boarding") {
                await boardingStay
                  .mutateAsync({ bookingRef: booking.id, checkOut: true })
                  .catch(() => undefined);
              }
              await queryClient.invalidateQueries({ queryKey: ["bookings"] });
              toast.success(
                fill("earlyCheckoutDone", {
                  ref: d.bookingRef,
                  date: formatDateLong(leftOn, locale),
                }),
                { description: t("earlyCheckoutHelp") },
              );
              till.openCheckout();
            } catch (error) {
              toast.error(t("earlyCheckoutFailed"), {
                description: error instanceof Error ? error.message : undefined,
              });
            }
          }}
        />
      ) : null}

      {d.pet && d.kind === "boarding" ? (
        <PrintKennelCardsModal
          open={is("careSheet")}
          onClose={() => h.setDialog(null)}
          guests={[
            kennelCardGuest(
              booking,
              d.pet,
              client,
              facts.kennelLabel,
              { t: words, locale },
              {
                unassigned: t("unassigned"),
                standardPackage: t("standardPackage"),
              },
            ),
          ]}
          initialFormat="kennel"
        />
      ) : null}

      <Dialog open={is("incident")} onOpenChange={close}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <CreateIncidentModal
            onClose={() => h.setDialog(null)}
            prefilledPets={d.pets.map((p) => ({
              id: p.id,
              name: p.name,
              clientName: client.name,
              clientId: client.id,
            }))}
            reservationId={d.bookingRef}
            bookingId={booking.id}
            clientId={client.id}
          />
        </DialogContent>
      </Dialog>

      <TakePaymentDialog
        open={till.open}
        onOpenChange={till.setOpen}
        booking={booking}
        clientName={client.name}
        clientRef={client.id}
        clientRowId={
          client.rowId ??
          (booking as { clientRowId?: string }).clientRowId ??
          null
        }
        bookingLabel={fill("bookingLabel", {
          ref: d.bookingRef,
          service: d.serviceLabel,
        })}
        receiptServiceWindow={formatStayRange(
          booking.startDate,
          booking.endDate,
          locale,
        )}
        amountDue={till.amountDue}
        loyaltyDiscount={d.loyalty.discount ?? undefined}
        membershipDiscount={d.membershipDiscount ?? undefined}
        pledgedTip={till.pledgedTip}
        receiptLines={[
          {
            label: booking.serviceType || booking.service,
            amount: booking.totalCost,
          },
          ...d.lineItems.map((item) => ({
            label:
              item.quantity > 1 ? `${item.name} x${item.quantity}` : item.name,
            amount: item.price,
          })),
          ...till.timeFees.map((fee) => ({
            label: fee.label || t("latePickupLine"),
            amount: fee.amount,
          })),
        ]}
        onConfirm={till.checkout}
      />

      <TipSplitModal
        open={is("tipSplit")}
        onOpenChange={close}
        totalTip={d.tips?.tipCollected ?? 0}
        staffOptions={tipStaff}
        staffServices={[
          {
            staffName: booking.stylistPreference ?? t("staffFallback"),
            serviceName: d.serviceLabel,
            serviceValue: booking.basePrice,
            multiStaff: false,
          },
        ]}
        onSave={async (method, allocations) => {
          await setTipSplit.mutateAsync({
            bookingRef: booking.id,
            method,
            allocations,
          });
          toast.success(t("tipSplitSaved"), {
            description: fill(
              allocations.length === 1
                ? "tipSplitStaffOne"
                : "tipSplitStaffMany",
              { n: allocations.length },
            ),
          });
        }}
      />

      <DepositChargeModal
        open={is("deposit")}
        onOpenChange={close}
        ruleAmount={d.ruleDepositAmount}
        ruleLabel={d.ruleDepositLabel}
        taxFor={d.taxOnSupply}
        onCharge={async (amount, method) => {
          const charged = await chargeBooking.mutateAsync({
            booking,
            amount,
            tax: d.taxOnSupply(amount),
            method: method as Tender,
            note: fill("depositNote", { rule: d.ruleDepositLabel }),
          });
          // What paying the deposit does is the facility's rule, and only
          // ever moves a booking that is not yet confirmed.
          const target = autoTransitionTarget(
            d.statusRules,
            booking,
            "onDepositPaid",
          );
          let confirmed = false;
          if (
            target === "confirmed" &&
            (booking.status === "pending" || booking.status === "estimate_sent")
          ) {
            try {
              await updateStatus.mutateAsync({
                id: booking.id,
                status: "confirmed",
              });
              confirmed = true;
            } catch (error) {
              toast.error(t("depositNotConfirmed"), {
                description: error instanceof Error ? error.message : undefined,
              });
            }
          }
          toast.success(
            fill(confirmed ? "depositRecordedConfirmed" : "depositRecorded", {
              amount: formatMoney(charged, locale),
            }),
          );
        }}
      />

      <PrepaymentModal
        open={is("prepayment")}
        onOpenChange={close}
        remainingDue={d.owed}
        invoiceTotal={booking.amountDue ?? booking.totalCost}
        alreadyCollected={booking.amountPaid ?? 0}
        taxFor={d.taxOnSupply}
        onConfirm={async (result) => {
          const charged = await chargeBooking.mutateAsync({
            booking,
            amount: result.amount,
            tax: d.taxOnSupply(result.amount),
            method: result.method as Tender,
            ...(result.note ? { note: result.note } : {}),
          });
          toast.success(
            fill("prepaymentRecorded", {
              amount: formatMoney(charged, locale),
            }),
          );
        }}
      />

      <RefundModal
        open={is("refund")}
        onOpenChange={close}
        invoiceTotal={booking.invoice?.total ?? bookingValue(booking)}
        amountPaid={booking.amountPaid ?? 0}
        items={(booking.invoice?.items ?? []).map((i) => ({
          name: i.name,
          price: i.price,
        }))}
        onConfirm={async (refund) => {
          if (refund.method === "original") {
            const result = await refundToCard.mutateAsync({
              bookingRef: booking.id,
              amountCents: Math.round(refund.amount * 100),
              reason: refund.reason,
            });
            toast.success(
              fill("refundedCard", {
                amount: formatMoney(result.refundedCents / 100, locale),
              }),
              { description: result.results.map((r) => r.detail).join(" ") },
            );
            if (result.shortfallCents > 0) {
              toast.warning(
                fill("refundShortfall", {
                  amount: formatMoney(result.shortfallCents / 100, locale),
                }),
              );
            }
            return;
          }
          await refundBooking.mutateAsync({
            bookingId: booking.id,
            amount: refund.amount,
            method: refundTender(refund.method),
            reason: refund.reason,
          });
          toast.success(
            fill(
              refund.method === "cash"
                ? "refundedCash"
                : refund.method === "store_credit"
                  ? "refundedCredit"
                  : "refundedOther",
              { amount: formatMoney(refund.amount, locale) },
            ),
          );
        }}
      />

      <AddRetailItemModal
        open={is("retail")}
        onOpenChange={close}
        onAddItems={(items) =>
          addItems.mutate({
            bookingRef: booking.id,
            items: items.map((i) => ({
              kind: "item" as const,
              name: i.name,
              // The dialog reports the LINE total; the row stores the unit
              // price and multiplies it back.
              unitPrice: i.price / i.quantity,
              quantity: i.quantity,
            })),
          })
        }
      />

      <AddServiceChargeDialog
        open={is("serviceCharge")}
        onOpenChange={close}
        serviceId={String(booking.service ?? "")}
        petCount={Array.isArray(booking.petId) ? booking.petId.length : 1}
        serviceTotal={bookingValue(booking)}
        locationId={booking.locationId}
        appliedFeeIds={[...d.alreadyChargedFeeIds]}
        onAdd={(lines) =>
          addItems.mutate({
            bookingRef: booking.id,
            items: lines.map((line) => ({
              kind: line.kind,
              name: line.name,
              unitPrice: line.unitPrice,
              quantity: line.quantity,
              feeId: line.feeId,
              taxable: line.taxable,
            })),
          })
        }
      />

      <CareCompletionGateDialog
        open={till.careGate.open}
        pending={d.careStatus.pending}
        hasCritical={d.careStatus.hasCritical}
        onClose={till.careGate.close}
        onReview={till.careGate.review}
        onContinueAnyway={till.careGate.continueAnyway}
      />

      <DetailsSmallDialogs d={d} facts={facts} h={h} />

      <AlertDialog
        open={h.confirm !== null}
        onOpenChange={(open) => {
          if (!open) h.setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {h.confirm?.title ?? t("confirmFallbackTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {h.confirm?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{actT("keepAsIs")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                h.confirm?.onConfirm();
                h.setConfirm(null);
              }}
            >
              {h.confirm?.confirmLabel ?? t("confirmFallback")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
