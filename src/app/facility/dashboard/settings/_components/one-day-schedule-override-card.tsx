"use client";

import { useState } from "react";
import { useSettings } from "@/hooks/use-settings";

import type { ScheduleTimeOverride } from "@/types/facility";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SERVICE_BLOCK_OPTIONS } from "./service-block-options";

// One-Day Schedule Time Override (Special Hours)
export function OneDayScheduleOverrideCard() {
  const { scheduleTimeOverrides, updateScheduleTimeOverrides } = useSettings();
  const [newDate, setNewDate] = useState("");
  const [newServices, setNewScheduleServices] = useState<string[]>([]);
  const [newOpenTime, setNewOpenTime] = useState("08:00");
  const [newCloseTime, setNewCloseTime] = useState("17:00");

  const handleAdd = () => {
    if (!newDate) return;
    const override: ScheduleTimeOverride = {
      id: `override-${Date.now()}`,
      date: newDate,
      services:
        newServices.length === 0 ||
        newServices.length === SERVICE_BLOCK_OPTIONS.length
          ? undefined
          : [...newServices],
      openTime: newOpenTime,
      closeTime: newCloseTime,
    };
    updateScheduleTimeOverrides([...scheduleTimeOverrides, override]);
    setNewDate("");
    setNewScheduleServices([]);
    setNewOpenTime("08:00");
    setNewCloseTime("17:00");
  };

  const handleRemove = (id: string) => {
    updateScheduleTimeOverrides(
      scheduleTimeOverrides.filter((o) => o.id !== id),
    );
  };

  const toggleScheduleService = (id: string) => {
    setNewScheduleServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-5" />
          One-Day Schedule Time Override (Special Hours)
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Set custom opening and closing times for a specific date (e.g.
          Halloween 10:00 AM – 3:00 PM) without changing the regular weekly
          schedule. Choose per service, multiple services, or all services.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 rounded-lg border p-4">
          <Label>Add override</Label>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Date</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Services (optional — leave empty for all)
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    setNewScheduleServices(
                      newServices.length === SERVICE_BLOCK_OPTIONS.length
                        ? []
                        : SERVICE_BLOCK_OPTIONS.map((o) => o.id),
                    )
                  }
                >
                  {newServices.length === SERVICE_BLOCK_OPTIONS.length
                    ? "Clear / All"
                    : "All services"}
                </Button>
                {SERVICE_BLOCK_OPTIONS.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`sched-svc-${opt.id}`}
                      checked={newServices.includes(opt.id)}
                      onCheckedChange={() => toggleScheduleService(opt.id)}
                    />
                    <Label
                      htmlFor={`sched-svc-${opt.id}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Opening time
              </Label>
              <Input
                type="time"
                aria-label="Opening time"
                value={newOpenTime}
                onChange={(e) => setNewOpenTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                Closing time
              </Label>
              <Input
                type="time"
                aria-label="Closing time"
                value={newCloseTime}
                onChange={(e) => setNewCloseTime(e.target.value)}
              />
            </div>
            <Button type="button" onClick={handleAdd} disabled={!newDate}>
              <Plus className="mr-2 size-4" />
              Add override
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Special hours</Label>
          {scheduleTimeOverrides.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border py-4 text-center text-sm">
              No one-day overrides. Add a date and times above.
            </p>
          ) : (
            <ul className="space-y-2">
              {scheduleTimeOverrides
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((override) => (
                  <li
                    key={override.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {new Date(
                            override.date + "T12:00:00",
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {override.services &&
                        override.services.length ===
                          SERVICE_BLOCK_OPTIONS.length ? (
                          <Badge variant="secondary" className="text-xs">
                            All services
                          </Badge>
                        ) : override.services &&
                          override.services.length > 0 ? (
                          override.services.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-xs"
                            >
                              {SERVICE_BLOCK_OPTIONS.find((o) => o.id === s)
                                ?.label ?? s}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            All services
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground text-sm">
                        {override.openTime} – {override.closeTime}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(override.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
