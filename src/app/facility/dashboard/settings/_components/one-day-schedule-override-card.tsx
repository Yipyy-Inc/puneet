"use client";

import { useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { useServiceTypeLabel } from "@/lib/settings/use-service-types";

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
  const t = useSettingsText().section("hours");
  // The five built-in service names, from the same catalogue the settings
  // rail uses — it said "Toilettage" while these chips said "Grooming".
  const serviceLabel = useServiceTypeLabel();
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
          {t("oneDaySchedule")}
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          {t("oneDayScheduleHelp")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 rounded-lg border p-4">
          <Label>{t("addOverride")}</Label>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                {t("date")}
              </Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                {t("servicesOptionalAll")}
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setNewScheduleServices(
                      newServices.length === SERVICE_BLOCK_OPTIONS.length
                        ? []
                        : SERVICE_BLOCK_OPTIONS.map((o) => o.id),
                    )
                  }
                >
                  {newServices.length === SERVICE_BLOCK_OPTIONS.length
                    ? t("clearOne")
                    : t("allServices")}
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
                      {serviceLabel(opt.id, opt.label)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                {t("openingTime")}
              </Label>
              <Input
                type="time"
                aria-label={t("openingTime")}
                value={newOpenTime}
                onChange={(e) => setNewOpenTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                {t("closingTime")}
              </Label>
              <Input
                type="time"
                aria-label={t("closingTime")}
                value={newCloseTime}
                onChange={(e) => setNewCloseTime(e.target.value)}
              />
            </div>
            <Button type="button" onClick={handleAdd} disabled={!newDate}>
              <Plus className="mr-2 size-4" />
              {t("addOverride")}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t("specialHours")}</Label>
          {scheduleTimeOverrides.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border py-4 text-center text-sm">
              {t("noOneDayOverrides")}
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
                            {t("allServices")}
                          </Badge>
                        ) : override.services &&
                          override.services.length > 0 ? (
                          override.services.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-xs"
                            >
                              {serviceLabel(
                                s,
                                SERVICE_BLOCK_OPTIONS.find((o) => o.id === s)
                                  ?.label ?? s,
                              )}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {t("allServices")}
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
