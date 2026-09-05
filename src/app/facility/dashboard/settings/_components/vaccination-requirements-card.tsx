"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

// Vaccination Requirements Component
const VACCINE_SPECIES_OPTIONS = ["Dog", "Cat", "Other"] as const;
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
          toast.success("Vaccination requirements saved");
        },
        onError: (error) =>
          toast.error(
            error instanceof Error
              ? error.message
              : "Those requirements were not saved.",
          ),
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
            <CardTitle>Vaccination requirements</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Configure which vaccines are required for each animal type.
              Customers will be asked to provide these vaccines and staff will
              verify them before booking.
            </p>
            {/* Unlike the money settings, an unreviewed list is not an empty
                one — an unset requirement fails OPEN, so the standard list
                keeps being checked until somebody says otherwise. Saying which
                of the two you are looking at is the whole job of
                `configured`. */}
            {!configured && (
              <p className="text-ink-tertiary mt-1 text-[13.5px]">
                This is the standard list Yipyy ships. Nobody at this facility
                has reviewed it yet — it is still being checked on every
                booking.
              </p>
            )}
          </div>
          {isDirty && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveSetting.isPending}
            >
              {saveSetting.isPending ? "Saving…" : "Save changes"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={species} onValueChange={setSpecies}>
          <TabsList>
            {VACCINE_SPECIES_OPTIONS.map((s) => (
              <TabsTrigger key={s} value={s}>
                {s}
              </TabsTrigger>
            ))}
          </TabsList>

          {VACCINE_SPECIES_OPTIONS.map((s) => (
            <TabsContent key={s} value={s} className="space-y-3">
              {filtered.length === 0 && species === s ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                  No vaccines configured for {s}. Add one below.
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
                          <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <Checkbox
                              checked={vax.required}
                              onCheckedChange={(v) =>
                                updateRequired(vax.id, Boolean(v))
                              }
                            />
                            Required
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Label className="text-xs">
                            Expiry warning (days)
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
                            className="h-8 w-24"
                          />
                        </div>

                        <div>
                          <Label className="text-muted-foreground mb-1.5 block text-xs">
                            Applicable services
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
                                      ? "bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs capitalize"
                                      : "text-muted-foreground hover:bg-muted rounded-full border px-3 py-1 text-xs capitalize"
                                  }
                                >
                                  {service}
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
                    <Label className="mb-1 block text-xs">Vaccine name</Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={`e.g. ${s === "Cat" ? "FeLV" : "Leptospirosis"}`}
                      className="h-9"
                    />
                  </div>
                  <div className="w-32">
                    <Label className="mb-1 block text-xs">
                      Expiry warn (days)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={newExpiry}
                      onChange={(e) =>
                        setNewExpiry(parseInt(e.target.value) || 0)
                      }
                      className="h-9"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={addVaccine}
                    disabled={!newName.trim()}
                  >
                    <Plus className="mr-1 size-3.5" />
                    Add vaccine
                  </Button>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
