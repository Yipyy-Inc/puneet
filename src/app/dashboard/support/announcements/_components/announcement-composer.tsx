"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, FileText, Send, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";
import { facilities } from "@/data/facilities";
import {
  type AnnouncementDraft,
  upsertAnnouncement,
  useAnnouncements,
} from "@/lib/announcements-store";
import { bodyPreview } from "./announcement-utils";
import type {
  AnnouncementPriority,
  AnnouncementTarget,
  EnhancedAnnouncement,
} from "@/types/announcement";
import { FacilityPicker } from "../../../commercial/credits/_components/facility-picker";
import {
  BUSINESS_TYPES,
  PLAN_TIERS,
  PRIORITY_HELP,
  PRIORITY_OPTIONS,
  TARGET_OPTIONS,
  targetSummary,
} from "./announcement-utils";
import { AnnouncementPreview } from "./announcement-preview";
import { RichTextEditor } from "./rich-text-editor";

const LIST_URL = "/dashboard/support/announcements";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function isoToParts(iso?: string): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}
function partsToIso(date: string, time: string): string {
  const [y, mo, da] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, mo - 1, da, h, mi, 0, 0).toISOString();
}

export function AnnouncementComposer() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const announcements = useAnnouncements();
  const hydrated = useHydrated();

  if (editId && !hydrated) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const existing = editId
    ? (announcements.find((a) => a.id === editId) ?? null)
    : null;

  return <ComposerForm key={existing?.id ?? "new"} existing={existing} />;
}

function ComposerForm({ existing }: { existing: EnhancedAnnouncement | null }) {
  const router = useRouter();
  const initialSchedule = isoToParts(existing?.scheduledFor);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [priority, setPriority] = useState<AnnouncementPriority>(
    existing?.priority ?? "Normal",
  );
  const [target, setTarget] = useState<AnnouncementTarget>(
    existing?.target ?? "All Facilities",
  );
  const [planTiers, setPlanTiers] = useState<string[]>(
    existing?.planTiers ?? [],
  );
  const [businessTypes, setBusinessTypes] = useState<string[]>(
    existing?.businessTypes ?? [],
  );
  const [facilityIds, setFacilityIds] = useState<number[]>(
    existing?.facilityIds ?? [],
  );
  const [inPlatform, setInPlatform] = useState(
    existing ? existing.deliveryMethod !== "email" : true,
  );
  const [email, setEmail] = useState(
    existing ? existing.deliveryMethod !== "in_platform" : false,
  );
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">(
    existing?.status === "Scheduled" ? "later" : "now",
  );
  const [scheduleDate, setScheduleDate] = useState(initialSchedule.date);
  const [scheduleTime, setScheduleTime] = useState(initialSchedule.time);
  const [autoArchiveDays, setAutoArchiveDays] = useState(
    existing?.autoArchiveDays != null ? String(existing.autoArchiveDays) : "",
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  const deliveryMethod =
    inPlatform && email ? "both" : email ? "email" : "in_platform";
  const canSave = title.trim().length > 0 && bodyPreview(body).length > 0;

  function toggle(list: string[], value: string): string[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  function buildDraft(intent: "draft" | "publish"): AnnouncementDraft {
    const scheduledFor =
      scheduleMode === "later" && scheduleDate && scheduleTime
        ? partsToIso(scheduleDate, scheduleTime)
        : undefined;
    const status =
      intent === "draft" ? "Draft" : scheduledFor ? "Scheduled" : "Published";
    return {
      id: existing?.id,
      title: title.trim(),
      body,
      priority,
      status,
      target,
      planTiers: target === "By Plan Tier" ? planTiers : undefined,
      businessTypes: target === "By Business Type" ? businessTypes : undefined,
      facilityIds: target === "Specific Facilities" ? facilityIds : undefined,
      deliveryMethod,
      scheduledFor,
      autoArchiveDays: autoArchiveDays === "" ? null : Number(autoArchiveDays),
    };
  }

  function save(intent: "draft" | "publish") {
    if (!canSave) return;
    const draft = buildDraft(intent);
    upsertAnnouncement(draft);
    toast.success(
      intent === "draft"
        ? "Draft saved"
        : draft.status === "Scheduled"
          ? "Announcement scheduled"
          : "Announcement published",
    );
    router.push(LIST_URL);
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to announcements"
            onClick={() => router.push(LIST_URL)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {existing ? "Edit Announcement" : "New Announcement"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Compose, target, and schedule a platform announcement.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="size-4" />
            Preview
          </Button>
          <Button
            variant="outline"
            disabled={!canSave}
            onClick={() => save("draft")}
          >
            <FileText className="size-4" />
            Save Draft
          </Button>
          <Button
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!canSave}
            onClick={() => save("publish")}
          >
            <Send className="size-4" />
            {scheduleMode === "later" ? "Schedule" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        {/* LEFT — title + body */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">Title</Label>
            <Input
              id="ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title"
              className="text-base font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Body</Label>
            <RichTextEditor
              initialValue={existing?.body ?? ""}
              onChange={setBody}
            />
          </div>
        </div>

        {/* RIGHT — settings */}
        <div className="space-y-4">
          {/* Priority */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Priority</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <RadioGroup
                value={priority}
                onValueChange={(v) => setPriority(v as AnnouncementPriority)}
                className="grid grid-cols-3 gap-2"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <Label
                    key={p}
                    htmlFor={`pri-${p}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm",
                      priority === p
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/40",
                    )}
                  >
                    <RadioGroupItem id={`pri-${p}`} value={p} />
                    {p}
                  </Label>
                ))}
              </RadioGroup>
              <p className="text-muted-foreground text-xs">
                {PRIORITY_HELP[priority]}
              </p>
            </CardContent>
          </Card>

          {/* Target */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Target</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={target}
                onValueChange={(v) => setTarget(v as AnnouncementTarget)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {target === "By Plan Tier" && (
                <div className="space-y-1.5">
                  {PLAN_TIERS.map((tier) => (
                    <Label
                      key={tier}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={planTiers.includes(tier)}
                        onCheckedChange={() =>
                          setPlanTiers((l) => toggle(l, tier))
                        }
                      />
                      {tier}
                    </Label>
                  ))}
                </div>
              )}

              {target === "By Business Type" && (
                <div className="grid grid-cols-2 gap-1.5">
                  {BUSINESS_TYPES.map((bt) => (
                    <Label
                      key={bt.value}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={businessTypes.includes(bt.value)}
                        onCheckedChange={() =>
                          setBusinessTypes((l) => toggle(l, bt.value))
                        }
                      />
                      {bt.label}
                    </Label>
                  ))}
                </div>
              )}

              {target === "Specific Facilities" && (
                <div className="space-y-2">
                  <FacilityPicker
                    value={null}
                    onChange={(id) =>
                      setFacilityIds((l) => (l.includes(id) ? l : [...l, id]))
                    }
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {facilityIds.map((id) => {
                      const f = facilities.find((x) => x.id === id);
                      return (
                        <Badge
                          key={id}
                          variant="outline"
                          className="gap-1 py-1"
                        >
                          {f?.name ?? `Facility ${id}`}
                          <button
                            type="button"
                            aria-label={`Remove ${f?.name ?? id}`}
                            onClick={() =>
                              setFacilityIds((l) => l.filter((x) => x !== id))
                            }
                            className="hover:text-foreground"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Delivery Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={inPlatform}
                  onCheckedChange={(v) => setInPlatform(v === true)}
                />
                In-platform
              </Label>
              <Label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={email}
                  onCheckedChange={(v) => setEmail(v === true)}
                />
                Email
              </Label>
              {!inPlatform && !email && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  Select at least one delivery method.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Scheduling */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Scheduling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <RadioGroup
                value={scheduleMode}
                onValueChange={(v) => setScheduleMode(v as "now" | "later")}
                className="flex gap-4"
              >
                <Label
                  htmlFor="sch-now"
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <RadioGroupItem id="sch-now" value="now" />
                  Publish now
                </Label>
                <Label
                  htmlFor="sch-later"
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <RadioGroupItem id="sch-later" value="later" />
                  Schedule
                </Label>
              </RadioGroup>
              {scheduleMode === "later" && (
                <div className="flex flex-wrap items-center gap-2">
                  <DatePicker
                    value={scheduleDate}
                    onValueChange={(v) => setScheduleDate(v)}
                  />
                  <TimePickerLux
                    value={scheduleTime}
                    onValueChange={(v) => setScheduleTime(v)}
                    displayMode="popover"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Auto-archive */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Auto-archive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">After</span>
                <Input
                  type="number"
                  min={1}
                  value={autoArchiveDays}
                  onChange={(e) => setAutoArchiveDays(e.target.value)}
                  placeholder="—"
                  className="w-20"
                />
                <span className="text-muted-foreground">
                  days (leave blank to keep until archived manually)
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AnnouncementPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={title}
        body={body}
        priority={priority}
        targetText={targetSummary({
          target,
          planTiers,
          businessTypes,
          facilityIds,
        } as EnhancedAnnouncement)}
        deliveryMethod={deliveryMethod}
      />
    </div>
  );
}
