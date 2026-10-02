"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";

import { Segmented } from "@/components/ui/segmented";
import {
  bookingClientSummaryQueries,
  summaryByClient,
} from "@/lib/api/booking-client-summary";
import { useSettingsAudience } from "@/lib/api/settings-audience";
import { trainingQueries } from "@/lib/api/training";
import {
  petsForPick,
  type ClientSearchHit,
} from "@/lib/bookings/wizard/client-search";
import { evaluationState } from "@/lib/bookings/wizard/pet-status";
import { useShellText } from "@/lib/shell/use-shell-text";
import {
  checkPrerequisitesForPet,
  hasCompletedPrerequisites,
} from "@/lib/training-program-prereqs";
import type { Client } from "@/types/client";
import type { ModuleConfig } from "@/types/facility";
import type { Pet } from "@/types/pet";

import { ClientCard } from "./ClientCard";
import { ClientSearchPanel } from "./ClientSearchPanel";
import { GuestInquiry } from "./GuestInquiry";
import { PetPicker, type PetLock } from "./PetPicker";

// ============================================================================
// Step 1 of the booking wizard (the client's mock, 2026-10-01).
//
//   Staff     "Find a client" until one is chosen, then the client's card and
//             "Pets on this booking". No client list — the search finds them.
//   Customer  "Who’s coming?": their own pets, nothing else.
//   Estimate  staff may price for someone who is not a client yet.
// ============================================================================

export interface GuestInquiryState {
  isGuest: boolean;
  setIsGuest: (value: boolean) => void;
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  petNames: string[];
  setPetNames: Dispatch<SetStateAction<string[]>>;
  petWeights: string[];
  setPetWeights: Dispatch<SetStateAction<string[]>>;
}

export function ClientPetStep({
  isCustomerMode,
  clients,
  selectedClient,
  selectedPetIds,
  setSelectedPetIds,
  onPickClient,
  onClearClient,
  searchQuery,
  setSearchQuery,
  onNewClient,
  selectedService,
  preSelectedProgramId,
  configs,
  guest,
}: {
  isCustomerMode: boolean;
  clients: readonly Client[];
  selectedClient: Client | undefined;
  selectedPetIds: number[];
  setSelectedPetIds: Dispatch<SetStateAction<number[]>>;
  onPickClient: (clientId: number, petIds: number[]) => void;
  /** Absent when the caller fixed the client. */
  onClearClient?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  /** Absent when the viewer may not create clients. */
  onNewClient?: () => void;
  selectedService: string;
  /** Training deep link: pets that have not finished its prerequisites are locked. */
  preSelectedProgramId?: string;
  configs: { daycare: ModuleConfig; boarding: ModuleConfig };
  /** Estimate mode only. */
  guest?: GuestInquiryState;
}) {
  const t = useShellText("booking");
  const audience = useSettingsAudience();
  const { data: summary } = useQuery({
    ...bookingClientSummaryQueries.all(),
    enabled: !isCustomerMode,
  });
  const { data: programs } = useQuery({
    ...trainingQueries.packages(audience),
    enabled: selectedService === "training" && !!preSelectedProgramId,
  });

  const visits = useMemo(() => {
    if (!selectedClient || !summary) return undefined;
    return summaryByClient(summary).get(selectedClient.id)?.bookingCount;
  }, [selectedClient, summary]);

  const lockedProgram =
    selectedService === "training" && preSelectedProgramId
      ? ((programs ?? []).find((p) => p.id === preSelectedProgramId) ?? null)
      : null;

  const lockOf = (pet: Pet): PetLock | null => {
    if (selectedService === "evaluation" && evaluationState(pet) === "passed") {
      return { label: t("alreadyEvaluated") };
    }
    if (
      lockedProgram &&
      (lockedProgram.prerequisitePackageIds?.length ?? 0) > 0 &&
      (pet.type !== "Dog" || !hasCompletedPrerequisites(pet.id, lockedProgram))
    ) {
      const missing = checkPrerequisitesForPet(pet.id, lockedProgram)
        .filter((result) => !result.satisfied)
        .map((result) => result.programName);
      return {
        label: t("prereq"),
        detail:
          missing.length > 0
            ? `${t("needsToComplete")} ${missing.join(", ")} ${t("needsToCompleteSuffix")}`
            : undefined,
      };
    }
    return null;
  };

  const showEvaluation =
    (configs.daycare?.settings.evaluation.enabled ?? false) ||
    (configs.boarding?.settings.evaluation.enabled ?? false);

  const pick = (hit: ClientSearchHit) =>
    onPickClient(
      hit.client.id,
      petsForPick(hit, (pet) => !lockOf(pet)),
    );

  const asGuest = !!guest?.isGuest;

  return (
    <div className="flex max-w-[1000px] flex-col gap-7">
      {guest && !selectedClient ? (
        <Segmented
          name="wizard-estimate-for"
          label={t("newInquiryTitle")}
          value={asGuest ? "guest" : "client"}
          options={[
            { value: "client", label: t("existingClient") },
            { value: "guest", label: t("newInquiryTitle") },
          ]}
          onChange={(value) => guest.setIsGuest(value === "guest")}
          className="self-start"
        />
      ) : null}

      {asGuest && guest ? (
        <GuestInquiry
          name={guest.name}
          setName={guest.setName}
          email={guest.email}
          setEmail={guest.setEmail}
          phone={guest.phone}
          setPhone={guest.setPhone}
          petNames={guest.petNames}
          setPetNames={guest.setPetNames}
          petWeights={guest.petWeights}
          setPetWeights={guest.setPetWeights}
        />
      ) : (
        <>
          {!isCustomerMode && !selectedClient ? (
            <ClientSearchPanel
              clients={clients}
              query={searchQuery}
              onQuery={setSearchQuery}
              onPick={pick}
              onNewClient={onNewClient}
            />
          ) : null}

          {!isCustomerMode && selectedClient ? (
            <ClientCard
              client={selectedClient}
              visits={visits}
              onChange={onClearClient}
            />
          ) : null}

          {selectedClient ? (
            <PetPicker
              title={
                isCustomerMode ? t("wizWhosComing") : t("wizPetsOnBooking")
              }
              pets={selectedClient.pets}
              selectedIds={selectedPetIds}
              onToggle={(petId) =>
                setSelectedPetIds((prev) =>
                  prev.includes(petId)
                    ? prev.filter((id) => id !== petId)
                    : [...prev, petId],
                )
              }
              onSelectAll={() =>
                setSelectedPetIds(
                  selectedClient.pets
                    .filter((pet) => !lockOf(pet))
                    .map((pet) => pet.id),
                )
              }
              lockOf={lockOf}
              showEvaluation={showEvaluation}
              emptyTitle={
                isCustomerMode ? t("wizNoPetsYouTitle") : t("clientHasNoPets")
              }
              emptyText={
                isCustomerMode
                  ? t("wizNoPetsYouText")
                  : t("addPetsOnClientProfile")
              }
            />
          ) : null}
        </>
      )}
    </div>
  );
}
