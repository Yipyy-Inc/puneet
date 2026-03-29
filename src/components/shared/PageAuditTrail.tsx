"use client";

import { useMemo } from "react";
import Link from "next/link";
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
  maxItems?: number;
  facilityId?: number;
}

export function PageAuditTrail({
  area,
  entityId,
  maxItems = 5,
  facilityId = 11,
}: PageAuditTrailProps) {
  const { role } = useFacilityRole();

  const entries = useMemo(() => {
    const all = getTenantAuditLogs(facilityId);
    let filtered = all;

    // Map area to audit categories
    const categoryMap: Record<string, string[]> = {
      settings: ["Configuration", "Financial"],
      forms: ["Configuration"],
      clients: ["Client"],
      bookings: ["Booking"],
      services: ["Configuration", "Financial"],
      staff: ["User Access"],
    };

    const cats = categoryMap[area];
    if (cats) {
      filtered = filtered.filter((e) => cats.includes(e.category));
    }

    if (entityId) {
      filtered = filtered.filter((e) => e.entityId === entityId);
    }

    return filtered.slice(0, maxItems);
  }, [area, entityId, maxItems, facilityId]);

  // Only visible to owner and manager
  if (role !== "owner" && role !== "manager") return null;
  if (entries.length === 0) return null;

  return (
    <div className="border-t pt-4">
      <Collapsible>
        <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between text-xs font-medium transition-colors">
          <span className="flex items-center gap-1.5">
            <Shield className="size-3" />
            Recent Changes ({entries.length})
          </span>
          <ChevronDown className="size-3" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2">
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
          <Link
            href="/facility/dashboard/forms/audit"
            className="text-primary inline-block pt-1 text-[11px] hover:underline"
          >
            View all →
          </Link>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
