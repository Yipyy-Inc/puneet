"use client";

import { supportAgents } from "@/data/support-tickets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SupportTicket } from "@/types/support";
import { SlaCountdown } from "./sla-countdown";
import { CATEGORIES, PRIORITIES, STATUSES } from "./ticket-utils";

const UNASSIGNED = "Unassigned";

export function TicketHeader({
  ticket,
  onUpdate,
  onBreach,
}: {
  ticket: SupportTicket;
  onUpdate: (patch: Partial<SupportTicket>) => void;
  onBreach: () => void;
}) {
  const agentNames = supportAgents.map((a) => a.name);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-muted-foreground font-mono text-xs">{ticket.id}</p>
        <h1 className="text-2xl font-bold tracking-tight">{ticket.title}</h1>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <MetaSelect
          label="Status"
          value={ticket.status}
          options={STATUSES}
          onChange={(v) => onUpdate({ status: v as SupportTicket["status"] })}
          className="w-36"
        />
        <MetaSelect
          label="Priority"
          value={ticket.priority}
          options={PRIORITIES}
          onChange={(v) =>
            onUpdate({ priority: v as SupportTicket["priority"] })
          }
          className="w-28"
        />
        <MetaSelect
          label="Category"
          value={ticket.category}
          options={CATEGORIES}
          onChange={(v) => onUpdate({ category: v })}
          className="w-40"
        />
        <MetaSelect
          label="Assigned To"
          value={ticket.assignedTo ?? UNASSIGNED}
          options={[UNASSIGNED, ...agentNames]}
          onChange={(v) =>
            onUpdate({ assignedTo: v === UNASSIGNED ? undefined : v })
          }
          className="w-44"
        />
        <div className="ml-auto space-y-1">
          <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
            SLA Deadline
          </p>
          <SlaCountdown
            ticket={ticket}
            breached={
              (ticket.sla?.breachCount ?? 0) > 0 ||
              ticket.status === "Escalated"
            }
            onBreach={onBreach}
          />
        </div>
      </div>
    </div>
  );
}

function MetaSelect({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
        {label}
      </p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn("h-9", className)}>
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
