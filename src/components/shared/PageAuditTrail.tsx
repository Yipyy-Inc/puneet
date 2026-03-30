"use client";

import { useMemo } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Shield } from "lucide-react";
import { getTenantAuditLogs } from "@/data/tenant-logs";
import { useFacilityRole } from "@/hooks/use-facility-role";

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface PageAuditTrailProps {
  area: string;
  entityId?: string;
  facilityId?: number;
}

export function PageAuditTrail({
  area,
  entityId,
  facilityId = 11,
}: PageAuditTrailProps) {
  const { role } = useFacilityRole();

  const entries = useMemo(() => {
    const all = getTenantAuditLogs(facilityId);
    let filtered = all;

    const categoryMap: Record<string, string[]> = {
      settings: ["Configuration", "Financial"],
      forms: ["Configuration"],
      clients: ["Client"],
      bookings: ["Booking"],
      services: ["Configuration", "Financial"],
      staff: ["User Access"],
      pets: ["Client"],
    };

    const cats = categoryMap[area];
    if (cats) {
      filtered = filtered.filter((e) => cats.includes(e.category));
    }

    if (entityId) {
      filtered = filtered.filter((e) => e.entityId === entityId);
    }

    return filtered;
  }, [area, entityId, facilityId]);

  if (role !== "owner" && role !== "manager") return null;
  if (entries.length === 0) return null;

  return (
    <div className="mt-6 border-t pt-4">
      <Collapsible>
        <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border px-4 py-2.5 transition-colors">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Shield className="text-muted-foreground size-4" />
            Change History
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold">
              {entries.length}
            </span>
          </span>
          <ChevronDown className="text-muted-foreground size-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="max-h-[400px] space-y-2 overflow-y-auto">
            {entries.map((entry) => (
              <div key={entry.id} className="text-xs">
                <p>
                  <span className="font-medium">{entry.userName}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    ({entry.userRole}) · {formatRelative(entry.timestamp)}
                  </span>
                </p>
                <p className="text-muted-foreground">{entry.description}</p>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
