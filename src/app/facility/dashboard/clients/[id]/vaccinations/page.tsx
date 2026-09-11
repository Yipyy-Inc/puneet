"use client";

import { use, useState } from "react";
import { AlertTriangle, Clock3, Plus, Syringe } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AddVaccinationDialog } from "@/components/clients/vaccinations/AddVaccinationDialog";
import { VaccinationRecordRow } from "@/components/clients/vaccinations/VaccinationRecordRow";
import { useClientRecord } from "@/lib/api/client";
import { useVaccinationRules } from "@/lib/api/facility-settings";
import { useClientVaccinations } from "@/lib/api/vaccinations";
import { formatList } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import {
  localToday,
  missingRequired,
  recordMatchesRule,
} from "@/lib/vaccinations";
import type { Pet } from "@/types/pet";

// ============================================================================
// A client's vaccination records, from `public.pet_vaccinations`.
//
// This read `vaccinationRecords` from `@/data/pet-data` and approved them by
// editing that module array as "Sarah (Staff)". Every action below is a real
// write, reviewed under the signed-in person's name, and survives a reload.
// ============================================================================

export default function ClientVaccinationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, fill, locale } = useStaffText("vaccinations");
  const { client } = useClientRecord(id);
  const { vaccinations, pending } = useClientVaccinations(Number(id));
  const { rules } = useVaccinationRules();
  const [today] = useState(localToday);
  const [adding, setAdding] = useState<Pet | null>(null);

  if (!client) return null;

  const awaiting = vaccinations.filter(
    (v) => !v.status || v.status === "pending_review",
  ).length;

  const gaps = client.pets
    .map((pet) => ({
      pet,
      missing: missingRequired(
        pet.type,
        vaccinations.filter((v) => v.petId === pet.id),
        rules,
        today,
      ),
    }))
    .filter((g) => g.missing.length > 0);

  return (
    <div className="space-y-4 p-4 pt-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-heading text-lg font-bold">{t("title")}</h2>
        {awaiting > 0 && (
          <Badge variant="pending">
            <Clock3 aria-hidden />
            {fill(awaiting === 1 ? "awaitingOne" : "awaitingMany", {
              n: awaiting,
            })}
          </Badge>
        )}
      </div>

      {client.pets.length === 0 && (
        <p className="text-ink-tertiary py-8 text-center text-sm">
          {t("noPets")}
        </p>
      )}

      {client.pets.map((pet) => {
        const records = vaccinations.filter((v) => v.petId === pet.id);
        const petRules = rules.filter(
          (r) => r.species.toLowerCase() === pet.type.toLowerCase(),
        );
        return (
          <Card key={pet.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex min-w-0 items-center gap-2 text-base">
                  <Syringe className="text-ink-tertiary size-5" aria-hidden />
                  <span className="truncate">
                    {pet.breed ? `${pet.name} — ${pet.breed}` : pet.name}
                  </span>
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAdding(pet)}
                >
                  <Plus className="size-4" />
                  {fill("addFor", { pet: pet.name })}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pending ? (
                <Skeleton className="h-24 w-full rounded-2xl" />
              ) : records.length === 0 ? (
                <p className="text-ink-tertiary text-sm">
                  {fill("noneForPet", { pet: pet.name })}
                </p>
              ) : (
                records.map((record) => {
                  const rule = petRules.find((r) =>
                    recordMatchesRule(record, r.vaccineName),
                  );
                  return (
                    <VaccinationRecordRow
                      key={record.id}
                      record={record}
                      today={today}
                      requirement={
                        rule
                          ? rule.required
                            ? "required"
                            : "optional"
                          : undefined
                      }
                    />
                  );
                })
              )}
            </CardContent>
          </Card>
        );
      })}

      {!pending && client.pets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-ink-tertiary flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
              <AlertTriangle className="size-4" aria-hidden />
              {t("missingTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {gaps.length === 0 ? (
              <p className="text-ink-secondary text-sm">{t("allCovered")}</p>
            ) : (
              gaps.map(({ pet, missing }) => (
                <p key={pet.id} className="text-sm">
                  <span className="font-semibold">{pet.name}</span>{" "}
                  <span className="text-ink-secondary">
                    {fill("missingList", {
                      list: formatList(
                        missing.map((r) => r.vaccineName),
                        locale,
                      ),
                    })}
                  </span>
                </p>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {adding && (
        <AddVaccinationDialog
          open
          onOpenChange={(open) => !open && setAdding(null)}
          petRef={adding.id}
          petName={adding.name}
          petSpecies={adding.type}
        />
      )}
    </div>
  );
}
