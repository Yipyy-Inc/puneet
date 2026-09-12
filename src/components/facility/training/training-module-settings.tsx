"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { trainingQueries } from "@/lib/api/training";
import { useSaveFacilitySetting } from "@/lib/api/facility-settings";
import { useSaveTrainingCatalog } from "@/lib/api/training-catalog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  Bell,
  BookOpen,
  Building,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Edit,
  FileSignature,
  GraduationCap,
  Home,
  Hourglass,
  Mail,
  MapPin,
  MessageSquare,
  Plus,
  Route,
  Save,
  Settings as SettingsIcon,
  Sun,
  Ticket,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import {
  DURATION_OPTIONS,
  REPORT_CARD_SEND_MODE_LABELS,
  type ReportCardSendMode,
  type TrainingLocation,
  type TrainingModuleSettings,
} from "@/lib/training-module-settings";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { useTrainingLabels } from "@/lib/settings/use-training-labels";
import { formatDuration, formatNumber } from "@/lib/i18n/format";
import { defaultTrainingWaivers } from "@/data/training-waivers";
import type {
  TrainingPathway,
  TrainingPathwayStep,
} from "@/data/training-pathways";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TrainingPackage } from "@/types/training";
import { MILESTONE_ORDER } from "@/lib/pet-milestones";
import { MILESTONE_VISUAL } from "@/components/training/milestone-visual-table";

// Module-level seed for newly-created location ids — keeps writes pure for
// the React Compiler (no Date.now() inside render).
let newLocationSeed = 0;
function nextLocationId(): string {
  newLocationSeed += 1;
  return `loc-custom-${newLocationSeed}`;
}

// Module-level seed for newly-created pathway ids — same rationale as the
// location seed above; keeps the create handler pure.
let newPathwaySeed = 0;
function nextPathwayId(): string {
  newPathwaySeed += 1;
  return `pathway-custom-${newPathwaySeed}`;
}

// ── LOADED FIRST, THEN SEEDED ─────────────────────────────────────────────
//
// The form keeps a draft in useState, seeded from what is saved. That was
// safe while "saved" was a constant; it is the facility's settings now, which
// arrive after the first render — and a useState seeded before they land
// keeps the shipped defaults forever, and saves them over the facility's own.
// So the saved values are loaded here, and the form is rendered only once
// they have arrived.
export function TrainingModuleSettings() {
  const moduleQuery = useQuery(trainingQueries.moduleSettings());
  const pathwaysQuery = useQuery(trainingQueries.allTrainingPathways());
  const error = moduleQuery.error ?? pathwaysQuery.error;
  if (error) {
    return <p className="text-destructive text-sm">{error.message}</p>;
  }
  if (!moduleQuery.data || !pathwaysQuery.data) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }
  return (
    <TrainingModuleSettingsForm
      persisted={moduleQuery.data}
      persistedPathways={pathwaysQuery.data}
    />
  );
}

function TrainingModuleSettingsForm({
  persisted,
  persistedPathways,
}: {
  persisted: TrainingModuleSettings;
  persistedPathways: TrainingPathway[];
}) {
  const { locale, section } = useSettingsText();
  const t = section("training");
  const labels = useTrainingLabels();
  // Intl picks the plural form, not `n === 1`: French counts 0 as singular.
  const rules = new Intl.PluralRules(locale === "fr" ? "fr-CA" : "en-CA");
  const pluralWord = (n: number, one: string, other: string) =>
    t(rules.select(n) === "one" ? one : other);

  const queryClient = useQueryClient();
  const { mutateAsync: saveSetting, isPending: savingModule } =
    useSaveFacilitySetting();
  const { save: savePathways, saving: savingPathways } =
    useSaveTrainingCatalog<TrainingPathway>("training_pathways");
  const saving = savingModule || savingPathways;
  const { data: programs = [] } = useQuery(trainingQueries.packages());
  const [draft, setDraft] = useState<TrainingModuleSettings>(persisted);
  const [saved, setSaved] = useState<TrainingModuleSettings>(persisted);
  const [pathwaysDraft, setPathwaysDraft] =
    useState<TrainingPathway[]>(persistedPathways);
  const [pathwaysSaved, setPathwaysSaved] =
    useState<TrainingPathway[]>(persistedPathways);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] =
    useState<TrainingLocation | null>(null);
  const [deletingLocation, setDeletingLocation] =
    useState<TrainingLocation | null>(null);
  const [pathwayDialogOpen, setPathwayDialogOpen] = useState(false);
  const [editingPathway, setEditingPathway] = useState<TrainingPathway | null>(
    null,
  );
  const [deletingPathway, setDeletingPathway] =
    useState<TrainingPathway | null>(null);

  const dirty = useMemo(
    () =>
      JSON.stringify(draft) !== JSON.stringify(saved) ||
      JSON.stringify(pathwaysDraft) !== JSON.stringify(pathwaysSaved),
    [draft, saved, pathwaysDraft, pathwaysSaved],
  );

  function update<K extends keyof TrainingModuleSettings>(
    key: K,
    value: TrainingModuleSettings[K],
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function updateNotifications<
    K extends keyof TrainingModuleSettings["notifications"],
  >(key: K, value: TrainingModuleSettings["notifications"][K]) {
    setDraft((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
  }

  // Both halves go to the facility's settings — the module's own, and the
  // pathways list — and the toast waits for both. It wrote them into the
  // query cache ("Persistence to a real backend lands later").
  async function handleSave() {
    try {
      await Promise.all([
        saveSetting({ domain: "training_module_settings", value: draft }),
        savePathways(pathwaysDraft),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      return;
    }
    await queryClient.invalidateQueries({
      queryKey: trainingQueries.moduleSettings().queryKey,
    });
    setSaved(draft);
    setPathwaysSaved(pathwaysDraft);
    toast.success(t("savedToast"));
  }

  function handleRevert() {
    setDraft(saved);
    setPathwaysDraft(pathwaysSaved);
    toast.success(t("revertedToast"));
  }

  function openAddPathway() {
    setEditingPathway(null);
    setPathwayDialogOpen(true);
  }

  function openEditPathway(pathway: TrainingPathway) {
    setEditingPathway(pathway);
    setPathwayDialogOpen(true);
  }

  function persistPathway(record: TrainingPathway) {
    setPathwaysDraft((prev) => {
      const exists = prev.some((p) => p.id === record.id);
      return exists
        ? prev.map((p) => (p.id === record.id ? record : p))
        : [...prev, record];
    });
    setPathwayDialogOpen(false);
    setEditingPathway(null);
  }

  function confirmDeletePathway() {
    if (!deletingPathway) return;
    const removed = deletingPathway;
    setPathwaysDraft((prev) => prev.filter((p) => p.id !== removed.id));
    toast.success(t("pathRemoved").replace("{name}", removed.name));
    setDeletingPathway(null);
  }

  function openAddLocation() {
    setEditingLocation(null);
    setLocationDialogOpen(true);
  }

  function openEditLocation(location: TrainingLocation) {
    setEditingLocation(location);
    setLocationDialogOpen(true);
  }

  function persistLocation(record: TrainingLocation) {
    setDraft((prev) => {
      const exists = prev.locations.some((l) => l.id === record.id);
      const locations = exists
        ? prev.locations.map((l) => (l.id === record.id ? record : l))
        : [...prev.locations, record];
      return { ...prev, locations };
    });
    setLocationDialogOpen(false);
    setEditingLocation(null);
  }

  function confirmDeleteLocation() {
    if (!deletingLocation) return;
    setDraft((prev) => ({
      ...prev,
      locations: prev.locations.filter((l) => l.id !== deletingLocation.id),
    }));
    toast.success(t("locRemoved").replace("{name}", deletingLocation.name));
    setDeletingLocation(null);
  }

  return (
    <>
      <div className="space-y-6 pb-24">
        {/* ── Module ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="text-muted-foreground size-4" />
              {t("modTitle")}
            </CardTitle>
            <p className="text-muted-foreground text-sm">{t("modIntro")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow
              label={t("modEnabled")}
              description={t("modEnabledHelp")}
              checked={draft.enabled}
              onCheckedChange={(v) => update("enabled", v)}
            />
            <ToggleRow
              label={t("modVisible")}
              description={t("modVisibleHelp")}
              checked={draft.visibleToCustomers}
              onCheckedChange={(v) => update("visibleToCustomers", v)}
              disabled={!draft.enabled}
            />
          </CardContent>
        </Card>

        {/* ── Training locations ────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="text-muted-foreground size-4" />
                {t("locTitle")}
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("locIntro")}
              </p>
            </div>
            <Button onClick={openAddLocation} size="sm">
              <Plus className="mr-1.5 size-4" />
              {t("locAdd")}
            </Button>
          </CardHeader>
          <CardContent>
            {draft.locations.length === 0 ? (
              <div className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">
                {t("locEmpty")}
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {draft.locations.map((location) => (
                  <li
                    key={location.id}
                    className={cn(
                      // §6 rule 4: the "Hidden" chip beside the name carries this, in a
                      // word. Opacity carried it by taking every ratio in the row down.
                      "bg-card flex items-center gap-3 rounded-xl border p-3 shadow-sm",
                    )}
                  >
                    <div
                      className={cn(
                        // A SOLID disc with a white glyph rather than a wash behind a tinted
                        // icon — §6 rule 2, and light-on-light is what disappears.
                        "flex size-9 shrink-0 items-center justify-center rounded-xl text-white",
                        location.type === "indoor" ? "bg-violet" : "bg-success",
                      )}
                    >
                      {location.type === "indoor" ? (
                        <Home className="size-4" />
                      ) : (
                        <Sun className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {location.name}
                      </p>
                      <p className="text-muted-foreground mt-0.5 inline-flex flex-wrap items-center gap-x-1.5 text-[11px]">
                        <Badge variant="outline" className="text-[10px]">
                          {location.type === "indoor"
                            ? t("locIndoor")
                            : t("locOutdoor")}
                        </Badge>
                        {location.capacity && (
                          <span className="inline-flex items-center gap-0.5">
                            <Users className="size-3" />
                            {t("locMax").replace(
                              "{n}",
                              formatNumber(location.capacity, locale),
                            )}
                          </span>
                        )}
                        {!location.isActive && (
                          <Badge variant="outline" className="text-[10px]">
                            {t("locHiddenTag")}
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEditLocation(location)}
                        title={t("locEdit")}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive size-8"
                        onClick={() => setDeletingLocation(location)}
                        title={t("locDelete")}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ── Training pathways ─────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Route className="text-muted-foreground size-4" />
                {t("pathTitle")}
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("pathIntro")}
              </p>
            </div>
            <Button onClick={openAddPathway} size="sm">
              <Plus className="mr-1.5 size-4" />
              {t("pathAdd")}
            </Button>
          </CardHeader>
          <CardContent>
            {pathwaysDraft.length === 0 ? (
              <div className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">
                {t("pathEmpty")}
              </div>
            ) : (
              <ul className="space-y-2">
                {pathwaysDraft.map((pathway) => (
                  <PathwayRow
                    key={pathway.id}
                    pathway={pathway}
                    programs={programs}
                    onEdit={() => openEditPathway(pathway)}
                    onDelete={() => setDeletingPathway(pathway)}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ── Session defaults ──────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="text-muted-foreground size-4" />
              {t("sessTitle")}
            </CardTitle>
            <p className="text-muted-foreground text-sm">{t("sessIntro")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                {t("sessDuration")}
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {DURATION_OPTIONS.map((mins) => {
                  const active = draft.defaultSessionDurationMinutes === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() =>
                        update("defaultSessionDurationMinutes", mins)
                      }
                      data-active={active || undefined}
                      className={cn(
                        "inline-flex min-h-10 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors max-lg:min-h-12",
                        "hover:bg-muted",
                        // A selected filter is the primary, not near-black (§1: there is
                        // no second action colour).
                        "data-active:border-primary data-active:bg-primary data-active:text-primary-foreground",
                      )}
                    >
                      {/* `45 min` · `1 h 30` — the shape §5q insists on for French. */}
                      {formatDuration(mins, locale)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label
                className="text-sm font-semibold"
                htmlFor="default-class-size"
              >
                {t("sessClassSize")}
              </Label>
              <Input
                id="default-class-size"
                type="number"
                min={1}
                max={50}
                value={draft.defaultClassSize}
                onChange={(e) =>
                  update(
                    "defaultClassSize",
                    Math.max(1, Math.min(50, Number(e.target.value) || 1)),
                  )
                }
                className="max-w-32"
              />
              <p className="text-muted-foreground text-[11px]">
                {t("sessClassSizeHelp")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Enrollment ────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="text-muted-foreground size-4" />
              {t("enrolTitle")}
            </CardTitle>
            <p className="text-muted-foreground text-sm">{t("enrolIntro")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow
              label={t("enrolOnline")}
              description={t("enrolOnlineHelp")}
              checked={draft.allowOnlineEnrollment}
              onCheckedChange={(v) => update("allowOnlineEnrollment", v)}
            />
            <ToggleRow
              label={t("enrolDropIns")}
              description={t("enrolDropInsHelp")}
              checked={draft.allowDropIns}
              onCheckedChange={(v) => update("allowDropIns", v)}
            />
            <ToggleRow
              label={t("enrolEvaluation")}
              description={t("enrolEvaluationHelp")}
              checked={draft.requireEvaluationBeforeEnrollment}
              onCheckedChange={(v) =>
                update("requireEvaluationBeforeEnrollment", v)
              }
            />
            <div className="space-y-1.5 pt-2">
              <Label
                className="text-sm font-semibold"
                htmlFor="default-message"
              >
                {t("enrolMessage")}
              </Label>
              <Textarea
                id="default-message"
                rows={3}
                value={draft.defaultEnrollmentMessage}
                onChange={(e) =>
                  update("defaultEnrollmentMessage", e.target.value)
                }
                placeholder={t("enrolMessagePlaceholder")}
              />
              <p className="text-muted-foreground text-[11px]">
                {t("enrolMessageHelp")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Waivers ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="text-muted-foreground size-4" />
              {t("waiverTitle")}
            </CardTitle>
            <p className="text-muted-foreground text-sm">{t("waiverIntro")}</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {defaultTrainingWaivers.map((waiver) => {
                const overridden =
                  draft.waiverRequiredOverrides[waiver.id] !== undefined;
                const required = overridden
                  ? draft.waiverRequiredOverrides[waiver.id]!
                  : waiver.required;
                return (
                  <li
                    key={waiver.id}
                    className={cn(
                      // The required state was a rose WASH behind the card — §6 rule 2
                      // tints a metric tile and a status chip and nothing else. The chip
                      // beside the title says "Required" in a word already.
                      "bg-card rounded-xl border p-3 shadow-sm",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-semibold">
                            {labels.waiverTitle(waiver.id)}
                          </p>
                          <Badge variant={required ? "pending" : "outline"}>
                            {required
                              ? t("waiverRequired")
                              : t("waiverOptional")}
                          </Badge>
                          {overridden && (
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                              title={t("waiverOverriddenHelp")}
                            >
                              {t("waiverOverridden")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-micro/relaxed mt-1">
                          {labels.waiverSummary(waiver.id)}
                        </p>
                      </div>
                      <Switch
                        checked={required}
                        onCheckedChange={(next) =>
                          setDraft((prev) => {
                            const overrides = {
                              ...prev.waiverRequiredOverrides,
                            };
                            if (next === waiver.required) {
                              // Back to catalog default — clear the override.
                              delete overrides[waiver.id];
                            } else {
                              overrides[waiver.id] = next;
                            }
                            return {
                              ...prev,
                              waiverRequiredOverrides: overrides,
                            };
                          })
                        }
                        aria-label={t("waiverToggle").replace(
                          "{name}",
                          labels.waiverTitle(waiver.id),
                        )}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* ── Report cards ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="text-muted-foreground size-4" />
              {t("rcTitle")}
            </CardTitle>
            <p className="text-muted-foreground text-sm">{t("rcIntro")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow
              label={t("rcAutoCreate")}
              description={t("rcAutoCreateHelp")}
              checked={draft.autoCreateReportCardOnSessionComplete}
              onCheckedChange={(v) =>
                update("autoCreateReportCardOnSessionComplete", v)
              }
            />
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                {t("rcSendToOwner")}
              </Label>
              <RadioGroup
                value={draft.reportCardSendMode}
                onValueChange={(v) =>
                  update("reportCardSendMode", v as ReportCardSendMode)
                }
                className="grid grid-cols-1 gap-2 md:grid-cols-3"
              >
                {(
                  Object.keys(
                    REPORT_CARD_SEND_MODE_LABELS,
                  ) as ReportCardSendMode[]
                ).map((mode) => (
                  <label
                    key={mode}
                    htmlFor={`mode-${mode}`}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition-colors",
                      draft.reportCardSendMode === mode
                        ? "border-primary ring-primary ring-2"
                        : "hover:border-foreground/15",
                    )}
                  >
                    <RadioGroupItem
                      value={mode}
                      id={`mode-${mode}`}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {labels.sendMode(mode)}
                      </p>
                      <p className="text-muted-foreground text-[11px]/relaxed">
                        {labels.sendModeHelp(mode)}
                      </p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* ── Homework ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="text-muted-foreground size-4" />
              {t("hwTitle")}
            </CardTitle>
            <p className="text-muted-foreground text-sm">{t("hwIntro")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow
              label={t("hwRequireVideo")}
              description={t("hwRequireVideoHelp")}
              icon={GraduationCap}
              checked={draft.requireVideoForHomeworkSubmission}
              onCheckedChange={(v) =>
                update("requireVideoForHomeworkSubmission", v)
              }
            />
          </CardContent>
        </Card>

        {/* ── Graduation follow-up ──────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="text-muted-foreground size-4" />
              {t("gradTitle")}
            </CardTitle>
            <p className="text-muted-foreground text-sm">{t("gradIntro")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow
              label={t("gradEnabled")}
              description={t("gradEnabledHelp")}
              icon={Bell}
              checked={draft.graduationFollowUpEnabled}
              onCheckedChange={(v) => update("graduationFollowUpEnabled", v)}
            />
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <Label
                htmlFor="grad-followup-days"
                className="text-sm font-medium"
              >
                {t("gradDelay")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="grad-followup-days"
                  type="number"
                  min={1}
                  max={30}
                  value={draft.graduationFollowUpDays}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isFinite(next) && next >= 1) {
                      update(
                        "graduationFollowUpDays",
                        Math.min(30, Math.round(next)),
                      );
                    }
                  }}
                  disabled={!draft.graduationFollowUpEnabled}
                  // `w-24` on a number field is fine; `h-9` was overriding Input's
                  // own min-height, which is what stops a control clipping (§5g).
                  className="w-24"
                />
                <span className="text-muted-foreground text-sm">
                  {pluralWord(
                    draft.graduationFollowUpDays,
                    "gradDelayUnitOne",
                    "gradDelayUnitOther",
                  )}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="grad-followup-template"
                className="text-sm font-medium"
              >
                {t("gradTemplate")}
              </Label>
              <Textarea
                id="grad-followup-template"
                value={draft.graduationFollowUpTemplate}
                onChange={(e) =>
                  update("graduationFollowUpTemplate", e.target.value)
                }
                disabled={!draft.graduationFollowUpEnabled}
                className="min-h-[60px] text-sm/relaxed"
              />
              <p className="text-muted-foreground text-[11px]">
                {/* This was a sentence built from "Use", "and" and a dash around
                    two <code> children — §5q's "never build a sentence from
                    fragments", and untranslatable because French does not join
                    a list the same way. The tags are one substitution now. */}
                {t("gradTemplateHelp")
                  .split("{tags}")
                  .flatMap((part, i) =>
                    i === 0
                      ? [<span key="lead">{part}</span>]
                      : [
                          <code
                            key="petName"
                            className="bg-muted rounded-sm px-1"
                          >
                            {"{petName}"}
                          </code>,
                          <span key="sep"> · </span>,
                          <code
                            key="programName"
                            className="bg-muted rounded-sm px-1"
                          >
                            {"{programName}"}
                          </code>,
                          <span key="rest">{part}</span>,
                        ],
                  )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Milestone notifications ───────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="text-muted-foreground size-4" />
              {t("mileTitle")}
            </CardTitle>
            <p className="text-muted-foreground text-sm">{t("mileIntro")}</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {MILESTONE_ORDER.map((kind) => {
                const visual = MILESTONE_VISUAL[kind];
                const Icon = visual.icon;
                // Unset values default to true (per the spec) — only an
                // explicit `false` opts the milestone out.
                const explicit = draft.milestoneNotifications[kind];
                const enabled = explicit === undefined ? true : explicit;
                return (
                  <li
                    key={kind}
                    className="bg-card flex items-start justify-between gap-3 rounded-lg border px-3 py-2"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm",
                          visual.chip,
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {labels.milestone(kind)}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          {enabled ? t("mileOn") : t("mileOff")}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(next) =>
                        setDraft((prev) => ({
                          ...prev,
                          milestoneNotifications: {
                            ...prev.milestoneNotifications,
                            [kind]: next,
                          },
                        }))
                      }
                      aria-label={t("mileToggle").replace(
                        "{name}",
                        labels.milestone(kind),
                      )}
                    />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* ── Waitlist ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hourglass className="text-muted-foreground size-4" />
              {t("waitTitle")}
            </CardTitle>
            <p className="text-muted-foreground text-sm">{t("waitIntro")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <Label
                htmlFor="waitlist-hold-hours"
                className="text-sm font-medium"
              >
                {t("waitHold")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="waitlist-hold-hours"
                  type="number"
                  min={1}
                  max={168}
                  value={draft.waitlistHoldHours}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isFinite(next) && next >= 1) {
                      update(
                        "waitlistHoldHours",
                        Math.min(168, Math.round(next)),
                      );
                    }
                  }}
                  className="w-24"
                />
                <span className="text-muted-foreground text-sm">
                  {/* `{n}h` is an English shape; `formatDuration` gives French
                        the `1 h 30` §5q insists on, and the half-window is a
                        DURATION rather than a bare number. */}
                  {t("waitHoldUnit").replace(
                    "{half}",
                    formatDuration(
                      Math.max(1, Math.round(draft.waitlistHoldHours / 2)) * 60,
                      locale,
                    ),
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Notifications ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="text-muted-foreground size-4" />
              {t("notifTitle")}
            </CardTitle>
            <p className="text-muted-foreground text-sm">{t("notifIntro")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ToggleRow
                label={t("notifEmail")}
                description=""
                icon={Mail}
                checked={draft.notifications.emailEnabled}
                onCheckedChange={(v) => updateNotifications("emailEnabled", v)}
              />
              <ToggleRow
                label={t("notifSms")}
                description=""
                icon={MessageSquare}
                checked={draft.notifications.smsEnabled}
                onCheckedChange={(v) => updateNotifications("smsEnabled", v)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold" htmlFor="reminder-lead">
                {t("notifLead")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="reminder-lead"
                  type="number"
                  min={1}
                  max={168}
                  value={draft.notifications.reminderLeadHours}
                  onChange={(e) =>
                    updateNotifications(
                      "reminderLeadHours",
                      Math.max(1, Math.min(168, Number(e.target.value) || 24)),
                    )
                  }
                  className="max-w-24"
                />
                <span className="text-muted-foreground text-[12px]">
                  {pluralWord(
                    draft.notifications.reminderLeadHours,
                    "notifLeadUnitOne",
                    "notifLeadUnitOther",
                  )}
                </span>
              </div>
            </div>
            <div className="space-y-2 border-t pt-3">
              <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                {t("notifTriggers")}
              </p>
              <ToggleRow
                label={t("notifHomework")}
                description={t("notifHomeworkHelp")}
                checked={draft.notifications.homeworkAssigned}
                onCheckedChange={(v) =>
                  updateNotifications("homeworkAssigned", v)
                }
              />
              <ToggleRow
                label={t("notifReportCard")}
                description={t("notifReportCardHelp")}
                checked={draft.notifications.reportCardSent}
                onCheckedChange={(v) =>
                  updateNotifications("reportCardSent", v)
                }
              />
              <ToggleRow
                label={t("notifCancelled")}
                description={t("notifCancelledHelp")}
                checked={draft.notifications.seriesCancelled}
                onCheckedChange={(v) =>
                  updateNotifications("seriesCancelled", v)
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky save bar — only renders while there are unsaved changes so
          the form sits flush most of the time. */}
      {dirty && (
        <div className="bg-card sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 shadow-lg">
          <p className="text-muted-foreground inline-flex items-center gap-1.5 text-[12.5px]">
            <SettingsIcon className="size-3.5" />
            {t("unsaved")}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRevert}>
              {t("revert")}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gap-1"
            >
              <Save className="size-4" />
              {t("saveChanges")}
            </Button>
          </div>
        </div>
      )}

      <LocationDialog
        open={locationDialogOpen}
        onOpenChange={(o) => {
          setLocationDialogOpen(o);
          if (!o) setEditingLocation(null);
        }}
        editing={editingLocation}
        onSave={persistLocation}
      />

      <PathwayDialog
        open={pathwayDialogOpen}
        onOpenChange={(o) => {
          setPathwayDialogOpen(o);
          if (!o) setEditingPathway(null);
        }}
        editing={editingPathway}
        programs={programs}
        onSave={persistPathway}
      />

      <AlertDialog
        open={!!deletingPathway}
        onOpenChange={(o) => !o && setDeletingPathway(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("pathDeleteTitle").replace(
                "{name}",
                deletingPathway?.name ?? "",
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("pathDeleteBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePathway}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingLocation}
        onOpenChange={(o) => !o && setDeletingLocation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("locDeleteTitle").replace(
                "{name}",
                deletingLocation?.name ?? "",
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("locDeleteBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteLocation}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: TrainingLocation | null;
  onSave: (location: TrainingLocation) => void;
}

function LocationDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: LocationDialogProps) {
  const t = useSettingsText().section("training");
  const [name, setName] = useState("");
  const [type, setType] = useState<"indoor" | "outdoor">("indoor");
  const [capacity, setCapacity] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setType(editing.type);
      setCapacity(editing.capacity?.toString() ?? "");
      setIsActive(editing.isActive);
    } else {
      setName("");
      setType("indoor");
      setCapacity("");
      setIsActive(true);
    }
  }, [open, editing]);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t("locNameRequired"));
      return;
    }
    const cap = capacity.trim() ? Number(capacity) : undefined;
    onSave({
      id: editing?.id ?? nextLocationId(),
      name: trimmed,
      type,
      capacity:
        cap !== undefined && !Number.isNaN(cap) && cap > 0 ? cap : undefined,
      isActive,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="text-muted-foreground size-4" />
            {editing ? t("locDialogEdit") : t("locDialogAdd")}
          </DialogTitle>
          <DialogDescription>{t("locDialogIntro")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{t("name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("locNamePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{t("locType")}</Label>
            <div className="flex gap-1.5">
              <TypePill
                active={type === "indoor"}
                onClick={() => setType("indoor")}
                icon={Home}
                label={t("locIndoor")}
                tone="indigo"
              />
              <TypePill
                active={type === "outdoor"}
                onClick={() => setType("outdoor")}
                icon={Sun}
                label={t("locOutdoor")}
                tone="emerald"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{t("locCapacity")}</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder={t("locCapacityPlaceholder")}
              className="max-w-32"
            />
            <p className="text-muted-foreground text-[11px]">
              {/* The example is the live value, so the help text shows what the
                  picker will actually say rather than a literal N. */}
              {t("locCapacityHelp").replace("{n}", capacity.trim() || "8")}
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">{t("locActiveLabel")}</p>
              <p className="text-muted-foreground text-xs">
                {t("locActiveHelp")}
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {editing ? t("saveChanges") : t("locAdd")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Both selected states were a tint of their own hue, which §6 rule 2
// bans and which also made "indoor" and "outdoor" read as two different
// KINDS of selection rather than two values of one control. One ring.
const TYPE_PILL_ACTIVE_CLS = "border-primary ring-primary text-primary ring-2";

function TypePill({
  active,
  onClick,
  icon: Icon,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Home;
  label: string;
  tone: "indigo" | "emerald";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active || undefined}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
        active ? TYPE_PILL_ACTIVE_CLS : "hover:bg-muted",
      )}
    >
      <Icon className="size-4" />
      {label}
      {active && <Check className="size-3.5" />}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Training Pathways
// ─────────────────────────────────────────────────────────────────────────

interface PathwayRowProps {
  pathway: TrainingPathway;
  programs: TrainingPackage[];
  onEdit: () => void;
  onDelete: () => void;
}

function PathwayRow({ pathway, programs, onEdit, onDelete }: PathwayRowProps) {
  const { locale, section } = useSettingsText();
  const t = section("training");
  const rules = new Intl.PluralRules(locale === "fr" ? "fr-CA" : "en-CA");
  const plural = (n: number, one: string, other: string) =>
    t(rules.select(n) === "one" ? one : other).replace("{n}", String(n));

  const programNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of programs) map.set(p.id, p.name);
    return map;
  }, [programs]);

  return (
    <li
      className={cn(
        // §6 rule 4 — the "Hidden" chip beside the name says this in a word.
        "bg-card rounded-xl border p-3 shadow-sm",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="bg-violet text-violet-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
          <Route className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold">{pathway.name}</p>
            <Badge variant="outline" className="text-[10px]">
              {plural(pathway.steps.length, "pathStepOne", "pathStepOther")}
            </Badge>
            {!pathway.isActive && (
              <Badge variant="outline" className="text-[10px]">
                {t("pathHiddenTag")}
              </Badge>
            )}
          </div>
          {pathway.description && (
            <p className="text-muted-foreground mt-0.5 text-[11.5px]/relaxed">
              {pathway.description}
            </p>
          )}
          {pathway.steps.length > 0 && (
            <ol className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              {pathway.steps.map((step, idx) => {
                const programName =
                  programNameById.get(step.programId) ??
                  t("pathUnknownProgram");
                const unknown = !programNameById.has(step.programId);
                return (
                  <li
                    key={`${pathway.id}-${idx}`}
                    className="inline-flex items-center gap-1"
                  >
                    {idx > 0 && (
                      <span className="text-muted-foreground/60">→</span>
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                        unknown
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : step.required
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-slate-50 text-slate-600",
                      )}
                    >
                      <span className="font-medium">{programName}</span>
                      {!step.required && (
                        <span className="text-muted-foreground text-[10px]">
                          {t("pathOptional")}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onEdit}
            title={t("pathEdit")}
          >
            <Edit className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive size-8"
            onClick={onDelete}
            title={t("pathDelete")}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}

interface PathwayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: TrainingPathway | null;
  programs: TrainingPackage[];
  onSave: (pathway: TrainingPathway) => void;
}

function PathwayDialog({
  open,
  onOpenChange,
  editing,
  programs,
  onSave,
}: PathwayDialogProps) {
  const { locale, section } = useSettingsText();
  const t = section("training");
  const rules = new Intl.PluralRules(locale === "fr" ? "fr-CA" : "en-CA");
  const plural = (n: number, one: string, other: string) =>
    t(rules.select(n) === "one" ? one : other).replace("{n}", String(n));
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState<TrainingPathwayStep[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setDescription(editing.description ?? "");
      setIsActive(editing.isActive);
      setSteps(editing.steps.map((s) => ({ ...s })));
    } else {
      setName("");
      setDescription("");
      setIsActive(true);
      setSteps([]);
    }
  }, [open, editing]);

  // Programs already used in this pathway are filtered out of the picker so
  // staff can't accidentally add the same course twice.
  const usedProgramIds = new Set(steps.map((s) => s.programId));
  const availablePrograms = programs.filter(
    (p) => !usedProgramIds.has(p.id) && p.isActive,
  );

  function addStep(programId: string) {
    if (!programId) return;
    setSteps((prev) => [
      ...prev,
      { programId, required: true, description: "" },
    ]);
  }

  function updateStep(idx: number, patch: Partial<TrainingPathwayStep>) {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  }

  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveStep(idx: number, delta: -1 | 1) {
    setSteps((prev) => {
      const target = idx + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t("pathNameRequired"));
      return;
    }
    if (steps.length === 0) {
      toast.error(t("pathStepsRequired"));
      return;
    }
    onSave({
      id: editing?.id ?? nextPathwayId(),
      name: trimmed,
      description: description.trim() || undefined,
      steps: steps.map((s) => ({
        programId: s.programId,
        required: s.required,
        description: s.description?.trim() || undefined,
      })),
      isActive,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="text-muted-foreground size-4" />
            {editing ? t("pathDialogEdit") : t("pathDialogCreate")}
          </DialogTitle>
          <DialogDescription>{t("pathDialogIntro")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">{t("pathName")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("pathNamePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">
              {t("descriptionOptional")}
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("pathDescriptionPlaceholder")}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">{t("pathSteps")}</Label>
              <span className="text-muted-foreground text-[11px]">
                {steps.length === 0
                  ? t("pathAddFirst")
                  : plural(
                      steps.length,
                      "pathInSequenceOne",
                      "pathInSequenceOther",
                    )}
              </span>
            </div>

            {steps.length === 0 ? (
              <div className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-[12px]">
                {t("pathNoCourses")}
              </div>
            ) : (
              <ol className="space-y-2">
                {steps.map((step, idx) => {
                  const program = programs.find((p) => p.id === step.programId);
                  return (
                    <li
                      key={`step-${idx}`}
                      className="rounded-lg border bg-slate-50/40 p-2.5"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center gap-0.5 pt-0.5">
                          <span className="inline-flex size-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                            {idx + 1}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => moveStep(idx, -1)}
                              disabled={idx === 0}
                              className={cn(
                                "text-muted-foreground hover:bg-muted hover:text-foreground rounded-sm p-0.5",
                                idx === 0 && "cursor-not-allowed opacity-30",
                              )}
                              title={t("pathMoveUp")}
                            >
                              <ChevronUp className="size-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveStep(idx, 1)}
                              disabled={idx === steps.length - 1}
                              className={cn(
                                "text-muted-foreground hover:bg-muted hover:text-foreground rounded-sm p-0.5",
                                idx === steps.length - 1 &&
                                  "cursor-not-allowed opacity-30",
                              )}
                              title={t("pathMoveDown")}
                            >
                              <ChevronDown className="size-3" />
                            </button>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <p className="text-sm font-semibold">
                              {program?.name ?? t("pathUnknownProgram")}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <label className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                                <Switch
                                  checked={step.required}
                                  onCheckedChange={(v) =>
                                    updateStep(idx, { required: v })
                                  }
                                />
                                <span>
                                  {step.required
                                    ? t("pathRequired")
                                    : t("pathOptionalLabel")}
                                </span>
                              </label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive size-7"
                                onClick={() => removeStep(idx)}
                                title={t("pathRemoveStep")}
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          </div>
                          <Input
                            value={step.description ?? ""}
                            onChange={(e) =>
                              updateStep(idx, { description: e.target.value })
                            }
                            placeholder={t("pathStepPlaceholder")}
                            className="text-[12px]"
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {availablePrograms.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                  {t("pathAddProgram")}
                </Label>
                <Select onValueChange={addStep} value="">
                  <SelectTrigger className="text-[12px]">
                    <SelectValue placeholder={t("pathPickProgram")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePrograms.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">{t("pathVisible")}</p>
              <p className="text-muted-foreground text-xs">
                {t("pathVisibleHelp")}
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || steps.length === 0}
          >
            {editing ? t("saveChanges") : t("pathDialogCreate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  icon?: typeof BookOpen;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({
  label,
  description,
  icon: Icon,
  checked,
  onCheckedChange,
  disabled,
}: ToggleRowProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border px-3 py-2",
        disabled && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium">
          {Icon && <Icon className="text-muted-foreground size-3.5" />}
          {label}
        </p>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-[11.5px]/relaxed">
            {description}
          </p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
