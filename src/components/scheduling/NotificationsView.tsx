"use client";

import { useState } from "react";
import {
  Bell,
  BellOff,
  Building2,
  CheckCircle2,
  Mail,
  MessageSquare,
  MessageSquareMore,
  Send,
  Smartphone,
  User,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  broadcastMessages as initialBroadcasts,
  departments,
  notificationPreferences as initialPrefs,
  scheduleEmployees,
} from "@/data/scheduling";
import type {
  BroadcastAudience,
  BroadcastMessage,
  NotificationChannels,
  NotificationEvent,
  NotificationPreferences,
  NotificationRule,
} from "@/types/scheduling";

const EVENT_LABELS: Record<NotificationEvent, { label: string; description: string }> = {
  schedule_published: {
    label: "Schedule published",
    description: "Sent when a new schedule period goes live.",
  },
  shift_changed: {
    label: "Shift changed",
    description: "Time, role, or location of an existing shift changed.",
  },
  shift_assigned: {
    label: "Shift assigned",
    description: "An open shift was assigned to a specific employee.",
  },
  shift_cancelled: {
    label: "Shift cancelled",
    description: "A scheduled shift has been removed.",
  },
  shift_reminder: {
    label: "Shift reminder",
    description: "Lead-time reminder before an upcoming shift.",
  },
  swap_requested: {
    label: "Swap requested",
    description: "A staff member has asked to swap a shift.",
  },
  swap_decision: {
    label: "Swap decision",
    description: "A swap request was approved or denied.",
  },
  timeoff_decision: {
    label: "Time-off decision",
    description: "A time-off request was approved or denied.",
  },
  availability_decision: {
    label: "Availability change decision",
    description: "An availability change request was reviewed.",
  },
  open_shift_posted: {
    label: "Open shift posted",
    description: "An unfilled shift was posted for pickup.",
  },
  open_shift_claimed: {
    label: "Open shift claimed",
    description: "Someone claimed a posted open shift.",
  },
  attendance_late: {
    label: "Attendance · late",
    description: "An employee clocked in later than the grace period.",
  },
  attendance_no_show: {
    label: "Attendance · no-show",
    description: "An employee did not clock in for a scheduled shift.",
  },
};

const audienceLabels: Record<BroadcastAudience, { label: string; icon: typeof User }> = {
  all_staff: { label: "All staff", icon: Users },
  department: { label: "Department", icon: Building2 },
  location: { label: "Location", icon: Building2 },
  individual: { label: "Individual", icon: User },
};

export function NotificationsView() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(initialPrefs);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>(initialBroadcasts);

  // Compose-broadcast form
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<BroadcastAudience>("all_staff");
  const [audienceTargetId, setAudienceTargetId] = useState<string>("");
  const [channels, setChannels] = useState<NotificationChannels>({
    inApp: true,
    email: true,
    sms: false,
    push: true,
  });

  const updateRule = (event: NotificationEvent, patch: Partial<NotificationRule>) => {
    setPrefs((p) => ({
      ...p,
      rules: p.rules.map((r) => (r.event === event ? { ...r, ...patch } : r)),
    }));
  };

  const updateRuleChannel = (
    event: NotificationEvent,
    channel: keyof NotificationChannels,
    enabled: boolean,
  ) => {
    setPrefs((p) => ({
      ...p,
      rules: p.rules.map((r) =>
        r.event === event
          ? { ...r, channels: { ...r.channels, [channel]: enabled } }
          : r,
      ),
    }));
  };

  const handleSavePrefs = () => {
    setPrefs((p) => ({
      ...p,
      updatedAt: new Date().toISOString().split("T")[0],
    }));
    toast.success("Notification preferences saved");
  };

  const recipientCountFor = (
    aud: BroadcastAudience,
    targetId?: string,
  ): number => {
    if (aud === "all_staff") return scheduleEmployees.length;
    if (aud === "department" && targetId) {
      return scheduleEmployees.filter((e) => e.departmentIds.includes(targetId))
        .length;
    }
    if (aud === "location" && targetId) {
      // For mock — all employees in matching department
      return scheduleEmployees.filter((e) => e.departmentIds.includes(targetId))
        .length;
    }
    if (aud === "individual" && targetId) return 1;
    return 0;
  };

  const handleSendBroadcast = () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    if (audience !== "all_staff" && !audienceTargetId) {
      toast.error("Pick a target audience");
      return;
    }
    const newMessage: BroadcastMessage = {
      id: `bc-${Date.now()}`,
      subject,
      body,
      audience,
      audienceTargetId: audience === "all_staff" ? undefined : audienceTargetId,
      channels,
      sentBy: "emp-1",
      sentByName: "Sarah Johnson",
      sentAt: new Date().toISOString(),
      recipientCount: recipientCountFor(audience, audienceTargetId),
    };
    setBroadcasts((prev) => [newMessage, ...prev]);
    toast.success(
      `Sent to ${newMessage.recipientCount} recipient${newMessage.recipientCount === 1 ? "" : "s"}`,
    );
    setSubject("");
    setBody("");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground text-sm">
            Configure automatic notifications and send broadcasts to the team.
          </p>
        </div>
      </div>

      <Tabs defaultValue="preferences">
        <TabsList>
          <TabsTrigger value="preferences">
            <Bell className="mr-1 size-3.5" /> Preferences
          </TabsTrigger>
          <TabsTrigger value="broadcast">
            <Send className="mr-1 size-3.5" /> Broadcast
          </TabsTrigger>
          <TabsTrigger value="history">
            <MessageSquareMore className="mr-1 size-3.5" /> History
          </TabsTrigger>
        </TabsList>

        {/* ── Preferences ────────────────────────────────────────────────── */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Quiet hours</CardTitle>
                <Button onClick={handleSavePrefs} size="sm">
                  Save preferences
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Push and SMS notifications are suppressed during these hours
                (in-app and email still arrive).
              </p>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Label className="text-xs">From</Label>
              <Input
                type="time"
                value={prefs.quietHoursStart ?? ""}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, quietHoursStart: e.target.value }))
                }
                className="w-32"
              />
              <Label className="text-xs">to</Label>
              <Input
                type="time"
                value={prefs.quietHoursEnd ?? ""}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, quietHoursEnd: e.target.value }))
                }
                className="w-32"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event triggers</CardTitle>
              <p className="text-muted-foreground text-xs">
                Choose which events fire notifications, who receives them, and
                via which channels.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {prefs.rules.map((rule) => {
                const cfg = EVENT_LABELS[rule.event];
                return (
                  <div
                    key={rule.event}
                    className="grid grid-cols-1 items-start gap-3 rounded-md border p-3 lg:grid-cols-[1fr_auto_auto]"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          updateRule(rule.event, { enabled: !rule.enabled })
                        }
                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded ${
                          rule.enabled
                            ? "bg-emerald-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {rule.enabled ? (
                          <Bell className="size-3" />
                        ) : (
                          <BellOff className="size-3" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{cfg.label}</div>
                        <div className="text-muted-foreground text-xs">
                          {cfg.description}
                        </div>
                        {rule.event === "shift_reminder" && rule.enabled && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <Label className="text-[11px] text-muted-foreground">
                              Lead time
                            </Label>
                            <Input
                              type="number"
                              min={5}
                              max={1440}
                              step={5}
                              value={rule.leadTimeMinutes ?? 60}
                              onChange={(e) =>
                                updateRule(rule.event, {
                                  leadTimeMinutes: parseInt(e.target.value) || 60,
                                })
                              }
                              className="h-6 w-20 text-xs"
                            />
                            <span className="text-[11px] text-muted-foreground">
                              min before shift
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Select
                      value={rule.audience}
                      onValueChange={(v) =>
                        updateRule(rule.event, {
                          audience: v as NotificationRule["audience"],
                        })
                      }
                      disabled={!rule.enabled}
                    >
                      <SelectTrigger className="h-8 w-[150px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="involved">Involved staff</SelectItem>
                        <SelectItem value="managers">Managers only</SelectItem>
                        <SelectItem value="all">Everyone</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1">
                      <ChannelToggle
                        active={rule.channels.inApp}
                        disabled={!rule.enabled}
                        onClick={() =>
                          updateRuleChannel(rule.event, "inApp", !rule.channels.inApp)
                        }
                        icon={Bell}
                        label="In-app"
                      />
                      <ChannelToggle
                        active={rule.channels.email}
                        disabled={!rule.enabled}
                        onClick={() =>
                          updateRuleChannel(rule.event, "email", !rule.channels.email)
                        }
                        icon={Mail}
                        label="Email"
                      />
                      <ChannelToggle
                        active={rule.channels.sms}
                        disabled={!rule.enabled}
                        onClick={() =>
                          updateRuleChannel(rule.event, "sms", !rule.channels.sms)
                        }
                        icon={MessageSquare}
                        label="SMS"
                      />
                      <ChannelToggle
                        active={rule.channels.push}
                        disabled={!rule.enabled}
                        onClick={() =>
                          updateRuleChannel(rule.event, "push", !rule.channels.push)
                        }
                        icon={Smartphone}
                        label="Push"
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Broadcast ──────────────────────────────────────────────────── */}
        <TabsContent value="broadcast">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Send a message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Audience</Label>
                  <Select
                    value={audience}
                    onValueChange={(v) => {
                      setAudience(v as BroadcastAudience);
                      setAudienceTargetId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_staff">All staff</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                      <SelectItem value="individual">Individual employee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {audience === "department" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Department</Label>
                    <Select
                      value={audienceTargetId}
                      onValueChange={setAudienceTargetId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {audience === "individual" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Employee</Label>
                    <Select
                      value={audienceTargetId}
                      onValueChange={setAudienceTargetId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pick an employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {scheduleEmployees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Snowstorm tomorrow — please confirm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Message</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder="Type your message here..."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Send via</Label>
                <div className="flex flex-wrap gap-2">
                  <ChannelToggle
                    active={channels.inApp}
                    onClick={() =>
                      setChannels((c) => ({ ...c, inApp: !c.inApp }))
                    }
                    icon={Bell}
                    label="In-app"
                  />
                  <ChannelToggle
                    active={channels.email}
                    onClick={() =>
                      setChannels((c) => ({ ...c, email: !c.email }))
                    }
                    icon={Mail}
                    label="Email"
                  />
                  <ChannelToggle
                    active={channels.sms}
                    onClick={() =>
                      setChannels((c) => ({ ...c, sms: !c.sms }))
                    }
                    icon={MessageSquare}
                    label="SMS"
                  />
                  <ChannelToggle
                    active={channels.push}
                    onClick={() =>
                      setChannels((c) => ({ ...c, push: !c.push }))
                    }
                    icon={Smartphone}
                    label="Push"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <p className="text-muted-foreground text-xs">
                  Will reach{" "}
                  <span className="font-medium text-foreground">
                    {recipientCountFor(audience, audienceTargetId)}
                  </span>{" "}
                  recipient
                  {recipientCountFor(audience, audienceTargetId) === 1 ? "" : "s"}
                </p>
                <Button onClick={handleSendBroadcast}>
                  <Send className="mr-1.5 size-3.5" />
                  Send broadcast
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── History ───────────────────────────────────────────────────── */}
        <TabsContent value="history">
          <div className="space-y-3">
            {broadcasts.map((m) => {
              const cfg = audienceLabels[m.audience];
              const Icon = cfg.icon;
              const target =
                m.audience === "department"
                  ? departments.find((d) => d.id === m.audienceTargetId)?.name
                  : m.audience === "individual"
                    ? scheduleEmployees.find((e) => e.id === m.audienceTargetId)?.name
                    : "";

              return (
                <Card key={m.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarFallback className="text-[10px]">
                            {m.sentByName
                              .split(" ")
                              .map((s) => s[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="leading-tight">
                          <p className="text-sm font-medium">{m.subject}</p>
                          <p className="text-muted-foreground text-[11px]">
                            {m.sentByName} ·{" "}
                            {new Date(m.sentAt).toLocaleString("en-CA", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          <Icon className="mr-1 size-3" />
                          {cfg.label}
                          {target ? ` · ${target}` : ""}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {m.recipientCount}{" "}
                          recipient{m.recipientCount === 1 ? "" : "s"}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{m.body}</p>
                    <div className="flex items-center gap-1 border-t pt-2">
                      {m.channels.inApp && (
                        <Badge variant="outline" className="text-[10px]">
                          <Bell className="mr-1 size-3" /> In-app
                        </Badge>
                      )}
                      {m.channels.email && (
                        <Badge variant="outline" className="text-[10px]">
                          <Mail className="mr-1 size-3" /> Email
                        </Badge>
                      )}
                      {m.channels.sms && (
                        <Badge variant="outline" className="text-[10px]">
                          <MessageSquare className="mr-1 size-3" /> SMS
                        </Badge>
                      )}
                      {m.channels.push && (
                        <Badge variant="outline" className="text-[10px]">
                          <Smartphone className="mr-1 size-3" /> Push
                        </Badge>
                      )}
                      <CheckCircle2 className="ml-auto size-3.5 text-emerald-500" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {broadcasts.length === 0 && (
              <div className="text-muted-foreground flex flex-col items-center py-12 text-center">
                <MessageSquareMore className="mb-3 size-10 opacity-30" />
                <p className="font-medium">No broadcasts yet</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChannelToggle({
  active,
  disabled,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: typeof Bell;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors ${
        disabled
          ? "border-dashed bg-muted/30 text-muted-foreground/50"
          : active
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
            : "border-border bg-background text-muted-foreground hover:bg-muted"
      }`}
    >
      <Icon className="size-3" />
      {label}
    </button>
  );
}
