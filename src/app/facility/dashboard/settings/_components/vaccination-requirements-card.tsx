"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

import {
  useSaveFacilitySetting,
  useVaccinationRules,
} from "@/lib/api/facility-settings";
import type { VaccinationRules } from "@/lib/settings/vaccinations";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { SaveBar } from "@/components/ui/save-bar";
import { useServiceTypeLabel } from "@/lib/settings/use-service-types";

// Vaccination Requirements Component
// The VALUES are stored on each rule and compared against `r.species`, so
// they stay as they are. Only the tab label is translated.
const VACCINE_SPECIES_OPTIONS = ["Dog", "Cat", "Other"] as const;
const SPECIES_KEY: Record<string, string> = {
  Dog: "speciesDog",
  Cat: "speciesCat",
  Other: "speciesOther",
};
const VACCINE_SERVICE_OPTIONS = [
  "boarding",
  "daycare",
  "grooming",
  "training",
  "vet",
] as const;

// ── NOTHING RENDERS UNTIL THE REQUIREMENTS HAVE ARRIVED ───────────────────
//
// The editor below seeds `useState` from what it is handed, and a `useState`
// initialiser runs ONCE — so mounting it against the fallback and letting the
// query land afterwards would show the shipped list whatever the facility had
// saved, and the first Save would write that back over their own.
export function VaccinationRequirementsCard() {
  const { rules, configured, isPending } = useVaccinationRules();

  if (isPending) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  return (
    <VaccinationRequirementsEditor
      key={configured ? "stored" : "shipped"}
      initialRules={rules}
      configured={configured}
    />
  );
}

function VaccinationRequirementsEditor({
  initialRules,
  configured,
}: {
  initialRules: VaccinationRules;
  configured: boolean;
}) {
  const saveSetting = useSaveFacilitySetting();
  const [species, setSpecies] = useState<string>("Dog");
  const t = useSettingsText().section("vaccination-requirements");
  const serviceLabel = useServiceTypeLabel();
  const fill = (key: string, values: Record<string, string>) =>
    Object.entries(values).reduce(
      (text, [name, value]) => text.replace(`{${name}}`, value),
      t(key),
    );
  const [rules, setRules] = useState<VaccinationRules>(initialRules);
  const [savedRules, setSavedRules] = useState<VaccinationRules>(initialRules);
  const [newName, setNewName] = useState("");
  const [newExpiry, setNewExpiry] = useState(30);

  const isDirty = JSON.stringify(rules) !== JSON.stringify(savedRules);

  const handleSave = () => {
    saveSetting.mutate(
      { domain: "vaccination_rules", value: rules },
      {
        onSuccess: () => {
          setSavedRules([...rules]);
          toast.success(t("saved"));
        },
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : t("saveFailed")),
      },
    );
  };

  const filtered = rules.filter(
    (r) => r.species.toLowerCase() === species.toLowerCase(),
  );

  const addVaccine = () => {
    const name = newName.trim();
    if (!name) return;
    setRules((prev) => [
      ...prev,
      {
        id: `vax-${Date.now()}`,
        vaccineName: name,
        species,
        required: true,
        expiryWarningDays: newExpiry,
        applicableServices: [],
      },
    ]);
    setNewName("");
    setNewExpiry(30);
  };

  const removeVaccine = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleService = (id: string, service: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const has = r.applicableServices.includes(service);
        return {
          ...r,
          applicableServices: has
            ? r.applicableServices.filter((s) => s !== service)
            : [...r.applicableServices, service],
        };
      }),
    );
  };

  const updateRequired = (id: string, required: boolean) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, required } : r)));
  };

  const updateExpiry = (id: string, days: number) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, expiryWarningDays: days } : r)),
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-ink-tertiary mt-1 text-[14.5px]">{t("intro")}</p>
            {/* Unlike the money settings, an unreviewed list is not an empty
                one — an unset requirement fails OPEN, so the standard list
                keeps being checked until somebody says otherwise. Saying which
                of the two you are looking at is the whole job of
                `configured`. */}
            {!configured && (
              <p className="text-ink-tertiary mt-1 text-[13.5px]">
                {t("unreviewed")}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={species} onValueChange={setSpecies}>
          <TabsList>
            {VACCINE_SPECIES_OPTIONS.map((s) => (
              <TabsTrigger key={s} value={s}>
                {t(SPECIES_KEY[s])}
              </TabsTrigger>
            ))}
          </TabsList>

          {VACCINE_SPECIES_OPTIONS.map((s) => (
            <TabsContent key={s} value={s} className="space-y-3">
              {filtered.length === 0 && species === s ? (
                <p className="text-ink-tertiary rounded-lg border border-dashed p-4 text-center text-[14.5px]">
                  {fill("noneForSpecies", { species: t(SPECIES_KEY[s]) })}
                </p>
              ) : null}

              {species === s &&
                filtered.map((vax) => (
                  <div key={vax.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={vax.vaccineName}
                            onChange={(e) =>
                              setRules((prev) =>
                                prev.map((r) =>
                                  r.id === vax.id
                                    ? { ...r, vaccineName: e.target.value }
                                    : r,
                                ),
                              )
                            }
                            className="max-w-xs font-semibold"
                          />
                          <label className="text-ink-tertiary flex min-h-10 items-center gap-1.5 text-[13.5px] max-lg:min-h-12">
                            <Checkbox
                              checked={vax.required}
                              onCheckedChange={(v) =>
                                updateRequired(vax.id, Boolean(v))
                              }
                            />
                            {t("required")}
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Label className="text-[13.5px]">
                            {t("expiryWarning")}
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={vax.expiryWarningDays}
                            onChange={(e) =>
                              updateExpiry(
                                vax.id,
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="w-24"
                          />
                        </div>

                        <div>
                          <Label className="text-ink-tertiary mb-1.5 block text-[13.5px]">
                            {t("applicableServices")}
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {VACCINE_SERVICE_OPTIONS.map((service) => {
                              const active =
                                vax.applicableServices.includes(service);
                              return (
                                <button
                                  key={service}
                                  type="button"
                                  onClick={() => toggleService(vax.id, service)}
                                  className={
                                    active
                                      ? "bg-primary text-primary-foreground min-h-10 rounded-full px-3 text-[13.5px] max-lg:min-h-12"
                                      : "text-ink-secondary hover:bg-muted min-h-10 rounded-full border px-3 text-[13.5px] max-lg:min-h-12"
                                  }
                                >
                                  {serviceLabel(service, service)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVaccine(vax.id)}
                        aria-label={t("removeVaccine")}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}

              {species === s && (
                <div className="bg-muted/30 flex items-end gap-2 rounded-lg border border-dashed p-3">
                  <div className="flex-1">
                    <Label className="mb-1 block text-[13.5px]">
                      {t("vaccineName")}
                    </Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={fill("vaccineNamePlaceholder", {
                        // A vaccine is a proper noun; only the "e.g." is copy.
                        // french-ok: proper noun
                        example: s === "Cat" ? "FeLV" : "Leptospirosis",
                      })}
                    />
                  </div>
                  <div className="w-32">
                    <Label className="mb-1 block text-[13.5px]">
                      {t("expiryWarningShort")}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={newExpiry}
                      onChange={(e) =>
                        setNewExpiry(parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={addVaccine}
                    disabled={!newName.trim()}
                  >
                    <Plus className="mr-1 size-3.5" />
                    {t("addVaccine")}
                  </Button>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
        <SaveBar
          placement="card"
          dirty={isDirty}
          saving={saveSetting.isPending}
          onSave={handleSave}
          onReset={() => setRules([...savedRules])}
        />
      </CardContent>
    </Card>
  );
}
