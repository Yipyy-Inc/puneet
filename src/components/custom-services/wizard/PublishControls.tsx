"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileEdit,
  Rocket,
  CalendarClock,
  Mail,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import type { CustomServiceModule } from "@/types/facility";
import {
  validateCustomServiceModule,
  hasBlockingIssues,
} from "@/lib/custom-service-validation";
import { cn } from "@/lib/utils";

type PublishMode = "draft" | "now" | "scheduled";

const PUBLISH_OPTIONS: {
  value: PublishMode;
  label: string;
  description: string;
  Icon: React.ElementType;
}[] = [
  {
    value: "draft",
    label: "Draft",
    description: "Saved but not yet visible to the facility.",
    Icon: FileEdit,
  },
  {
    value: "now",
    label: "Publish Now",
    description: "Immediately visible and active in the facility dashboard.",
    Icon: Rocket,
  },
  {
    value: "scheduled",
    label: "Schedule Publish",
    description: "Goes live automatically at a set date and time.",
    Icon: CalendarClock,
  },
];

interface PublishControlsProps {
  data: CustomServiceModule;
  onChange: (updates: Partial<CustomServiceModule>) => void;
}

export function PublishControls({ data, onChange }: PublishControlsProps) {
  const checks = validateCustomServiceModule(data);
  const blocked = hasBlockingIssues(checks);

  // Held in local state so "Schedule Publish" stays selected before a date is
  // picked (an empty scheduledPublishAt would otherwise read back as "draft").
  const [publishMode, setPublishMode] = useState<PublishMode>(
    data.scheduledPublishAt
      ? "scheduled"
      : data.status === "active"
        ? "now"
        : "draft",
  );

  const setMode = (mode: PublishMode) => {
    setPublishMode(mode);
    if (mode === "draft") {
      onChange({ status: "draft", scheduledPublishAt: undefined });
    } else if (mode === "now") {
      onChange({ status: "active", scheduledPublishAt: undefined });
    } else {
      // Stays draft until the scheduled time; keep any prior schedule value.
      onChange({
        status: "draft",
        scheduledPublishAt: data.scheduledPublishAt ?? "",
      });
    }
  };

  // Held locally so a time chosen before a date isn't lost (an empty date would
  // otherwise wipe scheduledPublishAt and discard the time the user just set).
  const [scheduledDate, setScheduledDate] = useState(
    data.scheduledPublishAt?.split("T")[0] ?? "",
  );
  const [scheduledTime, setScheduledTime] = useState(
    data.scheduledPublishAt?.split("T")[1]?.slice(0, 5) ?? "",
  );

  const commitSchedule = (date: string, time: string) => {
    onChange({
      scheduledPublishAt: date ? `${date}T${time || "09:00"}:00` : "",
    });
  };

  const notify = data.notifyFacilityAdminOnPublish ?? true;

  return (
    <div className="space-y-5">
      {/* Pre-publish validation */}
      <div className="border-border bg-card space-y-2 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Pre-Publish Validation</h3>
          {blocked ? (
            <span className="text-destructive text-xs font-medium">
              Resolve required items to save
            </span>
          ) : (
            <span className="text-xs font-medium text-emerald-600">
              All required checks passed
            </span>
          )}
        </div>
        <ul className="space-y-1.5">
          {checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-xs">
              {c.status === "pass" ? (
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
              ) : c.status === "fail" ? (
                <XCircle className="text-destructive mt-0.5 size-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
              )}
              <span
                className={cn(
                  c.status === "fail"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground",
                )}
              >
                {c.label}
                {c.status === "warn" && (
                  <span className="text-amber-600"> — recommended</span>
                )}
                {c.status === "fail" && c.critical && (
                  <span className="text-destructive"> — required</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Publish mode */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Publish Mode</Label>
        <div
          role="radiogroup"
          aria-label="Publish mode"
          className="grid gap-2 sm:grid-cols-3"
        >
          {PUBLISH_OPTIONS.map(({ value, label, description, Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={publishMode === value}
              onClick={() => setMode(value)}
              className={cn(
                "flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-colors",
                publishMode === value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-border/80 hover:bg-accent/30",
              )}
            >
              <Icon
                className={cn(
                  "size-4",
                  publishMode === value
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "text-sm font-semibold",
                  publishMode === value && "text-primary",
                )}
              >
                {label}
              </span>
              <span className="text-muted-foreground text-xs">
                {description}
              </span>
            </button>
          ))}
        </div>

        {publishMode === "scheduled" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Go-live date</Label>
              <DatePicker
                value={scheduledDate}
                onValueChange={(v) => {
                  setScheduledDate(v);
                  commitSchedule(v, scheduledTime);
                }}
                placeholder="Pick a date"
                displayMode="dialog"
                showQuickPresets={false}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Go-live time</Label>
              <TimePickerLux
                value={scheduledTime}
                onValueChange={(v) => {
                  setScheduledTime(v);
                  commitSchedule(scheduledDate, v);
                }}
                displayMode="dialog"
              />
            </div>
          </div>
        )}
      </div>

      {/* Notify facility admin */}
      <div className="border-border bg-card space-y-2 rounded-xl border p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox
            checked={notify}
            onCheckedChange={(v) =>
              onChange({ notifyFacilityAdminOnPublish: !!v })
            }
            className="mt-0.5"
          />
          <div className="space-y-0.5">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Mail className="size-3.5" />
              Notify facility admin on publish
            </span>
            <p className="text-muted-foreground text-xs">
              Emails the facility&apos;s admin when the module goes live.
            </p>
          </div>
        </label>
        {notify && (
          <div className="bg-muted/50 text-muted-foreground ml-7 rounded-lg p-3 text-xs">
            <p className="text-foreground font-medium">
              Your {data.name || "[Module Name]"} module is now live in your
              Yipyy dashboard. Here&apos;s how to set it up.
            </p>
            <p className="mt-1">
              Includes a direct link to the module&apos;s Rates setup page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
