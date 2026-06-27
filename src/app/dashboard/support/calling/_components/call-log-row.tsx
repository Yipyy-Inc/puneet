"use client";

import Link from "next/link";
import { Building2, ChevronRight, ExternalLink, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { lookupFacilityByPhone } from "@/data/support-calls";
import type { SupportCallLogEntry } from "@/types/support-call";
import { FacilityAvatar } from "../../chat/_components/facility-avatar";
import {
  DEPARTMENT_META,
  DIRECTION_META,
  formatRowTime,
  STATUS_META,
} from "./call-log-utils";

export function CallLogRow({
  entry,
  selected,
  onSelect,
  nowMs,
}: {
  entry: SupportCallLogEntry;
  selected: boolean;
  onSelect: () => void;
  nowMs: number;
}) {
  const facility = lookupFacilityByPhone(entry.callerNumber);
  const dir = DIRECTION_META[entry.direction];
  const DirIcon = dir.icon;
  const status = STATUS_META[entry.status];
  const StatusIcon = status.icon;
  const dept = DEPARTMENT_META[entry.department];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-primary/20 ring-1"
          : "hover:bg-muted/50",
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg",
          dir.box,
        )}
        title={dir.label}
      >
        <DirIcon className="size-3.5" />
      </span>

      {facility ? (
        <FacilityAvatar
          name={facility.facilityName}
          id={facility.facilityId}
          size="sm"
        />
      ) : (
        <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-xl">
          <Phone className="size-3.5" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {facility ? (
            <Link
              href={`/dashboard/facilities/${facility.facilityId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 truncate text-sm font-semibold hover:underline"
            >
              {facility.facilityName}
              <ExternalLink className="size-3 shrink-0 opacity-60" />
            </Link>
          ) : (
            <span className="text-muted-foreground truncate text-sm font-semibold">
              Unknown Caller
            </span>
          )}
          <Badge
            variant="outline"
            className={cn("shrink-0 gap-1 text-[10px]", dept.pill)}
          >
            <Building2 className="size-2.5" />
            {dept.label}
          </Badge>
        </div>
        <p className="text-muted-foreground truncate font-mono text-[11px]">
          {entry.callerNumber || "—"}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge
          variant="outline"
          className={cn("gap-1 text-[10px]", status.badge)}
        >
          <StatusIcon className="size-2.5" />
          {status.label}
        </Badge>
        <span className="text-muted-foreground text-[10px] tabular-nums">
          {formatRowTime(entry.at, nowMs)}
        </span>
      </div>

      <ChevronRight
        className={cn(
          "text-muted-foreground/40 size-4 shrink-0 transition-transform",
          selected && "text-primary rotate-90",
        )}
      />
    </div>
  );
}
