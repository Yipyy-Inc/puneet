"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Phone,
  UserCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CallTagSelect } from "@/components/calling/CallTagSelect";
import {
  FOLLOW_UP_META,
  FOLLOW_UP_OPTIONS,
} from "@/lib/calling/follow-up-status";
import { lookupFacilityByPhone } from "@/data/support-calls";
import { supportAgents } from "@/hooks/use-support-inbox";
import { useTwilioConfig } from "@/hooks/use-twilio-config";
import { recordOutboundCall } from "@/lib/dialer-store";
import {
  setCallAssigned,
  setCallFollowUp,
  setCallNotes,
  setCallTags,
} from "@/lib/support-call-log-store";
import { placeOutboundCall } from "@/lib/twilio-dialer";
import type { FollowUpStatus } from "@/types/communications";
import type { SupportCallLogEntry } from "@/types/support-call";
import {
  DEPARTMENT_META,
  DIRECTION_META,
  formatDuration,
  formatFullTime,
  STATUS_META,
} from "./call-log-utils";

const UNASSIGNED = "__unassigned__";

function humanizeRole(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <p className="text-muted-foreground mb-0.5 text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}

export function CallLogDetail({
  entry,
  onClose,
}: {
  entry: SupportCallLogEntry;
  onClose: () => void;
}) {
  const twilio = useTwilioConfig();
  const facility = lookupFacilityByPhone(entry.callerNumber);
  const dir = DIRECTION_META[entry.direction];
  const DirIcon = dir.icon;
  const status = STATUS_META[entry.status];
  const StatusIcon = status.icon;
  const dept = DEPARTMENT_META[entry.department];

  const [notes, setNotes] = useState(entry.notes);
  const [justSaved, setJustSaved] = useState(false);
  const notesDirty = notes !== entry.notes;

  async function onCallBack() {
    if (!twilio.connected) {
      toast.error("Twilio isn't connected — configure it in Integrations.");
      return;
    }
    const result = await placeOutboundCall({
      to: entry.callerNumber,
      from: twilio.phoneNumbers[0] ?? "",
    });
    if (!result.ok) {
      toast.error(result.error ?? "The call could not be placed.");
      return;
    }
    toast.success(`Calling ${facility?.facilityName ?? entry.callerNumber}…`);
    if (facility) {
      recordOutboundCall({
        facilityId: facility.facilityId,
        facilityName: facility.facilityName,
        number: entry.callerNumber,
      });
    }
  }

  return (
    <Card className="gap-0 overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              dir.box,
            )}
          >
            <DirIcon className="size-5" />
          </span>
          <div className="min-w-0">
            {facility ? (
              <Link
                href={`/dashboard/facilities/${facility.facilityId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold hover:underline"
              >
                {facility.facilityName}
                <ExternalLink className="size-3 shrink-0 opacity-60" />
              </Link>
            ) : (
              <span className="text-muted-foreground font-semibold">
                Unknown Caller
              </span>
            )}
            <p className="text-muted-foreground font-mono text-xs">
              {entry.callerNumber || "—"}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close detail"
          onClick={onClose}
          className="hover:bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-lg"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Status">
            <Badge
              variant="outline"
              className={cn("gap-1 text-[11px]", status.badge)}
            >
              <StatusIcon className="size-2.5" />
              {status.label}
            </Badge>
          </Field>
          <Field label="Direction">
            <span className="text-sm font-medium">{dir.label}</span>
          </Field>
          <Field label="Duration">
            <span className="font-mono text-sm tabular-nums">
              {formatDuration(entry.durationSeconds)}
            </span>
          </Field>
          <Field label="Handled by">
            {entry.handledBy ? (
              <span className="inline-flex items-center gap-1 text-sm">
                {entry.handledBy.kind === "ai" ? (
                  <Bot className="size-3.5 text-violet-500" />
                ) : (
                  <UserCheck className="size-3.5 text-sky-500" />
                )}
                {entry.handledBy.name}
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </Field>
          <Field label="Inquiry department">
            <Badge variant="outline" className={cn("text-[11px]", dept.pill)}>
              {dept.label}
            </Badge>
          </Field>
          <Field label="Time" className="col-span-2">
            <span className="text-sm">{formatFullTime(entry.at)}</span>
          </Field>
        </div>

        {/* Follow-up */}
        <Field label="Follow-up">
          <div className="flex items-center gap-2">
            <Select
              value={entry.followUpStatus}
              onValueChange={(v) =>
                setCallFollowUp(entry.id, v as FollowUpStatus)
              }
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOLLOW_UP_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {FOLLOW_UP_META[opt].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                FOLLOW_UP_META[entry.followUpStatus].pill,
              )}
            >
              {FOLLOW_UP_META[entry.followUpStatus].label}
            </span>
          </div>
        </Field>

        {/* Assigned to */}
        <Field label="Assigned to">
          <Select
            value={entry.assignedTo ?? UNASSIGNED}
            onValueChange={(v) =>
              setCallAssigned(entry.id, v === UNASSIGNED ? null : v)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {supportAgents.map((a) => (
                <SelectItem key={a.id} value={a.name}>
                  {a.name} · {humanizeRole(a.role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* Call tags */}
        <Field label="Call tags">
          <CallTagSelect
            selected={entry.tags}
            onChange={(ids) => setCallTags(entry.id, ids)}
          />
        </Field>

        {/* Staff notes */}
        <div className="space-y-2">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            Staff notes
          </p>
          <Textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setJustSaved(false);
            }}
            rows={4}
            placeholder="Add notes about this call…"
            className="resize-none text-sm"
          />
          <div className="flex items-center justify-end gap-2">
            {justSaved && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <CheckCircle2 className="size-3" /> Saved
              </span>
            )}
            <Button
              size="sm"
              variant="secondary"
              disabled={!notesDirty}
              onClick={() => {
                setCallNotes(entry.id, notes);
                setJustSaved(true);
              }}
            >
              Save notes
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 border-t pt-4">
          <Button
            onClick={onCallBack}
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Phone className="size-4" />
            Call Back
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              toast.success(`SMS sent to ${entry.callerNumber || "caller"}`)
            }
          >
            <MessageSquare className="size-4" />
            Send SMS
          </Button>
        </div>
      </div>
    </Card>
  );
}
