"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Pencil,
  RefreshCw,
  Save,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RebookTemplateEditorModal } from "@/components/communications/RebookTemplateEditorModal";
import { RebookAnalyticsRow } from "@/components/communications/RebookAnalyticsRow";
import { HistoryTab } from "@/components/communications/rebook/HistoryTab";
import { LapsedTab } from "@/components/communications/rebook/LapsedTab";
import { QueueTab } from "@/components/communications/rebook/QueueTab";
import {
  defaultServiceFrequencies,
  formatFrequency,
  getServiceLabel,
  REMINDER_LEAD_PRESETS,
  type DefaultServiceFrequency,
  type FrequencyUnit,
  type RebookMessageTemplate,
  type ReminderChannel,
  type ServiceTypeKey,
} from "@/data/rebook-reminders";
import {
  useFacilitySettings,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import { rebookQueries } from "@/lib/api/rebook";
import {
  NO_REBOOK_CONFIG,
  fromDays,
  toDays,
  type RebookConfig,
} from "@/lib/settings/rebook";

/** The channel a service writes on, as an icon. Still used by the Defaults tab. */
const channelIcon = (c: ReminderChannel, size = "size-3.5") => {
  if (c === "email") return <Mail className={size} />;
  if (c === "sms") return <MessageSquare className={size} />;
  return (
    <span className="flex items-center gap-0.5">
      <Mail className={size} />
      <MessageSquare className={size} />
    </span>
  );
};

function buildDefaults(
  config: RebookConfig,
  templateDrafts: Record<string, RebookMessageTemplate>,
): DefaultServiceFrequency[] {
  const services = [
    ...new Set([
      ...Object.keys(NO_REBOOK_CONFIG.services),
      ...Object.keys(config.services),
    ]),
  ];

  return services.map((service) => {
    const rule = config.services[service] ?? NO_REBOOK_CONFIG.services[service];
    const shipped = defaultServiceFrequencies.find(
      (d) => d.service === service,
    );
    return {
      service,
      frequency: fromDays(rule?.frequencyDays ?? 28),
      remindersEnabled: rule?.remindersEnabled ?? false,
      leadDays: rule?.leadDays ?? 7,
      channel: rule?.channel ?? "email",
      secondReminder: shipped?.secondReminder ?? {
        enabled: false,
        delayDays: 7,
      },
      template: templateDrafts[service] ??
        shipped?.template ?? { subject: "", body: "" },
    };
  });
}

export function RebookRemindersCard() {
  // The tab's own count, from the same query the tab reads. React Query
  // dedupes it, so this is not a second request — and it cannot report a
  // different number from the list underneath it.
  const lapsedCount =
    useQuery({ ...rebookQueries.lapsed(), notifyOnChangeProps: ["data"] }).data
      ?.clients.length ?? null;

  // ── The frequencies are the FACILITY's now, not a fixture ─────────────────
  //
  // Derived from `facility_settings.rebook_config` rather than held in state.
  // Held in state it could only ever be seeded once, and seeding it from an
  // async query means writing state in an effect — which this codebase bans,
  // and which would leave the screen briefly showing one facility's numbers as
  // another's.
  //
  // `template` is the one field still coming from the fixture, and it is
  // display-only: the REAL rebook wording lives in `message_templates` as
  // `rebook_reminder` / `rebook_reminder_sms`, editable on the Templates tab,
  // and that is what actually gets sent.
  const { settings } = useFacilitySettings();
  const saveSetting = useSaveFacilitySetting();
  const [templateDrafts, setTemplateDrafts] = useState<
    Record<string, RebookMessageTemplate>
  >({});

  const rebookConfig = settings.rebook_config.value;
  const defaults = useMemo<DefaultServiceFrequency[]>(
    () => buildDefaults(rebookConfig, templateDrafts),
    [rebookConfig, templateDrafts],
  );
  const [editingService, setEditingService] = useState<ServiceTypeKey | null>(
    null,
  );
  const [draft, setDraft] = useState<DefaultServiceFrequency | null>(null);

  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [templateEditingService, setTemplateEditingService] =
    useState<ServiceTypeKey | null>(null);

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

    // The whole domain is written, not one service: `facility_settings` stores
    // one jsonb per domain, so a partial write would drop every other service.
    const next: RebookConfig = {
      services: {
        ...rebookConfig.services,
        [editingService]: {
          frequencyDays: toDays(draft.frequency.value, draft.frequency.unit),
          remindersEnabled: draft.remindersEnabled,
          leadDays: draft.leadDays,
          channel: draft.channel,
          // Not on this form. Carried through rather than defaulted, so
          // editing the frequency cannot quietly reset how overdue somebody
          // has to be before the Lapsed tab shows them.
          lapsedAfterDays:
            rebookConfig.services[editingService]?.lapsedAfterDays ??
            NO_REBOOK_CONFIG.services[editingService]?.lapsedAfterDays ??
            14,
        },
      },
    };

    saveSetting.mutate(
      { domain: "rebook_config", value: next },
      {
        // Names what was stored. The old message said "settings saved" while
        // saving nothing at all, and the per-service message TEMPLATE is still
        // not part of this — so the wording says frequency, because that is
        // what is true.
        onSuccess: () => {
          toast.success(
            `${getServiceLabel(editingService)} frequency saved for this facility.`,
          );
          cancelEdit();
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  const openTemplateEditor = (service: ServiceTypeKey) => {
    setTemplateEditingService(service);
    setTemplateEditorOpen(true);
  };

  const saveTemplate = (template: RebookMessageTemplate) => {
    if (!templateEditingService) return;
    setTemplateDrafts((prev) => ({
      ...prev,
      [templateEditingService]: template,
    }));
    if (draft && draft.service === templateEditingService) {
      setDraft({ ...draft, template });
    }
  };

  const editingDef = templateEditingService
    ? defaults.find((d) => d.service === templateEditingService)
    : null;

  return (
    <>
      <div className="space-y-4">
        <RebookAnalyticsRow />

        <Card className="border-violet-100 bg-linear-to-br from-violet-50/40 via-white to-white">
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
                  automatically when the client already has a future booking or
                  any safety check fires.
                </p>
              </div>
              <Badge
                variant="outline"
                className="gap-1 border-violet-200 bg-violet-50 text-violet-700"
              >
                <Bell className="size-3" />
                {lapsedCount === null ? "" : `${lapsedCount} lapsed`}
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
                  Queue
                </TabsTrigger>
                <TabsTrigger value="lapsed">
                  <AlertTriangle className="mr-2 size-4" />
                  Lapsed{lapsedCount === null ? "" : ` (${lapsedCount})`}
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
                        className="hover:bg-muted/30 rounded-lg border p-4 transition-colors"
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
                                    <SelectItem value="months">
                                      Months
                                    </SelectItem>
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
                                {(["email", "sms", "both"] as const).map(
                                  (c) => (
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
                                      {c === "email" && (
                                        <Mail className="size-3" />
                                      )}
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
                                  ),
                                )}
                              </div>
                            </div>

                            {/* Second reminder */}
                            <div className="bg-muted/20 rounded-lg border p-3">
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
                            <div className="bg-muted/20 flex items-center justify-between rounded-lg border p-3">
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
                                    def.remindersEnabled
                                      ? "default"
                                      : "secondary"
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
              {/* QUEUE — real, a projection over bookings. See rebook/QueueTab.tsx. */}
              <TabsContent value="queue" className="space-y-4">
                <QueueTab />
              </TabsContent>

              {/* LAPSED — real, from Postgres. See rebook/LapsedTab.tsx. */}
              <TabsContent value="lapsed" className="space-y-4">
                <LapsedTab />
              </TabsContent>

              {/* HISTORY — the outbox, read back. See rebook/HistoryTab.tsx. */}
              <TabsContent value="history" className="space-y-4">
                <HistoryTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

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
    </>
  );
}
