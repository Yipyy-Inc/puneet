"use client";

import { useSettings } from "@/hooks/use-settings";

import { SettingsBlock } from "@/components/ui/settings-block";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";

// Booking Rules Component
export function BookingRulesCard() {
  const { rules, updateRules } = useSettings();

  return (
    <SettingsBlock
      title="Booking Rules & Policies"
      data={rules}
      onSave={updateRules}
    >
      {(isEditing, localRules, setLocalRules) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Advance Booking (hours)</Label>
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
              <Label>Maximum Advance Booking (days)</Label>
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
              <Label>Cancellation Policy (hours before)</Label>
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
              <Label>Cancellation Fee (%)</Label>
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
              <Label>Deposit Percentage (%)</Label>
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
              <Label>Facility Capacity Limit</Label>
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
            <Label>Daily Capacity Limit</Label>
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
              <div className="font-medium">Require Deposit</div>
              <div className="text-muted-foreground text-sm">
                Require deposit at booking
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
              <div className="font-medium">Allow Overbooking</div>
              <div className="text-muted-foreground text-sm">
                Accept bookings beyond capacity
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
