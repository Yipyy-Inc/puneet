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
import {
  membershipPlans,
  type Membership,
  type MembershipStatus,
  type MembershipActivityEvent,
} from "@/data/services-pricing";
import { PauseSubscriptionDialog } from "./PauseSubscriptionDialog";
import { CancelSubscriptionDialog } from "./CancelSubscriptionDialog";
import { toast } from "sonner";

interface Props {
  membership: Membership | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (m: Membership) => void;
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
  onUpdate,
}: Props) {
  const [pauseOpen, setPauseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (!membership) return null;

  const plan = membershipPlans.find((p) => p.id === membership.planId);
  const tone = statusTone[membership.status];

  const addActivity = (
    type: MembershipActivityEvent["type"],
    description: string,
  ) => {
    const event: MembershipActivityEvent = {
      id: `act-${Date.now()}`,
      type,
      date: new Date().toISOString(),
      description,
    };
    onUpdate({
      ...membership,
      activityLog: [event, ...membership.activityLog],
    });
  };

  const handleResume = () => {
    onUpdate({
      ...membership,
      status: "active",
      pauseDetails: undefined,
      activityLog: [
        {
          id: `act-${Date.now()}`,
          type: "resumed",
          date: new Date().toISOString(),
          description: "Subscription resumed",
        },
        ...membership.activityLog,
      ],
    });
    toast.success("Subscription resumed");
  };

  const handleRetry = () => {
    onUpdate({
      ...membership,
      status: "pending",
      activityLog: [
        {
          id: `act-${Date.now()}`,
          type: "payment_retried",
          date: new Date().toISOString(),
          description: "Payment retry initiated",
        },
        ...membership.activityLog,
      ],
    });
    toast.success("Retrying payment");
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
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                style={{
                  backgroundColor: plan?.badgeColor ?? "#D4AF37",
                }}
              >
                <Crown className="size-5" />
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
                      value={new Date(membership.graceEndsAt).toLocaleString()}
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
                    onCheckedChange={(v) => {
                      onUpdate({ ...membership, autoRenew: v });
                      addActivity(
                        "reminder_sent",
                        v ? "Auto-renew enabled" : "Auto-renew disabled",
                      );
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
                    <Button variant="outline" onClick={handleResume}>
                      <Play className="mr-2 size-4" />
                      Resume
                    </Button>
                  )}
                  {membership.status === "expired" && (
                    <Button variant="outline" onClick={handleRetry}>
                      <RefreshCw className="mr-2 size-4" />
                      Retry payment
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() =>
                      toast.success("Reminder sent", {
                        description: membership.customerEmail,
                      })
                    }
                  >
                    <Mail className="mr-2 size-4" />
                    Send reminder
                  </Button>
                  {membership.status !== "cancelled" && (
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive ml-auto"
                      onClick={() => setCancelOpen(true)}
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
                <ActivityTimeline events={membership.activityLog} />
              </TabsContent>

              <TabsContent value="invoices" className="mt-0 space-y-2">
                {membership.invoices.length === 0 ? (
                  <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
                    No invoices yet.
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
        onPause={(details) => {
          onUpdate({
            ...membership,
            status: "paused",
            pauseDetails: details,
            activityLog: [
              {
                id: `act-${Date.now()}`,
                type: "paused",
                date: new Date().toISOString(),
                description:
                  details.mode === "cycles"
                    ? `Paused for ${details.cycles} cycle(s)`
                    : details.mode === "date"
                      ? `Paused until ${details.resumeDate}`
                      : "Paused — manual restart",
              },
              ...membership.activityLog,
            ],
          });
        }}
      />
      <CancelSubscriptionDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        membership={membership}
        onCancel={() => {
          onUpdate({
            ...membership,
            status: "cancelled",
            autoRenew: false,
            activityLog: [
              {
                id: `act-${Date.now()}`,
                type: "cancelled",
                date: new Date().toISOString(),
                description: `Cancelled — access continues until ${membership.nextBillingDate}`,
              },
              ...membership.activityLog,
            ],
          });
        }}
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

function ActivityTimeline({ events }: { events: MembershipActivityEvent[] }) {
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
                {new Date(e.date).toLocaleString()}
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
