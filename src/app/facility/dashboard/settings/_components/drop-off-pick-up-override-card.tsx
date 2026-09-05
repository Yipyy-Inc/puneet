"use client";

import { useState } from "react";
import { useSettings } from "@/hooks/use-settings";

import type { DropOffPickUpOverride } from "@/types/facility";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Timer, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SERVICE_BLOCK_OPTIONS } from "./service-block-options";

// Drop-Off & Pick-Up Time Overrides
export function DropOffPickUpOverrideCard() {
  const { dropOffPickUpOverrides, updateDropOffPickUpOverrides } =
    useSettings();
  const [newDate, setNewDate] = useState("");
  const [newServices, setNewServices] = useState<string[]>([]);
  const [newDropOffStart, setNewDropOffStart] = useState("07:30");
  const [newDropOffEnd, setNewDropOffEnd] = useState("10:00");
  const [newPickUpStart, setNewPickUpStart] = useState("16:00");
  const [newPickUpEnd, setNewPickUpEnd] = useState("18:00");

  const handleAdd = () => {
    if (!newDate || newServices.length === 0) return;
    const override: DropOffPickUpOverride = {
      id: `dropoff-pickup-${Date.now()}`,
      date: newDate,
      services: [...newServices],
      dropOffStart: newDropOffStart,
      dropOffEnd: newDropOffEnd,
      pickUpStart: newPickUpStart,
      pickUpEnd: newPickUpEnd,
    };
    updateDropOffPickUpOverrides([...dropOffPickUpOverrides, override]);
    setNewDate("");
    setNewServices([]);
    setNewDropOffStart("07:30");
    setNewDropOffEnd("10:00");
    setNewPickUpStart("16:00");
    setNewPickUpEnd("18:00");
  };

  const handleRemove = (id: string) => {
    updateDropOffPickUpOverrides(
      dropOffPickUpOverrides.filter((o) => o.id !== id),
    );
  };

  const toggleService = (id: string) => {
    setNewServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="size-5" />
          Drop-Off &amp; Pick-Up Time Overrides
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Override drop-off and pick-up windows for specific dates (e.g. holiday
          hours). Customers only see valid time options for each date. Apply
          overrides per service.
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
                Services (per service, multiple, or all)
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    setNewServices(
                      newServices.length === SERVICE_BLOCK_OPTIONS.length
                        ? []
                        : SERVICE_BLOCK_OPTIONS.map((o) => o.id),
                    )
                  }
                >
                  {newServices.length === SERVICE_BLOCK_OPTIONS.length
                    ? "Clear all"
                    : "All services"}
                </Button>
                {SERVICE_BLOCK_OPTIONS.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`dopo-svc-${opt.id}`}
                      checked={newServices.includes(opt.id)}
                      onCheckedChange={() => toggleService(opt.id)}
                    />
                    <Label
                      htmlFor={`dopo-svc-${opt.id}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Drop-off start
                </Label>
                <Input
                  type="time"
                  aria-label="Drop-off start"
                  value={newDropOffStart}
                  onChange={(e) => setNewDropOffStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Drop-off end
                </Label>
                <Input
                  type="time"
                  aria-label="Drop-off end"
                  value={newDropOffEnd}
                  onChange={(e) => setNewDropOffEnd(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Pick-up start
                </Label>
                <Input
                  type="time"
                  aria-label="Pick-up start"
                  value={newPickUpStart}
                  onChange={(e) => setNewPickUpStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Pick-up end
                </Label>
                <Input
                  type="time"
                  aria-label="Pick-up end"
                  value={newPickUpEnd}
                  onChange={(e) => setNewPickUpEnd(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!newDate || newServices.length === 0}
            >
              <Plus className="mr-2 size-4" />
              Add override
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Overrides</Label>
          {dropOffPickUpOverrides.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border py-4 text-center text-sm">
              No drop-off/pick-up overrides. Add a date and service(s) above.
            </p>
          ) : (
            <ul className="space-y-2">
              {dropOffPickUpOverrides
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((override) => (
                  <li
                    key={override.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
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
                        <div className="flex flex-wrap gap-1">
                          {override.services.length ===
                          SERVICE_BLOCK_OPTIONS.length ? (
                            <Badge variant="secondary" className="text-xs">
                              All services
                            </Badge>
                          ) : (
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
                          )}
                        </div>
                      </div>
                      <span className="text-muted-foreground text-sm">
                        Drop-off {override.dropOffStart}–{override.dropOffEnd} ·
                        Pick-up {override.pickUpStart}–{override.pickUpEnd}
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
