"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell,
  CalendarClock,
  CheckCircle,
  Eye,
  Pencil,
  Save,
} from "lucide-react";
import { toast } from "sonner";

// Sample data used to render the merge-tag preview (same idea as the Report
// Card Builder's preview mode).
const SAMPLE_MERGE_DATA: Record<string, string> = {
  customer_name: "Sarah Johnson",
  pet_name: "Bella",
  service_name: "Full Groom",
  estimate_total: "$85.00",
  estimate_link: "https://yipyy.co/e/AB12CD",
};

/** Replace {{tag}} / {tag} merge tags with sample data for the preview. */
function renderMergePreview(message: string): string {
  return message
    .replace(
      /\{\{\s*(\w+)\s*\}\}/g,
      (match, key) => SAMPLE_MERGE_DATA[key] ?? match,
    )
    .replace(
      /\{\s*(\w+)\s*\}/g,
      (match, key) => SAMPLE_MERGE_DATA[key] ?? match,
    );
}

type FollowUpChannel = "email" | "sms" | "both";
type StopCondition = "accepted" | "expires" | "books_different";
type ExpiryAction = "declined" | "archive" | "none";

interface EstimateExpiryConfig {
  /** Days after which an estimate expires and can no longer be booked. */
  days: number;
  /** What happens to the estimate when it expires. */
  action: ExpiryAction;
}

const EXPIRY_ACTION_OPTIONS: { value: ExpiryAction; label: string }[] = [
  { value: "declined", label: "Mark as declined" },
  { value: "archive", label: "Archive" },
  { value: "none", label: "No action" },
];

interface ReminderRule {
  enabled: boolean;
  delayDays: number;
  channel: FollowUpChannel;
  message: string;
  /** Send at most this many follow-ups for this rule, then stop. */
  maxFollowUps: number;
  /** Condition that halts follow-ups early, before the max is reached. */
  stopCondition: StopCondition;
}

interface FollowUpConfig {
  enabled: boolean;
  expiry: EstimateExpiryConfig;
  notViewedReminder: ReminderRule;
  viewedNotBooked: ReminderRule;
}

const STOP_CONDITION_OPTIONS: { value: StopCondition; label: string }[] = [
  { value: "accepted", label: "Estimate is accepted" },
  { value: "expires", label: "Estimate expires" },
  { value: "books_different", label: "Customer books a different service" },
];

const DEFAULT_CONFIG: FollowUpConfig = {
  enabled: true,
  expiry: {
    days: 30,
    action: "declined",
  },
  notViewedReminder: {
    enabled: true,
    delayDays: 3,
    channel: "email",
    message:
      "Hi {{customer_name}}, we sent you an estimate for {{service_name}} a few days ago. Just wanted to make sure you received it! Let us know if you have any questions.",
    maxFollowUps: 2,
    stopCondition: "accepted",
  },
  viewedNotBooked: {
    enabled: true,
    delayDays: 2,
    channel: "email",
    message:
      "Hi {{customer_name}}, we noticed you checked out the estimate for {{pet_name}}. We'd love to help you get booked! Is there anything we can answer or adjust?",
    maxFollowUps: 1,
    stopCondition: "accepted",
  },
};

export function EstimateFollowUpSettings() {
  const [config, setConfig] = useState<FollowUpConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    try {
      const stored = localStorage.getItem("estimate-followup-config");
      if (stored) {
        // Merge with defaults so configs saved before max/stop fields existed
        // still get sensible values.
        const parsed = JSON.parse(stored) as Partial<FollowUpConfig>;
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          expiry: { ...DEFAULT_CONFIG.expiry, ...parsed.expiry },
          notViewedReminder: {
            ...DEFAULT_CONFIG.notViewedReminder,
            ...parsed.notViewedReminder,
          },
          viewedNotBooked: {
            ...DEFAULT_CONFIG.viewedNotBooked,
            ...parsed.viewedNotBooked,
          },
        };
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_CONFIG;
  });

  const [previewNotViewed, setPreviewNotViewed] = useState(false);
  const [previewViewed, setPreviewViewed] = useState(false);

  const handleSave = () => {
    localStorage.setItem("estimate-followup-config", JSON.stringify(config));
    toast.success("Follow-up settings saved");
  };

  return (
    <div className="space-y-6">
      {/* Estimate Expiry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4" />
            Estimate Expiry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Expires after</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={config.expiry.days}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      expiry: {
                        ...config.expiry,
                        days: Number(e.target.value),
                      },
                    })
                  }
                  className="h-8 w-20 text-sm"
                />
                <span className="text-muted-foreground text-xs">days</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Expired estimate action</Label>
              <Select
                value={config.expiry.action}
                onValueChange={(v) =>
                  setConfig({
                    ...config,
                    expiry: { ...config.expiry, action: v as ExpiryAction },
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_ACTION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Expired estimates can no longer be booked. Follow-up reminders stop
            automatically once an estimate expires.
          </p>
        </CardContent>
      </Card>

      {/* Auto Follow-Up Reminders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4" />
              Auto Follow-Up Reminders
            </CardTitle>
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => setConfig({ ...config, enabled: v })}
            />
          </div>
        </CardHeader>
        {config.enabled && (
          <CardContent className="space-y-6">
            {/* Reminder 1: Not viewed */}
            <div className="space-y-3 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="size-4 text-amber-500" />
                  <p className="text-sm font-semibold">Estimate Not Viewed</p>
                </div>
                <Switch
                  checked={config.notViewedReminder.enabled}
                  onCheckedChange={(v) =>
                    setConfig({
                      ...config,
                      notViewedReminder: {
                        ...config.notViewedReminder,
                        enabled: v,
                      },
                    })
                  }
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Send a reminder if the customer hasn&apos;t opened the estimate.
              </p>
              {config.notViewedReminder.enabled && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Send after</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={config.notViewedReminder.delayDays}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            notViewedReminder: {
                              ...config.notViewedReminder,
                              delayDays: Number(e.target.value),
                            },
                          })
                        }
                        className="h-8 w-20 text-sm"
                        min={1}
                        max={14}
                      />
                      <span className="text-muted-foreground text-xs">
                        days
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Channel</Label>
                    <Select
                      value={config.notViewedReminder.channel}
                      onValueChange={(v) =>
                        setConfig({
                          ...config,
                          notViewedReminder: {
                            ...config.notViewedReminder,
                            channel: v as "email" | "sms" | "both",
                          },
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Max follow-ups</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        Send up to
                      </span>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={config.notViewedReminder.maxFollowUps}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            notViewedReminder: {
                              ...config.notViewedReminder,
                              maxFollowUps: Number(e.target.value),
                            },
                          })
                        }
                        className="h-8 w-16 text-sm"
                      />
                      <span className="text-muted-foreground text-xs">
                        times, then stop
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Stop following up when</Label>
                    <Select
                      value={config.notViewedReminder.stopCondition}
                      onValueChange={(v) =>
                        setConfig({
                          ...config,
                          notViewedReminder: {
                            ...config.notViewedReminder,
                            stopCondition: v as StopCondition,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STOP_CONDITION_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Message template</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1.5 px-2 text-xs"
                        onClick={() => setPreviewNotViewed((v) => !v)}
                      >
                        {previewNotViewed ? (
                          <>
                            <Pencil className="size-3" />
                            Edit
                          </>
                        ) : (
                          <>
                            <Eye className="size-3" />
                            Preview rendered message
                          </>
                        )}
                      </Button>
                    </div>
                    {previewNotViewed ? (
                      <div className="bg-muted/30 text-foreground min-h-[76px] rounded-lg border p-3 text-xs whitespace-pre-line">
                        {renderMergePreview(config.notViewedReminder.message)}
                      </div>
                    ) : (
                      <Textarea
                        value={config.notViewedReminder.message}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            notViewedReminder: {
                              ...config.notViewedReminder,
                              message: e.target.value,
                            },
                          })
                        }
                        rows={3}
                        className="text-xs"
                      />
                    )}
                    <div className="flex flex-wrap gap-1">
                      {[
                        "{{customer_name}}",
                        "{{pet_name}}",
                        "{{service_name}}",
                        "{{estimate_total}}",
                      ].map((v) => (
                        <Badge
                          key={v}
                          variant="outline"
                          className="cursor-default text-[9px]"
                        >
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Reminder 2: Viewed but not booked */}
            <div className="space-y-3 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="size-4 text-blue-500" />
                  <p className="text-sm font-semibold">Viewed but Not Booked</p>
                </div>
                <Switch
                  checked={config.viewedNotBooked.enabled}
                  onCheckedChange={(v) =>
                    setConfig({
                      ...config,
                      viewedNotBooked: {
                        ...config.viewedNotBooked,
                        enabled: v,
                      },
                    })
                  }
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Send a follow-up if the customer viewed the estimate but
                didn&apos;t book.
              </p>
              {config.viewedNotBooked.enabled && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Send after viewing</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={config.viewedNotBooked.delayDays}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            viewedNotBooked: {
                              ...config.viewedNotBooked,
                              delayDays: Number(e.target.value),
                            },
                          })
                        }
                        className="h-8 w-20 text-sm"
                        min={1}
                        max={14}
                      />
                      <span className="text-muted-foreground text-xs">
                        days
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Channel</Label>
                    <Select
                      value={config.viewedNotBooked.channel}
                      onValueChange={(v) =>
                        setConfig({
                          ...config,
                          viewedNotBooked: {
                            ...config.viewedNotBooked,
                            channel: v as "email" | "sms" | "both",
                          },
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Max follow-ups</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        Send up to
                      </span>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={config.viewedNotBooked.maxFollowUps}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            viewedNotBooked: {
                              ...config.viewedNotBooked,
                              maxFollowUps: Number(e.target.value),
                            },
                          })
                        }
                        className="h-8 w-16 text-sm"
                      />
                      <span className="text-muted-foreground text-xs">
                        times, then stop
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Stop following up when</Label>
                    <Select
                      value={config.viewedNotBooked.stopCondition}
                      onValueChange={(v) =>
                        setConfig({
                          ...config,
                          viewedNotBooked: {
                            ...config.viewedNotBooked,
                            stopCondition: v as StopCondition,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STOP_CONDITION_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Message template</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1.5 px-2 text-xs"
                        onClick={() => setPreviewViewed((v) => !v)}
                      >
                        {previewViewed ? (
                          <>
                            <Pencil className="size-3" />
                            Edit
                          </>
                        ) : (
                          <>
                            <Eye className="size-3" />
                            Preview rendered message
                          </>
                        )}
                      </Button>
                    </div>
                    {previewViewed ? (
                      <div className="bg-muted/30 text-foreground min-h-[76px] rounded-lg border p-3 text-xs whitespace-pre-line">
                        {renderMergePreview(config.viewedNotBooked.message)}
                      </div>
                    ) : (
                      <Textarea
                        value={config.viewedNotBooked.message}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            viewedNotBooked: {
                              ...config.viewedNotBooked,
                              message: e.target.value,
                            },
                          })
                        }
                        rows={3}
                        className="text-xs"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <Button onClick={handleSave} className="w-full gap-2">
        <Save className="size-4" />
        Save Estimate Settings
      </Button>
    </div>
  );
}
