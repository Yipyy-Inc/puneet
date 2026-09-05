"use client";

import { useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { useSettingsText } from "@/lib/settings/use-settings-text";

import type { ServiceDateBlock } from "@/types/facility";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarX, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SERVICE_BLOCK_OPTIONS } from "./service-block-options";

type BlockType = "full" | "check_in" | "check_out";

// Service-Specific Day Blocking (override regular schedule)
export function ServiceDayBlockingCard() {
  const t = useSettingsText().section("hours");
  const { serviceDateBlocks, updateServiceDateBlocks } = useSettings();
  const [newDate, setNewDate] = useState("");
  const [newServices, setNewServices] = useState<string[]>([]);
  const [newBlockType, setNewBlockType] = useState<BlockType>("full");
  const [newClosureMessage, setNewClosureMessage] = useState("");

  const includesBoarding = newServices.includes("boarding");

  const handleAdd = () => {
    if (!newDate || newServices.length === 0) return;
    const block: ServiceDateBlock = {
      id: `block-${Date.now()}`,
      date: newDate,
      services: [...newServices],
      closed: includesBoarding ? newBlockType === "full" : true,
      blockCheckIn: includesBoarding ? newBlockType === "check_in" : undefined,
      blockCheckOut: includesBoarding
        ? newBlockType === "check_out"
        : undefined,
      closureMessage: newClosureMessage.trim() || undefined,
    };
    updateServiceDateBlocks([...serviceDateBlocks, block]);
    setNewDate("");
    setNewServices([]);
    setNewBlockType("full");
    setNewClosureMessage("");
  };

  const handleRemove = (id: string) => {
    updateServiceDateBlocks(serviceDateBlocks.filter((b) => b.id !== id));
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
          <CalendarX className="size-5" />
          {t("serviceDayBlocking")}
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          {t("serviceDayBlockingHelp")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 rounded-lg border p-4">
          <Label>{t("addBlock")}</Label>
          <div className="flex flex-wrap items-end gap-4">
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
                {t("servicesAffected")}
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
                    ? t("clearAll")
                    : t("allServices")}
                </Button>
                {SERVICE_BLOCK_OPTIONS.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`block-svc-${opt.id}`}
                      checked={newServices.includes(opt.id)}
                      onCheckedChange={() => toggleService(opt.id)}
                    />
                    <Label
                      htmlFor={`block-svc-${opt.id}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            {includesBoarding && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  {t("boardingBlockType")}
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={newBlockType === "full" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setNewBlockType("full")}
                  >
                    {t("fullyClose")}
                  </Button>
                  <Button
                    type="button"
                    variant={
                      newBlockType === "check_in" ? "default" : "outline"
                    }
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setNewBlockType("check_in")}
                  >
                    {t("blockCheckInOnly")}
                  </Button>
                  <Button
                    type="button"
                    variant={
                      newBlockType === "check_out" ? "default" : "outline"
                    }
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setNewBlockType("check_out")}
                  >
                    {t("blockCheckOutOnly")}
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  Fully close = no check-in or check-out. Or block only check-in
                  or only check-out dates.
                </p>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                {t("closureMessage")}
              </Label>
              <Input
                value={newClosureMessage}
                onChange={(e) => setNewClosureMessage(e.target.value)}
                placeholder={t("blockReasonPlaceholder")}
                className="max-w-sm"
              />
              <p className="text-muted-foreground text-xs">
                {t("closureMessageHelp")}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!newDate || newServices.length === 0}
            >
              <Plus className="mr-2 size-4" />
              {t("addBlock")}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t("blockedDates")}</Label>
          {serviceDateBlocks.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border py-4 text-center text-sm">
              {t("noBlocks")}
            </p>
          ) : (
            <ul className="space-y-2">
              {serviceDateBlocks
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((block) => (
                  <li
                    key={block.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {new Date(
                            block.date + "T12:00:00",
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {block.services.length ===
                          SERVICE_BLOCK_OPTIONS.length ? (
                            <Badge variant="secondary" className="text-xs">
                              All services
                            </Badge>
                          ) : (
                            block.services.map((s) => (
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
                        {block.services.includes("boarding") ? (
                          <Badge variant="outline" className="text-xs">
                            {block.closed
                              ? t("fullyClosed")
                              : block.blockCheckIn && block.blockCheckOut
                                ? t("checkInOutBlocked")
                                : block.blockCheckIn
                                  ? t("checkInBlocked")
                                  : block.blockCheckOut
                                    ? t("checkOutBlocked")
                                    : "Closed"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{t("closed")}</Badge>
                        )}
                      </div>
                      {block.closureMessage && (
                        <p className="text-muted-foreground text-sm">
                          “{block.closureMessage}”
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(block.id)}
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
