"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CloudSun,
  Plus,
  Thermometer,
  Wind,
  CloudRain,
  Droplets,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/hooks/use-settings";
import type {
  WeatherWarningRule,
  WeatherCondition,
  WeatherWarningSeverity,
} from "@/types/facility";

const CONDITION_LABELS: Record<WeatherCondition, string> = {
  temperature_below: "Temperature drops below",
  temperature_above: "Temperature rises above",
  feels_like_below: "Feels-like drops below",
  feels_like_above: "Feels-like rises above",
  wind_speed_above: "Wind speed exceeds",
  weather_is: "Weather condition is",
  precipitation_probability_above: "Precipitation chance above",
};

const CONDITION_ICONS: Record<string, typeof Thermometer> = {
  temperature_below: Thermometer,
  temperature_above: Thermometer,
  feels_like_below: Thermometer,
  feels_like_above: Thermometer,
  wind_speed_above: Wind,
  weather_is: CloudRain,
  precipitation_probability_above: Droplets,
};

const WEATHER_TYPES = [
  "clear",
  "cloudy",
  "rain",
  "drizzle",
  "snow",
  "thunderstorm",
  "fog",
  "sleet",
];

const SEVERITY_CONFIG = {
  info: { label: "Info", color: "bg-blue-100 text-blue-800" },
  warning: { label: "Warning", color: "bg-amber-100 text-amber-800" },
  critical: { label: "Critical", color: "bg-red-100 text-red-800" },
};

const DEFAULT_AREAS = [
  { value: "indoor_park", label: "Indoor Park" },
  { value: "outdoor_park", label: "Outdoor Park" },
  { value: "indoor_area", label: "Indoor Area" },
  { value: "covered_patio", label: "Covered Patio" },
  { value: "pool", label: "Pool / Splash Pad" },
  { value: "all", label: "All Areas" },
];

function getStoredCustomAreas(): Array<{ value: string; label: string }> {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("yipyy-forecast-custom-areas");
    if (stored) return JSON.parse(stored);
  } catch {
    /* ignore */
  }
  return [];
}

function saveCustomAreas(areas: Array<{ value: string; label: string }>) {
  localStorage.setItem("yipyy-forecast-custom-areas", JSON.stringify(areas));
}

function makeId() {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function conditionSummary(rule: WeatherWarningRule, unitSymbol: string): string {
  const label = CONDITION_LABELS[rule.condition];
  if (rule.condition === "weather_is") return `${label} ${rule.value}`;
  if (rule.condition === "wind_speed_above")
    return `${label} ${rule.value} km/h`;
  if (rule.condition === "precipitation_probability_above")
    return `${label} ${rule.value}%`;
  return `${label} ${rule.value}${unitSymbol}`;
}

interface RuleForm {
  name: string;
  condition: WeatherCondition;
  value: number | string;
  severity: WeatherWarningSeverity;
  message: string;
  autoAction: string;
  appliesToAreas: string[];
}

const emptyForm: RuleForm = {
  name: "",
  condition: "temperature_below",
  value: 0,
  severity: "warning",
  message: "",
  autoAction: "",
  appliesToAreas: ["outdoor_park"],
};

export function WeatherWarningSettings() {
  const { weatherRules, updateWeatherRules, profile } = useSettings();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WeatherWarningRule | null>(null);
  const [form, setForm] = useState<RuleForm>(emptyForm);
  const [customAreas, setCustomAreas] = useState(getStoredCustomAreas);
  const [newAreaName, setNewAreaName] = useState("");
  const AREA_OPTIONS = [...DEFAULT_AREAS, ...customAreas];
  const unitSymbol =
    profile.preferences.temperatureUnit === "fahrenheit" ? "°F" : "°C";

  const addCustomArea = () => {
    const name = newAreaName.trim();
    if (!name) return;
    const value = name.toLowerCase().replace(/\s+/g, "_");
    if (AREA_OPTIONS.some((a) => a.value === value)) return;
    const updated = [...customAreas, { value, label: name }];
    setCustomAreas(updated);
    saveCustomAreas(updated);
    setNewAreaName("");
  };

  const removeCustomArea = (value: string) => {
    const updated = customAreas.filter((a) => a.value !== value);
    setCustomAreas(updated);
    saveCustomAreas(updated);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (rule: WeatherWarningRule) => {
    setEditing(rule);
    setForm({
      name: rule.name,
      condition: rule.condition,
      value: rule.value,
      severity: rule.severity,
      message: rule.message,
      autoAction: rule.autoAction ?? "",
      appliesToAreas: [...rule.appliesToAreas],
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.message.trim()) {
      toast.error("Name and message are required");
      return;
    }
    const rule: WeatherWarningRule = {
      id: editing?.id ?? makeId(),
      name: form.name,
      condition: form.condition,
      value:
        form.condition === "weather_is"
          ? String(form.value)
          : Number(form.value),
      severity: form.severity,
      message: form.message,
      autoAction: form.autoAction || undefined,
      isActive: editing?.isActive ?? true,
      appliesToAreas:
        form.appliesToAreas as WeatherWarningRule["appliesToAreas"],
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    if (editing) {
      updateWeatherRules(
        weatherRules.map((r) => (r.id === editing.id ? rule : r)),
      );
      toast.success(`"${form.name}" updated`);
    } else {
      updateWeatherRules([...weatherRules, rule]);
      toast.success(`"${form.name}" created`);
    }
    setModalOpen(false);
  };

  const handleDuplicate = (rule: WeatherWarningRule) => {
    const dup = { ...rule, id: makeId(), name: `${rule.name} (copy)` };
    updateWeatherRules([...weatherRules, dup]);
    toast.success("Rule duplicated");
  };

  const handleDelete = (rule: WeatherWarningRule) => {
    updateWeatherRules(weatherRules.filter((r) => r.id !== rule.id));
    toast.success(`"${rule.name}" deleted`);
  };

  const isWeatherCondition = form.condition === "weather_is";
  const isPrecipitation = form.condition === "precipitation_probability_above";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-sky-100">
            <CloudSun className="size-4 text-sky-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Yipyy Forecast</h3>
            <p className="text-muted-foreground text-xs">
              Set up automatic weather alerts to protect pets in your facility
            </p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="size-3.5" />
          Add Rule
        </Button>
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        {weatherRules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-10 text-center">
              <CloudSun className="text-muted-foreground/30 size-10" />
              <p className="text-muted-foreground mt-3 text-sm">
                No forecast rules configured
              </p>
            </CardContent>
          </Card>
        ) : (
          weatherRules.map((rule) => {
            const Icon = CONDITION_ICONS[rule.condition] ?? CloudRain;
            const sev = SEVERITY_CONFIG[rule.severity];
            return (
              <Card
                key={rule.id}
                className="overflow-hidden transition-shadow hover:shadow-md"
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-10 items-center justify-center rounded-xl ${
                        rule.severity === "critical"
                          ? "bg-red-50"
                          : rule.severity === "warning"
                            ? "bg-amber-50"
                            : "bg-blue-50"
                      }`}
                    >
                      <Icon
                        className={`size-5 ${
                          rule.severity === "critical"
                            ? "text-red-600"
                            : rule.severity === "warning"
                              ? "text-amber-600"
                              : "text-blue-600"
                        }`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{rule.name}</p>
                        <Badge className={`text-[10px] ${sev.color}`}>
                          {sev.label}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {conditionSummary(rule, unitSymbol)}
                      </p>
                      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                        {rule.message}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {rule.appliesToAreas.map((area) => (
                          <Badge
                            key={area}
                            variant="outline"
                            className="text-[9px] capitalize"
                          >
                            {area.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={(c) =>
                        updateWeatherRules(
                          weatherRules.map((r) =>
                            r.id === rule.id ? { ...r, isActive: c } : r,
                          ),
                        )
                      }
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(rule)}>
                          <Pencil className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(rule)}>
                          <Copy className="mr-2 size-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(rule)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Weather Rule" : "Add Weather Rule"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Extreme Cold Alert"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select
                  value={form.condition}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      condition: v as WeatherCondition,
                      value: v === "weather_is" ? "rain" : 0,
                    })
                  }
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Threshold</Label>
                {isWeatherCondition ? (
                  <Select
                    value={String(form.value)}
                    onValueChange={(v) => setForm({ ...form, value: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEATHER_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      value={form.value}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          value: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {isPrecipitation
                        ? "%"
                        : form.condition.includes("wind")
                          ? "km/h"
                          : unitSymbol}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <div className="flex gap-2">
                {(["info", "warning", "critical"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, severity: s })}
                    className={`flex-1 rounded-lg border p-2 text-center text-xs font-medium transition-all ${
                      form.severity === s
                        ? `${SEVERITY_CONFIG[s].color} ring-1 ring-current`
                        : "hover:bg-muted"
                    }`}
                  >
                    {SEVERITY_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Alert Message</Label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="What should staff see on the dashboard?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Suggested Action (optional)</Label>
              <Input
                value={form.autoAction}
                onChange={(e) =>
                  setForm({ ...form, autoAction: e.target.value })
                }
                placeholder="e.g. Move all dogs to indoor areas"
              />
            </div>

            <div className="space-y-2">
              <Label>Affected Areas</Label>
              <div className="flex flex-wrap gap-2">
                {AREA_OPTIONS.map((area) => {
                  const isCustom = customAreas.some(
                    (c) => c.value === area.value,
                  );
                  return (
                    <label
                      key={area.value}
                      className="flex items-center gap-1.5"
                    >
                      <Checkbox
                        checked={form.appliesToAreas.includes(area.value)}
                        onCheckedChange={(c) =>
                          setForm({
                            ...form,
                            appliesToAreas: c
                              ? [...form.appliesToAreas, area.value]
                              : form.appliesToAreas.filter(
                                  (a) => a !== area.value,
                                ),
                          })
                        }
                      />
                      <span className="text-xs">{area.label}</span>
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => removeCustomArea(area.value)}
                          className="text-muted-foreground text-[10px] hover:text-red-500"
                        >
                          x
                        </button>
                      )}
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomArea();
                    }
                  }}
                  placeholder="Add custom area..."
                  className="h-7 flex-1 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={addCustomArea}
                  disabled={!newAreaName.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
