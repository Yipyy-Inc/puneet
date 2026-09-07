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
import { useSettingsText } from "@/lib/settings/use-settings-text";
import type {
  WeatherWarningRule,
  WeatherCondition,
  WeatherWarningSeverity,
} from "@/types/facility";

// The three maps below hold KEYS, not words. They used to hold English, which
// is why a French user configured weather rules entirely in English — the
// condition, the severity and every area name. The words live in the settings
// catalogue now and the maps say which key each value uses.
const CONDITION_KEYS: Record<WeatherCondition, string> = {
  temperature_below: "conditionTemperatureBelow",
  temperature_above: "conditionTemperatureAbove",
  feels_like_below: "conditionFeelsLikeBelow",
  feels_like_above: "conditionFeelsLikeAbove",
  wind_speed_above: "conditionWindSpeedAbove",
  weather_is: "conditionWeatherIs",
  precipitation_probability_above: "conditionPrecipitationAbove",
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
  info: { key: "severityInfo", color: "bg-blue-100 text-blue-800" },
  warning: { key: "severityWarning", color: "bg-amber-100 text-amber-800" },
  critical: { key: "severityCritical", color: "bg-red-100 text-red-800" },
};

const DEFAULT_AREAS = [
  { value: "indoor_park", key: "areaIndoorPark" },
  { value: "outdoor_park", key: "areaOutdoorPark" },
  { value: "indoor_area", key: "areaIndoorArea" },
  { value: "covered_patio", key: "areaCoveredPatio" },
  { value: "pool", key: "areaPool" },
  { value: "all", key: "areaAll" },
];

/** A weather type is stored lowercase and rendered from the catalogue. */
const WEATHER_TYPE_KEY = (type: string) =>
  `weather${type[0].toUpperCase()}${type.slice(1)}`;

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

function conditionSummary(
  rule: WeatherWarningRule,
  unitSymbol: string,
  t: (key: string) => string,
): string {
  const label = t(CONDITION_KEYS[rule.condition]);
  // The VALUE is translated too. Without this the French summary read "La
  // condition météo est rain" — the label in French, the condition in English,
  // in one sentence.
  if (rule.condition === "weather_is")
    return `${label} ${t(WEATHER_TYPE_KEY(String(rule.value))).toLowerCase()}`;
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
  const t = useSettingsText().section("weather");
  const fill = (key: string, values: Record<string, string>) =>
    Object.entries(values).reduce(
      (text, [name, value]) => text.replace(`{${name}}`, value),
      t(key),
    );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WeatherWarningRule | null>(null);
  const [form, setForm] = useState<RuleForm>(emptyForm);
  const [customAreas, setCustomAreas] = useState(getStoredCustomAreas);
  const [newAreaName, setNewAreaName] = useState("");
  const AREA_OPTIONS: Array<{ value: string; key?: string; label?: string }> = [
    ...DEFAULT_AREAS,
    ...customAreas,
  ];

  /**
   * A shipped area is a KEY; one the facility typed is a NAME.
   *
   * §5q: "a pet's name, a breed as the owner typed it" never passes through
   * the locale layer, and a custom area is the same kind of thing — somebody
   * called it "Le grand parc" and it stays that in both languages.
   */
  const areaLabel = (area: { key?: string; label?: string }) =>
    area.key ? t(area.key) : (area.label ?? "");
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
      toast.error(t("nameAndMessageRequired"));
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
      toast.success(fill("ruleUpdated", { name: form.name }));
    } else {
      updateWeatherRules([...weatherRules, rule]);
      toast.success(fill("ruleCreated", { name: form.name }));
    }
    setModalOpen(false);
  };

  const handleDuplicate = (rule: WeatherWarningRule) => {
    const dup = {
      ...rule,
      id: makeId(),
      name: fill("copySuffix", { name: rule.name }),
    };
    updateWeatherRules([...weatherRules, dup]);
    toast.success(fill("ruleDuplicated", { name: rule.name }));
  };

  const handleDelete = (rule: WeatherWarningRule) => {
    updateWeatherRules(weatherRules.filter((r) => r.id !== rule.id));
    toast.success(fill("ruleDeleted", { name: rule.name }));
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
            <h3 className="text-[14.5px] font-bold">{t("title")}</h3>
            <p className="text-ink-tertiary text-[13.5px]">{t("intro")}</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="size-3.5" />
          {t("addRule")}
        </Button>
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        {weatherRules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-10 text-center">
              <CloudSun className="text-muted-foreground/30 size-10" />
              <p className="text-ink-tertiary mt-3 text-[14.5px]">
                {t("noRules")}
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
                        <p className="text-[14.5px] font-semibold">
                          {rule.name}
                        </p>
                        <Badge className={`text-[12px] ${sev.color}`}>
                          {t(sev.key)}
                        </Badge>
                      </div>
                      <p className="text-ink-tertiary text-[13.5px]">
                        {conditionSummary(rule, unitSymbol, t)}
                      </p>
                      <p className="text-ink-tertiary mt-0.5 line-clamp-1 text-[13.5px]">
                        {rule.message}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {/* These read `area.replace(/_/g, " ")` with a CSS
                            `capitalize` — the stored key, prettied up. So the
                            badges said "Outdoor Park" in French while the
                            checkbox that set them said "Parc extérieur". */}
                        {rule.appliesToAreas.map((area) => (
                          <Badge
                            key={area}
                            variant="outline"
                            className="text-[12px]"
                          >
                            {areaLabel(
                              AREA_OPTIONS.find((a) => a.value === area) ?? {
                                label: area.replace(/_/g, " "),
                              },
                            )}
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
                          <span className="sr-only">{t("openMenu")}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(rule)}>
                          <Pencil className="mr-2 size-4" />
                          {t("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(rule)}>
                          <Copy className="mr-2 size-4" />
                          {t("duplicate")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(rule)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          {t("delete")}
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
              {editing ? t("editRule") : t("createRule")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("ruleName")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("ruleNamePlaceholder")}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
              <div className="space-y-2">
                <Label>{t("condition")}</Label>
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
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONDITION_KEYS).map(([value, key]) => (
                      <SelectItem key={value} value={value}>
                        {t(key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("threshold")}</Label>
                {isWeatherCondition ? (
                  <Select
                    value={String(form.value)}
                    onValueChange={(v) => setForm({ ...form, value: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEATHER_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(WEATHER_TYPE_KEY(type))}
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
              <Label>{t("severity")}</Label>
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
                    {t(SEVERITY_CONFIG[s].key)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("alertMessage")}</Label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder={t("alertMessagePlaceholder")}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("suggestedAction")}</Label>
              <Input
                value={form.autoAction}
                onChange={(e) =>
                  setForm({ ...form, autoAction: e.target.value })
                }
                placeholder={t("suggestedActionPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("affectedAreas")}</Label>
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
                      <span className="text-[13.5px]">{areaLabel(area)}</span>
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => removeCustomArea(area.value)}
                          aria-label={t("removeArea")}
                          className="text-ink-tertiary hover:text-error-ink flex size-6 items-center justify-center rounded-full text-[13.5px]"
                        >
                          ×
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
                  placeholder={t("addAreaPlaceholder")}
                  aria-label={t("addArea")}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomArea}
                  disabled={!newAreaName.trim()}
                >
                  {t("addArea")}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSave}>
              {editing ? t("save") : t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
