"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NOTIFICATION_ROWS } from "@/lib/loyalty/notification-settings";
import type {
  LoyaltyNotificationSettings,
  LoyaltyNotificationMethod,
} from "@/types/loyalty";

const METHOD_OPTIONS: { value: LoyaltyNotificationMethod; label: string }[] = [
  { value: "both", label: "Email + Portal" },
  { value: "portal", label: "Portal only" },
  { value: "email", label: "Email only" },
];

export function NotificationSettingsEditor({
  value,
  onChange,
}: {
  value: LoyaltyNotificationSettings;
  onChange: (v: LoyaltyNotificationSettings) => void;
}) {
  const patch = (p: Partial<LoyaltyNotificationSettings>) =>
    onChange({ ...value, ...p });

  return (
    <div className="space-y-3">
      {NOTIFICATION_ROWS.map((row) => {
        const enabled = value[row.enabledField] as boolean;
        const method = row.methodField
          ? (value[row.methodField] as LoyaltyNotificationMethod)
          : undefined;
        return (
          <Card key={row.key}>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <Label className="text-base">{row.label}</Label>
                  <p className="text-muted-foreground text-sm">
                    {row.description}
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) =>
                    patch({ [row.enabledField]: checked })
                  }
                  aria-label={`Enable ${row.label}`}
                />
              </div>

              {enabled && (row.methodField || row.key === "rewardExpiry") && (
                <div className="flex flex-wrap items-end gap-4 border-t pt-4">
                  {row.methodField && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Delivery method</Label>
                      <Select
                        value={method}
                        onValueChange={(v: LoyaltyNotificationMethod) =>
                          patch({ [row.methodField!]: v })
                        }
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {METHOD_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {row.key === "rewardExpiry" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Warn this many days before</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={90}
                          className="w-24"
                          value={value.rewardExpiryDays}
                          onChange={(e) =>
                            patch({
                              rewardExpiryDays:
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                            })
                          }
                        />
                        <span className="text-muted-foreground text-sm">
                          days
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {enabled && row.templateKey && (
                <div className="space-y-1.5 border-t pt-4">
                  <Label className="text-xs">Custom message (optional)</Label>
                  <Textarea
                    rows={2}
                    placeholder="Leave blank to use the default message."
                    value={value.templates?.[row.templateKey] ?? ""}
                    onChange={(e) =>
                      patch({
                        templates: {
                          ...value.templates,
                          [row.templateKey!]: e.target.value,
                        },
                      })
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Tokens: {"{programName}"}, {"{customerFirstName}"},{" "}
                    {"{pointsEarned}"}, {"{tierName}"}, {"{portalLink}"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
