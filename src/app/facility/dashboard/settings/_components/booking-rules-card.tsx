"use client";

import { useSettings } from "@/hooks/use-settings";

import { SettingsBlock } from "@/components/ui/settings-block";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// Booking Rules Component
export function BookingRulesCard() {
  const t = useSettingsText().section("booking-rules");
  const { rules, updateRules } = useSettings();

  return (
    <SettingsBlock title={t("rulesTitle")} data={rules} onSave={updateRules}>
      {(isEditing, localRules, setLocalRules) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("minAdvance")}</Label>
              <Input
                type="number"
                value={localRules.minimumAdvanceBooking}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    minimumAdvanceBooking: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("maxAdvance")}</Label>
              <Input
                type="number"
                value={localRules.maximumAdvanceBooking}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    maximumAdvanceBooking: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("cancellationPolicy")}</Label>
              <Input
                type="number"
                value={localRules.cancelPolicyHours}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    cancelPolicyHours: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("cancellationFee")}</Label>
              <Input
                type="number"
                value={localRules.cancelFeePercentage}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    cancelFeePercentage: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("depositPercentage")}</Label>
              <Input
                type="number"
                value={localRules.depositPercentage}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    depositPercentage: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("facilityCapacity")}</Label>
              <Input
                type="number"
                value={localRules.capacityLimit}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    capacityLimit: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("dailyCapacity")}</Label>
            <Input
              type="number"
              value={localRules.dailyCapacityLimit}
              onChange={(e) =>
                setLocalRules({
                  ...localRules,
                  dailyCapacityLimit: parseInt(e.target.value),
                })
              }
              readOnly={!isEditing}
              className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">{t("requireDeposit")}</div>
              <div className="text-muted-foreground text-sm">
                {t("requireDepositHelp")}
              </div>
            </div>
            <Switch
              checked={localRules.depositRequired}
              disabled={!isEditing}
              onCheckedChange={(checked) =>
                setLocalRules({ ...localRules, depositRequired: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">{t("allowOverbooking")}</div>
              <div className="text-muted-foreground text-sm">
                {t("allowOverbookingHelp")}
              </div>
            </div>
            <Switch
              checked={localRules.allowOverBooking}
              disabled={!isEditing}
              onCheckedChange={(checked) =>
                setLocalRules({ ...localRules, allowOverBooking: checked })
              }
            />
          </div>
        </div>
      )}
    </SettingsBlock>
  );
}
