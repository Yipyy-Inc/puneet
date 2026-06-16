"use client";

import { cn } from "@/lib/utils";
import { staffMembers } from "@/data/staff";
import type { ReputationEscalationRoute } from "@/types/reputation";

const SERVICES: { key: string; label: string }[] = [
  { key: "grooming", label: "Grooming" },
  { key: "training", label: "Training" },
  { key: "daycare", label: "Daycare" },
  { key: "boarding", label: "Boarding" },
  { key: "default", label: "All other services" },
];

const ACTIVE_STAFF = staffMembers.filter((s) => s.isActive);

export function ReputationEscalationRouting({
  routes,
  onChange,
}: {
  routes: ReputationEscalationRoute[];
  onChange: (routes: ReputationEscalationRoute[]) => void;
}) {
  function routeFor(service: string): ReputationEscalationRoute | undefined {
    return routes.find((r) => r.service === service);
  }

  function toggleStaff(service: string, staffId: string) {
    const existing = routeFor(service);
    const currentIds = existing?.staffIds ?? [];
    const ids = currentIds.includes(staffId)
      ? currentIds.filter((id) => id !== staffId)
      : [...currentIds, staffId];
    const names = ids.map(
      (id) => ACTIVE_STAFF.find((s) => s.id === id)?.name ?? id,
    );

    const updated: ReputationEscalationRoute = { service, staffIds: ids, staffNames: names };
    onChange(
      existing
        ? routes.map((r) => (r.service === service ? updated : r))
        : [...routes, updated],
    );
  }

  return (
    <div className="space-y-4">
      {SERVICES.map(({ key, label }) => {
        const selected = routeFor(key)?.staffIds ?? [];
        return (
          <div key={key} className="rounded-xl border p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">{label}</p>
              <span className="text-muted-foreground text-xs">
                {selected.length === 0
                  ? "Falls back to default"
                  : `${selected.length} assigned`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVE_STAFF.map((staff) => {
                const isOn = selected.includes(staff.id);
                return (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => toggleStaff(key, staff.id)}
                    title={staff.role}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      isOn
                        ? "border-amber-400 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {staff.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="text-muted-foreground text-xs">
        Pick one person or several. A negative review for a service notifies and creates a follow-up task for everyone assigned to it.
      </p>
    </div>
  );
}
