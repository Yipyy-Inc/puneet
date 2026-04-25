"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Megaphone,
  Plus,
  Smartphone,
  Mail,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Users,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { campaigns as defaultCampaigns } from "@/data/messaging";
import type { Campaign, CampaignChannel } from "@/types/messaging";

const AUDIENCE_LABELS: Record<string, string> = {
  all_active: "All Active Clients",
  inactive_6m: "Inactive 6+ Months",
  boarding_clients: "Boarding Clients",
  grooming_clients: "Grooming Clients",
  vaccine_expired: "Vaccine Expired",
  membership_holders: "Membership Holders",
  custom: "Custom List",
};

const AUDIENCE_COUNTS: Record<string, number> = {
  all_active: 284,
  inactive_6m: 112,
  boarding_clients: 143,
  grooming_clients: 187,
  vaccine_expired: 67,
  membership_holders: 89,
  custom: 0,
};

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600 border-slate-200", icon: AlertCircle },
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  sending: { label: "Sending", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Send },
  sent: { label: "Sent", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-600 border-red-200", icon: XCircle },
};

// ── Campaign Wizard ─────────────────────────────────────────────────

const VARIABLES = ["{ClientName}", "{PetName}", "{NextAppointment}", "{Balance}", "{BookingLink}"];

function CampaignWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [channel, setChannel] = useState<CampaignChannel>("sms");
  const [audience, setAudience] = useState("all_active");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">("now");

  const recipientCount = AUDIENCE_COUNTS[audience] ?? 0;
  const segments = message.length > 0 ? Math.ceil(message.length / 160) : 0;
  const smsCost = (recipientCount * segments * 0.05).toFixed(2);

  const canNext =
    (step === 1 && channel) ||
    (step === 2 && audience) ||
    (step === 3 && message.trim() && name.trim()) ||
    step === 4;

  const send = () => {
    toast.success(`Campaign "${name}" ${scheduleMode === "now" ? "sent" : "scheduled"}!`);
    onClose();
  };

  const STEPS = ["Channel", "Audience", "Compose", "Review & Send"];

  return (
    <div className="flex flex-col">
      {/* Step indicator */}
      <div className="flex items-center gap-0 border-b px-6 py-4">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-xs font-bold",
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-400",
                )}
              >
                {done ? <CheckCircle2 className="size-4" /> : n}
              </div>
              <span
                className={cn(
                  "ml-2 text-xs font-medium",
                  active ? "text-slate-800" : "text-slate-400",
                )}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <ChevronRight className="mx-3 size-4 shrink-0 text-slate-300" />
              )}
            </div>
          );
        })}
      </div>

      <div className="min-h-[320px] p-6">
        {/* Step 1: Channel */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Choose Channel</h3>
              <p className="mt-1 text-sm text-slate-500">Select how you want to reach your clients.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(["sms", "email"] as CampaignChannel[]).map((ch) => {
                const Icon = ch === "sms" ? Smartphone : Mail;
                const active = channel === ch;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(ch)}
                    className={cn(
                      "flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all",
                      active
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <Icon className={cn("size-8", active ? "text-blue-600" : "text-slate-400")} />
                    <span className={cn("font-semibold", active ? "text-blue-700" : "text-slate-600")}>
                      {ch === "sms" ? "SMS Campaign" : "Email Campaign"}
                    </span>
                    <span className="text-center text-xs text-slate-400">
                      {ch === "sms"
                        ? "Direct text messages, high open rates"
                        : "Rich content, attachments, branded templates"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Audience */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Choose Audience</h3>
              <p className="mt-1 text-sm text-slate-500">Filter which clients will receive this campaign.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(AUDIENCE_LABELS).map(([key, label]) => {
                const count = AUDIENCE_COUNTS[key] ?? 0;
                const active = audience === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAudience(key)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all",
                      active
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <span className={cn("text-sm font-medium", active ? "text-blue-700" : "text-slate-700")}>
                      {label}
                    </span>
                    <span className={cn("text-sm font-bold tabular-nums", active ? "text-blue-600" : "text-slate-400")}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            {recipientCount > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
                <Users className="size-4 shrink-0" />
                <strong>{recipientCount} recipients</strong> will receive this campaign
              </div>
            )}
          </div>
        )}

        {/* Step 3: Compose */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Compose Message</h3>
              <p className="mt-1 text-sm text-slate-500">Write your campaign message.</p>
            </div>
            <Input
              placeholder="Campaign name (internal)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-slate-200"
            />
            {channel === "email" && (
              <Input
                placeholder="Email subject line"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="border-slate-200"
              />
            )}
            <Textarea
              placeholder={
                channel === "sms"
                  ? "Type your SMS message..."
                  : "Type your email body..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] resize-none border-slate-200"
            />

            {/* Variables */}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-500">Insert variable:</p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMessage((m) => m + v)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-mono text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {channel === "sms" && message.length > 0 && (
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
                <Smartphone className="size-4 shrink-0 text-slate-400" />
                <span>
                  <strong>{message.length}</strong> chars ·{" "}
                  <strong>{segments}</strong> SMS segment{segments !== 1 ? "s" : ""} ·{" "}
                  <strong>{recipientCount} recipients</strong> · est. cost{" "}
                  <strong>${smsCost}</strong>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review & Send */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Review & Send</h3>
              <p className="mt-1 text-sm text-slate-500">Confirm your campaign details before sending.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {[
                { label: "Campaign", value: name },
                { label: "Channel", value: channel === "sms" ? "SMS" : "Email" },
                { label: "Audience", value: AUDIENCE_LABELS[audience] },
                { label: "Recipients", value: `${recipientCount} clients` },
                channel === "sms"
                  ? { label: "Est. Cost", value: `$${smsCost} (${segments} seg × ${recipientCount})` }
                  : null,
              ]
                .filter(Boolean)
                .map((row) => (
                  <div key={row!.label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-slate-500">{row!.label}</span>
                    <span className="text-sm font-semibold text-slate-800">{row!.value}</span>
                  </div>
                ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
                Message Preview
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{message}</p>
            </div>

            <div className="flex gap-3">
              {(["now", "schedule"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setScheduleMode(m)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-all",
                    scheduleMode === m
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300",
                  )}
                >
                  {m === "now" ? <Send className="size-4" /> : <Clock className="size-4" />}
                  {m === "now" ? "Send Now" : "Schedule"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-6 py-4">
        <Button
          variant="ghost"
          onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
          className="gap-1.5"
        >
          {step === 1 ? "Cancel" : <><ChevronLeft className="size-4" /> Back</>}
        </Button>
        <Button
          onClick={() => (step === 4 ? send() : setStep(step + 1))}
          disabled={!canNext}
          className="gap-1.5"
        >
          {step === 4 ? (
            scheduleMode === "now" ? (
              <><Send className="size-4" /> Send Campaign</>
            ) : (
              <><Clock className="size-4" /> Schedule</>
            )
          ) : (
            <>Next <ChevronRight className="size-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(defaultCampaigns);
  const [showWizard, setShowWizard] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return campaigns;
    return campaigns.filter((c) => c.status === statusFilter);
  }, [campaigns, statusFilter]);

  const stats = {
    total: campaigns.length,
    sent: campaigns.filter((c) => c.status === "sent").length,
    scheduled: campaigns.filter((c) => c.status === "scheduled").length,
    draft: campaigns.filter((c) => c.status === "draft").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Campaigns</h2>
          <p className="mt-1 text-sm text-slate-500">
            Send targeted SMS and email campaigns to your clients
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)} className="gap-2">
          <Plus className="size-4" />
          New Campaign
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Campaigns", value: stats.total, color: "text-slate-800" },
          { label: "Sent", value: stats.sent, color: "text-emerald-600" },
          { label: "Scheduled", value: stats.scheduled, color: "text-blue-600" },
          { label: "Drafts", value: stats.draft, color: "text-slate-500" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-5">
              <p className="text-sm text-slate-500">{kpi.label}</p>
              <p className={cn("mt-1 text-3xl font-bold", kpi.color)}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {["all", "draft", "scheduled", "sent", "cancelled"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-all capitalize",
              statusFilter === s
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200",
            )}
          >
            {s === "all" ? "All" : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Campaign list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-16 text-center">
            <Megaphone className="mx-auto mb-4 size-12 text-slate-200" />
            <p className="text-slate-400">No campaigns found</p>
          </div>
        ) : (
          filtered.map((campaign) => {
            const cfg = STATUS_CONFIG[campaign.status];
            const StatusIcon = cfg.icon;
            const ChannelIcon = campaign.channel === "sms" ? Smartphone : Mail;

            return (
              <Card key={campaign.id} className="transition-shadow hover:shadow-md">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-xl",
                          campaign.channel === "sms" ? "bg-blue-100" : "bg-violet-100",
                        )}
                      >
                        <ChannelIcon
                          className={cn(
                            "size-5",
                            campaign.channel === "sms" ? "text-blue-600" : "text-violet-600",
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-800">{campaign.name}</h3>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                              cfg.color,
                            )}
                          >
                            <StatusIcon className="size-3" />
                            {cfg.label}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-400">{campaign.message}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="size-3" />
                            {campaign.recipientCount} recipients
                          </span>
                          <span>·</span>
                          <span>{AUDIENCE_LABELS[campaign.audience]}</span>
                          {campaign.sentAt && (
                            <>
                              <span>·</span>
                              <span>
                                Sent {new Date(campaign.sentAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </>
                          )}
                          {campaign.scheduledAt && campaign.status === "scheduled" && (
                            <>
                              <span>·</span>
                              <span className="text-blue-600">
                                Scheduled {new Date(campaign.scheduledAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </>
                          )}
                          <span>·</span>
                          <span>by {campaign.createdBy}</span>
                        </div>
                      </div>
                    </div>

                    {/* Metrics */}
                    {campaign.status === "sent" && (
                      <div className="flex shrink-0 items-center gap-4 text-center">
                        {campaign.deliveryRate && (
                          <div>
                            <p className="text-xl font-bold text-slate-800">{campaign.deliveryRate}%</p>
                            <p className="text-[10px] text-slate-400">Delivery</p>
                          </div>
                        )}
                        {campaign.openRate && (
                          <div>
                            <p className="text-xl font-bold text-emerald-600">{campaign.openRate}%</p>
                            <p className="text-[10px] text-slate-400">Open Rate</p>
                          </div>
                        )}
                        {campaign.smsCost && (
                          <div>
                            <p className="text-xl font-bold text-slate-700">${campaign.smsCost}</p>
                            <p className="text-[10px] text-slate-400">Cost</p>
                          </div>
                        )}
                      </div>
                    )}

                    {campaign.status === "draft" && (
                      <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Eye className="size-3.5" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            setCampaigns((prev) =>
                              prev.map((c) =>
                                c.id === campaign.id ? { ...c, status: "sent" as const, sentAt: new Date().toISOString() } : c,
                              ),
                            );
                            toast.success(`Campaign "${campaign.name}" sent!`);
                          }}
                        >
                          <Send className="size-3.5" />
                          Send
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Wizard dialog */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-bold text-slate-900">New Campaign</h2>
            <p className="text-sm text-slate-500">Create a targeted SMS or email campaign</p>
          </div>
          <CampaignWizard onClose={() => setShowWizard(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
