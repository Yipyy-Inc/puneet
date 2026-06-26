"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, Mail, Phone, Save, User } from "lucide-react";

import { supportAgents, supportTickets } from "@/data/support-tickets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SupportTicket } from "@/types/support";
import {
  CATEGORIES,
  PRIORITIES,
  STATUS_BADGE,
  STATUSES,
  facilityHealth,
  formatTimestamp,
  resolveFacility,
} from "./ticket-utils";

const UNASSIGNED = "Unassigned";

export function TicketSidebar({
  ticket,
  onUpdate,
}: {
  ticket: SupportTicket;
  onUpdate: (patch: Partial<SupportTicket>) => void;
}) {
  const rf = resolveFacility(ticket);
  const health = rf
    ? facilityHealth(ticket.facilityId ?? "", rf.status)
    : facilityHealth(ticket.facilityId ?? "", "active");
  const recent = supportTickets
    .filter((t) => t.facilityId === ticket.facilityId && t.id !== ticket.id)
    .slice(0, 5);
  const agentNames = supportAgents.map((a) => a.name);

  return (
    <div className="space-y-4">
      {/* Facility Context */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Facility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
              {(rf?.name ?? ticket.facility).slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <Link
                href={rf ? `/dashboard/facilities/${rf.id}` : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold hover:underline"
              >
                {rf?.name ?? ticket.facility}
                <ExternalLink className="size-3" />
              </Link>
              <div className="mt-0.5 flex items-center gap-1.5">
                {rf && (
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {rf.plan}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={cn("text-[10px]", health.className)}
                >
                  {health.label}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 text-sm">
            <p className="flex items-center gap-2">
              <User className="text-muted-foreground size-3.5" />
              {ticket.requester}
            </p>
            {ticket.requesterEmail && (
              <p className="flex items-center gap-2">
                <Mail className="text-muted-foreground size-3.5" />
                <span className="truncate">{ticket.requesterEmail}</span>
              </p>
            )}
            {rf?.phone && (
              <p className="flex items-center gap-2">
                <Phone className="text-muted-foreground size-3.5" />
                {rf.phone}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ticket Details (editable) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ticket Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DetailSelect
            label="Status"
            value={ticket.status}
            options={STATUSES}
            onChange={(v) => onUpdate({ status: v as SupportTicket["status"] })}
          />
          <DetailSelect
            label="Priority"
            value={ticket.priority}
            options={PRIORITIES}
            onChange={(v) =>
              onUpdate({ priority: v as SupportTicket["priority"] })
            }
          />
          <DetailSelect
            label="Category"
            value={ticket.category}
            options={CATEGORIES}
            onChange={(v) => onUpdate({ category: v })}
          />
          <DetailSelect
            label="Assigned To"
            value={ticket.assignedTo ?? UNASSIGNED}
            options={[UNASSIGNED, ...agentNames]}
            onChange={(v) =>
              onUpdate({ assignedTo: v === UNASSIGNED ? undefined : v })
            }
          />
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>Created</span>
            <span>{formatTimestamp(ticket.createdAt)}</span>
          </div>
          <Button
            className="w-full"
            onClick={() => toast.success("Ticket details saved")}
          >
            <Save className="mr-2 size-4" />
            Save
          </Button>
        </CardContent>
      </Card>

      {/* Recent Tickets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Recent Tickets · {ticket.facility}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <p className="text-muted-foreground px-4 pb-4 text-sm">
              No other tickets from this facility.
            </p>
          ) : (
            <div className="divide-y">
              {recent.map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/support/tickets/${t.id}`}
                  className="hover:bg-muted/50 block px-4 py-2.5 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {t.id}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", STATUS_BADGE[t.status])}
                    >
                      {t.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm font-medium">
                    {t.title}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
