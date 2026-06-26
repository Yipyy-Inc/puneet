"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  FileWarning,
  LifeBuoy,
  ShieldAlert,
  TrendingDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { platformDashboardQueries } from "@/lib/api/platform-dashboard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function SectionHeader({
  icon: Icon,
  title,
  count,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  tone: "rose" | "amber" | "indigo" | "violet";
}) {
  const toneRing: Record<typeof tone, string> = {
    rose: "bg-gradient-to-br from-rose-500 to-pink-500",
    amber: "bg-gradient-to-br from-amber-400 to-orange-500",
    indigo: "bg-gradient-to-br from-indigo-500 to-blue-600",
    violet: "bg-gradient-to-br from-violet-500 to-purple-500",
  };
  return (
    <div className="flex flex-1 items-center gap-3">
      <span
        className={`flex size-8 items-center justify-center rounded-xl text-white shadow-sm ${toneRing[tone]}`}
      >
        <Icon className="size-4" />
      </span>
      <span className="text-sm font-semibold">{title}</span>
      <Badge
        variant={count > 0 ? "secondary" : "outline"}
        className="mr-2 ml-auto tabular-nums"
      >
        {count}
      </Badge>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="hover:bg-muted/40 bg-card/60 flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors">
      {children}
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="text-muted-foreground rounded-lg border border-dashed py-4 text-center text-xs">
      {label}
    </p>
  );
}

function FacilityLink({
  facilityId,
  name,
}: {
  facilityId?: number;
  name: string;
}) {
  const href = facilityId
    ? `/dashboard/facilities/${facilityId}`
    : "/dashboard/facilities";
  return (
    <Link
      href={href}
      className="truncate font-medium hover:underline"
      title={name}
    >
      {name}
    </Link>
  );
}

export function NeedsAttention() {
  const { data, isLoading } = useQuery(
    platformDashboardQueries.needsAttention(),
  );

  const overdue = data?.overdueInvoices ?? [];
  const flags = data?.suspensionFlags ?? [];
  const requests = data?.pendingRequests ?? [];
  const slaTickets = data?.slaBreachedTickets ?? [];
  const atRisk = data?.atRiskFacilities ?? [];

  const total =
    overdue.length +
    flags.length +
    requests.length +
    slaTickets.length +
    atRisk.length;

  const defaultOpen = [
    flags.length > 0 ? "suspension" : null,
    overdue.length > 0 ? "overdue" : null,
    requests.length > 0 ? "requests" : null,
    slaTickets.length > 0 ? "sla" : null,
    atRisk.length > 0 ? "risk" : null,
  ].filter(Boolean) as string[];

  return (
    <Card className="bg-card overflow-hidden border">
      <div className="from-card relative flex items-center gap-3 border-b bg-linear-to-br to-amber-50/40 px-5 py-4 dark:to-amber-950/10">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-sm">
          <AlertTriangle className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Needs Attention
          </h2>
          <p className="text-muted-foreground text-xs">
            {total > 0
              ? `${total} item${total === 1 ? "" : "s"} across billing, onboarding, support and retention`
              : "Nothing needs your attention right now"}
          </p>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-muted h-12 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <Accordion
            type="multiple"
            defaultValue={defaultOpen}
            className="space-y-2"
          >
            {/* Flagged for suspension (Day-14 dunning) */}
            <AccordionItem
              value="suspension"
              className="rounded-xl border px-3"
            >
              <AccordionTrigger className="py-3 hover:no-underline">
                <SectionHeader
                  icon={ShieldAlert}
                  title="Flagged for Suspension"
                  count={flags.length}
                  tone="rose"
                />
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-3">
                {flags.length === 0 ? (
                  <EmptyRow label="No facilities flagged for suspension" />
                ) : (
                  flags.map((flag) => (
                    <Row key={flag.facilityId}>
                      <div className="min-w-0 flex-1">
                        <FacilityLink
                          facilityId={flag.facilityId}
                          name={flag.facilityName}
                        />
                        <p className="text-muted-foreground text-xs">
                          #{flag.invoiceNumber} ·{" "}
                          <span className="text-rose-600 dark:text-rose-400">
                            {flag.daysPastDue}d past due
                          </span>
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums">
                        ${flag.amount.toLocaleString()}
                      </span>
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/dashboard/commercial/dunning">Review</Link>
                      </Button>
                    </Row>
                  ))
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Overdue invoices */}
            <AccordionItem
              value="overdue"
              className="rounded-xl border px-3 last:border"
            >
              <AccordionTrigger className="py-3 hover:no-underline">
                <SectionHeader
                  icon={FileWarning}
                  title="Overdue Invoices"
                  count={overdue.length}
                  tone="rose"
                />
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-3">
                {overdue.length === 0 ? (
                  <EmptyRow label="No overdue invoices" />
                ) : (
                  overdue.map((inv) => (
                    <Row key={inv.id}>
                      <div className="min-w-0 flex-1">
                        <FacilityLink
                          facilityId={inv.facilityId}
                          name={inv.facilityName}
                        />
                        <p className="text-muted-foreground text-xs">
                          #{inv.invoiceNumber} ·{" "}
                          <span className="text-rose-600 dark:text-rose-400">
                            {inv.daysOverdue}d overdue
                          </span>
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums">
                        ${inv.amount.toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toast.success(`Reminder sent to ${inv.facilityName}`)
                        }
                      >
                        Send Reminder
                      </Button>
                    </Row>
                  ))
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Pending facility requests */}
            <AccordionItem value="requests" className="rounded-xl border px-3">
              <AccordionTrigger className="py-3 hover:no-underline">
                <SectionHeader
                  icon={ClipboardList}
                  title="Pending Facility Requests"
                  count={requests.length}
                  tone="indigo"
                />
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-3">
                {requests.length === 0 ? (
                  <EmptyRow label="No pending requests" />
                ) : (
                  requests.map((req) => (
                    <Row key={req.id}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {req.facilityName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {req.requestType} · {req.when}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/dashboard/facilities/requests">
                          Review
                        </Link>
                      </Button>
                    </Row>
                  ))
                )}
              </AccordionContent>
            </AccordionItem>

            {/* SLA-breached tickets */}
            <AccordionItem value="sla" className="rounded-xl border px-3">
              <AccordionTrigger className="py-3 hover:no-underline">
                <SectionHeader
                  icon={LifeBuoy}
                  title="SLA-Breached Tickets"
                  count={slaTickets.length}
                  tone="amber"
                />
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-3">
                {slaTickets.length === 0 ? (
                  <EmptyRow label="No SLA breaches" />
                ) : (
                  slaTickets.map((t) => (
                    <Row key={t.id}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          <span className="text-muted-foreground font-mono text-xs">
                            {t.id}
                          </span>{" "}
                          {t.facility}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {t.title}
                        </p>
                      </div>
                      <Badge variant="destructive" className="tabular-nums">
                        {t.hoursOver}h over
                      </Badge>
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/dashboard/system-admin/support-ticketing">
                          Open Ticket
                        </Link>
                      </Button>
                    </Row>
                  ))
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Facilities at risk */}
            <AccordionItem value="risk" className="rounded-xl border px-3">
              <AccordionTrigger className="py-3 hover:no-underline">
                <SectionHeader
                  icon={TrendingDown}
                  title="Facilities At Risk"
                  count={atRisk.length}
                  tone="violet"
                />
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-3">
                {atRisk.length === 0 ? (
                  <EmptyRow label="No at-risk facilities" />
                ) : (
                  atRisk.map((f) => (
                    <Row key={f.facilityId}>
                      <div className="min-w-0 flex-1">
                        <FacilityLink
                          facilityId={f.facilityId}
                          name={f.facilityName}
                        />
                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <span
                            className={
                              f.severity === "critical"
                                ? "size-1.5 rounded-full bg-rose-500"
                                : "size-1.5 rounded-full bg-amber-500"
                            }
                          />
                          {f.reason}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toast.success(`Outreach logged for ${f.facilityName}`)
                        }
                      >
                        Reach Out
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </Row>
                  ))
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>
    </Card>
  );
}
