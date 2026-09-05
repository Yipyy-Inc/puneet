"use client";

import { useSettings } from "@/hooks/use-settings";

import { SettingsBlock } from "@/components/ui/settings-block";

import { Input } from "@/components/ui/input";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

// Business Hours Component
export function BusinessHoursCard() {
  const { hours, updateHours } = useSettings();

  return (
    <SettingsBlock title="Business Hours" data={hours} onSave={updateHours}>
      {(isEditing, localHours, setLocalHours) => (
        <div className="space-y-3">
          {Object.entries(localHours).map(
            ([day, schedule]: [
              string,
              { isOpen: boolean; openTime: string; closeTime: string },
            ]) => (
              <div
                key={day}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="w-32 font-medium capitalize">{day}</div>
                  <Switch
                    aria-label={`${day} open`}
                    checked={schedule.isOpen}
                    disabled={!isEditing}
                    onCheckedChange={(checked) =>
                      setLocalHours({
                        ...localHours,
                        [day]: { ...schedule, isOpen: checked },
                      })
                    }
                  />
                  {schedule.isOpen && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        aria-label={`${day} opening time`}
                        value={schedule.openTime}
                        onChange={(e) =>
                          setLocalHours({
                            ...localHours,
                            [day]: { ...schedule, openTime: e.target.value },
                          })
                        }
                        className={`w-32 ${!isEditing ? "cursor-not-allowed bg-gray-100" : ""} `}
                        readOnly={!isEditing}
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        aria-label={`${day} closing time`}
                        value={schedule.closeTime}
                        onChange={(e) =>
                          setLocalHours({
                            ...localHours,
                            [day]: { ...schedule, closeTime: e.target.value },
                          })
                        }
                        className={`w-32 ${!isEditing ? "cursor-not-allowed bg-gray-100" : ""} `}
                        readOnly={!isEditing}
                      />
                    </div>
                  )}
                  {!schedule.isOpen && (
                    <Badge variant="secondary">Closed</Badge>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </SettingsBlock>
  );
}
