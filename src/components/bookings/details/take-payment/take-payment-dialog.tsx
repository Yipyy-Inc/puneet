"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";

import { LookProvider } from "@/components/look/look-context";
import { Button } from "@/components/ui/button";

import { AmountSection } from "./amount-section";
import { DoneView, LoadingView, ProcessingView } from "./stage-views";
import { PayWith } from "./pay-with";
import { SummaryAndFooter } from "./summary-footer";
import { useTakePayment } from "./use-take-payment";
import type { TakePaymentProps } from "./use-till-data";

// ============================================================================
// Take payment — the client's "Take Payment.dc.html", embedded in all four
// booking details mocks (2026-10-03).
//
// It replaced PaymentCheckoutFlow everywhere a booking is paid at the desk:
// the booking page and the board's Check Out (decision 1). The engine behind
// it did not change — `useBookingCheckout` writes the bill's lines, then the
// money, then checks the pet out when the bill settles — only what staff see
// and the one press that starts it.
//
// Its own look, wherever it opens: the scrim, the warm panel, the mock's blue.
// The state lives in a component that exists only while the dialog is open,
// so every open starts from a clean form.
// ============================================================================

const LOOK = { names: ["booking-details" as const] };

export function TakePaymentDialog(props: TakePaymentProps) {
  return (
    <DialogPrimitive.Root open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <TakePaymentSurface {...props} /> : null}
    </DialogPrimitive.Root>
  );
}

function TakePaymentSurface(props: TakePaymentProps) {
  const tp = useTakePayment(props);
  const busy = tp.stage === "processing";
  const hold = (event: Event) => {
    // Money in flight: the dialog stays until it has an answer.
    if (busy) event.preventDefault();
  };
  return (
    <DialogPrimitive.Portal>
      <LookProvider look={LOOK}>
        <DialogPrimitive.Overlay
          data-look="booking-details"
          className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-(--bd-scrim) px-4 py-8 motion-reduce:animate-none"
        >
          <DialogPrimitive.Content
            data-slot="take-payment"
            onEscapeKeyDown={hold}
            onPointerDownOutside={hold}
            onInteractOutside={hold}
            className="text-body-ink flex w-full max-w-[560px] min-w-0 flex-col overflow-hidden rounded-[28px] bg-(--bd-modal) shadow-(--bd-sh-modal) outline-none"
          >
            <div className="border-line-soft flex items-start justify-between gap-3 border-b px-6 py-5">
              <div className="flex min-w-0 flex-col gap-0.5">
                <DialogPrimitive.Title className="text-[19px] font-semibold">
                  {tp.t("title")}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-ink-tertiary text-[13px]">
                  {`${props.bookingLabel} · ${props.clientName}`}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="bd-close"
                  disabled={busy}
                  aria-label={tp.t("close")}
                  className="text-ink-tertiary shrink-0"
                >
                  ×
                </Button>
              </DialogPrimitive.Close>
            </div>

            {tp.stage === "form" && !tp.data.ready ? (
              <LoadingView tp={tp} />
            ) : tp.stage === "form" ? (
              <>
                <AmountSection tp={tp} />
                {tp.figures.dueCents > 0 ? <PayWith tp={tp} /> : null}
                <SummaryAndFooter tp={tp} />
              </>
            ) : tp.stage === "processing" ? (
              <ProcessingView tp={tp} />
            ) : (
              <DoneView tp={tp} />
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </LookProvider>
    </DialogPrimitive.Portal>
  );
}
