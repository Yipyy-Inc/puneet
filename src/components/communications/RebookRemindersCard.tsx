"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Bell,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Mail,
  MessageCircle,
  MessageSquare,
  Pencil,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  ShieldOff,
  Settings,
  Sparkles,
  UserMinus,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { RebookTemplateEditorModal } from "@/components/communications/RebookTemplateEditorModal";
import { DismissReminderDialog } from "@/components/communications/DismissReminderDialog";
import { RebookAnalyticsRow } from "@/components/communications/RebookAnalyticsRow";
import {
  BLOCK_REASON_LABELS,
  defaultServiceFrequencies,
  rebookReminders,
  lapsedClients,
  formatFrequency,
  getServiceLabel,
  REBOOK_SERVICE_TYPES,
  REMINDER_LEAD_PRESETS,
  type DefaultServiceFrequency,
  type DismissReason,
  type FrequencyUnit,
  type RebookMessageTemplate,
  type RebookReminder,
  type ReminderBlockReason,
  type ReminderChannel,
  type ServiceFrequency,
  type ServiceTypeKey,
} from "@/data/rebook-reminders";
import { getBlockedClientIds } from "@/lib/blocked-clients";

type QueueRange = 30 | 60 | 90;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatDate = (d?: string) => {
  if (!d) return "";
  return new Date(d + (d.includes("T") ? "" : "T00:00:00")).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric" },
  );
};

const formatLongDate = (d?: string) => {
  if (!d) return "";
  return new Date(d + (d.includes("T") ? "" : "T00:00:00")).toLocaleDateString(
    "en-US",
    { weekday: "short", month: "short", day: "numeric", year: "numeric" },
  );
};

const channelIcon = (c: ReminderChannel, size = "size-3.5") => {
  if (c === "both")
    return (
      <span className="text-muted-foreground flex items-center gap-0.5">
        <Mail className={size} />
        <MessageSquare className={size} />
      </span>
    );
  if (c === "email") return <Mail className={`text-muted-foreground ${size}`} />;
  return <MessageSquare className={`text-muted-foreground ${size}`} />;
};

const BLOCK_REASON_SHORT: Record<ReminderBlockReason, string> = {
  client_blocked: "Client blocked",
  client_opted_out: "Client opted out",
  client_inactive: "Client inactive",
  marketing_opt_out: "Marketing opt-out",
  open_incident: "Open incident",
  refund_in_progress: "Refund in progress",
  future_booking_exists: "Already booked",
};

const dayBucket = (sendDate: string, today: number) => {
  const send = new Date(sendDate + "T00:00:00").getTime();
  const days = Math.round((send - today) / 86400000);
  if (days < 0) return { key: "overdue", label: "Overdue" };
  if (days <= 7) return { key: "thisWeek", label: "This week" };
  if (days <= 14) return { key: "nextWeek", label: "Next week" };
  if (days <= 30) return { key: "later", label: "Later this month" };
  if (days <= 60) return { key: "next30", label: "Next 30–60 days" };
  return { key: "next90", label: "60–90 days out" };
};

const BUCKET_ORDER = [
  "overdue",
  "thisWeek",
  "nextWeek",
  "later",
  "next30",
  "next90",
];

export function RebookRemindersCard() {
  const [defaults, setDefaults] = useState<DefaultServiceFrequency[]>(() =>
    defaultServiceFrequencies.map((d) => ({ ...d })),
  );
  const [reminders, setReminders] = useState<RebookReminder[]>(() => {
    const blockedIds = getBlockedClientIds();
    return rebookReminders.map((r) => {
      if (!blockedIds.has(r.clientId)) return { ...r };
      const existing = r.blockedReasons ?? [];
      const blockedReasons = existing.includes("client_blocked")
        ? existing
        : ["client_blocked" as const, ...existing];
      return { ...r, blockedReasons };
    });
  });

  const [editingService, setEditingService] = useState<ServiceTypeKey | null>(
    null,
  );
  const [draft, setDraft] = useState<DefaultServiceFrequency | null>(null);

  const [applyToAllOpen, setApplyToAllOpen] = useState(false);
  const [applyToAllService, setApplyToAllService] =
    useState<ServiceTypeKey | null>(null);

  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [templateEditingService, setTemplateEditingService] =
    useState<ServiceTypeKey | null>(null);

  const [dismissOpen, setDismissOpen] = useState(false);
  const [dismissTarget, setDismissTarget] = useState<RebookReminder | null>(
    null,
  );

  const [queueRange, setQueueRange] = useState<QueueRange>(30);
  const [queueServiceFilter, setQueueServiceFilter] =
    useState<ServiceTypeKey | "all">("all");
  const [lapsedServiceFilter, setLapsedServiceFilter] =
    useState<ServiceTypeKey | "all">("all");

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const startEdit = (def: DefaultServiceFrequency) => {
    setEditingService(def.service);
    setDraft({ ...def, secondReminder: { ...def.secondReminder } });
  };

  const cancelEdit = () => {
    setEditingService(null);
    setDraft(null);
  };

  const saveEdit = () => {
    if (!editingService || !draft) return;
    setDefaults((prev) =>
      prev.map((d) => (d.service === editingService ? draft : d)),
    );
    toast.success(`${getServiceLabel(editingService)} settings saved`);
    cancelEdit();
  };

  const handleApplyToAll = () => {
    if (!applyToAllService) return;
    const def = defaults.find((d) => d.service === applyToAllService);
    if (!def) return;
    toast.success(
      `Applied ${formatFrequency(def.frequency).toLowerCase()} to all existing ${getServiceLabel(
        applyToAllService,
      ).toLowerCase()} clients (overrides preserved)`,
    );
    setApplyToAllOpen(false);
    setApplyToAllService(null);
  };

  const openTemplateEditor = (service: ServiceTypeKey) => {
    setTemplateEditingService(service);
    setTemplateEditorOpen(true);
  };

  const saveTemplate = (template: RebookMessageTemplate) => {
    if (!templateEditingService) return;
    setDefaults((prev) =>
      prev.map((d) =>
        d.service === templateEditingService ? { ...d, template } : d,
      ),
    );
    if (draft && draft.service === templateEditingService) {
      setDraft({ ...draft, template });
    }
  };

  const openDismiss = (r: RebookReminder) => {
    setDismissTarget(r);
    setDismissOpen(true);
  };

  const confirmDismiss = (reason: DismissReason, note: string) => {
    if (!dismissTarget) return;
    setReminders((prev) =>
      prev.map((r) =>
        r.id === dismissTarget.id
          ? {
              ...r,
              status: "dismissed",
              dismissedAt: new Date().toISOString(),
              dismissReason: reason,
              dismissNote: note || undefined,
              dismissedBy: "You",
            }
          : r,
      ),
    );
    toast.success(`Reminder dismissed — ${reason}`);
    setDismissTarget(null);
  };

  const sendNow = (r: RebookReminder) => {
    setReminders((prev) =>
      prev.map((x) =>
        x.id === r.id
          ? { ...x, status: "sent", sentAt: new Date().toISOString() }
          : x,
      ),
    );
    toast.success(`Sent reminder to ${r.clientName}`);
  };

  const queueScheduled = reminders.filter((r) => r.status === "scheduled");
  const queueWithinRange = useMemo(() => {
    return queueScheduled.filter((r) => {
      const diff =
        (new Date(r.scheduledSendDate + "T00:00:00").getTime() - today) /
        86400000;
      return diff <= queueRange && diff >= -7;
    });
  }, [queueScheduled, queueRange, today]);

  const filteredQueue = useMemo(() => {
    if (queueServiceFilter === "all") return queueWithinRange;
    return queueWithinRange.filter((r) => r.service === queueServiceFilter);
  }, [queueWithinRange, queueServiceFilter]);

  const groupedQueue = useMemo(() => {
    const groups: Record<string, RebookReminder[]> = {};
    for (const r of filteredQueue) {
      const b = dayBucket(r.scheduledSendDate, today);
      if (!groups[b.key]) groups[b.key] = [];
      groups[b.key].push(r);
    }
    return BUCKET_ORDER.filter((k) => groups[k]?.length).map((k) => ({
      key: k,
      label: dayBucket(
        groups[k][0].scheduledSendDate,
        today,
      ).label,
      items: groups[k].sort(
        (a, b) =>
          new Date(a.scheduledSendDate).getTime() -
          new Date(b.scheduledSendDate).getTime(),
      ),
    }));
  }, [filteredQueue, today]);

  const filteredLapsed = useMemo(() => {
    const list =
      lapsedServiceFilter === "all"
        ? lapsedClients
        : lapsedClients.filter((l) => l.service === lapsedServiceFilter);
    return [...list].sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [lapsedServiceFilter]);

  const sentItems = reminders.filter(
    (r) => r.status === "sent" || r.status === "rebooked",
  );
  const dismissedItems = reminders.filter((r) => r.status === "dismissed");
  const skippedItems = useMemo(
    () =>
      reminders
        .filter((r) => r.status === "skipped")
        .sort(
          (a, b) =>
            new Date(b.skippedAt ?? 0).getTime() -
            new Date(a.skippedAt ?? 0).getTime(),
        ),
    [reminders],
  );

  const stats = {
    sent: sentItems.length,
    rebooked: reminders.filter((r) => r.status === "rebooked").length,
    dismissed: dismissedItems.length,
    skipped: skippedItems.length,
  };

  const editingDef = templateEditingService
    ? defaults.find((d) => d.service === templateEditingService)
    : null;

  return (
    <>
      <div className="space-y-4">
        <RebookAnalyticsRow reminders={reminders} />

        <Card className="border-violet-100 bg-gradient-to-br from-violet-50/40 via-white to-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                    <RefreshCw className="size-4" />
                  </span>
                  Rebook Reminders
                </CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">
                  Per-service frequency, lead time, channel, and follow-up
                  config. Up to two reminders per booking cycle. Skipped
                  automatically when the client already has a future booking
                  or any safety check fires.
                </p>
              </div>
              <Badge
                variant="outline"
                className="gap-1 border-violet-200 bg-violet-50 text-violet-700"
              >
                <Bell className="size-3" />
                {queueScheduled.length} queued
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="defaults" className="space-y-4">
            <TabsList>
              <TabsTrigger value="defaults">
                <Settings className="mr-2 size-4" />
                Defaults & Templates
              </TabsTrigger>
              <TabsTrigger value="queue">
                <Clock className="mr-2 size-4" />
                Queue ({queueScheduled.length})
              </TabsTrigger>
              <TabsTrigger value="lapsed">
                <AlertTriangle className="mr-2 size-4" />
                Lapsed ({lapsedClients.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                <CheckCircle2 className="mr-2 size-4" />
                History
              </TabsTrigger>
            </TabsList>

            {/* DEFAULTS */}
            <TabsContent value="defaults" className="space-y-3">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                <p className="font-medium">How reminder timing works</p>
                <p className="mt-1">
                  When a booking completes we add the client&apos;s frequency
                  to compute the expected return date, then send the reminder
                  the chosen number of days <em>before</em> that date. If a
                  future booking already exists for the same service, the
                  reminder is skipped automatically.
                </p>
              </div>

              <div className="space-y-2">
                {defaults.map((def) => {
                  const isEditing = editingService === def.service && draft;
                  const d = isEditing ? draft! : def;
                  return (
                    <div
                      key={def.service}
                      className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
                    >
                      {isEditing ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">
                              {getServiceLabel(d.service)}
                            </span>
                            <div className="flex items-center gap-2 text-xs">
                              <Switch
                                checked={d.remindersEnabled}
                                onCheckedChange={(v) =>
                                  setDraft({ ...d, remindersEnabled: v })
                                }
                              />
                              <span className="text-muted-foreground">
                                Reminders {d.remindersEnabled ? "on" : "off"}
                              </span>
                            </div>
                          </div>

                          {/* Frequency */}
                          <div>
                            <label className="text-muted-foreground text-xs font-medium">
                              Frequency
                            </label>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-muted-foreground text-sm">
                                Every
                              </span>
                              <Input
                                type="number"
                                min={1}
                                value={d.frequency.value}
                                onChange={(e) =>
                                  setDraft({
                                    ...d,
                                    frequency: {
                                      ...d.frequency,
                                      value: Math.max(
                                        1,
                                        parseInt(e.target.value, 10) || 1,
                                      ),
                                    },
                                  })
                                }
                                className="h-8 w-20"
                              />
                              <Select
                                value={d.frequency.unit}
                                onValueChange={(v: FrequencyUnit) =>
                                  setDraft({
                                    ...d,
                                    frequency: { ...d.frequency, unit: v },
                                  })
                                }
                              >
                                <SelectTrigger className="h-8 w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="days">Days</SelectItem>
                                  <SelectItem value="weeks">Weeks</SelectItem>
                                  <SelectItem value="months">Months</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Lead time */}
                          <div>
                            <label className="text-muted-foreground text-xs font-medium">
                              Send first reminder
                            </label>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {REMINDER_LEAD_PRESETS.map((p) => {
                                const active = d.leadDays === p;
                                return (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() =>
                                      setDraft({ ...d, leadDays: p })
                                    }
                                    className={
                                      active
                                        ? "border-primary bg-primary/10 text-primary rounded-full border-2 px-3 py-1 text-xs font-medium"
                                        : "hover:bg-muted/50 rounded-full border px-3 py-1 text-xs"
                                    }
                                  >
                                    {p === 0
                                      ? "On expected date"
                                      : `${p} days before`}
                                  </button>
                                );
                              })}
                              <div className="flex items-center gap-1.5 rounded-full border px-2 py-0.5">
                                <span className="text-muted-foreground text-xs">
                                  Custom:
                                </span>
                                <Input
                                  type="number"
                                  min={0}
                                  value={d.leadDays}
                                  onChange={(e) =>
                                    setDraft({
                                      ...d,
                                      leadDays: Math.max(
                                        0,
                                        parseInt(e.target.value, 10) || 0,
                                      ),
                                    })
                                  }
                                  className="h-6 w-14 text-xs"
                                />
                                <span className="text-muted-foreground text-xs">
                                  d
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Channel */}
                          <div>
                            <label className="text-muted-foreground text-xs font-medium">
                              Channel
                            </label>
                            <div className="mt-1 flex gap-1.5">
                              {(["email", "sms", "both"] as const).map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() =>
                                    setDraft({ ...d, channel: c })
                                  }
                                  className={
                                    d.channel === c
                                      ? "border-primary bg-primary/10 text-primary flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-medium"
                                      : "hover:bg-muted/50 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs capitalize"
                                  }
                                >
                                  {c === "email" && <Mail className="size-3" />}
                                  {c === "sms" && (
                                    <MessageSquare className="size-3" />
                                  )}
                                  {c === "both" && (
                                    <>
                                      <Mail className="size-3" />
                                      <MessageSquare className="size-3" />
                                    </>
                                  )}
                                  {c === "both" ? "Email + SMS" : c}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Second reminder */}
                          <div className="rounded-lg border bg-muted/20 p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">
                                  Follow-up reminder
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  One automatic follow-up if there&apos;s no
                                  booking. After the second reminder, the
                                  system stops.
                                </p>
                              </div>
                              <Switch
                                checked={d.secondReminder.enabled}
                                onCheckedChange={(v) =>
                                  setDraft({
                                    ...d,
                                    secondReminder: {
                                      ...d.secondReminder,
                                      enabled: v,
                                    },
                                  })
                                }
                              />
                            </div>
                            {d.secondReminder.enabled && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-muted-foreground text-xs">
                                  Send
                                </span>
                                <Input
                                  type="number"
                                  min={1}
                                  value={d.secondReminder.delayDays}
                                  onChange={(e) =>
                                    setDraft({
                                      ...d,
                                      secondReminder: {
                                        ...d.secondReminder,
                                        delayDays: Math.max(
                                          1,
                                          parseInt(e.target.value, 10) || 1,
                                        ),
                                      },
                                    })
                                  }
                                  className="h-7 w-16 text-xs"
                                />
                                <span className="text-muted-foreground text-xs">
                                  days after the first reminder
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Template editor link */}
                          <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                            <div>
                              <p className="text-sm font-medium">
                                Message template
                              </p>
                              <p className="text-muted-foreground line-clamp-1 text-xs">
                                {d.template.subject}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openTemplateEditor(d.service)}
                            >
                              <Pencil className="mr-1 size-3.5" />
                              Edit template
                            </Button>
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </Button>
                            <Button size="sm" onClick={saveEdit}>
                              <Save className="mr-1 size-3.5" />
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                {getServiceLabel(def.service)}
                              </span>
                              <Badge
                                variant={
                                  def.remindersEnabled ? "default" : "secondary"
                                }
                              >
                                {def.remindersEnabled ? "On" : "Off"}
                              </Badge>
                              {channelIcon(def.channel)}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {formatFrequency(def.frequency)} ·{" "}
                              {def.leadDays === 0
                                ? "On expected date"
                                : `${def.leadDays}d before expected`}
                              {def.secondReminder.enabled
                                ? ` · Follow-up after ${def.secondReminder.delayDays}d`
                                : " · No follow-up"}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openTemplateEditor(def.service)}
                            >
                              <Pencil className="mr-1 size-3.5" />
                              Template
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setApplyToAllService(def.service);
                                setApplyToAllOpen(true);
                              }}
                            >
                              <Users className="mr-1 size-3.5" />
                              Apply to all
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(def)}
                            >
                              <Settings className="size-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* QUEUE */}
            <TabsContent value="queue" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {([30, 60, 90] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setQueueRange(r)}
                      className={
                        queueRange === r
                          ? "border-primary bg-primary/10 text-primary rounded-full border-2 px-3 py-1 text-xs font-medium"
                          : "hover:bg-muted/50 rounded-full border px-3 py-1 text-xs"
                      }
                    >
                      Next {r} days
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    Service:
                  </span>
                  <Select
                    value={queueServiceFilter}
                    onValueChange={(v) =>
                      setQueueServiceFilter(v as ServiceTypeKey | "all")
                    }
                  >
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All services</SelectItem>
                      {REBOOK_SERVICE_TYPES.map((s) => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredQueue.length === 0 ? (
                <div className="text-muted-foreground py-12 text-center">
                  <Bell className="mx-auto mb-3 size-12 opacity-50" />
                  <p className="font-medium">No reminders in this window</p>
                  <p className="mt-1 text-sm">
                    Reminders appear here as clients approach their expected
                    return date.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {groupedQueue.map((group) => (
                    <div key={group.key} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold">
                          {group.label}
                        </h4>
                        <span className="text-muted-foreground text-xs">
                          ({group.items.length})
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        {group.items.map((r) => (
                          <ReminderCard
                            key={r.id}
                            reminder={r}
                            onSendNow={() => sendNow(r)}
                            onDismiss={() => openDismiss(r)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* LAPSED */}
            <TabsContent value="lapsed" className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <p className="font-medium">Lapsed clients don&apos;t get auto reminders</p>
                <p className="mt-1">
                  After two reminders, we stop. Take manual action below or
                  build a marketing segment for a win-back campaign.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLapsedServiceFilter("all")}
                    className={
                      lapsedServiceFilter === "all"
                        ? "border-primary bg-primary/10 text-primary rounded-full border-2 px-3 py-1 text-xs font-medium"
                        : "hover:bg-muted/50 rounded-full border px-3 py-1 text-xs"
                    }
                  >
                    All services
                  </button>
                  {REBOOK_SERVICE_TYPES.map((s) => {
                    const count = lapsedClients.filter(
                      (l) => l.service === s.key,
                    ).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setLapsedServiceFilter(s.key)}
                        className={
                          lapsedServiceFilter === s.key
                            ? "border-primary bg-primary/10 text-primary rounded-full border-2 px-3 py-1 text-xs font-medium"
                            : "hover:bg-muted/50 rounded-full border px-3 py-1 text-xs"
                        }
                      >
                        {s.label} ({count})
                      </button>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/facility/dashboard/marketing?segment=lapsed_${lapsedServiceFilter === "all" ? "all" : lapsedServiceFilter}`}
                  >
                    <Sparkles className="mr-1 size-3.5" />
                    Create marketing segment
                    <ArrowRight className="ml-1 size-3.5" />
                  </Link>
                </Button>
              </div>

              {filteredLapsed.length === 0 ? (
                <div className="text-muted-foreground py-12 text-center">
                  <CheckCircle2 className="mx-auto mb-3 size-12 opacity-50" />
                  <p className="font-medium">No lapsed clients</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {filteredLapsed.map((l) => (
                    <LapsedClientCard
                      key={`${l.clientId}-${l.service}`}
                      lapsed={l}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* HISTORY */}
            <TabsContent value="history" className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="Sent" value={stats.sent} tone="default" />
                <StatCard
                  label="Rebooked"
                  value={stats.rebooked}
                  tone="success"
                />
                <StatCard
                  label="Dismissed"
                  value={stats.dismissed}
                  tone="warning"
                />
                <StatCard
                  label="Skipped"
                  value={stats.skipped}
                  tone="muted"
                />
              </div>

              {dismissedItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Recent dismissals</h4>
                  <div className="space-y-2">
                    {dismissedItems.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg border bg-muted/20 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9">
                              <AvatarFallback>
                                {initials(r.clientName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {r.clientName} · {r.petName}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {getServiceLabel(r.service)} · Dismissed by{" "}
                                {r.dismissedBy ?? "staff"}
                              </p>
                              {r.dismissNote && (
                                <p className="text-muted-foreground mt-1 text-xs italic">
                                  “{r.dismissNote}”
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-amber-700"
                          >
                            {r.dismissReason}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {skippedItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">
                      Auto-skipped by safety check
                    </h4>
                    <span className="text-muted-foreground text-xs">
                      ({skippedItems.length})
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Reminders the system held back automatically — opt-outs,
                    open incidents, refunds in progress, or a future booking
                    already on file.
                  </p>
                  <div className="space-y-2">
                    {skippedItems.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9">
                              <AvatarFallback className="bg-slate-200 text-slate-700">
                                {initials(r.clientName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium">
                                {r.clientName} · {r.petName}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {getServiceLabel(r.service)} · Skipped{" "}
                                {formatLongDate(r.skippedAt)}
                              </p>
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {(r.blockedReasons ?? []).map((reason) => (
                                  <span
                                    key={reason}
                                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700"
                                  >
                                    <ShieldOff className="size-2.5" />
                                    {BLOCK_REASON_LABELS[reason]}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-slate-300 bg-white text-slate-600"
                          >
                            Skipped
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sentItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Recently sent</h4>
                  <div className="space-y-2">
                    {sentItems.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarFallback>
                              {initials(r.clientName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {r.clientName} · {r.petName}
                              {r.reminderNumber === 2 && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 text-[10px]"
                                >
                                  Follow-up
                                </Badge>
                              )}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {getServiceLabel(r.service)} ·{" "}
                              {r.status === "rebooked"
                                ? `Rebooked ${formatLongDate(r.rebookedAt)}`
                                : `Sent ${formatLongDate(r.sentAt)}`}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            r.status === "rebooked"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 capitalize"
                              : "capitalize"
                          }
                        >
                          {r.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        </Card>
      </div>

      {/* Apply-to-all confirm */}
      <Dialog open={applyToAllOpen} onOpenChange={setApplyToAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Apply default to all existing clients?
            </DialogTitle>
            <DialogDescription className="pt-2">
              This will set the{" "}
              <span className="text-foreground font-medium">
                {applyToAllService
                  ? getServiceLabel(applyToAllService).toLowerCase()
                  : ""}
              </span>{" "}
              frequency to{" "}
              <span className="text-foreground font-medium">
                {applyToAllService
                  ? formatFrequency(
                      defaults.find((d) => d.service === applyToAllService)
                        ?.frequency ?? { value: 4, unit: "weeks" },
                    ).toLowerCase()
                  : ""}
              </span>{" "}
              for every existing client. Clients with a manual override will be
              preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyToAllOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleApplyToAll}
              className="gap-1.5"
            >
              <Calendar className="size-4" />
              Apply to all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template editor */}
      {editingDef && (
        <RebookTemplateEditorModal
          open={templateEditorOpen}
          onOpenChange={(o) => {
            setTemplateEditorOpen(o);
            if (!o) setTemplateEditingService(null);
          }}
          service={editingDef.service}
          channel={editingDef.channel}
          template={editingDef.template}
          onSave={saveTemplate}
        />
      )}

      {/* Dismiss reason */}
      {dismissTarget && (
        <DismissReminderDialog
          open={dismissOpen}
          onOpenChange={(o) => {
            setDismissOpen(o);
            if (!o) setDismissTarget(null);
          }}
          clientName={dismissTarget.clientName}
          petName={dismissTarget.petName}
          onConfirm={confirmDismiss}
        />
      )}
    </>
  );
}

// ----------------------------------------------------------------------------
// Subcomponents
// ----------------------------------------------------------------------------

interface ReminderCardProps {
  reminder: RebookReminder;
  onSendNow: () => void;
  onDismiss: () => void;
}

function ReminderCard({ reminder: r, onSendNow, onDismiss }: ReminderCardProps) {
  const isFollowUp = r.reminderNumber === 2;
  const blockedReasons = r.blockedReasons ?? [];
  const isBlocked = blockedReasons.length > 0;

  return (
    <div
      data-blocked={isBlocked ? "true" : undefined}
      className="group bg-card hover:border-primary/30 data-[blocked=true]:border-amber-200 data-[blocked=true]:bg-amber-50/30 relative rounded-xl border p-4 transition-all hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-11">
          <AvatarFallback className="bg-primary/10 text-primary">
            {initials(r.clientName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{r.clientName}</p>
            {isFollowUp && (
              <Badge
                variant="outline"
                className="border-blue-200 bg-blue-50 text-[10px] text-blue-700"
              >
                Follow-up
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground truncate text-xs">
            {r.petName} · {getServiceLabel(r.service)}
          </p>
          <div className="mt-2.5 flex items-center gap-1.5">
            {channelIcon(r.channel, "size-3")}
            <span className="text-muted-foreground text-[11px] capitalize">
              {r.channel === "both" ? "Email + SMS" : r.channel}
            </span>
          </div>
        </div>
      </div>

      {isBlocked && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-amber-800">
              Will auto-skip on send
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {blockedReasons.map((reason) => (
                <span
                  key={reason}
                  className="rounded-full border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                  title={BLOCK_REASON_LABELS[reason]}
                >
                  {BLOCK_REASON_SHORT[reason]}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Timeline pills */}
      <div className="bg-muted/40 mt-3 grid grid-cols-3 gap-2 rounded-lg p-2.5 text-center">
        <div>
          <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
            Last visit
          </p>
          <p className="mt-0.5 text-xs font-semibold">
            {formatDate(r.lastVisitDate)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
            Expected
          </p>
          <p className="mt-0.5 text-xs font-semibold">
            {formatDate(r.expectedReturnDate)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
            Sends
          </p>
          <p className="text-primary mt-0.5 text-xs font-semibold">
            {formatDate(r.scheduledSendDate)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onDismiss}
        >
          <Ban className="mr-1 size-3" />
          Dismiss
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={onSendNow}
          disabled={isBlocked}
          title={
            isBlocked
              ? "This reminder is blocked by a safety check and will not send."
              : undefined
          }
        >
          <Send className="mr-1 size-3" />
          Send now
        </Button>
      </div>
    </div>
  );
}

interface LapsedCardProps {
  lapsed: (typeof lapsedClients)[number];
}

function LapsedClientCard({ lapsed: l }: LapsedCardProps) {
  const severe = l.daysOverdue > 30;
  return (
    <div className="bg-card hover:border-primary/30 rounded-xl border p-4 transition-all hover:shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar className="size-11">
          <AvatarFallback
            className={
              severe
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
            }
          >
            {initials(l.clientName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{l.clientName}</p>
            <Badge
              variant="outline"
              className={
                severe
                  ? "border-red-200 bg-red-50 text-[10px] text-red-700"
                  : "border-amber-200 bg-amber-50 text-[10px] text-amber-700"
              }
            >
              {l.daysOverdue}d overdue
            </Badge>
          </div>
          <p className="text-muted-foreground truncate text-xs">
            {l.petName} · {getServiceLabel(l.service)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="size-7 p-0">
              <Settings className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                toast.success(`Composer opened for ${l.clientName}`)
              }
            >
              <MessageCircle className="mr-2 size-4" />
              Send manual message
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toast.success(
                  `Booking flow opened pre-filled for ${l.clientName}`,
                )
              }
            >
              <CalendarPlus className="mr-2 size-4" />
              Book appointment
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                toast.info(`${l.clientName} marked inactive`)
              }
            >
              <UserX className="mr-2 size-4" />
              Mark inactive
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toast.info(`Removed ${l.clientName} from list`)}
            >
              <UserMinus className="mr-2 size-4" />
              Dismiss from list
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="bg-muted/40 mt-3 grid grid-cols-3 gap-2 rounded-lg p-2.5 text-center">
        <div>
          <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
            Last visit
          </p>
          <p className="mt-0.5 text-xs font-semibold">
            {formatDate(l.lastVisitDate)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
            Expected
          </p>
          <p className="mt-0.5 text-xs font-semibold">
            {formatFrequency(l.expectedFrequency)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
            Reminders
          </p>
          <p className="mt-0.5 text-xs font-semibold">
            {l.remindersSent} sent
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => toast.success(`Composer opened for ${l.clientName}`)}
        >
          <MessageCircle className="mr-1 size-3" />
          Message
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={() =>
            toast.success(`Booking flow opened for ${l.clientName}`)
          }
        >
          <CalendarPlus className="mr-1 size-3" />
          Book now
        </Button>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  tone: "default" | "success" | "warning" | "muted";
}

function StatCard({ label, value, tone }: StatCardProps) {
  const valueClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "muted"
          ? "text-muted-foreground"
          : "";
  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}
