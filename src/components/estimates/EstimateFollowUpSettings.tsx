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
import { Bell, CheckCircle, Eye, Save } from "lucide-react";
import { toast } from "sonner";

interface FollowUpConfig {
  enabled: boolean;
  notViewedReminder: {
    enabled: boolean;
    delayDays: number;
    channel: "email" | "sms" | "both";
    message: string;
  };
  viewedNotBooked: {
    enabled: boolean;
    delayDays: number;
    channel: "email" | "sms" | "both";
    message: string;
  };
}

const DEFAULT_CONFIG: FollowUpConfig = {
  enabled: true,
  notViewedReminder: {
    enabled: true,
    delayDays: 3,
    channel: "email",
    message:
      "Hi {{customer_name}}, we sent you an estimate for {{service_name}} a few days ago. Just wanted to make sure you received it! Let us know if you have any questions.",
  },
  viewedNotBooked: {
    enabled: true,
    delayDays: 2,
    channel: "email",
    message:
      "Hi {{customer_name}}, we noticed you checked out the estimate for {{pet_name}}. We'd love to help you get booked! Is there anything we can answer or adjust?",
  },
};

export function EstimateFollowUpSettings() {
  const [config, setConfig] = useState<FollowUpConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    try {
      const stored = localStorage.getItem("estimate-followup-config");
      if (stored) return JSON.parse(stored);
    } catch {
      /* ignore */
    }
    return DEFAULT_CONFIG;
  });

  const handleSave = () => {
    localStorage.setItem("estimate-followup-config", JSON.stringify(config));
    toast.success("Follow-up settings saved");
  };

  return (
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
                    <span className="text-muted-foreground text-xs">days</span>
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
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs">Message template</Label>
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
                    <span className="text-muted-foreground text-xs">days</span>
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
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs">Message template</Label>
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
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleSave} className="w-full gap-2">
            <Save className="size-4" />
            Save Follow-Up Settings
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
