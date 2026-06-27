"use client";

import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supportAgents } from "@/data/support-tickets";
import { assignTicket } from "@/lib/ticket-assignment-store";

const AGENT_STATUS_DOT: Record<string, string> = {
  Available: "bg-emerald-500",
  Busy: "bg-amber-500",
  Away: "bg-slate-400",
  Offline: "bg-slate-300",
};

/** Inline "Assign" affordance for an unassigned ticket row. Opens an agent
 *  dropdown without triggering the row's navigation. */
export function AssignCell({ ticketId }: { ticketId: string }) {
  return (
    <div
      className="inline-flex"
      role="presentation"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
            <UserPlus className="size-3.5" />
            Assign
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel>Assign to agent</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {supportAgents.map((agent) => (
            <DropdownMenuItem
              key={agent.id}
              onSelect={() => {
                assignTicket(ticketId, agent.name);
                toast.success(`${ticketId} assigned to ${agent.name}`);
              }}
              className="gap-2"
            >
              <span
                className={`size-2 shrink-0 rounded-full ${
                  AGENT_STATUS_DOT[agent.status] ?? "bg-slate-300"
                }`}
              />
              <span className="flex-1">{agent.name}</span>
              <span className="text-muted-foreground text-xs">
                {agent.role}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
