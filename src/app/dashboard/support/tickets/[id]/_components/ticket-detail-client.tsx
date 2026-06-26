"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { supportTickets } from "@/data/support-tickets";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SupportTicket } from "@/types/support";
import { ConversationThread } from "./conversation-thread";
import { ReplyBox } from "./reply-box";
import { TicketHeader } from "./ticket-header";
import { TicketSidebar } from "./ticket-sidebar";
import { bumpPriority, resolveFacility } from "./ticket-utils";

export function TicketDetailClient({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<SupportTicket | null>(
    () => supportTickets.find((t) => t.id === ticketId) ?? null,
  );

  if (!ticket) {
    return (
      <div className="space-y-3 p-6">
        <h1 className="text-xl font-semibold">Ticket not found</h1>
        <p className="text-muted-foreground text-sm">
          No support ticket exists with id “{ticketId}”.
        </p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/system-admin/support-ticketing">
            <ArrowLeft className="mr-2 size-4" />
            Back to tickets
          </Link>
        </Button>
      </div>
    );
  }

  const rf = resolveFacility(ticket);
  const facilityName = rf?.name ?? ticket.facility;

  function update(patch: Partial<SupportTicket>) {
    setTicket((t) => (t ? { ...t, ...patch } : t));
  }

  function handleBreach() {
    if (!ticket) return;
    if (ticket.status === "Escalated" || (ticket.sla?.breachCount ?? 0) > 0)
      return;
    setTicket((t) =>
      t
        ? {
            ...t,
            status: "Escalated",
            priority: bumpPriority(t.priority),
            sla: t.sla
              ? {
                  ...t.sla,
                  isEscalated: true,
                  breachCount: t.sla.breachCount + 1,
                }
              : t.sla,
          }
        : t,
    );
    toast.error(
      "SLA breached — auto-escalated and priority raised. Alert sent to SLA Config recipients.",
    );
  }

  function handleSend(body: string, isInternal: boolean, resolve: boolean) {
    const sender = ticket?.assignedTo ?? "Yipyy Support";
    setTicket((t) =>
      t
        ? {
            ...t,
            status: resolve ? "Resolved" : t.status,
            messages: [
              ...(t.messages ?? []),
              {
                id: `m-${Date.now()}`,
                sender,
                message: body,
                timestamp: new Date().toISOString(),
                isInternal,
              },
            ],
          }
        : t,
    );
    toast.success(
      isInternal
        ? "Internal note added"
        : resolve
          ? "Reply sent — ticket resolved"
          : "Reply sent",
    );
  }

  return (
    <div className="space-y-4 p-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href="/dashboard/system-admin/support-ticketing">
          <ArrowLeft className="mr-1.5 size-4" />
          All tickets
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT (65%) */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="pt-5">
              <TicketHeader
                ticket={ticket}
                onUpdate={update}
                onBreach={handleBreach}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <ConversationThread
                messages={ticket.messages ?? []}
                requester={ticket.requester}
                facilityName={facilityName}
              />
            </CardContent>
          </Card>

          <ReplyBox onSend={handleSend} />
        </div>

        {/* RIGHT (35%) */}
        <div className="lg:col-span-1">
          <TicketSidebar ticket={ticket} onUpdate={update} />
        </div>
      </div>
    </div>
  );
}
