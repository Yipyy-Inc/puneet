"use client";

import { useState } from "react";
import {
  CreditCard,
  Loader2,
  RefreshCw,
  Search,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useAttachPayment,
  useDismissPayment,
  useReconcileNow,
  useUnattachedPayments,
  type UnattachedPayment,
} from "@/lib/api/unattached-payments";

// ============================================================================
// The card payments Clover has and Yipyy cannot place.
//
// ── IT IS SILENT WHEN THERE IS NOTHING TO DO ──────────────────────────────
//
// No empty state, no "0 payments to attach" panel. A facility that never takes
// a payment outside Yipyy should never learn this exists — and a panel that is
// empty ninety-nine days out of a hundred is one people stop seeing on the
// hundredth.
//
// The Reconcile button is the exception and lives outside the card, because
// "check whether anything is waiting" has to be reachable when the answer so
// far is no.
//
// ── AND IT REPORTS WHAT THE SWEEP FOUND ───────────────────────────────────
//
// A toast saying "Reconciled" over a sweep that examined nothing is the shape
// of claim `bun run check:success-claims` exists to catch. Pressing it twice
// should visibly find nothing the second time.
// ============================================================================

function money(cents: number, currency: string | null): string {
  const amount = (cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency === "USD" ? "$" : currency ? `${currency} ` : "$"}${amount}`;
}

function when(iso: string | null): string {
  if (!iso) return "time unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "time unknown";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UnattachedPayments() {
  const { data, isPending, error } = useUnattachedPayments();
  const reconcile = useReconcileNow();
  const [attaching, setAttaching] = useState<UnattachedPayment | null>(null);

  function runSweep() {
    reconcile.mutate(undefined, {
      onSuccess: (result) => {
        if (result.problem) {
          toast.warning(result.problem);
          return;
        }
        const found = [
          result.recovered > 0 && `${result.recovered} recovered`,
          result.reversed > 0 &&
            `${result.reversed} refund${result.reversed === 1 ? "" : "s"}`,
          result.unattached > 0 && `${result.unattached} to attach`,
          result.drained > 0 &&
            `${result.drained} event${result.drained === 1 ? "" : "s"} settled`,
        ].filter(Boolean) as string[];

        toast.success(
          found.length > 0
            ? `Checked ${result.examined} payment${result.examined === 1 ? "" : "s"} — ${found.join(", ")}.`
            : `Checked ${result.examined} payment${result.examined === 1 ? "" : "s"} at Clover. Nothing was missing.`,
        );
      },
      onError: (error: Error) => toast.error(error.message),
    });
  }

  const payments = data?.payments ?? [];

  // Somebody without `financial_view_amounts` gets a 403 from the route. Draw
  // nothing rather than offering them a Reconcile button that would 403 too —
  // a control whose only outcome is a refusal is worse than no control, and the
  // first version of this rendered the button on the error branch.
  if (isPending || error || !data) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Yipyy hears about Clover payments as they happen. This asks again, in
          case a message went missing.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={runSweep}
          disabled={reconcile.isPending}
        >
          {reconcile.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Reconcile now
        </Button>
      </div>

      {/* Nothing when the queue is empty. A skeleton for a card that usually
          should not exist is a card that usually should not exist, flickering. */}
      {payments.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start gap-2.5">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <p className="font-semibold">
                  {payments.length} payment{payments.length === 1 ? "" : "s"} to
                  attach
                </p>
                <p className="text-muted-foreground text-sm/relaxed">
                  Clover took {payments.length === 1 ? "this" : "these"} and
                  Yipyy does not know what{" "}
                  {payments.length === 1 ? "it was" : "they were"}. Until{" "}
                  {payments.length === 1 ? "it is" : "they are"} attached, your
                  Yipyy takings will be short by this much against
                  Clover&apos;s.
                </p>
              </div>
            </div>

            <ul className="space-y-2">
              {payments.map((payment) => (
                <li
                  key={payment.id}
                  className="bg-background/70 flex flex-wrap items-center gap-3 rounded-lg border p-3"
                >
                  <CreditCard className="text-muted-foreground size-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-[tabular-nums] text-sm font-semibold">
                      {money(payment.amountCents, payment.currency)}
                      {payment.tipCents > 0 && (
                        <span className="text-muted-foreground ml-2 text-xs font-normal">
                          incl. {money(payment.tipCents, payment.currency)} tip
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {payment.cardBrand ?? "Card"}
                      {payment.cardLast4
                        ? ` ••••${payment.cardLast4}`
                        : ""} · {when(payment.takenAt)}
                      {payment.deviceSerial ? ` · ${payment.deviceSerial}` : ""}
                    </p>
                  </div>
                  {payment.entryMethod && (
                    <Badge variant="outline" className="text-xs">
                      {payment.entryMethod}
                    </Badge>
                  )}
                  {data?.canAttach ? (
                    <Button size="sm" onClick={() => setAttaching(payment)}>
                      Attach
                    </Button>
                  ) : (
                    // Said, rather than a disabled button somebody hovers over
                    // hunting for a reason.
                    <span className="text-muted-foreground text-xs">
                      Needs someone who can take payments
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <AttachDialog payment={attaching} onClose={() => setAttaching(null)} />
    </div>
  );
}

function AttachDialog({
  payment,
  onClose,
}: {
  payment: UnattachedPayment | null;
  onClose: () => void;
}) {
  const [bookingRef, setBookingRef] = useState("");
  const [note, setNote] = useState("");
  const [dismissing, setDismissing] = useState(false);
  const attach = useAttachPayment();
  const dismiss = useDismissPayment();
  const busy = attach.isPending || dismiss.isPending;

  function close() {
    setBookingRef("");
    setNote("");
    setDismissing(false);
    onClose();
  }

  function submit() {
    if (!payment) return;
    const ref = Number(bookingRef.replace(/[^0-9]/g, ""));
    if (!Number.isInteger(ref) || ref <= 0) {
      toast.error("Enter the booking number this payment belongs to.");
      return;
    }
    attach.mutate(
      { id: payment.id, bookingRef: ref, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`Attached to booking ${ref}. The balance has moved.`);
          close();
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  }

  function setAside() {
    if (!payment) return;
    if (note.trim().length < 3) {
      toast.error("Say why this payment is being set aside.");
      return;
    }
    dismiss.mutate(
      { id: payment.id, note: note.trim() },
      {
        onSuccess: () => {
          toast.success("Set aside. The record that Clover took it stays.");
          close();
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  }

  return (
    <Dialog
      open={payment !== null}
      onOpenChange={(open) => (open ? undefined : close())}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Attach {payment ? money(payment.amountCents, payment.currency) : ""}
          </DialogTitle>
          <DialogDescription>
            {payment?.cardBrand ?? "Card"}
            {payment?.cardLast4 ? ` ••••${payment.cardLast4}` : ""} taken{" "}
            {when(payment?.takenAt ?? null)}. Attaching it records the payment
            against the booking and moves that booking&apos;s balance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!dismissing && (
            <div className="space-y-1.5">
              <Label htmlFor="attach-booking" className="text-sm font-medium">
                Booking number
              </Label>
              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  id="attach-booking"
                  value={bookingRef}
                  inputMode="numeric"
                  placeholder="896"
                  className="pl-9 font-[tabular-nums]"
                  onChange={(event) => setBookingRef(event.target.value)}
                />
              </div>
              <p className="text-muted-foreground text-xs/relaxed">
                The number on the booking, not the customer&apos;s. The payment
                is attached to that booking&apos;s client automatically.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="attach-note" className="text-sm font-medium">
              {dismissing ? "Why is this being set aside?" : "Note"}
              {!dismissing && (
                <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                  optional
                </span>
              )}
            </Label>
            <Textarea
              id="attach-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                dismissing
                  ? "A test charge; belongs to the shop till, not Yipyy."
                  : "Walk-in nail trim, paid at the counter."
              }
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {/* Setting aside is not deleting: the evidence that Clover took the
              money stays either way, which is why this is not destructive-red. */}
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => (dismissing ? setAside() : setDismissing(true))}
          >
            {dismiss.isPending && <Loader2 className="size-4 animate-spin" />}
            {dismissing ? "Confirm set aside" : "Not a Yipyy payment"}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={close} disabled={busy}>
              Cancel
            </Button>
            {!dismissing && (
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={submit}
                disabled={busy}
              >
                {attach.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Attach to booking
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
