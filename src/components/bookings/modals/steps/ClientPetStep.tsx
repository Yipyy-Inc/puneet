import React from "react";
import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import { formatWeightFromLb } from "@/lib/i18n/format";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  PawPrint,
  Check,
  Cat,
  FileWarning,
  Lock,
  Info,
  CheckCheck,
  XCircle,
  User,
  Sparkles,
  Mail,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Client } from "@/types/client";
import type { ModuleConfig } from "@/types/facility";
import type { Pet } from "@/types/pet";
import {
  checkPrerequisitesForPet,
  hasCompletedPrerequisites,
} from "@/lib/training-program-prereqs";
import { useQuery } from "@tanstack/react-query";
import {
  bookingClientSummaryQueries,
  summaryByClient,
} from "@/lib/api/booking-client-summary";
import { useSettingsAudience } from "@/lib/api/settings-audience";
import { trainingQueries } from "@/lib/api/training";

interface ClientPetStepProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredClients: Client[];
  selectedClientId: number | null;
  setSelectedClientId: (id: number | null) => void;
  selectedPetIds: number[];
  setSelectedPetIds: React.Dispatch<React.SetStateAction<number[]>>;
  selectedClient: Client | undefined;
  preSelectedClientId?: number;
  selectedService: string;
  /** Training-only: when a specific program is deep-linked, dogs that
   *  haven't completed the prereq programs are grayed out + tagged with a
   *  note about what's missing. */
  preSelectedProgramId?: string;
  configs: { daycare: ModuleConfig; boarding: ModuleConfig };
  // Guest estimate props
  isEstimateMode?: boolean;
  isGuestEstimate?: boolean;
  setIsGuestEstimate?: (v: boolean) => void;
  guestName?: string;
  setGuestName?: (v: string) => void;
  guestEmail?: string;
  setGuestEmail?: (v: string) => void;
  guestPhone?: string;
  setGuestPhone?: (v: string) => void;
  guestPetNames?: string[];
  setGuestPetNames?: React.Dispatch<React.SetStateAction<string[]>>;
  guestPetWeights?: string[];
  setGuestPetWeights?: React.Dispatch<React.SetStateAction<string[]>>;
  /** Staff may book past the evaluation rule at the service step, so the
   *  pets it catches are a heads-up here, not a dead end. */
  mayOverrideEvaluation?: boolean;
}

export function ClientPetStep({
  searchQuery,
  setSearchQuery,
  filteredClients,
  selectedClientId,
  setSelectedClientId,
  selectedPetIds,
  setSelectedPetIds,
  selectedClient,
  preSelectedClientId,
  preSelectedProgramId,
  selectedService,
  configs,
  isEstimateMode,
  isGuestEstimate,
  setIsGuestEstimate,
  guestName,
  setGuestName,
  guestEmail,
  setGuestEmail,
  guestPhone,
  setGuestPhone,
  guestPetNames,
  setGuestPetNames,
  guestPetWeights,
  setGuestPetWeights,
  mayOverrideEvaluation = false,
}: ClientPetStepProps) {
  // A customer reads their own facility's catalogue (lib/api/settings-audience).
  const settingsAudience = useSettingsAudience();
  // Visit counts from the booking summary, not every booking the facility has.
  const { data: bookingSummary } = useQuery(bookingClientSummaryQueries.all());
  const { data: trainingPrograms } = useQuery(
    trainingQueries.packages(settingsAudience),
  );
  const t = useShellText("booking");
  const locale = useShellLocale();
  // Check if service requires evaluation
  const serviceRequiresEvaluation = React.useMemo(() => {
    const config = configs[selectedService as "daycare" | "boarding"];
    return config?.settings.evaluation.enabled ?? false;
  }, [selectedService, configs]);

  // Check if evaluation is optional
  const isEvaluationOptional = React.useMemo(() => {
    const config = configs[selectedService as "daycare" | "boarding"];
    return config?.settings.evaluation.optional ?? false;
  }, [selectedService, configs]);

  // Check if a pet has a valid (passed) evaluation
  const hasValidEvaluation = (pet: Pet) => {
    return pet.evaluations?.some(
      (e) =>
        e.status === "passed" &&
        e.isExpired !== true &&
        // Approved services check (if provided)
        (Array.isArray(e.approvedServices)
          ? e.approvedServices.length > 0
          : true),
    );
  };

  const hasExpiredEvaluation = (pet: Pet) => {
    return pet.evaluations?.some(
      (e) =>
        (e.status === "passed" && e.isExpired === true) ||
        e.status === "outdated",
    );
  };

  const hasFailedEvaluation = (pet: Pet) => {
    return pet.evaluations?.some((e) => e.status === "failed");
  };

  // Check if pet can be selected for evaluation service
  const canSelectForEvaluation = (pet: Pet) => {
    // If evaluation service is selected, only allow pets without valid evaluations
    if (selectedService === "evaluation") {
      return !hasValidEvaluation(pet);
    }
    return true;
  };

  // Resolve the locked-in training program (if any) once so prereq checks
  // below are a constant-time lookup per pet.
  const lockedProgram = React.useMemo(() => {
    if (selectedService !== "training" || !preSelectedProgramId) return null;
    return (
      (trainingPrograms ?? []).find((p) => p.id === preSelectedProgramId) ??
      null
    );
  }, [selectedService, preSelectedProgramId, trainingPrograms]);

  const canSelectForProgramPrereq = React.useCallback(
    (pet: Pet) => {
      if (!lockedProgram) return true;
      if ((lockedProgram.prerequisitePackageIds?.length ?? 0) === 0)
        return true;
      // The current prereq helper checks against dogs; cats can't enroll in
      // a training program anyway, so we just gate on dogs here.
      if (pet.type !== "Dog") return false;
      return hasCompletedPrerequisites(pet.id, lockedProgram);
    },
    [lockedProgram],
  );

  const prereqResultsByPet = React.useMemo(() => {
    if (!lockedProgram)
      return new Map<number, ReturnType<typeof checkPrerequisitesForPet>>();
    const map = new Map<number, ReturnType<typeof checkPrerequisitesForPet>>();
    if (!selectedClient) return map;
    for (const pet of selectedClient.pets) {
      map.set(pet.id, checkPrerequisitesForPet(pet.id, lockedProgram));
    }
    return map;
  }, [lockedProgram, selectedClient]);

  // Get selected pets
  const selectedPets = React.useMemo(() => {
    if (!selectedClient) return [];
    return selectedClient.pets.filter((pet) => selectedPetIds.includes(pet.id));
  }, [selectedClient, selectedPetIds]);

  // #2 — Consolidated list of pets with evaluation issues (expired, failed, or missing)
  const petEvalIssues = React.useMemo(() => {
    if (!serviceRequiresEvaluation || selectedService === "evaluation")
      return [];
    const issues: { pet: Pet; reason: string }[] = [];
    for (const pet of selectedPets) {
      if (hasExpiredEvaluation(pet)) {
        issues.push({ pet, reason: "expired" });
      } else if (hasFailedEvaluation(pet)) {
        issues.push({ pet, reason: "failed" });
      } else if (!hasValidEvaluation(pet) && !isEvaluationOptional) {
        issues.push({ pet, reason: "missing" });
      }
    }
    return issues;
  }, [
    selectedPets,
    serviceRequiresEvaluation,
    isEvaluationOptional,
    selectedService,
  ]);

  // #5 — select all / deselect all
  const allPetIds =
    selectedClient?.pets
      .filter((p) => canSelectForEvaluation(p))
      .map((p) => p.id) ?? [];
  const allSelected =
    allPetIds.length > 0 &&
    allPetIds.every((id) => selectedPetIds.includes(id));

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedPetIds([]);
    } else {
      setSelectedPetIds(allPetIds);
    }
  };

  // Evaluation badge for a pet — returns null when nothing to show
  const renderEvalBadge = (pet: Pet) => {
    if (hasExpiredEvaluation(pet)) {
      return (
        <Badge variant="destructive" className="text-xs">
          <FileWarning className="mr-1 size-3" />
          {t("evalExpired")}
        </Badge>
      );
    }
    if (hasFailedEvaluation(pet)) {
      return (
        <Badge
          variant="secondary"
          className="bg-red-100 text-xs text-red-800 hover:bg-red-100"
        >
          <FileWarning className="mr-1 size-3" />
          {t("evalFailed")}
        </Badge>
      );
    }
    if (hasValidEvaluation(pet)) {
      return (
        <Badge
          variant="secondary"
          className="bg-green-100 text-xs text-green-800 hover:bg-green-100"
        >
          <Check className="mr-1 size-3" />
          {t("evalPassed")}
        </Badge>
      );
    }
    if (selectedService === "evaluation") {
      return (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-xs text-blue-800 hover:bg-blue-100"
        >
          {t("evalCanBe")}
        </Badge>
      );
    }
    if (serviceRequiresEvaluation && !isEvaluationOptional) {
      return (
        <Badge
          variant="secondary"
          className="bg-red-100 text-xs text-red-800 hover:bg-red-100"
        >
          {t("evaluationRequired")}
        </Badge>
      );
    }
    if (serviceRequiresEvaluation && isEvaluationOptional) {
      return (
        <Badge
          variant="secondary"
          className="bg-yellow-100 text-xs text-yellow-800 hover:bg-yellow-100"
        >
          <FileWarning className="mr-1 size-3" />
          {t("evalNone")}
        </Badge>
      );
    }
    return null;
  };

  // Booking counts per client
  const bookingCounts = React.useMemo(() => {
    const counts: Record<number, number> = {};
    for (const [ref, row] of summaryByClient(bookingSummary ?? [])) {
      counts[ref] = row.bookingCount;
    }
    return counts;
  }, [bookingSummary]);

  // Client list sorted by frequency (most bookings first)
  const sortedClients = React.useMemo(() => {
    return [...filteredClients].sort(
      (a, b) => (bookingCounts[b.id] ?? 0) - (bookingCounts[a.id] ?? 0),
    );
  }, [filteredClients, bookingCounts]);

  const handlePetToggle = (petId: number) => {
    setSelectedPetIds((prev) =>
      prev.includes(petId)
        ? prev.filter((id) => id !== petId)
        : [...prev, petId],
    );
  };

  const resolvedGuestPetNames = React.useMemo(() => {
    if (guestPetNames && guestPetNames.length > 0) return guestPetNames;
    return [""];
  }, [guestPetNames]);

  const handleGuestPetNameChange = (index: number, value: string) => {
    if (!setGuestPetNames) return;
    setGuestPetNames((prev) => {
      const names = prev.length > 0 ? [...prev] : [""];
      names[index] = value;
      return names;
    });
  };

  const handleGuestPetWeightChange = (index: number, value: string) => {
    if (!setGuestPetWeights) return;
    // Only digits with optional one decimal point — ignore other characters.
    const sanitized = value.replace(/[^\d.]/g, "");
    setGuestPetWeights((prev) => {
      const weights = prev.length > 0 ? [...prev] : [""];
      while (weights.length <= index) weights.push("");
      weights[index] = sanitized;
      return weights;
    });
  };

  const addGuestPetField = () => {
    if (!setGuestPetNames) return;
    setGuestPetNames((prev) => [...(prev.length > 0 ? prev : [""]), ""]);
  };

  const removeGuestPetField = (index: number) => {
    if (!setGuestPetNames) return;
    setGuestPetNames((prev) => {
      const names = prev.length > 0 ? [...prev] : [""];
      if (names.length <= 1) return names;
      const next = names.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
  };

  return (
    <div className="space-y-6">
      {/* #2 — Single consolidated alert for all evaluation issues */}
      {petEvalIssues.length > 0 && (
        <Alert
          variant={mayOverrideEvaluation ? "default" : "destructive"}
          className={mayOverrideEvaluation ? "border-warning" : undefined}
        >
          <FileWarning
            className={cn("size-4", mayOverrideEvaluation && "text-warning")}
          />
          <AlertTitle>{t("evalIssues")}</AlertTitle>
          <AlertDescription>
            <p>
              {t(
                mayOverrideEvaluation
                  ? "evalIssuesStaffHelp"
                  : "evalIssuesHelp",
              )}
            </p>
            <ul className="mt-2 space-y-1">
              {petEvalIssues.map(({ pet, reason }) => (
                <li key={pet.id} className="flex items-center gap-2">
                  <PawPrint className="size-3.5 shrink-0" />
                  <span>
                    {pet.name} ({pet.type}) —{" "}
                    {reason === "expired"
                      ? t("evalReasonExpired")
                      : reason === "failed"
                        ? t("evalReasonFailed")
                        : t("evalReasonNone")}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2">
              {t(
                mayOverrideEvaluation ? "evalIssuesStaffFix" : "evalIssuesFix",
              )}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Estimate mode: Existing client vs New inquiry toggle */}
      {isEstimateMode && !preSelectedClientId && setIsGuestEstimate && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setIsGuestEstimate(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
              !isGuestEstimate
                ? "border-blue-400 bg-blue-50/50 shadow-sm"
                : "border-slate-200 hover:border-blue-200",
            )}
          >
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-lg",
                !isGuestEstimate ? "bg-blue-100" : "bg-slate-100",
              )}
            >
              <User
                className={cn(
                  "size-4",
                  !isGuestEstimate ? "text-blue-600" : "text-slate-400",
                )}
              />
            </div>
            <div>
              <p className="text-sm font-semibold">{t("existingClient")}</p>
              <p className="text-muted-foreground text-[11px]">
                {t("existingClientHelp")}
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setIsGuestEstimate(true)}
            className={cn(
              "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
              isGuestEstimate
                ? "border-violet-400 bg-violet-50/50 shadow-sm"
                : "border-slate-200 hover:border-violet-200",
            )}
          >
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-lg",
                isGuestEstimate ? "bg-violet-100" : "bg-slate-100",
              )}
            >
              <Sparkles
                className={cn(
                  "size-4",
                  isGuestEstimate ? "text-violet-600" : "text-slate-400",
                )}
              />
            </div>
            <div>
              <p className="text-sm font-semibold">{t("newInquiryTitle")}</p>
              <p className="text-muted-foreground text-[11px]">
                {t("newInquiryHelp")}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Guest estimate contact form */}
      {isEstimateMode && isGuestEstimate && setGuestName && setGuestEmail && (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold">{t("newInquiryTitle")}</h3>

          <div className="space-y-4 rounded-xl border bg-slate-50/40 p-4">
            <h4 className="text-base font-semibold">
              {t("contactInformation")}
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium">
                  <User className="size-3.5" /> {t("nameRequired")}
                </label>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={t("customerNamePlaceholder")}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium">
                  <Mail className="size-3.5" /> {t("emailRequired")}
                </label>
                <Input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder={t("guestEmailPlaceholder")}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="flex items-center gap-1.5 text-sm font-medium">
                  <Phone className="size-3.5" /> {t("phone")}
                </label>
                <Input
                  value={guestPhone}
                  onChange={(e) => setGuestPhone?.(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="bg-white"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border bg-violet-50/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="flex items-center gap-1.5 text-base font-semibold">
                  <PawPrint className="size-4" /> {t("petInformation")}{" "}
                  <span className="text-destructive text-sm">*</span>
                </h4>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {t("petInformationHelp")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs"
                onClick={addGuestPetField}
              >
                <Plus className="size-3" />
                {t("addPet")}
              </Button>
            </div>

            <div className="space-y-2">
              {resolvedGuestPetNames.map((petName, index) => {
                const weight = guestPetWeights?.[index] ?? "";
                const nameEntered = petName.trim().length > 0;
                const weightMissing =
                  nameEntered && (!weight || Number(weight) <= 0);
                return (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex h-8 min-w-8 items-center justify-center rounded-md bg-violet-100 text-xs font-semibold text-violet-700">
                      {index + 1}
                    </div>
                    <Input
                      value={petName}
                      onChange={(e) =>
                        handleGuestPetNameChange(index, e.target.value)
                      }
                      placeholder={
                        index === 0
                          ? t("petNameExample")
                          : t("petNumberName").replace("{n}", String(index + 1))
                      }
                      className="bg-white"
                    />
                    <div className="relative">
                      <Input
                        value={weight}
                        onChange={(e) =>
                          handleGuestPetWeightChange(index, e.target.value)
                        }
                        inputMode="decimal"
                        placeholder={t("weight")}
                        aria-label={t("petNumberWeight").replace(
                          "{n}",
                          String(index + 1),
                        )}
                        aria-invalid={weightMissing}
                        className={cn(
                          "w-28 bg-white pr-9",
                          weightMissing && "border-destructive",
                        )}
                      />
                      <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs">
                        {t("unitLbs")}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-slate-400 hover:text-red-500"
                      disabled={resolvedGuestPetNames.length <= 1}
                      onClick={() => removeGuestPetField(index)}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">{t("removePet")}</span>
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Client Selection */}
      {!preSelectedClientId && !(isEstimateMode && isGuestEstimate) && (
        <>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t("selectClient")}</h3>
              {/* No "Add a client" here. A client is created on the Clients
                  screen, which asks for what a client record actually needs;
                  this offered a name, a phone and an email in the middle of a
                  booking and then dropped you into a pet form. Two ways to
                  make a client, one of them worse, is a choice nobody should
                  have to make mid-booking. */}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder={t("searchClientsPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Client list — sorted by booking frequency */}
            <div>
              <div className="p-2">
                {filteredClients.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    {t("noClientsFound")}
                  </p>
                ) : (
                  // One column on phones: at 2 columns each card was ~180px, so
                  // the avatar + visits/pets badges consumed the row and the
                  // name/email collapsed to zero width (invisible).
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {sortedClients.map((client) => {
                      const isSelected = selectedClientId === client.id;
                      return (
                        <div
                          key={client.id}
                          className={cn(
                            // No row-span on select: in a 2-col grid it forced
                            // the card to span two rows and balloon into a square.
                            "cursor-pointer rounded-lg p-3 transition-all",
                            isSelected
                              ? "bg-primary/10 border-transparent shadow-sm"
                              : "hover:bg-muted border-2 border-transparent",
                          )}
                          onClick={() => {
                            setSelectedClientId(client.id);
                            if (client.pets.length === 1) {
                              setSelectedPetIds([client.pets[0].id]);
                            } else {
                              setSelectedPetIds([]);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar
                              className={cn(
                                "transition-all",
                                isSelected ? "size-12" : "size-10",
                              )}
                            >
                              <AvatarImage
                                src={client.imageUrl}
                                alt={client.name}
                              />
                              <AvatarFallback>
                                {client.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">
                                {client.name}
                              </p>
                              {/* #4 — removed dead ternary */}
                              <p className="text-muted-foreground truncate text-sm">
                                {client.email}
                              </p>
                              {isSelected && client.phone && (
                                <p className="text-muted-foreground text-sm">
                                  {client.phone}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {(bookingCounts[client.id] ?? 0) > 0 && (
                                <Badge
                                  variant="outline"
                                  className="border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                                >
                                  {t("visitsCount").replace(
                                    "{count}",
                                    String(bookingCounts[client.id]),
                                  )}
                                </Badge>
                              )}
                              <Badge
                                variant={isSelected ? "secondary" : "outline"}
                              >
                                {(client.pets.length === 1
                                  ? t("petsCountOne")
                                  : t("petsCountMany")
                                ).replace(
                                  "{count}",
                                  String(client.pets.length),
                                )}
                              </Badge>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="border-border mt-3 border-t pt-3">
                              <div className="text-sm">
                                <p className="text-muted-foreground">
                                  {t("status")}
                                </p>
                                <p className="font-medium capitalize">
                                  {client.status}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />
        </>
      )}

      {/* Pet Selection — hidden for guest estimates */}
      {!(isEstimateMode && isGuestEstimate) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold">{t("selectPets")}</h3>
              {serviceRequiresEvaluation && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="text-muted-foreground ml-2 size-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {isEvaluationOptional
                        ? t("evaluationOptionalHere")
                        : t("evaluationRequiredHere")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* #5 — Select all / Deselect all */}
              {selectedClient && allPetIds.length >= 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={handleToggleAll}
                >
                  {allSelected ? (
                    <>
                      <XCircle className="size-3" />
                      {t("deselectAll")}
                    </>
                  ) : (
                    <>
                      <CheckCheck className="size-3" />
                      {t("selectAll")}
                    </>
                  )}
                </Button>
              )}
              {selectedClient && (
                <Badge variant="secondary">
                  {(selectedPetIds.length === 1
                    ? t("petsSelectedOne")
                    : t("petsSelectedMany")
                  ).replace("{count}", String(selectedPetIds.length))}
                </Badge>
              )}
            </div>
          </div>
          {selectedClient ? (
            <div className="space-y-3">
              {selectedClient.pets.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3 pr-2">
                    {selectedClient.pets.map((pet) => {
                      const isSelected = selectedPetIds.includes(pet.id);
                      const canSelectEval = canSelectForEvaluation(pet);
                      const canSelectPrereq = canSelectForProgramPrereq(pet);
                      const canSelect = canSelectEval && canSelectPrereq;
                      const isDisabled = !canSelect;
                      const evalBadge = renderEvalBadge(pet);
                      const missingPrereqs =
                        canSelectEval && !canSelectPrereq
                          ? (prereqResultsByPet.get(pet.id) ?? [])
                              .filter((r) => !r.satisfied)
                              .map((r) => r.programName)
                          : [];

                      return (
                        <div
                          key={pet.id}
                          // #6 — accessibility
                          role="checkbox"
                          aria-checked={isSelected}
                          aria-disabled={isDisabled}
                          aria-label={`${pet.name}, ${pet.type}, ${pet.breed}`}
                          tabIndex={isDisabled ? -1 : 0}
                          onKeyDown={(e) => {
                            if (
                              !isDisabled &&
                              (e.key === "Enter" || e.key === " ")
                            ) {
                              e.preventDefault();
                              handlePetToggle(pet.id);
                            }
                          }}
                          // #3 — cn() instead of template literals
                          className={cn(
                            "rounded-lg border p-3 transition-all outline-none",
                            "focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2",
                            isDisabled
                              ? "bg-muted cursor-not-allowed opacity-50"
                              : isSelected
                                ? "bg-primary/5 cursor-pointer border-transparent shadow-sm"
                                : "hover:border-primary/50 cursor-pointer",
                          )}
                          onClick={() => {
                            if (!isDisabled) handlePetToggle(pet.id);
                          }}
                        >
                          <div className="flex gap-3">
                            {pet.imageUrl ? (
                              <Image
                                src={pet.imageUrl}
                                alt={pet.name}
                                width={64}
                                height={64}
                                className="size-16 rounded-lg object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="bg-muted flex size-16 items-center justify-center rounded-lg">
                                {pet.type === "Cat" ? (
                                  <Cat className="text-muted-foreground size-8" />
                                ) : (
                                  <PawPrint className="text-muted-foreground size-8" />
                                )}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium">
                                    {pet.name}
                                  </p>
                                  <p className="text-muted-foreground truncate text-xs">
                                    {pet.type} • {pet.breed}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    {(pet.age === 1
                                      ? t("ageYearsOne")
                                      : t("ageYearsMany")
                                    ).replace("{count}", String(pet.age))}{" "}
                                    • {formatWeightFromLb(pet.weight, locale)}
                                  </p>
                                  {/* #1 — only render wrapper when badge exists */}
                                  {evalBadge && (
                                    <div className="mt-1">{evalBadge}</div>
                                  )}
                                  {missingPrereqs.length > 0 && (
                                    <div className="mt-1 inline-flex items-start gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px]/snug text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                                      <FileWarning className="mt-0.5 size-3 shrink-0" />
                                      <span>
                                        {t("needsToComplete")}{" "}
                                        <span className="font-semibold">
                                          {missingPrereqs.join(", ")}
                                        </span>{" "}
                                        {t("needsToCompleteSuffix")}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {isSelected && !isDisabled && (
                                  <Check className="text-primary size-5 shrink-0" />
                                )}
                                {isDisabled &&
                                  selectedService === "evaluation" && (
                                    <Badge
                                      variant="outline"
                                      className="shrink-0 text-xs"
                                    >
                                      {t("alreadyEvaluated")}
                                    </Badge>
                                  )}
                                {isDisabled && missingPrereqs.length > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="shrink-0 gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-800"
                                  >
                                    <Lock className="size-3" />
                                    {t("prereq")}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-muted-foreground text-sm">
                    {t("clientHasNoPets")}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {t("addPetsOnClientProfile")}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-muted-foreground text-sm">
                {t("selectAClientFirst")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
