"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  Zap,
  Palette,
  Shield,
  Lock,
  WandSparkles,
  Workflow,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBookingStatusRules,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import type { BookingStatusRules } from "@/lib/settings/booking-statuses";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { useFacilityRole } from "@/hooks/use-facility-role";

// ── Types ────────────────────────────────────────────────────────────────────

interface CustomStatus {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface AutoTransitions {
  onDepositPaid: string;
  onCheckIn: string;
  onCheckout: string;
  onPaymentComplete: string;
}

type AutoTransitionAction = keyof AutoTransitions;

interface IftttTransitionRule {
  id: string;
  service: string;
  action: AutoTransitionAction;
  currentStatus: string;
  targetStatus: string;
  enabled: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SYSTEM_STATUSES = [
  { id: "estimate_sent", labelKey: "statusEstimateSent", color: "violet" },
  { id: "pending", labelKey: "statusPending", color: "amber" },
  { id: "confirmed", labelKey: "statusConfirmed", color: "emerald" },
  { id: "checked_in", labelKey: "statusCheckedIn", color: "teal" },
  { id: "in_progress", labelKey: "statusInProgress", color: "orange" },
  { id: "ready", labelKey: "statusReady", color: "purple" },
  { id: "completed", labelKey: "statusCompleted", color: "slate" },
  { id: "no_show", labelKey: "statusNoShow", color: "red" },
  { id: "cancelled", labelKey: "statusCancelled", color: "red" },
  { id: "declined", labelKey: "statusDeclined", color: "red" },
];

const COLOR_OPTIONS = [
  { value: "red", labelKey: "colourRed", dot: "bg-red-500" },
  { value: "orange", labelKey: "colourOrange", dot: "bg-orange-500" },
  { value: "amber", labelKey: "colourAmber", dot: "bg-amber-500" },
  { value: "yellow", labelKey: "colourYellow", dot: "bg-yellow-500" },
  { value: "emerald", labelKey: "colourGreen", dot: "bg-emerald-500" },
  { value: "teal", labelKey: "colourTeal", dot: "bg-teal-500" },
  { value: "blue", labelKey: "colourBlue", dot: "bg-blue-500" },
  { value: "violet", labelKey: "colourViolet", dot: "bg-violet-500" },
  { value: "purple", labelKey: "colourPurple", dot: "bg-purple-500" },
  { value: "pink", labelKey: "colourPink", dot: "bg-pink-500" },
  { value: "slate", labelKey: "colourGrey", dot: "bg-slate-500" },
];

const TRANSITION_EVENT_OPTIONS: {
  value: AutoTransitionAction;
  labelKey: string;
}[] = [
  { value: "onDepositPaid", labelKey: "eventDepositPaid" },
  { value: "onPaymentComplete", labelKey: "eventPaymentComplete" },
  { value: "onCheckIn", labelKey: "eventCheckIn" },
  { value: "onCheckout", labelKey: "eventCheckout" },
];

const BASE_SERVICE_OPTIONS: {
  value: string;
  labelKey?: string;
  name?: string;
}[] = [
  { value: "any", labelKey: "svcAny" },
  { value: "boarding", labelKey: "svcBoarding" },
  { value: "daycare", labelKey: "svcDaycare" },
  { value: "grooming", labelKey: "svcGrooming" },
  { value: "training", labelKey: "svcTraining" },
  { value: "evaluation", labelKey: "svcEvaluation" },
];

let _customId = 600;
let _iftttRuleId = 1200;

// ── Component ────────────────────────────────────────────────────────────────

// Statuses that end the lifecycle — shown separately from the linear flow.
const TERMINAL_STATUS_IDS = new Set(["no_show", "cancelled", "declined"]);

// Short labels for the auto-transition events, used on the flow arrows.
const EVENT_ARROW_KEYS: Record<AutoTransitionAction, string> = {
  onDepositPaid: "arrowDeposit",
  onPaymentComplete: "arrowPayment",
  onCheckIn: "arrowCheckIn",
  onCheckout: "arrowCheckout",
};

// ── WHERE THESE RULES LIVE ──────────────────────────────────────────────────
//
// In `facility_settings` (`booking_status_rules`) since 2026-09-12. Save
// wrote them into fixture facility 11 in `src/data/facilities.ts` — an
// assignment into an imported module, gone on reload — and the booking page
// read them from there for every facility.
//
// Wrapper gates on the load; the editor seeds from props. A `useState`
// initialiser runs once, so mounting before the facility's own rules arrive
// would show the defaults and write them back on the first Save.
export function BookingStatusSettings() {
  const { rules, isPending } = useBookingStatusRules();
  if (isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  return <BookingStatusEditor initial={rules} />;
}

function BookingStatusEditor({ initial }: { initial: BookingStatusRules }) {
  const t = useSettingsText().section("booking-statuses");
  const { role } = useFacilityRole();
  const saveSetting = useSaveFacilitySetting();

  const [showFlow, setShowFlow] = useState(true);

  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>(
    initial.customStatuses,
  );
  const [autoTransitions, setAutoTransitions] = useState<AutoTransitions>(
    initial.autoTransitions,
  );
  const [iftttTransitionRules, setIftttTransitionRules] = useState<
    IftttTransitionRule[]
  >(initial.iftttTransitionRules);

  const serviceOptions = (() => {
    const map = new Map<string, string>();

    for (const option of BASE_SERVICE_OPTIONS) {
      map.set(
        option.value,
        option.labelKey ? t(option.labelKey) : (option.name ?? option.value),
      );
    }

    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  })();

  const statusOptions = (() => {
    const statusMap = new Map<string, string>();

    for (const status of SYSTEM_STATUSES) {
      statusMap.set(status.id, t(status.labelKey));
    }

    for (const status of customStatuses) {
      const name = status.name.trim();
      if (!name || statusMap.has(status.id)) continue;
      statusMap.set(status.id, name);
    }

    return Array.from(statusMap.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  })();

  // Linear lifecycle for the flow preview: system statuses in their canonical
  // order (minus terminal ones), merged with custom statuses by their position.
  const statusFlow = (() => {
    const systemFlow = SYSTEM_STATUSES.filter(
      (s) => !TERMINAL_STATUS_IDS.has(s.id),
    ).map((s, i) => ({
      id: s.id,
      label: t(s.labelKey),
      color: s.color,
      order: i,
    }));
    const customFlow = customStatuses
      .filter((s) => s.name.trim())
      .map((s) => ({
        id: s.id,
        label: s.name.trim(),
        color: s.color,
        order: s.position ?? systemFlow.length,
      }));
    return [...systemFlow, ...customFlow].sort((a, b) => a.order - b.order);
  })();

  const exitStatuses = SYSTEM_STATUSES.filter((s) =>
    TERMINAL_STATUS_IDS.has(s.id),
  );

  // Auto-transition events (if any) that lead into a given status.
  const eventsIntoStatus = (statusId: string): string =>
    (Object.keys(autoTransitions) as AutoTransitionAction[])
      .filter((k) => autoTransitions[k] === statusId)
      .map((k) => t(EVENT_ARROW_KEYS[k]))
      .join(", ");

  const handleAddCustom = () => {
    _customId += 1;
    setCustomStatuses((prev) => [
      ...prev,
      {
        id: `custom_${_customId}`,
        name: "",
        color: "blue",
        position: prev.length + 3,
      },
    ]);
  };

  const handleRemoveCustom = (id: string) => {
    setCustomStatuses((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateCustom = (id: string, updates: Partial<CustomStatus>) => {
    setCustomStatuses((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    );
  };

  const handleAddIftttRule = () => {
    _iftttRuleId += 1;
    setIftttTransitionRules((prev) => [
      ...prev,
      {
        id: `ifttt_${_iftttRuleId}`,
        service: "any",
        action: "onCheckIn",
        currentStatus: "any",
        targetStatus: "checked_in",
        enabled: true,
      },
    ]);
  };

  const handleUpdateIftttRule = (
    id: string,
    updates: Partial<IftttTransitionRule>,
  ) => {
    setIftttTransitionRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule)),
    );
  };

  const handleRemoveIftttRule = (id: string) => {
    setIftttTransitionRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  const handleSave = () => {
    const empty = customStatuses.find((s) => !s.name.trim());
    if (empty) {
      toast.error(t("needsName"));
      return;
    }

    saveSetting.mutate(
      {
        domain: "booking_status_rules",
        value: {
          customStatuses,
          autoTransitions,
          iftttTransitionRules,
        } satisfies BookingStatusRules,
      },
      {
        onSuccess: () => toast.success(t("savedToast")),
        onError: (error) =>
          toast.error(t("saveFailed"), { description: error.message }),
      },
    );
  };

  if (role !== "owner" && role !== "manager") {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8">
          <Shield className="text-muted-foreground size-5" />
          <p className="text-muted-foreground text-sm">{t("restricted")}</p>
        </CardContent>
      </Card>
    );
  }

  // min-w-0: a grid item is `min-width: auto`, so below lg this card grew to
  // its widest row and the page scrolled sideways at 599px (§6 rule 7).
  return (
    <div className="min-w-0 space-y-6">
      <div>
        <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
      </div>

      {/* Status Flow Preview — read-only lifecycle diagram */}
      <Card>
        <button
          type="button"
          onClick={() => setShowFlow((v) => !v)}
          className="hover:bg-muted/30 flex min-h-10 w-full items-center rounded-t-xl text-left transition-colors max-lg:min-h-12"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Workflow className="size-4" />
                {t("flowTitle")}
                <span className="text-muted-foreground rounded-full border px-1.5 py-0.5 text-[10px] font-normal">
                  {t("readOnly")}
                </span>
              </CardTitle>
              <ChevronDown
                className={cn(
                  "text-muted-foreground size-4 transition-transform",
                  showFlow && "rotate-180",
                )}
              />
            </div>
          </CardHeader>
        </button>
        {showFlow && (
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-xs">{t("flowHelp")}</p>
            <div className="flex items-center overflow-x-auto pb-2">
              {statusFlow.map((s, i) => {
                const dot =
                  COLOR_OPTIONS.find((c) => c.value === s.color)?.dot ??
                  "bg-muted-foreground";
                const events = i > 0 ? eventsIntoStatus(s.id) : "";
                return (
                  <div key={s.id} className="flex shrink-0 items-center">
                    {i > 0 && (
                      <div className="flex shrink-0 flex-col items-center px-1">
                        {events && (
                          <span className="text-muted-foreground text-[9px] leading-none whitespace-nowrap">
                            {events}
                          </span>
                        )}
                        <ArrowRight className="text-muted-foreground size-4" />
                      </div>
                    )}
                    <span className="bg-background inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
                      <span className={cn("size-2 rounded-full", dot)} />
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {exitStatuses.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-t pt-2 text-[11px]">
                <span className="text-muted-foreground">{t("exitStates")}</span>
                {exitStatuses.map((s) => {
                  const dot =
                    COLOR_OPTIONS.find((c) => c.value === s.color)?.dot ??
                    "bg-muted-foreground";
                  return (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
                    >
                      <span className={cn("size-1.5 rounded-full", dot)} />
                      {t(s.labelKey)}
                    </span>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* System Statuses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Lock className="size-4" />
            {t("systemTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-3 text-xs">
            {t("systemHelp")}
          </p>
          <div className="flex flex-wrap gap-2">
            {SYSTEM_STATUSES.map((s) => {
              const colorOpt = COLOR_OPTIONS.find((c) => c.value === s.color);
              return (
                <div
                  key={s.id}
                  className="bg-background flex min-h-10 items-center gap-1.5 rounded-full border px-3 max-lg:min-h-12"
                >
                  <div
                    className={cn(
                      "size-2 rounded-full",
                      colorOpt?.dot ?? "bg-muted-foreground",
                    )}
                  />
                  <span className="text-xs font-medium">{t(s.labelKey)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom Statuses */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Palette className="size-4" />
              {t("customTitle")}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleAddCustom}
            >
              <Plus className="size-3.5" />
              {t("addStatus")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {customStatuses.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              {t("noCustom")}
            </p>
          ) : (
            customStatuses.map((status) => (
              <div
                key={status.id}
                // Twelve columns only once there is room for twelve. Below `sm`
                // this row is three fields and a delete in ~570px, where 4/3/4/1
                // tracks truncate "After In Progress" to "After In Progr" — so
                // it stacks instead. minmax(0,1fr) above that, because a
                // SelectTrigger is `w-fit whitespace-nowrap` and an `auto` floor
                // lets a long status name widen its own column.
                className="grid items-end gap-3 rounded-xl border p-3 sm:grid-cols-12"
              >
                <div className="sm:col-span-4">
                  <Label className="text-[11px]">{t("name")}</Label>
                  <Input
                    value={status.name}
                    onChange={(e) =>
                      handleUpdateCustom(status.id, { name: e.target.value })
                    }
                    placeholder={t("namePlaceholder")}
                    className="mt-1 text-sm"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label className="text-[11px]">{t("colour")}</Label>
                  <Select
                    value={status.color}
                    onValueChange={(v) =>
                      handleUpdateCustom(status.id, { color: v })
                    }
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "size-2.5 rounded-full",
                            COLOR_OPTIONS.find((c) => c.value === status.color)
                              ?.dot ?? "bg-muted-foreground",
                          )}
                        />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn("size-2.5 rounded-full", c.dot)}
                            />
                            {t(c.labelKey)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-4">
                  <Label className="text-[11px]">{t("positionAfter")}</Label>
                  <Select
                    value={String(status.position)}
                    onValueChange={(v) =>
                      handleUpdateCustom(status.id, {
                        position: parseInt(v, 10),
                      })
                    }
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SYSTEM_STATUSES.map((s, idx) => (
                        <SelectItem key={s.id} value={String(idx)}>
                          {t("afterStatus").replace("{status}", t(s.labelKey))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end sm:col-span-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive size-10 rounded-full p-0 max-lg:size-12"
                    onClick={() => handleRemoveCustom(status.id)}
                    aria-label={t("removeStatus")}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Auto-Transition Rules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="size-4" />
            {t("autoTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-xs">{t("autoHelp")}</p>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-center gap-2">
              <Zap className="size-3.5 text-sky-600" />
              <h4 className="text-sm font-semibold">{t("fallbackTitle")}</h4>
            </div>
            <p className="text-muted-foreground text-xs">{t("fallbackHelp")}</p>

            <div className="space-y-3">
              <TransitionRule
                label={t("ruleDepositPaid")}
                value={autoTransitions.onDepositPaid}
                onChange={(v) =>
                  setAutoTransitions((p) => ({ ...p, onDepositPaid: v }))
                }
                options={statusOptions}
              />
              <Separator />
              <TransitionRule
                label={t("rulePaymentComplete")}
                value={autoTransitions.onPaymentComplete}
                onChange={(v) =>
                  setAutoTransitions((p) => ({ ...p, onPaymentComplete: v }))
                }
                options={statusOptions}
              />
              <Separator />
              <TransitionRule
                label={t("ruleCheckIn")}
                value={autoTransitions.onCheckIn}
                onChange={(v) =>
                  setAutoTransitions((p) => ({ ...p, onCheckIn: v }))
                }
                options={statusOptions}
              />
              <Separator />
              <TransitionRule
                label={t("ruleCheckout")}
                value={autoTransitions.onCheckout}
                onChange={(v) =>
                  setAutoTransitions((p) => ({ ...p, onCheckout: v }))
                }
                options={statusOptions}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <WandSparkles className="size-3.5 text-violet-600" />
                  <h4 className="text-sm font-semibold">{t("iftttTitle")}</h4>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {t("iftttHelp")}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleAddIftttRule}
              >
                <Plus className="size-3.5" />
                {t("addIfttt")}
              </Button>
            </div>

            {iftttTransitionRules.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-sm">
                {t("noIfttt")}
              </p>
            ) : (
              <div className="space-y-3">
                {iftttTransitionRules.map((rule) => (
                  <IftttRuleRow
                    key={rule.id}
                    rule={rule}
                    serviceOptions={serviceOptions}
                    statusOptions={statusOptions}
                    onUpdate={(updates) =>
                      handleUpdateIftttRule(rule.id, updates)
                    }
                    onRemove={() => handleRemoveIftttRule(rule.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className="gap-1.5"
          disabled={saveSetting.isPending}
          aria-busy={saveSetting.isPending}
        >
          {saveSetting.isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function TransitionRule({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const t = useSettingsText().section("booking-statuses");

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 items-center gap-2">
        <Zap className="text-muted-foreground size-3.5" />
        <span className="text-sm">{label}</span>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full sm:w-auto sm:min-w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{t("noAutoTransition")}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              → {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function IftttRuleRow({
  rule,
  serviceOptions,
  statusOptions,
  onUpdate,
  onRemove,
}: {
  rule: IftttTransitionRule;
  serviceOptions: { value: string; label: string }[];
  statusOptions: { value: string; label: string }[];
  onUpdate: (updates: Partial<IftttTransitionRule>) => void;
  onRemove: () => void;
}) {
  const t = useSettingsText().section("booking-statuses");

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
      {/* Two things were wrong here and they hid each other.

          `grid-cols-5` is five `minmax(auto, 1fr)` tracks, and a SelectTrigger
          is `w-fit whitespace-nowrap` — so "Checkout completes" widened its own
          track and pushed its own chevron out of the control. CLAUDE.md states
          the rule: every fr column needs `minmax(0, …)`.

          But the floor alone only turned an overflow into "Pet is check". The
          five columns were the real fault: `xl:` measures the VIEWPORT, and
          this row never sees viewport width — it sits inside the settings pane,
          past a nav rail and a section rail, which is ~530px at 1440. Five
          tracks in 530px is ~90px a field. Two is what fits, at every width
          this pane actually has. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-[11px]">{t("ifService")}</Label>
          <Select
            value={rule.service}
            onValueChange={(value) => onUpdate({ service: value })}
          >
            <SelectTrigger className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {serviceOptions.map((service) => (
                <SelectItem key={service.value} value={service.value}>
                  {service.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[11px]">{t("whenEvent")}</Label>
          <Select
            value={rule.action}
            onValueChange={(value) =>
              onUpdate({ action: value as AutoTransitionAction })
            }
          >
            <SelectTrigger className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSITION_EVENT_OPTIONS.map((event) => (
                <SelectItem key={event.value} value={event.value}>
                  {t(event.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[11px]">{t("andStatus")}</Label>
          <Select
            value={rule.currentStatus}
            onValueChange={(value) => onUpdate({ currentStatus: value })}
          >
            <SelectTrigger className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t("anyStatus")}</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[11px]">{t("thenStatus")}</Label>
          <Select
            value={rule.targetStatus}
            onValueChange={(value) => onUpdate({ targetStatus: value })}
          >
            <SelectTrigger className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("noAutoTransition")}</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* The switch and the delete are not a fifth field — with two columns
            they take the full row under them, so the pair reads as the rule's
            controls rather than as another thing to set. */}
        <div className="flex items-end justify-between gap-3 sm:col-span-2">
          <div className="mb-1.5 flex items-center gap-2">
            <Switch
              checked={rule.enabled}
              onCheckedChange={(checked) =>
                onUpdate({ enabled: Boolean(checked) })
              }
            />
            <span className="text-xs">{t("enabled")}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive size-10 rounded-full p-0 max-lg:size-12"
            onClick={onRemove}
            aria-label={t("removeRule")}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
