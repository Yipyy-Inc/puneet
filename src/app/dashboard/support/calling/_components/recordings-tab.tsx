"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Flag,
  Lock,
  Mic,
  Play,
  ShieldCheck,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";
import { lookupFacilityByPhone } from "@/data/support-calls";
import { useSupportRecordings } from "@/lib/support-recording-store";
import type { SupportRecording } from "@/types/support-call";
import { FacilityAvatar } from "../../chat/_components/facility-avatar";
import {
  formatDuration,
  formatRowTime,
  inTimeRange,
  TIME_OPTIONS,
  type TimeRange,
} from "./call-log-utils";
import { NeedsReviewSection } from "./needs-review-section";
import { RecordingPlayerDialog } from "./recording-player-dialog";
import {
  QA_FILTER_OPTIONS,
  qaScoreClass,
  RECORDING_ENABLED,
  STORAGE_NOTE,
} from "./recording-utils";

export function RecordingsTab() {
  const recordings = useSupportRecordings();
  const hydrated = useHydrated();
  const [nowMs] = useState(() => Date.now());

  const [staff, setStaff] = useState("all");
  const [time, setTime] = useState<TimeRange>("all");
  const [qa, setQa] = useState("all");
  const [playing, setPlaying] = useState<SupportRecording | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);

  const staffNames = useMemo(
    () => [...new Set(recordings.map((r) => r.agentName))].sort(),
    [recordings],
  );

  const flagged = useMemo(
    () => recordings.filter((r) => r.flagged),
    [recordings],
  );

  const filtered = useMemo(
    () =>
      recordings.filter((r) => {
        if (staff !== "all" && r.agentName !== staff) return false;
        if (!inTimeRange(r.at, time, nowMs)) return false;
        if (qa === "scored" && r.qaScore == null) return false;
        if (qa === "unscored" && r.qaScore != null) return false;
        return true;
      }),
    [recordings, staff, time, qa, nowMs],
  );

  function openPlayer(rec: SupportRecording) {
    setPlaying(rec);
    setPlayerOpen(true);
  }

  const columns: ColumnDef<SupportRecording>[] = [
    {
      key: "agent",
      label: "Agent",
      sortable: true,
      sortValue: (r) => r.agentName,
      render: (r) => (
        <div className="flex items-center gap-2">
          <FacilityAvatar name={r.agentName} id={r.agentId} size="sm" />
          <span className="text-sm font-medium">{r.agentName}</span>
        </div>
      ),
    },
    {
      key: "facility",
      label: "Facility",
      sortable: true,
      sortValue: (r) =>
        lookupFacilityByPhone(r.callerNumber)?.facilityName ?? "zzz",
      render: (r) => {
        const facility = lookupFacilityByPhone(r.callerNumber);
        return (
          <div className="max-w-[220px]">
            {facility ? (
              <Link
                href={`/dashboard/facilities/${facility.facilityId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 truncate text-sm font-medium hover:underline"
              >
                {facility.facilityName}
                <ExternalLink className="size-3 shrink-0 opacity-60" />
              </Link>
            ) : (
              <span className="text-muted-foreground text-sm font-medium">
                Unknown Caller
              </span>
            )}
            <p className="text-muted-foreground truncate font-mono text-[11px]">
              {r.callerNumber || "—"}
            </p>
          </div>
        );
      },
    },
    {
      key: "qa",
      label: "QA Score",
      sortable: true,
      sortValue: (r) => r.qaScore ?? -1,
      render: (r) =>
        r.qaScore != null ? (
          <Badge
            variant="outline"
            className={cn("gap-1", qaScoreClass(r.qaScore))}
          >
            <Star className="size-2.5 fill-current" />
            {r.qaScore}/5
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">Not scored</span>
        ),
    },
    {
      key: "duration",
      label: "Duration",
      sortable: true,
      sortValue: (r) => r.durationSeconds,
      render: (r) => (
        <span className="font-mono text-sm tabular-nums">
          {formatDuration(r.durationSeconds)}
        </span>
      ),
    },
    {
      key: "at",
      label: "Date & Time",
      sortable: true,
      sortValue: (r) => r.at,
      render: (r) => (
        <span className="text-muted-foreground text-sm">
          {formatRowTime(r.at, nowMs)}
        </span>
      ),
    },
    {
      key: "flagged",
      label: "Flagged",
      sortable: true,
      sortValue: (r) => (r.flagged ? 0 : 1),
      render: (r) =>
        r.flagged ? (
          <Badge
            variant="outline"
            className="gap-1 border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300"
          >
            <Flag className="size-2.5" />
            Flagged
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Consent / recording notice */}
      {RECORDING_ENABLED && (
        <div className="flex flex-wrap items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <p className="text-sky-800 dark:text-sky-200">
            <span className="font-semibold">Call recording is enabled.</span>{" "}
            Every caller is informed that the call is recorded at the start of
            the call — the consent notice is part of the IVR greeting.
            Recordings are used for quality assurance only.
          </p>
        </div>
      )}

      {/* Needs Review */}
      <NeedsReviewSection recordings={flagged} nowMs={nowMs} />

      {/* Recordings header + storage note */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">All Recordings</h2>
        <span
          className="text-muted-foreground inline-flex items-center gap-1.5 text-xs"
          title="Recordings are encrypted at rest and automatically deleted after the retention period."
        >
          <Lock className="size-3.5" />
          {STORAGE_NOTE}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={staff} onValueChange={setStaff}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="All Staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            {staffNames.map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={time} onValueChange={(v) => setTime(v as TimeRange)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Time" />
          </SelectTrigger>
          <SelectContent>
            {TIME_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={qa} onValueChange={setQa}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="QA Scored" />
          </SelectTrigger>
          <SelectContent>
            {QA_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Recordings table */}
      <DataTable
        data={filtered}
        columns={columns}
        itemsPerPage={10}
        emptyState={{
          icon: Mic,
          title: "No recordings yet",
          description:
            "Call recordings will appear here once calls are recorded for quality assurance.",
        }}
        getSearchValue={(r) =>
          `${lookupFacilityByPhone(r.callerNumber)?.facilityName ?? "unknown caller"} ${r.callerNumber}`
        }
        searchPlaceholder="Search facility or number…"
        actions={(r) => (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => openPlayer(r)}
          >
            <Play className="size-3.5" />
            Play
          </Button>
        )}
      />

      <RecordingPlayerDialog
        recording={playing}
        open={playerOpen}
        onOpenChange={setPlayerOpen}
      />
    </div>
  );
}
