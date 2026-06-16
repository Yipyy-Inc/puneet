"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Phone,
  Gift,
  CheckCircle2,
  Star,
  Bell,
  Mail,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReputation } from "@/hooks/use-reputation";
import { resolveEscalationAssignees } from "@/lib/reputation/review-link";
import type { ReputationRequest } from "@/types/reputation";

const CREDIT_PRESETS = [10, 25, 50];

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "size-3.5",
            n <= value
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

function fmt(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
}

// ─── Ticket card ──────────────────────────────────────────────────────────────

function TicketCard({
  req,
  routedTo,
  onCall,
  onApology,
  onResolve,
}: {
  req: ReputationRequest;
  routedTo: string;
  onCall: (r: ReputationRequest) => void;
  onApology: (r: ReputationRequest) => void;
  onResolve: (r: ReputationRequest) => void;
}) {
  const resolved = req.status === "closed";

  return (
    <Card
      className={cn(
        resolved
          ? "opacity-80"
          : "border-rose-200 dark:border-rose-900/50",
      )}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                resolved
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40"
                  : "bg-rose-100 text-rose-600 dark:bg-rose-950/40",
              )}
            >
              {resolved ? (
                <ShieldCheck className="size-4" />
              ) : (
                <AlertTriangle className="size-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-none">
                {req.clientName}
                <span className="text-muted-foreground font-normal">
                  {" "}
                  · {req.petName}
                </span>
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Stars value={req.rating ?? 0} />
                <span className="text-muted-foreground text-xs capitalize">
                  {req.serviceLabel}
                </span>
              </div>
            </div>
          </div>
          <Badge
            className={cn(
              "border-0",
              resolved
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
            )}
          >
            {resolved ? "Resolved" : "Escalated"}
          </Badge>
        </div>

        {req.feedbackText && (
          <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 dark:border-rose-900 dark:bg-rose-950/30">
            <p className="text-foreground text-sm">“{req.feedbackText}”</p>
          </div>
        )}

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span>Received {fmt(req.ratedAt)}</span>
          {routedTo && (
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-3" /> Routed to {routedTo}
            </span>
          )}
          {!resolved && (
            <span className="inline-flex items-center gap-2">
              Alerts sent:
              <span className="inline-flex items-center gap-1">
                <Smartphone className="size-3" /> SMS
              </span>
              <span className="inline-flex items-center gap-1">
                <Mail className="size-3" /> Email
              </span>
              <span className="inline-flex items-center gap-1">
                <Bell className="size-3" /> Bell
              </span>
            </span>
          )}
          {req.apologyCreditAmount != null && (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <Gift className="size-3" /> ${req.apologyCreditAmount} credit issued
            </span>
          )}
          {resolved && req.resolvedAt && <span>Resolved {fmt(req.resolvedAt)}</span>}
        </div>

        {!resolved && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCall(req)}
              className="gap-1.5"
            >
              <Phone className="size-3.5" /> Call via IVR
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onApology(req)}
              className="gap-1.5"
            >
              <Gift className="size-3.5" /> Apology credit
            </Button>
            <Button
              size="sm"
              onClick={() => onResolve(req)}
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="size-3.5" /> Resolve ticket
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Escalations tab ──────────────────────────────────────────────────────────

export function ReputationEscalationsTab() {
  const router = useRouter();
  const { requests, settings, resolveEscalation, grantApology } = useReputation();

  const routedTo = (req: ReputationRequest) =>
    resolveEscalationAssignees(settings, req.service)
      .map((a) => a.name)
      .join(", ");

  const [apologyFor, setApologyFor] = useState<ReputationRequest | null>(null);
  const [creditAmount, setCreditAmount] = useState(25);

  const { open, resolved } = useMemo(() => {
    const escalated = requests.filter((r) => r.escalatedToManager);
    return {
      open: escalated.filter((r) => r.status !== "closed"),
      resolved: escalated.filter((r) => r.status === "closed"),
    };
  }, [requests]);

  function handleCall(req: ReputationRequest) {
    toast.info(`Opening IVR dialer for ${req.clientName}…`);
    router.push("/facility/dashboard/calling");
  }

  function handleResolve(req: ReputationRequest) {
    resolveEscalation(req.id);
    toast.success(`Ticket resolved — ${req.clientName}`, {
      description: "The manager follow-up task has been marked complete.",
    });
  }

  function confirmApology() {
    if (!apologyFor || creditAmount <= 0) return;
    grantApology(apologyFor.id, creditAmount);
    toast.success(`$${creditAmount} apology credit issued`, {
      description: `Added to ${apologyFor.clientName}'s account.`,
    });
    setApologyFor(null);
    setCreditAmount(25);
  }

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/60 p-4 dark:border-rose-900/40 dark:bg-rose-950/10">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600" />
        <div>
          <p className="text-sm font-semibold">Internal Escalation Ledger</p>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Negative reviews are intercepted before they reach public platforms.
            Each one alerts the manager and opens a ticket here with quick service-recovery actions.
          </p>
        </div>
      </div>

      {/* Open tickets */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Open tickets
          </h2>
          <span className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold">
            {open.length}
          </span>
        </div>
        {open.length > 0 ? (
          <div className="grid gap-3">
            {open.map((req) => (
              <TicketCard
                key={req.id}
                req={req}
                routedTo={routedTo(req)}
                onCall={handleCall}
                onApology={(r) => {
                  setApologyFor(r);
                  setCreditAmount(25);
                }}
                onResolve={handleResolve}
              />
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center rounded-xl border border-dashed py-12 text-center">
            <ShieldCheck className="mb-2 size-8 opacity-30" />
            <p className="text-sm font-medium">No open escalations</p>
            <p className="text-xs">Negative reviews will appear here for follow-up.</p>
          </div>
        )}
      </section>

      {/* Resolved */}
      {resolved.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Resolved ({resolved.length})
          </h2>
          <div className="grid gap-3">
            {resolved.map((req) => (
              <TicketCard
                key={req.id}
                req={req}
                routedTo={routedTo(req)}
                onCall={handleCall}
                onApology={() => {}}
                onResolve={() => {}}
              />
            ))}
          </div>
        </section>
      )}

      {/* Apology credit dialog */}
      <Dialog
        open={apologyFor != null}
        onOpenChange={(o) => !o && setApologyFor(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="size-4" /> Send apology credit
            </DialogTitle>
            <DialogDescription>
              Issue store credit to {apologyFor?.clientName} as a goodwill gesture.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              {CREDIT_PRESETS.map((amt) => (
                <Button
                  key={amt}
                  type="button"
                  variant={creditAmount === amt ? "default" : "outline"}
                  onClick={() => setCreditAmount(amt)}
                  className="flex-1"
                >
                  ${amt}
                </Button>
              ))}
            </div>
            <Input
              type="number"
              min={1}
              value={creditAmount}
              onChange={(e) => setCreditAmount(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApologyFor(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmApology}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Issue ${creditAmount} credit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
