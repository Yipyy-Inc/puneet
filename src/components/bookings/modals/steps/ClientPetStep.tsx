import React from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, PawPrint, Check, Cat, FileWarning, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  // Check if there are pets that need evaluation
  const petsNeedingEvaluation = React.useMemo(() => {
    if (!serviceRequiresEvaluation || isEvaluationOptional) return [];
    return selectedPets.filter((pet) => !hasValidEvaluation(pet));
  }, [selectedPets, serviceRequiresEvaluation, isEvaluationOptional]);

  const petsWithExpiredEvaluation = React.useMemo(() => {
    if (!serviceRequiresEvaluation) return [];
    return selectedPets.filter((pet) => hasExpiredEvaluation(pet));
  }, [selectedPets, serviceRequiresEvaluation]);

  const petsWithFailedEvaluation = React.useMemo(() => {
    if (!serviceRequiresEvaluation) return [];
    return selectedPets.filter((pet) => hasFailedEvaluation(pet));
  }, [selectedPets, serviceRequiresEvaluation]);

  return (
    <div className="space-y-6">
      {/* Expired Evaluation Warning (customer-facing) */}
      {selectedService !== "evaluation" &&
        petsWithExpiredEvaluation.length > 0 && (
          <Alert variant="destructive">
            <FileWarning className="size-4" />
            <AlertTitle>Evaluation expired</AlertTitle>
            <AlertDescription>
              <p>
                Evaluation expired — please book a new evaluation to unlock
                services.
              </p>
              <ul className="mt-2 space-y-1">
                {petsWithExpiredEvaluation.map((pet) => (
                  <li key={pet.id} className="flex items-center gap-2">
                    <PawPrint className="size-4" />
                    {pet.name} ({pet.type})
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

      {/* Failed Evaluation Warning (customer-facing, no reason shown) */}
      {selectedService !== "evaluation" &&
        petsWithFailedEvaluation.length > 0 && (
          <Alert variant="destructive">
            <FileWarning className="size-4" />
            <AlertTitle>Evaluation required</AlertTitle>
            <AlertDescription>
              <p>
                Evaluation not passed — please book a new evaluation to unlock
                services.
              </p>
              <ul className="mt-2 space-y-1">
                {petsWithFailedEvaluation.map((pet) => (
                  <li key={pet.id} className="flex items-center gap-2">
                    <PawPrint className="size-4" />
                    {pet.name} ({pet.type})
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

      {/* Evaluation Warning */}
      {petsNeedingEvaluation.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <FileWarning className="mt-0.5 size-5 text-red-600" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800">
                Evaluation Required
              </h4>
              <p className="mt-1 text-sm text-red-700">
                The following pets require a passed evaluation before booking
                this service:
              </p>
              <ul className="mt-2 space-y-1">
                {petsNeedingEvaluation.map((pet) => (
                  <li
                    key={pet.id}
                    className="flex items-center gap-2 text-sm text-red-700"
                  >
                    <PawPrint className="size-4" />
                    {pet.name} ({pet.type})
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-red-700">
                Please complete evaluations for these pets or select different
                pets to proceed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Client Selection */}
      {!preSelectedClientId && (
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

            {/* Client list */}
            <div>
              <div className="p-2">
                {filteredClients.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No clients found
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredClients.map((client) => {
                      const isSelected = selectedClientId === client.id;
                      return (
                        <div
                          key={client.id}
                          className={`cursor-pointer rounded-lg p-3 transition-all ${
                            isSelected
                              ? `border-primary bg-primary/10 row-span-2 border-2`
                              : `hover:bg-muted border-2 border-transparent`
                          } `}
                          onClick={() => {
                            setSelectedClientId(client.id);
                            // Auto-select pet if client has only one pet
                            if (client.pets.length === 1) {
                              setSelectedPetIds([client.pets[0].id]);
                            } else {
                              setSelectedPetIds([]);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar
                              className={` ${isSelected ? "size-12" : `size-10`} transition-all`}
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
                              <p
                                className={`truncate text-sm ${
                                  isSelected
                                    ? `text-muted-foreground`
                                    : `text-muted-foreground`
                                } `}
                              >
                                {client.email}
                              </p>
                              {isSelected && client.phone && (
                                <p className="text-muted-foreground text-sm">
                                  {client.phone}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={isSelected ? "secondary" : "outline"}
                            >
                              {client.pets.length} pet
                              {client.pets.length !== 1 ? "s" : ""}
                            </Badge>
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

      {/* Pet Selection */}
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
          {selectedClient && (
            <Badge variant="secondary">
              {selectedPetIds.length} pet
              {selectedPetIds.length !== 1 ? "s" : ""} selected
            </Badge>
          )}
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
                    return (
                      <div
                        key={pet.id}
                        className={`rounded-lg border p-3 transition-all ${
                          isDisabled
                            ? "bg-muted cursor-not-allowed opacity-50"
                            : isSelected
                              ? `border-primary bg-primary/5 ring-primary/20 cursor-pointer ring-2`
                              : `hover:border-primary/50 cursor-pointer`
                        } `}
                        onClick={() => {
                          if (isDisabled) return;
                          setSelectedPetIds((prev) =>
                            prev.includes(pet.id)
                              ? prev.filter((id) => id !== pet.id)
                              : [...prev, pet.id],
                          );
                        }}
                      >
                        <div className="flex gap-3">
                          {pet.imageUrl ? (
                            <Image
                              src={pet.imageUrl}
                              alt={pet.name}
                              width={64}
                              height={64}
                              className="h-16 w-16 rounded-lg object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-lg">
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
                                {(serviceRequiresEvaluation ||
                                  selectedService === "evaluation") && (
                                  <div className="mt-1">
                                    {hasExpiredEvaluation(pet) ? (
                                      <Badge
                                        variant="destructive"
                                        className="text-xs"
                                      >
                                        <FileWarning className="mr-1 size-3" />
                                        Evaluation Expired
                                      </Badge>
                                    ) : hasValidEvaluation(pet) ? (
                                      <Badge
                                        variant="secondary"
                                        className="bg-green-100 text-xs text-green-800 hover:bg-green-100"
                                      >
                                        <Check className="mr-1 size-3" />
                                        Evaluation Passed
                                      </Badge>
                                    ) : selectedService === "evaluation" ? (
                                      <Badge
                                        variant="secondary"
                                        className="bg-blue-100 text-xs text-blue-800 hover:bg-blue-100"
                                      >
                                        Can be evaluated
                                      </Badge>
                                    ) : isEvaluationOptional ? (
                                      <Badge
                                        variant="secondary"
                                        className="bg-yellow-100 text-xs text-yellow-800 hover:bg-yellow-100"
                                      >
                                        <FileWarning className="mr-1 size-3" />
                                        No Evaluation
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="secondary"
                                        className="bg-red-100 text-xs text-red-800 hover:bg-red-100"
                                      >
                                        Evaluation Required
                                      </Badge>
                                    )}
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
    </div>
  );
}
