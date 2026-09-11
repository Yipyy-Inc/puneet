"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Calendar,
  Crown,
  DollarSign,
  Pause,
  Play,
  RefreshCw,
  Mail,
  X,
  Check,
  FileText,
  Activity as ActivityIcon,
  Gift,
  Percent,
  Infinity as InfinityIcon,
  CircleDot,
} from "lucide-react";
import type {
  Membership,
  MembershipStatus,
  MembershipActivityEvent,
  PauseDetails,
} from "@/data/services-pricing";
import {
  describePause,
  useMembershipAction,
  useMembershipPlans,
  type MembershipAction,
} from "@/lib/api/memberships";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { formatDateLong, formatTime } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import { PauseSubscriptionDialog } from "./PauseSubscriptionDialog";
import { CancelSubscriptionDialog } from "./CancelSubscriptionDialog";
import { toast } from "sonner";

interface Props {
  membership: Membership | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusTone: Record<
  MembershipStatus,
  { label: string; className: string }
> = {
  active: {
    label: "In subscription",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  paused: {
    label: "Paused",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-300",
  },
  expired: {
    label: "Expired",
    className: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  },
  pending: {
    label: "Pending payment",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  },
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function SubscriptionDetailSheet({
  membership,
  open,
  onOpenChange,
}: Props) {
  // Above the early return: hooks run in the same order every render.
  const [pauseOpen, setPauseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const { t, fill, locale } = useStaffText("memberships");
  const { data: plans } = useMembershipPlans();
  const change = useMembershipAction();

  if (!membership) return null;

  const plan = plans?.find((p) => p.id === membership.planId);
  const tone = statusTone[membership.status];

  // ── EVERY CHANGE IS A WRITE, AND THE TOAST WAITS FOR IT ───────────────
  //
  // Pause, resume, cancel and auto-renew each rewrote this row in the parent's
  // `useState`. They PATCH /api/memberships/[id] now, which appends the event
  // to the row's own activity log; the sheet re-renders from the refetch.
  //
  // "Retry payment" is gone: it set the row to `pending` and toasted
  // "Retrying payment" with no payment anywhere. Memberships are not billed
  // automatically yet — a cycle is charged at the till like anything else.
  const act = (input: MembershipAction, done?: string) =>
    new Promise<boolean>((resolve) => {
      change.mutate(
        { id: membership.id, ...input },
        {
          onSuccess: () => {
            if (done) toast.success(done);
            resolve(true);
          },
          onError: (error) => {
            toast.error(t("notChanged"), {
              description: error instanceof Error ? error.message : undefined,
            });
            resolve(false);
          },
        },
      );
    });

  const handleResume = () => {
    void act(
      { action: "resume", description: t("resumedEvent") },
      "Subscription resumed",
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-[600px]"
        >
          <SheetHeader className="border-b px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <div className="flex size-10 items-center justify-center overflow-hidden rounded-full ring-2 ring-slate-100">
                  {membership.customerAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={membership.customerAvatarUrl}
                      alt={membership.customerName}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex size-full items-center justify-center text-xs font-semibold text-white"
                      style={{ backgroundColor: plan?.badgeColor ?? "#D4AF37" }}
                    >
                      {membership.customerName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <div
                  className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full text-white shadow-sm"
                  style={{ backgroundColor: plan?.badgeColor ?? "#D4AF37" }}
                >
                  <Crown className="size-2.5" />
                </div>
              </div>
              <div className="flex-1">
                <SheetTitle className="text-base">
                  {membership.customerName}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {membership.customerEmail}
                </SheetDescription>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{membership.planName}</Badge>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tone.className}`}
                  >
                    <CircleDot className="size-3" />
                    {tone.label}
                  </span>
                </div>
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue="overview" className="flex flex-1 flex-col">
            <TabsList className="bg-muted/40 mx-6 mt-4 w-auto justify-start gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="perks">Perks</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <TabsContent value="overview" className="mt-0 space-y-4">
                <div className="bg-muted/30 grid grid-cols-2 gap-3 rounded-xl border p-3 text-sm">
                  <Kv
                    icon={<DollarSign className="size-3.5" />}
                    label="Price"
                    value={`${fmt(membership.monthlyPrice)}${
                      membership.billingCycle === "monthly"
                        ? "/mo"
                        : membership.billingCycle === "annually"
                          ? "/yr"
                          : membership.billingCycle === "weekly"
                            ? "/wk"
                            : ""
                    }`}
                  />
                  <Kv
                    icon={<Calendar className="size-3.5" />}
                    label="Next billing"
                    value={membership.nextBillingDate}
                  />
                  <Kv label="Cycle" value={membership.billingCycle} />
                  <Kv
                    label="Credits remaining"
                    value={
                      membership.creditsRemaining === -1
                        ? "Unlimited"
                        : `${membership.creditsRemaining} / ${membership.creditsTotal}`
                    }
                  />
                  <Kv label="Start date" value={membership.startDate} />
                  <Kv
                    label="Discount"
                    value={`${membership.discountPercentage}%`}
                  />
                  {membership.graceEndsAt && (
                    <Kv
                      label="Grace ends"
                      value={`${formatDateLong(membership.graceEndsAt, locale)} ${formatTime(membership.graceEndsAt, locale)}`}
                    />
                  )}
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <div className="text-sm font-medium">Auto-renew</div>
                    <div className="text-muted-foreground text-xs">
                      Automatically renew at the next billing date
                    </div>
                  </div>
                  <Switch
                    checked={membership.autoRenew}
                    disabled={
                      change.isPending || membership.status === "cancelled"
                    }
                    onCheckedChange={(v) => {
                      void act({
                        action: "autoRenew",
                        autoRenew: v,
                        description: v ? t("autoRenewOn") : t("autoRenewOff"),
                      });
                    }}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {membership.status === "active" && (
                    <Button
                      variant="outline"
                      onClick={() => setPauseOpen(true)}
                    >
                      <Pause className="mr-2 size-4" />
                      Pause
                    </Button>
                  )}
                  {membership.status === "paused" && (
                    <Button
                      variant="outline"
                      onClick={handleResume}
                      disabled={change.isPending}
                    >
                      <Play className="mr-2 size-4" />
                      Resume
                    </Button>
                  )}
                  {/* "Send reminder" toasted "Reminder sent" and sent nothing.
                      It opens the staff member's own email, addressed. */}
                  {membership.customerEmail && (
                    <Button variant="outline" asChild>
                      <a
                        href={`mailto:${membership.customerEmail}?subject=${encodeURIComponent(membership.planName)}`}
                      >
                        <Mail className="mr-2 size-4" />
                        {fill("emailClient", { name: membership.customerName })}
                      </a>
                    </Button>
                  )}
                  {membership.status !== "cancelled" && (
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive ml-auto"
                      onClick={() => setCancelOpen(true)}
                      disabled={change.isPending}
                    >
                      <X className="mr-2 size-4" />
                      Cancel
                    </Button>
                  )}
                </div>

                {membership.pauseDetails && (
                  <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 p-3 text-sm dark:border-amber-400/30 dark:bg-amber-950/20">
                    <div className="font-medium">Paused details</div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      Mode: {membership.pauseDetails.mode}
                      {membership.pauseDetails.cycles &&
                        ` — resume after ${membership.pauseDetails.cycles} cycle(s)`}
                      {membership.pauseDetails.resumeDate &&
                        ` — resume on ${membership.pauseDetails.resumeDate}`}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="activity" className="mt-0">
                <ActivityTimeline
                  events={membership.activityLog}
                  locale={locale}
                />
              </TabsContent>

              <TabsContent value="invoices" className="mt-0 space-y-2">
                {membership.invoices.length === 0 ? (
                  <div className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
                    {t("noInvoices")}
                  </div>
                ) : (
                  membership.invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="text-muted-foreground size-4" />
                        <div>
                          <div className="font-medium">{inv.date}</div>
                          <div className="text-muted-foreground text-xs">
                            {fmt(inv.amount)} + {fmt(inv.tax)} tax
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <InvoiceBadge status={inv.status} />
                        {inv.receiptUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toast.info("Opening receipt", {
                                description: `Invoice ${inv.id}`,
                              })
                            }
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="perks" className="mt-0 space-y-3">
                {plan?.includedItems.length ? (
                  <section className="space-y-2">
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase">
                      <Gift className="size-3" />
                      Included items
                    </div>
                    {plan.includedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border p-3 text-sm"
                      >
                        <div>
                          <div className="font-medium">{item.label}</div>
                          <div className="text-muted-foreground text-xs capitalize">
                            {item.kind}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Check className="size-3.5 text-emerald-600" />
                          {item.quantity === -1 ? (
                            <InfinityIcon className="size-3.5" />
                          ) : (
                            `${item.quantity} per cycle`
                          )}
                        </div>
                      </div>
                    ))}
                  </section>
                ) : null}

                {plan?.discountRules.length ? (
                  <section className="space-y-2">
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase">
                      <Percent className="size-3" />
                      Discounts
                    </div>
                    {plan.discountRules.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-lg border p-3 text-sm"
                      >
                        <div>
                          <div className="font-medium">
                            {r.label ?? `${r.discountValue}% off`}
                          </div>
                          <div className="text-muted-foreground text-xs capitalize">
                            {r.target}
                            {r.categories && r.categories.length
                              ? ` — ${r.categories.join(", ")}`
                              : ""}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {r.discountType === "percentage"
                            ? `${r.discountValue}%`
                            : fmt(r.discountValue)}
                        </Badge>
                      </div>
                    ))}
                  </section>
                ) : null}

                {!plan?.includedItems.length && !plan?.discountRules.length && (
                  <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
                    This plan has no perks configured.
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>

      <PauseSubscriptionDialog
        open={pauseOpen}
        onOpenChange={setPauseOpen}
        membership={membership}
        onPause={(details: PauseDetails) =>
          act({
            action: "pause",
            pause: details,
            description: describePause(details, fill, t),
          })
        }
      />
      <CancelSubscriptionDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        membership={membership}
        onCancel={() =>
          act({
            action: "cancel",
            description: fill("cancelledUntil", {
              date: membership.nextBillingDate,
            }),
          })
        }
      />
    </>
  );
}

function Kv({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground flex items-center gap-1 text-xs capitalize">
        {icon}
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function InvoiceBadge({
  status,
}: {
  status: "paid" | "failed" | "refunded" | "pending";
}) {
  const tones: Record<typeof status, string> = {
    paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    refunded:
      "bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-300",
    pending: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${tones[status]}`}
    >
      {status}
    </span>
  );
}

// A numeric date here read 9/11/2026 — the month-or-day ambiguity §6 rule 8
// bans outright. Long form, in the viewer's language.
function ActivityTimeline({
  events,
  locale,
}: {
  events: MembershipActivityEvent[];
  locale: AppLocale;
}) {
  if (events.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
        No activity yet.
      </div>
    );
  }

  const iconFor = (type: MembershipActivityEvent["type"]) => {
    switch (type) {
      case "paused":
        return <Pause className="size-3.5" />;
      case "resumed":
        return <Play className="size-3.5" />;
      case "cancelled":
        return <X className="size-3.5" />;
      case "payment_failed":
        return <RefreshCw className="size-3.5" />;
      case "payment_retried":
        return <RefreshCw className="size-3.5" />;
      case "perk_redeemed":
        return <Gift className="size-3.5" />;
      case "credit_used":
        return <Percent className="size-3.5" />;
      case "reminder_sent":
        return <Mail className="size-3.5" />;
      case "renewed":
        return <Crown className="size-3.5" />;
      default:
        return <ActivityIcon className="size-3.5" />;
    }
  };

  return (
    <ol className="relative space-y-3 border-l pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="bg-background border-primary absolute top-0 -left-[27px] flex size-5 items-center justify-center rounded-full border-2">
            {iconFor(e.type)}
          </span>
          <div className="bg-muted/20 rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium capitalize">
                {e.type.replace("_", " ")}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatDateLong(e.date, locale)} · {formatTime(e.date, locale)}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {e.description}
            </p>
            {typeof e.amount === "number" && (
              <div className="mt-1 text-xs font-medium">{fmt(e.amount)}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
