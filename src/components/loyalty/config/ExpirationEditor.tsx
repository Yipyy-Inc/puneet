"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { PointsExpirationConfig } from "@/types/loyalty";

type ExpirationType = PointsExpirationConfig["expirationType"];
type ExpirationPolicy = NonNullable<
  PointsExpirationConfig["timeBased"]
>["expirationPolicy"];
type WarningsConfig = NonNullable<PointsExpirationConfig["warnings"]>;
type TierRow = NonNullable<PointsExpirationConfig["tierBased"]>["tiers"][number];

interface ExpirationEditorProps {
  value: PointsExpirationConfig;
  onChange: (v: PointsExpirationConfig) => void;
}

export function ExpirationEditor({ value, onChange }: ExpirationEditorProps) {
  const patch = (changes: Partial<PointsExpirationConfig>) =>
    onChange({ ...value, ...changes });

  const timeBased = value.timeBased;
  const activityBased = value.activityBased;
  const tiers = value.tierBased?.tiers ?? [];
  const warnings = value.warnings;

  const updateTimeBased = (
    changes: Partial<NonNullable<PointsExpirationConfig["timeBased"]>>,
  ) =>
    patch({
      timeBased: {
        expirationMonths: timeBased?.expirationMonths ?? 0,
        expirationDays: timeBased?.expirationDays,
        expirationPolicy: timeBased?.expirationPolicy ?? "fifo",
        ...changes,
      },
    });

  const updateActivityBased = (
    changes: Partial<NonNullable<PointsExpirationConfig["activityBased"]>>,
  ) =>
    patch({
      activityBased: {
        expireAfterInactiveMonths:
          activityBased?.expireAfterInactiveMonths ?? 0,
        resetOnActivity: activityBased?.resetOnActivity ?? false,
        ...changes,
      },
    });

  const updateTiers = (next: TierRow[]) => patch({ tierBased: { tiers: next } });

  const updateWarnings = (changes: Partial<WarningsConfig>) =>
    patch({
      warnings: {
        enabled: warnings?.enabled ?? false,
        warnDaysBefore: warnings?.warnDaysBefore ?? [],
        sendEmail: warnings?.sendEmail ?? false,
        sendSms: warnings?.sendSms ?? false,
        showInPortal: warnings?.showInPortal ?? false,
        ...changes,
      },
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base">Points Expiration</Label>
          <p className="text-muted-foreground text-sm">
            Set when earned points expire
          </p>
        </div>
        <Switch
          checked={value.enabled}
          onCheckedChange={(checked) => patch({ enabled: checked })}
        />
      </div>

      {value.enabled && (
        <>
          <div className="space-y-2">
            <Label>Expiration Type</Label>
            <Select
              value={value.expirationType}
              onValueChange={(v: ExpirationType) =>
                patch({ expirationType: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Expiration</SelectItem>
                <SelectItem value="time_based">Time-Based</SelectItem>
                <SelectItem value="activity_based">Activity-Based</SelectItem>
                <SelectItem value="tier_based">Tier-Based</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {value.expirationType === "time_based" && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <Label className="text-base">Time-Based Expiration</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expiration (Months)</Label>
                    <Input
                      type="number"
                      value={timeBased?.expirationMonths ?? 0}
                      onChange={(e) =>
                        updateTimeBased({
                          expirationMonths: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiration Policy</Label>
                    <Select
                      value={timeBased?.expirationPolicy ?? "fifo"}
                      onValueChange={(v: ExpirationPolicy) =>
                        updateTimeBased({ expirationPolicy: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fifo">FIFO (Oldest First)</SelectItem>
                        <SelectItem value="lifo">LIFO (Newest First)</SelectItem>
                        <SelectItem value="proportional">
                          Proportional
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {value.expirationType === "activity_based" && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <Label className="text-base">Activity-Based Expiration</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expire After Inactive (Months)</Label>
                    <Input
                      type="number"
                      value={activityBased?.expireAfterInactiveMonths ?? 0}
                      onChange={(e) =>
                        updateActivityBased({
                          expireAfterInactiveMonths: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center space-x-2 self-end pb-2">
                    <Switch
                      id="activityResetOnActivity"
                      checked={activityBased?.resetOnActivity ?? false}
                      onCheckedChange={(checked) =>
                        updateActivityBased({ resetOnActivity: checked })
                      }
                    />
                    <Label htmlFor="activityResetOnActivity">
                      Reset Timer on Activity
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {value.expirationType === "tier_based" && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Tier-Based Expiration</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateTiers([
                        ...tiers,
                        { tierId: "", expirationMonths: 0 },
                      ])
                    }
                  >
                    <Plus className="size-4" />
                    Add Tier
                  </Button>
                </div>
                {tiers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No tiers configured yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tiers.map((tier, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[1fr_1fr_auto] items-end gap-3"
                      >
                        <div className="space-y-2">
                          <Label>Tier ID</Label>
                          <Input
                            value={tier.tierId}
                            onChange={(e) =>
                              updateTiers(
                                tiers.map((t, i) =>
                                  i === index
                                    ? { ...t, tierId: e.target.value }
                                    : t,
                                ),
                              )
                            }
                            placeholder="e.g., gold"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Expiration (Months)</Label>
                          <Input
                            type="number"
                            value={tier.expirationMonths}
                            onChange={(e) =>
                              updateTiers(
                                tiers.map((t, i) =>
                                  i === index
                                    ? {
                                        ...t,
                                        expirationMonths: Number(
                                          e.target.value,
                                        ),
                                      }
                                    : t,
                                ),
                              )
                            }
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove tier"
                          onClick={() =>
                            updateTiers(tiers.filter((_, i) => i !== index))
                          }
                        >
                          <Trash2 className="text-destructive size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <Label className="text-base">Warning Notifications</Label>
                <Switch
                  checked={warnings?.enabled ?? false}
                  onCheckedChange={(checked) =>
                    updateWarnings({ enabled: checked })
                  }
                />
              </div>
              {warnings?.enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Warn Days Before Expiration</Label>
                    <Input
                      value={warnings.warnDaysBefore.join(",")}
                      onChange={(e) =>
                        updateWarnings({
                          warnDaysBefore: e.target.value
                            .split(",")
                            .map((part) => Number(part.trim()))
                            .filter((n) => !Number.isNaN(n)),
                        })
                      }
                      placeholder="e.g., 30,14,7"
                    />
                    <p className="text-muted-foreground text-xs">
                      Comma-separated list of days
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="warnEmail"
                        checked={warnings.sendEmail}
                        onCheckedChange={(checked) =>
                          updateWarnings({ sendEmail: checked })
                        }
                      />
                      <Label htmlFor="warnEmail">Email</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="warnSms"
                        checked={warnings.sendSms}
                        onCheckedChange={(checked) =>
                          updateWarnings({ sendSms: checked })
                        }
                      />
                      <Label htmlFor="warnSms">SMS</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="warnPortal"
                        checked={warnings.showInPortal}
                        onCheckedChange={(checked) =>
                          updateWarnings({ showInPortal: checked })
                        }
                      />
                      <Label htmlFor="warnPortal">Customer Portal</Label>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
