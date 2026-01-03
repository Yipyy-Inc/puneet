import React from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, PawPrint, Check, Cat, FileWarning, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Client, Pet, ModuleConfig } from "@/lib/types";

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
    return pet.evaluations?.some((e) => e.status === "passed");
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

  return (
    <div className="space-y-6">
      {/* Evaluation Warning */}
      {petsNeedingEvaluation.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <FileWarning className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800">
                Evaluation Required
              </h4>
              <p className="text-sm text-red-700 mt-1">
                The following pets require a passed evaluation before booking
                this service:
              </p>
              <ul className="mt-2 space-y-1">
                {petsNeedingEvaluation.map((pet) => (
                  <li
                    key={pet.id}
                    className="text-sm text-red-700 flex items-center gap-2"
                  >
                    <PawPrint className="h-4 w-4" />
                    {pet.name} ({pet.type})
                  </li>
                ))}
              </ul>
              <p className="text-sm text-red-700 mt-2">
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
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No clients found
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredClients.map((client) => {
                      const isSelected = selectedClientId === client.id;
                      return (
                        <div
                          key={client.id}
                          className={`p-3 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? "bg-primary/10 border-2 border-primary row-span-2"
                              : "hover:bg-muted border-2 border-transparent"
                          }`}
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
                              className={`${isSelected ? "h-12 w-12" : "h-10 w-10"} transition-all`}
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
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {client.name}
                              </p>
                              <p
                                className={`text-sm truncate ${isSelected ? "text-muted-foreground" : "text-muted-foreground"}`}
                              >
                                {client.email}
                              </p>
                              {isSelected && client.phone && (
                                <p className="text-sm text-muted-foreground">
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
                            <div className="mt-3 pt-3 border-t border-border">
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
                  <Info className="h-4 w-4 text-muted-foreground ml-2" />
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
                        className={`p-3 rounded-lg border transition-all ${
                          isDisabled
                            ? "opacity-50 cursor-not-allowed bg-muted"
                            : isSelected
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20 cursor-pointer"
                              : "hover:border-primary/50 cursor-pointer"
                        }`}
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
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={pet.imageUrl}
                              alt={pet.name}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                              {pet.type === "Cat" ? (
                                <Cat className="h-8 w-8 text-muted-foreground" />
                              ) : (
                                <PawPrint className="h-8 w-8 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {pet.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {pet.type} • {pet.breed}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {pet.age} {pet.age === 1 ? "yr" : "yrs"} •{" "}
                                  {pet.weight}kg
                                </p>
                                {(serviceRequiresEvaluation ||
                                  selectedService === "evaluation") && (
                                  <div className="mt-1">
                                    {pet.evaluations?.some(
                                      (e) => e.status === "passed",
                                    ) ? (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs bg-green-100 text-green-800 hover:bg-green-100"
                                      >
                                        <Check className="h-3 w-3 mr-1" />
                                        Evaluation Passed
                                      </Badge>
                                    ) : selectedService === "evaluation" ? (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-100"
                                      >
                                        Can be evaluated
                                      </Badge>
                                    ) : isEvaluationOptional ? (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                      >
                                        <FileWarning className="h-3 w-3 mr-1" />
                                        No Evaluation
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs bg-red-100 text-red-800 hover:bg-red-100"
                                      >
                                        Evaluation Required
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              {isSelected && !isDisabled && (
                                <Check className="h-5 w-5 text-primary shrink-0" />
                              )}
                              {isDisabled &&
                                selectedService === "evaluation" && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs shrink-0"
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
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  This client has no pets registered.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Please select a client first
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
