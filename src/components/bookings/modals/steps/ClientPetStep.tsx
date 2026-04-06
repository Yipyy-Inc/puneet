import React from "react";
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
  Info,
  CheckCheck,
  XCircle,
  User,
  Sparkles,
  Mail,
  Phone,
} from "lucide-react";
import { bookings } from "@/data/bookings";
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
  guestPetName?: string;
  setGuestPetName?: (v: string) => void;
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
  guestPetName,
  setGuestPetName,
}: ClientPetStepProps) {
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
          Evaluation Expired
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
          Evaluation Failed
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
          Evaluation Passed
        </Badge>
      );
    }
    if (selectedService === "evaluation") {
      return (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-xs text-blue-800 hover:bg-blue-100"
        >
          Can be evaluated
        </Badge>
      );
    }
    if (serviceRequiresEvaluation && !isEvaluationOptional) {
      return (
        <Badge
          variant="secondary"
          className="bg-red-100 text-xs text-red-800 hover:bg-red-100"
        >
          Evaluation Required
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
          No Evaluation
        </Badge>
      );
    }
    return null;
  };

  // Booking counts per client
  const bookingCounts = React.useMemo(() => {
    const counts: Record<number, number> = {};
    for (const b of bookings) {
      counts[b.clientId] = (counts[b.clientId] ?? 0) + 1;
    }
    return counts;
  }, []);

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

  return (
    <div className="space-y-6">
      {/* #2 — Single consolidated alert for all evaluation issues */}
      {petEvalIssues.length > 0 && (
        <Alert variant="destructive">
          <FileWarning className="size-4" />
          <AlertTitle>Evaluation issues</AlertTitle>
          <AlertDescription>
            <p>
              The following pets cannot access this service until their
              evaluation status is resolved:
            </p>
            <ul className="mt-2 space-y-1">
              {petEvalIssues.map(({ pet, reason }) => (
                <li key={pet.id} className="flex items-center gap-2">
                  <PawPrint className="size-3.5 shrink-0" />
                  <span>
                    {pet.name} ({pet.type}) —{" "}
                    {reason === "expired"
                      ? "evaluation expired"
                      : reason === "failed"
                        ? "evaluation not passed"
                        : "no evaluation on file"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2">
              Please book an evaluation first or select different pets.
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
              <p className="text-sm font-semibold">Existing Client</p>
              <p className="text-muted-foreground text-[11px]">
                Search your database
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
              <p className="text-sm font-semibold">New Inquiry</p>
              <p className="text-muted-foreground text-[11px]">
                No account yet
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Guest estimate contact form */}
      {isEstimateMode && isGuestEstimate && setGuestName && setGuestEmail && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Contact Info</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <User className="size-3.5" /> Name *
              </label>
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <Mail className="size-3.5" /> Email *
              </label>
              <Input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <Phone className="size-3.5" /> Phone
              </label>
              <Input
                value={guestPhone}
                onChange={(e) => setGuestPhone?.(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <PawPrint className="size-3.5" /> Pet Name
              </label>
              <Input
                value={guestPetName}
                onChange={(e) => setGuestPetName?.(e.target.value)}
                placeholder="Pet's name (optional)"
              />
            </div>
          </div>
        </div>
      )}

      {/* Client Selection */}
      {!preSelectedClientId && !(isEstimateMode && isGuestEstimate) && (
        <>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Select Client</h3>

            {/* Search */}
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search by name, email, or phone..."
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
                    No clients found
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {sortedClients.map((client) => {
                      const isSelected = selectedClientId === client.id;
                      return (
                        <div
                          key={client.id}
                          className={cn(
                            "cursor-pointer rounded-lg p-3 transition-all",
                            isSelected
                              ? "border-primary bg-primary/10 row-span-2 border-2"
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
                            <div className="flex items-center gap-1.5">
                              {(bookingCounts[client.id] ?? 0) > 0 && (
                                <Badge
                                  variant="outline"
                                  className="border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                                >
                                  {bookingCounts[client.id]} visits
                                </Badge>
                              )}
                              <Badge
                                variant={isSelected ? "secondary" : "outline"}
                              >
                                {client.pets.length} pet
                                {client.pets.length !== 1 ? "s" : ""}
                              </Badge>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="border-border mt-3 border-t pt-3">
                              <div className="text-sm">
                                <p className="text-muted-foreground">Status</p>
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
              <h3 className="text-lg font-semibold">Select Pet(s)</h3>
              {serviceRequiresEvaluation && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="text-muted-foreground ml-2 size-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Evaluation is enabled and{" "}
                      {isEvaluationOptional ? "optional" : "required"} for this
                      service.
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
                      Deselect all
                    </>
                  ) : (
                    <>
                      <CheckCheck className="size-3" />
                      Select all
                    </>
                  )}
                </Button>
              )}
              {selectedClient && (
                <Badge variant="secondary">
                  {selectedPetIds.length} pet
                  {selectedPetIds.length !== 1 ? "s" : ""} selected
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
                      const canSelect = canSelectForEvaluation(pet);
                      const isDisabled = !canSelect;
                      const evalBadge = renderEvalBadge(pet);

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
                                ? "border-primary bg-primary/5 ring-primary/20 cursor-pointer ring-2"
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
                                    {pet.age} {pet.age === 1 ? "yr" : "yrs"} •{" "}
                                    {pet.weight}kg
                                  </p>
                                  {/* #1 — only render wrapper when badge exists */}
                                  {evalBadge && (
                                    <div className="mt-1">{evalBadge}</div>
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
                                      Already Evaluated
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
                    This client has no pets registered.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-muted-foreground text-sm">
                Please select a client first
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
