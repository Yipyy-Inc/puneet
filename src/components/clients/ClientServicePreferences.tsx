"use client";

import { useMemo, useState } from "react";
import {
  BellOff,
  Calendar,
  CheckCircle,
  Edit,
  Save,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bookings } from "@/data/bookings";
import {
  REBOOK_SERVICE_TYPES,
  clientRebookOptOuts,
  clientServicePreferences,
  computeActualFrequency,
  formatFrequency,
  frequencyInDays,
  getEffectiveFrequency,
  getServiceLabel,
  type FrequencyUnit,
  type ServiceFrequency,
  type ServiceTypeKey,
} from "@/data/rebook-reminders";

interface Props {
  clientId: number;
}

interface PrefRow {
  service: ServiceTypeKey;
  effective: ServiceFrequency;
  source: "override" | "default";
  actual: ServiceFrequency | null;
  bookingCount: number;
  reason?: string;
}

export function ClientServicePreferences({ clientId }: Props) {
  const [overrides, setOverrides] = useState(() =>
    clientServicePreferences.filter((p) => p.clientId === clientId),
  );
  const [optedOut, setOptedOut] = useState(
    () =>
      clientRebookOptOuts.find((o) => o.clientId === clientId)?.optedOut ??
      false,
  );
  const [editingService, setEditingService] = useState<ServiceTypeKey | null>(
    null,
  );
  const [draftFrequency, setDraftFrequency] = useState<ServiceFrequency>({
    value: 4,
    unit: "weeks",
  });
  const [draftReason, setDraftReason] = useState("");

  const toggleOptOut = (next: boolean) => {
    setOptedOut(next);
    toast.success(
      next
        ? "Rebook reminders turned off for this client"
        : "Rebook reminders re-enabled for this client",
    );
  };

  const clientBookings = useMemo(
    () => bookings.filter((b) => b.clientId === clientId),
    [clientId],
  );

  const rows: PrefRow[] = useMemo(() => {
    return REBOOK_SERVICE_TYPES.map(({ key }) => {
      const override = overrides.find((p) => p.service === key);
      const eff = override
        ? { frequency: override.frequency, source: "override" as const }
        : getEffectiveFrequency(clientId, key);
      const dates = clientBookings
        .filter(
          (b) =>
            b.service === key &&
            (b.status === "completed" || b.status === "confirmed"),
        )
        .map((b) => b.startDate);
      const actual = computeActualFrequency(dates);
      return {
        service: key,
        effective: eff.frequency,
        source: eff.source,
        actual,
        bookingCount: dates.length,
        reason: override?.reason,
      };
    });
  }, [overrides, clientBookings, clientId]);

  const startEdit = (row: PrefRow) => {
    setEditingService(row.service);
    setDraftFrequency({ ...row.effective });
    setDraftReason(row.reason ?? "");
  };

  const cancelEdit = () => {
    setEditingService(null);
    setDraftReason("");
  };

  const saveEdit = () => {
    if (!editingService) return;
    setOverrides((prev) => {
      const idx = prev.findIndex((p) => p.service === editingService);
      const next = {
        clientId,
        service: editingService,
        frequency: draftFrequency,
        reason: draftReason.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = next;
        return copy;
      }
      return [...prev, next];
    });
    toast.success(
      `${getServiceLabel(editingService)} frequency set to ${formatFrequency(
        draftFrequency,
      ).toLowerCase()}`,
    );
    setEditingService(null);
  };

  const resetToDefault = (service: ServiceTypeKey) => {
    setOverrides((prev) => prev.filter((p) => p.service !== service));
    toast.success(`${getServiceLabel(service)} reset to facility default`);
  };

  const compareIndicator = (row: PrefRow) => {
    if (!row.actual) return null;
    const expectedDays = frequencyInDays(row.effective);
    const actualDays = frequencyInDays(row.actual);
    const diff = actualDays - expectedDays;
    const pct = Math.abs(diff) / expectedDays;
    if (pct < 0.15) {
      return {
        icon: <CheckCircle className="size-3" />,
        text: "Matches actual",
        cls: "text-emerald-600",
      };
    }
    if (diff > 0) {
      return {
        icon: <TrendingDown className="size-3" />,
        text: `Comes back slower (every ${formatFrequency(row.actual).toLowerCase().replace("every ", "")})`,
        cls: "text-amber-600",
      };
    }
    return {
      icon: <TrendingUp className="size-3" />,
      text: `Comes back faster (every ${formatFrequency(row.actual).toLowerCase().replace("every ", "")})`,
      cls: "text-blue-600",
    };
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="size-4" />
            Service Preferences
          </CardTitle>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Sparkles className="size-3" />
            Powers rebook reminders
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          How often this client typically returns, per service. Defaults inherit
          from{" "}
          <a
            href="/facility/dashboard/automations"
            className="text-primary underline-offset-4 hover:underline"
          >
            Automations → Rebook Reminders
          </a>
          .
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div
          className={
            optedOut
              ? "flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3"
              : "flex items-center justify-between rounded-lg border bg-muted/20 p-3"
          }
        >
          <div className="flex items-center gap-2.5">
            <BellOff
              className={
                optedOut
                  ? "size-4 text-amber-600"
                  : "size-4 text-muted-foreground"
              }
            />
            <div>
              <p className="text-sm font-medium">
                {optedOut
                  ? "Rebook reminders are off"
                  : "Rebook reminders enabled"}
              </p>
              <p
                className={
                  optedOut
                    ? "text-amber-700/80 text-xs"
                    : "text-muted-foreground text-xs"
                }
              >
                {optedOut
                  ? "This client is excluded from the rebook queue. Other communications still send."
                  : "Use this toggle if the client asks not to receive rebook nudges."}
              </p>
            </div>
          </div>
          <Switch checked={!optedOut} onCheckedChange={(v) => toggleOptOut(!v)} />
        </div>
        {rows.map((row) => {
          const isEditing = editingService === row.service;
          const indicator = compareIndicator(row);
          return (
            <div
              key={row.service}
              className={
                optedOut
                  ? "rounded-lg border border-dashed p-3 opacity-60 transition-colors"
                  : "rounded-lg border p-3 transition-colors hover:bg-muted/30"
              }
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {getServiceLabel(row.service)}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {row.source === "override" ? "Editing override" : "New override"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        Every
                      </span>
                      <Input
                        type="number"
                        min={1}
                        value={draftFrequency.value}
                        onChange={(e) =>
                          setDraftFrequency({
                            ...draftFrequency,
                            value: Math.max(
                              1,
                              parseInt(e.target.value, 10) || 1,
                            ),
                          })
                        }
                        className="h-8 w-16"
                      />
                      <Select
                        value={draftFrequency.unit}
                        onValueChange={(v: FrequencyUnit) =>
                          setDraftFrequency({ ...draftFrequency, unit: v })
                        }
                      >
                        <SelectTrigger className="h-8 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">Days</SelectItem>
                          <SelectItem value="weeks">Weeks</SelectItem>
                          <SelectItem value="months">Months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      placeholder="Reason (optional)"
                      value={draftReason}
                      onChange={(e) => setDraftReason(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={cancelEdit}
                    >
                      <X className="mr-1 size-3" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={saveEdit}
                    >
                      <Save className="mr-1 size-3" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {getServiceLabel(row.service)}
                      </span>
                      <Badge
                        variant={
                          row.source === "override" ? "default" : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {row.source === "override"
                          ? "Override"
                          : "Facility default"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Set to{" "}
                      <span className="text-foreground font-medium">
                        {formatFrequency(row.effective).toLowerCase()}
                      </span>
                    </p>
                    {row.reason && (
                      <p className="text-muted-foreground mt-0.5 text-[11px] italic">
                        “{row.reason}”
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                      <span className="text-muted-foreground">
                        Historical:{" "}
                        <span className="text-foreground font-medium">
                          {row.actual
                            ? formatFrequency(row.actual).toLowerCase()
                            : row.bookingCount === 0
                              ? "no visits"
                              : "1 visit only"}
                        </span>
                      </span>
                      {indicator && (
                        <span
                          className={`flex items-center gap-1 ${indicator.cls}`}
                        >
                          {indicator.icon}
                          {indicator.text}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {row.bookingCount} booking
                        {row.bookingCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {row.source === "override" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => resetToDefault(row.service)}
                      >
                        Reset
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => startEdit(row)}
                    >
                      <Edit className="mr-1 size-3" />
                      {row.source === "override" ? "Edit" : "Override"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
