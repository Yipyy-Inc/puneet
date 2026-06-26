"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Building2, CreditCard, Ticket } from "lucide-react";

import { facilities } from "@/data/facilities";
import { lastMessage } from "@/hooks/use-support-inbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SupportConversation } from "@/types/support-chat";
import { FacilityAvatar } from "./facility-avatar";
import { accountHealth, formatDate, stableCount } from "./support-chat-utils";

export function ConversationSidebar({
  conversation,
}: {
  conversation: SupportConversation | null;
}) {
  if (!conversation) {
    return (
      <div className="bg-card text-muted-foreground hidden h-full w-[280px] shrink-0 items-center justify-center rounded-2xl border p-3 text-center text-xs xl:flex">
        Select a conversation to see facility details.
      </div>
    );
  }

  const facility = facilities.find((f) => f.id === conversation.facilityId);
  const plan = facility?.plan ?? "—";
  const health = accountHealth(facility?.status ?? "active");
  const openTickets = stableCount(conversation.facilityId, 4);
  const last = lastMessage(conversation);

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
          <Stat label="Last contact" value={last ? formatDate(last.at) : "—"} />
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
            <Link href={`/dashboard/facilities/${conversation.facilityId}`}>
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
