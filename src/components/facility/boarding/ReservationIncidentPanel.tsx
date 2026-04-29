"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertTriangle,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Siren,
  ShieldCheck,
} from "lucide-react";
import { getIncidentsForGuest } from "@/data/incidents";
import { CreateIncidentModal } from "@/components/incidents/CreateIncidentModal";
import { IncidentDetailsModal } from "@/components/incidents/IncidentDetailsModal";
import type { Incident } from "@/types/incidents";

interface Props {
  guestId: string;
  reservationId?: string;
  petName: string;
  petId: number;
  ownerName: string;
}

const SEVERITY_CONFIG: Record<string, { label: string; dot: string; row: string }> = {
  critical: {
    label: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
    row: "border-red-200 bg-red-50/40 hover:bg-red-50/70 dark:border-red-900 dark:bg-red-900/10 dark:hover:bg-red-900/20",
  },
  high: {
    label: "text-orange-700 dark:text-orange-400",
    dot: "bg-orange-500",
    row: "border-orange-200 bg-orange-50/40 hover:bg-orange-50/70 dark:border-orange-900 dark:bg-orange-900/10 dark:hover:bg-orange-900/20",
  },
  medium: {
    label: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-400",
    row: "border-border bg-muted/20 hover:bg-muted/40",
  },
  low: {
    label: "text-green-700 dark:text-green-400",
    dot: "bg-green-500",
    row: "border-border bg-muted/20 hover:bg-muted/40",
  },
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  open: {
    icon: <AlertCircle className="size-3" />,
    label: "Open",
    color: "text-red-600 dark:text-red-400",
  },
  investigating: {
    icon: <Clock className="size-3" />,
    label: "Investigating",
    color: "text-amber-600 dark:text-amber-400",
  },
  resolved: {
    icon: <CheckCircle2 className="size-3" />,
    label: "Resolved",
    color: "text-green-600 dark:text-green-400",
  },
  closed: {
    icon: <XCircle className="size-3" />,
    label: "Closed",
    color: "text-muted-foreground",
  },
};

function formatIncidentDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReservationIncidentPanel({
  guestId,
  reservationId,
  petName,
  petId,
  ownerName,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);

  const linkedIncidents = getIncidentsForGuest(guestId);
  const openCount = linkedIncidents.filter(
    (i) => i.status === "open" || i.status === "investigating",
  ).length;
  const hasOpen = openCount > 0;

  return (
    <>
      <div
        data-alert={hasOpen}
        className="overflow-hidden rounded-xl border transition-colors data-[alert=true]:border-red-200 data-[alert=false]:border-border dark:data-[alert=true]:border-red-800"
      >
        {/* Header */}
        <div
          data-alert={hasOpen}
          className="flex items-center justify-between px-4 py-3 data-[alert=true]:bg-red-50/60 data-[alert=false]:bg-muted/30 dark:data-[alert=true]:bg-red-900/10 dark:data-[alert=false]:bg-muted/10"
        >
          <div className="flex items-center gap-2.5">
            <div
              data-alert={hasOpen}
              className="flex size-7 items-center justify-center rounded-lg data-[alert=true]:bg-red-100 data-[alert=false]:bg-muted dark:data-[alert=true]:bg-red-900/30"
            >
              {hasOpen ? (
                <Siren className="size-3.5 text-red-600 dark:text-red-400" />
              ) : (
                <ShieldCheck className="size-3.5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">
                Incident Reports
              </p>
              {hasOpen ? (
                <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                  {openCount} open — requires attention
                </p>
              ) : (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {linkedIncidents.length === 0
                    ? "No incidents this stay"
                    : `${linkedIncidents.length} total · all resolved`}
                </p>
              )}
            </div>
          </div>

          <Button
            size="sm"
            variant={hasOpen ? "destructive" : "outline"}
            className="h-7 text-xs"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="mr-1 size-3" />
            Report
          </Button>
        </div>

        {/* Incident list */}
        {linkedIncidents.length > 0 && (
          <div className="divide-y">
            {linkedIncidents.map((incident) => {
              const sev = SEVERITY_CONFIG[incident.severity] ?? SEVERITY_CONFIG.low;
              const status = STATUS_CONFIG[incident.status] ?? STATUS_CONFIG.closed;
              return (
                <button
                  key={incident.id}
                  onClick={() => setSelected(incident)}
                  className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${sev.row}`}
                >
                  {/* Severity dot */}
                  <span className={`mt-0.5 size-2 shrink-0 rounded-full ${sev.dot}`} />

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-semibold leading-snug">
                        {incident.title}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {incident.id}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className={`flex items-center gap-1 text-xs font-medium ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </span>
                      <span className="text-muted-foreground text-xs">·</span>
                      <span className={`text-xs font-medium capitalize ${sev.label}`}>
                        {incident.severity}
                      </span>
                      <span className="text-muted-foreground text-xs">·</span>
                      <span className="text-muted-foreground text-xs">
                        {formatIncidentDate(incident.incidentDate)}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create incident modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
          <CreateIncidentModal
            onClose={() => setShowCreate(false)}
            prefilledPet={{ id: petId, name: petName, clientName: ownerName }}
            reservationId={reservationId}
            boardingGuestId={guestId}
          />
        </DialogContent>
      </Dialog>

      {/* View incident modal */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
      >
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
          {selected && (
            <IncidentDetailsModal
              incident={selected}
              onClose={() => setSelected(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
