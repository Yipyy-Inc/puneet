"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { YipyyGoConfig, ReminderRule, DeliveryChannel } from "@/data/yipyygo-config";
import { DELIVERY_CHANNEL_LABELS } from "@/data/yipyygo-config";

interface TimingRemindersSectionProps {
  config: YipyyGoConfig;
  onConfigChange: (updates: Partial<YipyyGoConfig>) => void;
}

export function TimingRemindersSection({
  config,
  onConfigChange,
}: TimingRemindersSectionProps) {
  const handleInitialSendTimeChange = (value: string) => {
    const hours = parseInt(value, 10);
    if (!isNaN(hours) && hours > 0) {
      onConfigChange({
        timing: { ...config.timing, initialSendTime: hours },
      });
    }
  };

  const handleDeadlineChange = (value: string) => {
    const hours = parseInt(value, 10);
    if (!isNaN(hours) && hours > 0) {
      onConfigChange({
        timing: { ...config.timing, deadline: hours },
      });
    }
  };

  const handleDeliveryChannelToggle = (channel: DeliveryChannel, enabled: boolean) => {
    const channels = enabled
      ? [...config.timing.deliveryChannels, channel]
      : config.timing.deliveryChannels.filter((c) => c !== channel);
    onConfigChange({
      timing: { ...config.timing, deliveryChannels: channels },
    });
  };

  const handleAddReminder = () => {
    const newReminder: ReminderRule = {
      id: `reminder-${Date.now()}`,
      sendTime: 24,
      channel: "email",
    };
    onConfigChange({
      timing: {
        ...config.timing,
        reminderRules: [...config.timing.reminderRules, newReminder],
      },
    });
  };

  const handleReminderChange = (id: string, updates: Partial<ReminderRule>) => {
    const updated = config.timing.reminderRules.map((r) =>
      r.id === id ? { ...r, ...updates } : r
    );
    onConfigChange({
      timing: { ...config.timing, reminderRules: updated },
    });
  };

  const handleRemoveReminder = (id: string) => {
    const updated = config.timing.reminderRules.filter((r) => r.id !== id);
    onConfigChange({
      timing: { ...config.timing, reminderRules: updated },
    });
  };

  return (
    <div className="space-y-4">
      {/* Timing Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Send Timing & Deadline
          </CardTitle>
          <CardDescription>
            Configure when forms are sent and when they must be completed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initial-send-time">
                Initial Send Time (hours before check-in)
              </Label>
              <Input
                id="initial-send-time"
                type="number"
                min="1"
                value={config.timing.initialSendTime}
                onChange={(e) => handleInitialSendTimeChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                When to send the initial form request
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">
                Deadline (hours before check-in)
              </Label>
              <Input
                id="deadline"
                type="number"
                min="1"
                value={config.timing.deadline}
                onChange={(e) => handleDeadlineChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Must be completed by this time
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Channels</CardTitle>
          <CardDescription>
            Select which channels to use for sending forms and reminders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(["email", "sms", "push"] as DeliveryChannel[]).map((channel) => {
            const isEnabled = config.timing.deliveryChannels.includes(channel);
            return (
              <div key={channel} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`channel-${channel}`}
                    checked={isEnabled}
                    onCheckedChange={(checked) =>
                      handleDeliveryChannelToggle(channel, checked === true)
                    }
                  />
                  <Label htmlFor={`channel-${channel}`} className="cursor-pointer font-medium">
                    {DELIVERY_CHANNEL_LABELS[channel]}
                  </Label>
                </div>
                {isEnabled && (
                  <Badge variant="secondary">Enabled</Badge>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Reminder Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reminder Rules</CardTitle>
              <CardDescription>
                Configure automatic reminders if forms are not submitted.
              </CardDescription>
            </div>
            <Button onClick={handleAddReminder} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Reminder
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.timing.reminderRules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No reminder rules configured. Add one to send automatic reminders.
            </p>
          ) : (
            config.timing.reminderRules.map((reminder, index) => (
              <div key={reminder.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Reminder {index + 1}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveReminder(reminder.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Send Time (hours before check-in)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={reminder.sendTime}
                      onChange={(e) =>
                        handleReminderChange(reminder.id, {
                          sendTime: parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Channel</Label>
                    <Select
                      value={reminder.channel}
                      onValueChange={(value: DeliveryChannel) =>
                        handleReminderChange(reminder.id, { channel: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {config.timing.deliveryChannels.map((channel) => (
                          <SelectItem key={channel} value={channel}>
                            {DELIVERY_CHANNEL_LABELS[channel]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {index < config.timing.reminderRules.length - 1 && (
                  <Separator className="mt-3" />
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
