"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Building2, CreditCard, Ticket } from "lucide-react";

import { facilities } from "@/data/facilities";
import { lastMessage } from "@/hooks/use-support-inbox";
import { supportQueries } from "@/lib/api/support";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FacilityHealth } from "./support-chat-utils";
import type { SupportConversation } from "@/types/support-chat";
import { FacilityAvatar } from "./facility-avatar";
import {
  HEALTH_META,
  OPEN_TICKET_STATUSES,
  formatDate,
} from "./support-chat-utils";

export function ConversationSidebar({
  conversation,
}: {
  conversation: SupportConversation | null;
}) {
  // Live tickets from the support factory — drives the open-ticket count and the
  // At-Risk health signal (never rendered while conversation is null, but hooks
  // must run unconditionally, so query first).
  const { data: tickets = [] } = useQuery(supportQueries.tickets());

  if (!conversation) {
    return (
      <div className="bg-card text-muted-foreground hidden h-full w-[280px] shrink-0 items-center justify-center rounded-2xl border p-3 text-center text-xs xl:flex">
        Select a conversation to see facility details.
      </div>
    );
  }

  const facility = facilities.find((f) => f.id === conversation.facilityId);
  const plan = facility?.plan ?? "—";

  // Join support tickets to this facility (ticket ids are zero-padded, e.g.
  // facility 1 → "fac-001").
  const facilityKey = `fac-${String(conversation.facilityId).padStart(3, "0")}`;
  const facilityTickets = tickets.filter((t) => t.facilityId === facilityKey);
  const openTicketList = facilityTickets.filter((t) =>
    OPEN_TICKET_STATUSES.has(t.status),
  );
  const openTickets = openTicketList.length;
  const hasSevereTicket = openTicketList.some(
    (t) => t.status === "Escalated" || t.priority === "Urgent",
  );

  // Live account health: inactive → Suspended; an active account with an open
  // escalated/urgent ticket → At Risk; otherwise Healthy.
  const healthKey: FacilityHealth =
    facility && facility.status !== "active"
      ? "suspended"
      : hasSevereTicket
        ? "at_risk"
        : "healthy";
  const health = HEALTH_META[healthKey];

  // Last contact = most recent of this conversation's last message and the
  // facility's most recently-updated ticket.
  const last = lastMessage(conversation);
  const contactDates = [
    last?.at,
    ...facilityTickets.map((t) => t.updatedAt),
  ].filter((d): d is string => Boolean(d));
  const lastContactAt = contactDates.length
    ? contactDates.sort()[contactDates.length - 1]
    : null;

  return (
    <div className="bg-card hidden h-full w-[280px] shrink-0 flex-col gap-4 overflow-y-auto rounded-2xl border p-3 xl:flex">
      <Section title="Facility Info">
        <div className="space-y-3 rounded-xl border p-3">
          <div className="flex items-center gap-2">
            <FacilityAvatar
              name={conversation.facilityName}
              id={conversation.facilityId}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {conversation.facilityName}
              </p>
              <Badge variant="secondary" className="text-[10px] capitalize">
                {plan}
              </Badge>
            </div>
          </div>
          <div className="text-xs">
            <p className="text-muted-foreground">Primary contact</p>
            <p className="font-medium">{conversation.contactName}</p>
            <p className="text-muted-foreground truncate">
              {conversation.contactEmail}
            </p>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Account health</span>
            <Badge variant="outline" className={cn(health.className)}>
              {health.label}
            </Badge>
          </div>
        </div>
      </Section>

      <Section title="Quick Stats">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Open tickets" value={String(openTickets)} />
          <Stat
            label="Last contact"
            value={lastContactAt ? formatDate(lastContactAt) : "—"}
          />
        </div>
      </Section>

      <Section title="Quick Actions">
        <div className="space-y-1.5">
          <Button variant="outline" className="w-full justify-start" asChild>
            <Link href={`/dashboard/facilities/${conversation.facilityId}`}>
              <Building2 className="mr-2 size-4" />
              View Facility Profile
            </Link>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() =>
              toast.success(
                `Ticket draft opened for ${conversation.facilityName}`,
              )
            }
          >
            <Ticket className="mr-2 size-4" />
            Open a Ticket
          </Button>
          <Button variant="outline" className="w-full justify-start" asChild>
            <Link
              href={`/dashboard/facilities/${conversation.facilityId}?tab=billing`}
            >
              <CreditCard className="mr-2 size-4" />
              View Billing
            </Link>
          </Button>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2.5">
      <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground text-[11px]">{label}</p>
    </div>
  );
}
