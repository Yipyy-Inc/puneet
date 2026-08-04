"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Banknote,
  Smartphone,
  ArrowLeftRight,
  Check,
  Calendar,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { facilities } from "@/data/facilities";
import { invoiceHeaderHtml } from "@/lib/invoice-header";

const defaultFacility = facilities.find((f) => f.id === 11);

interface UnpaidInvoice {
  bookingId: number;
  invoiceId: string;
  service: string;
  date: string;
  petName: string;
  total: number;
  paid: number;
  remaining: number;
}

interface BulkPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  invoices: UnpaidInvoice[];
  /**
   * Records the payments and resolves with what was ACTUALLY taken.
   *
   * Returns a promise so the receipt can wait for it. The previous signature
   * was fire-and-forget, and the receipt printed regardless — see the note on
   * `handleConfirm`.
   *
   * It carries BOOKING ids, not invoice ids: `invoiceId` is a display label
   * this component is handed, and on most of these bookings it is
   * `10000 + bookingId`, invented at render time. Nothing can be settled by it.
   */
  onConfirm: (payment: {
    bookingIds: number[];
    method: string;
  }) => Promise<{ bookingRef: number; amount: number }[]>;
}

type PaymentMethod = "card" | "cash" | "terminal" | "e_transfer";

const METHODS: {
  value: PaymentMethod;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "card", label: "Card", icon: CreditCard },
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "terminal", label: "Terminal", icon: Smartphone },
  { value: "e_transfer", label: "E-Transfer", icon: ArrowLeftRight },
];

export function BulkPaymentModal({
  open,
  onOpenChange,
  clientName,
  invoices,
  onConfirm,
}: BulkPaymentModalProps) {
  // ── The state is what the user UNTICKED, not what is ticked ──────────────
  //
  // The obvious shape — a set of selected ids seeded from `invoices` — needs
  // the seed to be re-run whenever `invoices` changes, and this dialog is
  // mounted permanently by its parents rather than rendered when open. A
  // `useState` initialiser therefore runs once, on a first render where the
  // client overview has not fetched its bookings yet: the set stayed empty
  // forever and Continue was permanently disabled. That was invisible while
  // the list came from a synchronous fixture.
  //
  // Syncing it in an effect works and is what the React Compiler rejects
  // (set-state-in-effect). Inverting removes the question: everything is
  // selected because nothing is unticked, so an invoice that arrives later is
  // selected the moment it appears, with nothing to keep in step.
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const isSelected = (id: string) => !unticked.has(id);
  const selectedCount = invoices.filter((i) => isSelected(i.invoiceId)).length;
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [step, setStep] = useState<"select" | "confirm">("select");
  // The confirm button is now a network call, so it can be pressed twice.
  const [busy, setBusy] = useState(false);

  const selectedInvoices = useMemo(
    () => invoices.filter((i) => !unticked.has(i.invoiceId)),
    [invoices, unticked],
  );
  const totalAmount = selectedInvoices.reduce((s, i) => s + i.remaining, 0);

  const toggleInvoice = (id: string) => {
    setUnticked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setUnticked(
      selectedCount === invoices.length
        ? new Set(invoices.map((i) => i.invoiceId))
        : new Set(),
    );
  };

  // ── The receipt waits for the money ───────────────────────────────────────
  //
  // This used to call `onConfirm`, close, print "PAYMENT COMPLETE · All N
  // invoices marked as paid" and toast success — in that order, unconditionally,
  // with `onConfirm` returning nothing anybody could wait for. On the client
  // overview it was `onConfirm={() => {}}`, so the receipt was the ONLY thing
  // that happened. A customer could leave holding paper for money nobody
  // recorded.
  //
  // It now awaits the write and prints from what came BACK, so the paper says
  // what the ledger says. The database computes each amount, which is why the
  // per-line figures here are the response's and not `inv.remaining`.
  const handleConfirm = async () => {
    if (step === "select") {
      setStep("confirm");
      return;
    }
    if (busy) return;

    setBusy(true);
    let settled: { bookingRef: number; amount: number }[];
    try {
      settled = await onConfirm({
        bookingIds: selectedInvoices.map((i) => i.bookingId),
        method,
      });
    } catch (error) {
      setBusy(false);
      toast.error(
        error instanceof Error ? error.message : "Could not take that payment.",
      );
      // Left open, on the confirm step: the operator is standing with a
      // customer and needs to try again, not to start over.
      return;
    }
    setBusy(false);

    if (settled.length === 0) {
      toast.info("Nothing was owing on those bookings.");
      onOpenChange(false);
      setStep("select");
      return;
    }

    const charged = settled.reduce((sum, s) => sum + s.amount, 0);
    const byRef = new Map(settled.map((s) => [s.bookingRef, s.amount]));
    const lines = selectedInvoices.filter((i) => byRef.has(i.bookingId));

    onOpenChange(false);
    setStep("select");

    const w = window.open("", "_blank", "width=500,height=700");
    if (w) {
      w.document
        .write(`<!DOCTYPE html><html><head><title>Bulk Payment Receipt</title>
<style>body{font-family:-apple-system,sans-serif;padding:40px;color:#111;max-width:420px;margin:0 auto}
h1{font-size:18px;margin:0}h2{font-size:12px;color:#666;margin:4px 0 20px}
.row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid #eee}
.row.total{border-top:2px solid #111;border-bottom:none;font-weight:700;font-size:15px;padding-top:10px}
.row.sub{color:#666}.section{margin-top:14px;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.footer{margin-top:24px;text-align:center;font-size:10px;color:#999}
.badge{background:#ecfdf5;color:#059669;padding:6px 14px;border-radius:8px;text-align:center;margin-top:14px;font-weight:600;font-size:13px}
</style></head><body>
${invoiceHeaderHtml(defaultFacility)}
<h1>Bulk Payment Receipt</h1>
<h2>${clientName} · ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</h2>
<div class="section">Bookings Paid (${lines.length})</div>
${lines.map((inv) => `<div class="row"><span>#${inv.bookingId} · ${inv.service} · ${inv.petName}</span><span>$${(byRef.get(inv.bookingId) ?? 0).toFixed(2)}</span></div>`).join("")}
<div class="row total"><span>Total Charged</span><span>$${charged.toFixed(2)}</span></div>
<div class="row sub"><span>Payment Method</span><span>${method}</span></div>
<div class="badge">PAYMENT COMPLETE</div>
<div class="footer">Recorded against ${lines.length} booking${lines.length === 1 ? "" : "s"}</div>
</body></html>`);
      w.document.close();
    }

    // Says what was taken, and names the gap when it is not what was asked
    // for — a booking somebody else settled in the meantime is skipped, and
    // silently charging less than the screen showed is how a shortfall gets
    // discovered at month end.
    const skipped = selectedInvoices.length - settled.length;
    toast.success(
      `$${charged.toFixed(2)} taken across ${settled.length} booking${settled.length === 1 ? "" : "s"}` +
        (skipped > 0
          ? ` — ${skipped} had already been settled and ${skipped === 1 ? "was" : "were"} skipped`
          : ""),
    );
  };

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        // Reset on CLOSE, in an event handler — which is where React says to
        // put "start fresh next time", and needs no effect.
        if (!v) {
          setStep("select");
          setUnticked(new Set());
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-5" />
            Bulk Payment — {clientName}
          </DialogTitle>
        </DialogHeader>

        {step === "select" ? (
          <div className="animate-in fade-in space-y-5 py-2 duration-200">
            {/* Total */}
            <div className="bg-muted/30 rounded-xl border p-4 text-center">
              <p className="text-muted-foreground text-xs">Total Outstanding</p>
              <p className="font-[tabular-nums] text-3xl font-bold">
                ${invoices.reduce((s, i) => s + i.remaining, 0).toFixed(2)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {invoices.length} unpaid invoice
                {invoices.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Invoice selection */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                  Select Invoices
                </p>
                <button
                  onClick={selectAll}
                  className="text-primary text-xs font-medium hover:underline"
                >
                  {selectedCount === invoices.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>
              <div className="space-y-1.5">
                {invoices.map((inv) => (
                  <label
                    key={inv.invoiceId}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all",
                      isSelected(inv.invoiceId)
                        ? "border-primary/30 bg-primary/5"
                        : "hover:bg-muted/30",
                    )}
                  >
                    <Checkbox
                      checked={isSelected(inv.invoiceId)}
                      onCheckedChange={() => toggleInvoice(inv.invoiceId)}
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-100">
                        <Calendar className="size-3.5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{inv.invoiceId}</p>
                        <p className="text-muted-foreground text-xs">
                          {inv.service} · {inv.petName} · {formatDate(inv.date)}
                        </p>
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="font-[tabular-nums] text-sm font-semibold">
                        ${inv.remaining.toFixed(2)}
                      </p>
                      {inv.paid > 0 && (
                        <p className="text-[10px] text-emerald-600">
                          ${inv.paid.toFixed(2)} paid
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Payment method */}
            <div>
              <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wider uppercase">
                Payment Method
              </p>
              <div className="grid grid-cols-4 gap-2">
                {METHODS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.value}
                      onClick={() => setMethod(m.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all",
                        method === m.value
                          ? "border-primary bg-primary/5 text-primary ring-primary/20 ring-1"
                          : "hover:bg-muted/30",
                      )}
                    >
                      <Icon className="size-5" />
                      <span className="text-[10px] font-medium">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected summary */}
            <div className="bg-muted/20 rounded-lg border px-3 py-2.5">
              <div className="flex justify-between text-sm font-semibold">
                <span>
                  {selectedInvoices.length} invoice
                  {selectedInvoices.length !== 1 ? "s" : ""} selected
                </span>
                <span className="font-[tabular-nums]">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-2 space-y-5 py-2 duration-200">
            <div className="bg-muted/20 rounded-xl border p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoices</span>
                  <span className="font-medium">{selectedInvoices.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-medium capitalize">{method}</span>
                </div>
                <Separator />
                <div className="flex items-baseline justify-between">
                  <span className="font-medium">Total to Charge</span>
                  <span className="font-[tabular-nums] text-2xl font-bold">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-center text-xs">
              Payment will be automatically applied across all{" "}
              {selectedInvoices.length} selected invoices. Each invoice will be
              marked as paid.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (step === "confirm") setStep("select");
              else onOpenChange(false);
            }}
          >
            {step === "confirm" ? "Go Back" : "Cancel"}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedInvoices.length === 0 || busy}
            className={cn(
              "gap-1.5",
              step === "confirm" && "bg-emerald-600 hover:bg-emerald-700",
            )}
          >
            <Check className="size-4" />
            {busy
              ? "Taking payment…"
              : step === "confirm"
                ? `Confirm & Charge $${totalAmount.toFixed(2)}`
                : `Continue — $${totalAmount.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
