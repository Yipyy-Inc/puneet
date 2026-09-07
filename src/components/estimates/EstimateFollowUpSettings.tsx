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
import { useSettingsText } from "@/lib/settings/use-settings-text";

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
type StopCondition = "accepted" | "declined" | "expires" | "books_different";
type ExpiryAction = "declined" | "archive" | "none";

interface EstimateExpiryConfig {
  /** Days after which an estimate expires and can no longer be booked. */
  days: number;
  /** What happens to the estimate when it expires. */
  action: ExpiryAction;
}

const EXPIRY_ACTION_OPTIONS: { value: ExpiryAction; labelKey: string }[] = [
  { value: "declined", labelKey: "actionDeclined" },
  { value: "archive", labelKey: "actionArchive" },
  { value: "none", labelKey: "actionNone" },
];

interface ReminderRule {
  enabled: boolean;
  delayDays: number;
  channel: FollowUpChannel;
  message: string;
  /** Shorter template used when the channel includes SMS. */
  smsMessage: string;
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

const STOP_CONDITION_OPTIONS: { value: StopCondition; labelKey: string }[] = [
  { value: "accepted", labelKey: "stopAccepted" },
  { value: "declined", labelKey: "stopDeclined" },
  { value: "expires", labelKey: "stopExpires" },
  { value: "books_different", labelKey: "stopBooksDifferent" },
];

// Merge tags — the {{...}} syntax matches what's used in the message templates.
const MERGE_TAGS = [
  "{{customer_name}}",
  "{{pet_name}}",
  "{{service_name}}",
  "{{estimate_total}}",
  "{{estimate_link}}",
];

/** The shipped config, with its four message bodies in the viewer's language. */
function defaultConfig(t: (key: string) => string): FollowUpConfig {
  return {
    enabled: true,
    expiry: {
      days: 30,
      action: "declined",
    },
    notViewedReminder: {
      enabled: true,
      delayDays: 3,
      channel: "email",
      message: t("defaultNotViewedEmail"),
      smsMessage: t("defaultNotViewedSms"),
      maxFollowUps: 2,
      stopCondition: "accepted",
    },
    viewedNotBooked: {
      enabled: true,
      delayDays: 2,
      channel: "email",
      message: t("defaultViewedEmail"),
      smsMessage: t("defaultViewedSms"),
      maxFollowUps: 1,
      stopCondition: "accepted",
    },
  };
}

export function EstimateFollowUpSettings() {
  const t = useSettingsText().section("estimate-settings");
  const DEFAULT_CONFIG = defaultConfig(t);
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
  const [previewNotViewedSms, setPreviewNotViewedSms] = useState(false);
  const [previewViewed, setPreviewViewed] = useState(false);
  const [previewViewedSms, setPreviewViewedSms] = useState(false);

  const handleSave = () => {
    localStorage.setItem("estimate-followup-config", JSON.stringify(config));
    toast.success(t("followUpsSaved"));
  };

  return (
    <div className="space-y-6">
      {/* Estimate Expiry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4" />
            {t("expiryTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("expiresAfter")}</Label>
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
                <span className="text-muted-foreground text-xs">
                  {t("days")}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("expiredAction")}</Label>
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
                      {t(o.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">{t("expiryHelp")}</p>
        </CardContent>
      </Card>

      {/* Auto Follow-Up Reminders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4" />
              {t("followUpTitle")}
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
                  <p className="text-sm font-semibold">{t("notViewedTitle")}</p>
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
                {t("notViewedHelp")}
              </p>
              {config.notViewedReminder.enabled && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("sendAfter")}</Label>
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
                        {t("days")}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("channel")}</Label>
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
                        <SelectItem value="email">
                          {t("channelEmail")}
                        </SelectItem>
                        <SelectItem value="sms">{t("channelSms")}</SelectItem>
                        <SelectItem value="both">{t("channelBoth")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("maxFollowUps")}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {t("sendUpTo")}
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
                        {t("timesThenStop")}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("stopWhen")}</Label>
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
                            {t(o.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    {/* Email template — when the channel includes email */}
                    {(config.notViewedReminder.channel === "email" ||
                      config.notViewedReminder.channel === "both") && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">
                            {config.notViewedReminder.channel === "both"
                              ? t("emailMessage")
                              : t("messageTemplate")}
                          </Label>
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
                                {t("edit")}
                              </>
                            ) : (
                              <>
                                <Eye className="size-3" />
                                {t("preview")}
                              </>
                            )}
                          </Button>
                        </div>
                        {previewNotViewed ? (
                          <div className="bg-muted/30 text-foreground min-h-[76px] rounded-lg border p-3 text-xs whitespace-pre-line">
                            {renderMergePreview(
                              config.notViewedReminder.message,
                            )}
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
                      </div>
                    )}

                    {/* Shorter SMS template — when the channel includes SMS */}
                    {(config.notViewedReminder.channel === "sms" ||
                      config.notViewedReminder.channel === "both") && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">{t("smsMessage")}</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1.5 px-2 text-xs"
                            onClick={() => setPreviewNotViewedSms((v) => !v)}
                          >
                            {previewNotViewedSms ? (
                              <>
                                <Pencil className="size-3" />
                                {t("edit")}
                              </>
                            ) : (
                              <>
                                <Eye className="size-3" />
                                {t("preview")}
                              </>
                            )}
                          </Button>
                        </div>
                        {previewNotViewedSms ? (
                          <div className="bg-muted/30 text-foreground rounded-lg border p-3 text-xs whitespace-pre-line">
                            {renderMergePreview(
                              config.notViewedReminder.smsMessage,
                            )}
                          </div>
                        ) : (
                          <Textarea
                            value={config.notViewedReminder.smsMessage}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                notViewedReminder: {
                                  ...config.notViewedReminder,
                                  smsMessage: e.target.value,
                                },
                              })
                            }
                            rows={2}
                            className="text-xs"
                          />
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {MERGE_TAGS.map((v) => (
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
                  <p className="text-sm font-semibold">{t("viewedTitle")}</p>
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
              <p className="text-muted-foreground text-xs">{t("viewedHelp")}</p>
              {config.viewedNotBooked.enabled && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("sendAfterViewing")}</Label>
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
                        {t("days")}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("channel")}</Label>
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
                        <SelectItem value="email">
                          {t("channelEmail")}
                        </SelectItem>
                        <SelectItem value="sms">{t("channelSms")}</SelectItem>
                        <SelectItem value="both">{t("channelBoth")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("maxFollowUps")}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {t("sendUpTo")}
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
                        {t("timesThenStop")}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("stopWhen")}</Label>
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
                            {t(o.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    {/* Email template — when the channel includes email */}
                    {(config.viewedNotBooked.channel === "email" ||
                      config.viewedNotBooked.channel === "both") && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">
                            {config.viewedNotBooked.channel === "both"
                              ? t("emailMessage")
                              : t("messageTemplate")}
                          </Label>
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
                                {t("edit")}
                              </>
                            ) : (
                              <>
                                <Eye className="size-3" />
                                {t("preview")}
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
                    )}

                    {/* Shorter SMS template — when the channel includes SMS */}
                    {(config.viewedNotBooked.channel === "sms" ||
                      config.viewedNotBooked.channel === "both") && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">{t("smsMessage")}</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1.5 px-2 text-xs"
                            onClick={() => setPreviewViewedSms((v) => !v)}
                          >
                            {previewViewedSms ? (
                              <>
                                <Pencil className="size-3" />
                                {t("edit")}
                              </>
                            ) : (
                              <>
                                <Eye className="size-3" />
                                {t("preview")}
                              </>
                            )}
                          </Button>
                        </div>
                        {previewViewedSms ? (
                          <div className="bg-muted/30 text-foreground rounded-lg border p-3 text-xs whitespace-pre-line">
                            {renderMergePreview(
                              config.viewedNotBooked.smsMessage,
                            )}
                          </div>
                        ) : (
                          <Textarea
                            value={config.viewedNotBooked.smsMessage}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                viewedNotBooked: {
                                  ...config.viewedNotBooked,
                                  smsMessage: e.target.value,
                                },
                              })
                            }
                            rows={2}
                            className="text-xs"
                          />
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {MERGE_TAGS.map((v) => (
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
          </CardContent>
        )}
      </Card>

      <Button onClick={handleSave} className="w-full gap-2">
        <Save className="size-4" />
        {t("saveFollowUps")}
      </Button>
    </div>
  );
}
