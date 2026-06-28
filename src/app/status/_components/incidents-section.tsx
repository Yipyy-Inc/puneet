import { CheckCircle2 } from "lucide-react";

import {
  activeIncidents,
  resolvedIncidents,
  STATUS_COMPONENTS,
  type PlatformIncident,
} from "@/data/status-page";
import { cn } from "@/lib/utils";

import {
  formatDate,
  formatDateTime,
  impactMeta,
  incidentStatusMeta,
} from "./status-styles";

function componentName(id: string): string {
  return STATUS_COMPONENTS.find((c) => c.id === id)?.name ?? id;
}

function IncidentTimeline({
  updates,
}: {
  updates: PlatformIncident["updates"];
}) {
  // Newest update first.
  const ordered = [...updates].reverse();
  return (
    <ol className="space-y-3">
      {ordered.map((u, i) => {
        const meta = incidentStatusMeta(u.status);
        return (
          <li key={i} className="flex gap-3">
            <span
              className={cn("mt-1.5 size-2 shrink-0 rounded-full", meta.dot)}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-semibold">{meta.label}</span>
                <span className="text-muted-foreground">
                  {" "}
                  — {formatDateTime(u.at)}
                </span>
              </p>
              <p className="text-muted-foreground text-sm">{u.message}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function IncidentCard({
  incident,
  active,
}: {
  incident: PlatformIncident;
  active: boolean;
}) {
  const impact = impactMeta(incident.impact);
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        active && "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20",
      )}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{incident.title}</h3>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              impact.cls,
            )}
          >
            {impact.label}
          </span>
        </div>
        <span className="text-muted-foreground text-xs">
          {active
            ? `Started ${formatDateTime(incident.startedAt)}`
            : formatDate(incident.startedAt)}
        </span>
      </div>
      <p className="text-muted-foreground mb-3 text-xs">
        Affected: {incident.affected.map(componentName).join(", ")}
      </p>
      <IncidentTimeline updates={incident.updates} />
    </div>
  );
}

export function IncidentsSection() {
  const active = activeIncidents();
  const past = resolvedIncidents().slice(0, 6);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Active Incidents</h2>
        {active.length === 0 ? (
          <div className="text-muted-foreground flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm">
            <CheckCircle2 className="size-4 text-emerald-500" />
            No incidents reported. All systems are operating normally.
          </div>
        ) : (
          <div className="space-y-4">
            {active.map((i) => (
              <IncidentCard key={i.id} incident={i} active />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Incident History</h2>
        <div className="space-y-4">
          {past.map((i) => (
            <IncidentCard key={i.id} incident={i} active={false} />
          ))}
        </div>
      </section>
    </div>
  );
}
