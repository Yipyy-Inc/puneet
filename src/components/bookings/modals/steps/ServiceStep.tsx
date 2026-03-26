import { useMemo } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SERVICE_CATEGORIES } from "../constants";
import { evaluationConfig } from "@/data/settings";
import type { FacilityBookingFlowConfig, ModuleConfig, Pet } from "@/lib/types";
import { useCustomServices } from "@/hooks/use-custom-services";
import { getAllServiceCategories } from "@/lib/service-registry";

interface ServiceStepProps {
  selectedService: string;
  setSelectedService: (service: string) => void;
  setServiceType: (type: string) => void;
  setCurrentSubStep: (step: number) => void;
  configs: Record<string, ModuleConfig>;
  bookingFlow: FacilityBookingFlowConfig;
  selectedPets?: Pet[];
}

export function ServiceStep({
  selectedService,
  setSelectedService,
  setServiceType,
  setCurrentSubStep,
  configs,
  bookingFlow,
  selectedPets = [],
}: ServiceStepProps) {
  const { activeModules } = useCustomServices();
  const allCategories = useMemo(
    () => getAllServiceCategories(SERVICE_CATEGORIES, activeModules),
    [activeModules],
  );

  const getLatestEvaluation = (pet: Pet) => {
    const evals = (pet as unknown as { evaluations?: any[] }).evaluations ?? [];
    if (evals.length === 0) return null;
    return [...evals].sort((a, b) => {
      const da = a?.evaluatedAt ? new Date(a.evaluatedAt).getTime() : 0;
      const db = b?.evaluatedAt ? new Date(b.evaluatedAt).getTime() : 0;
      return db - da;
    })[0];
  };

  const isExpiredEvaluation = (ev: any) => {
    return ev?.isExpired === true || ev?.status === "outdated";
  };

  const isPassedEvaluation = (ev: any) => ev?.status === "passed";
  const isFailedEvaluation = (ev: any) => ev?.status === "failed";
  const hasValidEvaluation = (pet: Pet) => {
    const latest = getLatestEvaluation(pet);
    if (!latest) return false;
    if (isFailedEvaluation(latest)) return false;
    if (!isPassedEvaluation(latest)) return false;
    if (isExpiredEvaluation(latest)) return false;
    return true;
  };

  const isServiceApprovedByEvaluation = (ev: any, serviceId: string) => {
    if (!ev || !isPassedEvaluation(ev) || isExpiredEvaluation(ev)) return false;
    const approvals =
      ev.approvedServices ?? ev.serviceApprovals ?? ev.approvals ?? null;
    // Backwards-compat: if API doesn't provide approvals, treat PASS as approved.
    if (!approvals) return true;

    // boolean map: { daycare: true, boarding: false, customApproved: [...] }
    if (typeof approvals === "object" && !Array.isArray(approvals)) {
      if (serviceId === "daycare" && "daycare" in approvals)
        return Boolean((approvals as any).daycare);
      if (serviceId === "boarding" && "boarding" in approvals)
        return Boolean((approvals as any).boarding);
      const customApproved: unknown = (approvals as any).customApproved;
      if (Array.isArray(customApproved))
        return customApproved.includes(serviceId);
      const custom: unknown = (approvals as any).custom;
      if (Array.isArray(custom)) return custom.includes(serviceId);
    }

    // array of ids
    if (Array.isArray(approvals)) return approvals.includes(serviceId);

    // string modes (rare)
    if (approvals === "both")
      return serviceId === "daycare" || serviceId === "boarding";
    if (approvals === "daycare") return serviceId === "daycare";
    if (approvals === "boarding") return serviceId === "boarding";

    return false;
  };

  const isPetUnlockedForService = (pet: Pet, serviceId: string) => {
    const latest = getLatestEvaluation(pet);
    if (!latest) return false;
    if (isFailedEvaluation(latest)) return false;
    if (!isPassedEvaluation(latest)) return false;
    if (isExpiredEvaluation(latest)) return false;
    return isServiceApprovedByEvaluation(latest, serviceId);
  };

  return (
    <div className="space-y-4">
      <Label className="text-base">Select a service</Label>
      <div className="grid grid-cols-2 gap-4">
        {allCategories
          .filter((service) => {
            if (service.id === "evaluation") return true;
            if (bookingFlow.hiddenServices.includes(service.id)) return false;
            if (
              bookingFlow.evaluationRequired &&
              bookingFlow.hideServicesUntilEvaluationCompleted
            ) {
              if (selectedPets.length === 0) return false;
              return selectedPets.every((pet) => hasValidEvaluation(pet));
            }
            return true;
          })
          .map((service) => {
            const Icon = service.icon;
            const config = configs[service.id as keyof typeof configs];
            // Special handling for evaluation service
            const isEvaluation = service.id === "evaluation";
            const evaluationDisabled = false; // Evaluation is always available
            const requiresEvaluation =
              !isEvaluation &&
              (bookingFlow.evaluationRequired ||
                bookingFlow.servicesRequiringEvaluation.includes(service.id) ||
                ((config?.settings.evaluation.enabled ?? false) &&
                  !(config?.settings.evaluation.optional ?? false)));
            const hasPetContext = selectedPets.length > 0;
            const isLockedByEvaluation =
              requiresEvaluation && hasPetContext
                ? selectedPets.some(
                    (p) => !isPetUnlockedForService(p, service.id),
                  )
                : false;

            const isDisabled = isEvaluation
              ? evaluationDisabled
              : (config?.status.disabled ?? false) || isLockedByEvaluation;
            return (
              <div
                key={service.id}
                className={`relative overflow-hidden rounded-lg border transition-colors ${
                  isDisabled
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer"
                } ${
                  selectedService === service.id && !isDisabled
                    ? "border-primary bg-primary/5"
                    : !isDisabled
                      ? "hover:border-primary/50"
                      : ""
                } `}
                onClick={() => {
                  if (!isDisabled) {
                    setSelectedService(service.id);
                    setServiceType("");
                    setCurrentSubStep(0);
                  }
                }}
              >
                {isLockedByEvaluation && (
                  <div className="absolute top-2 left-2 z-10">
                    <Badge variant="destructive" className="text-xs">
                      Locked
                    </Badge>
                  </div>
                )}
                {config?.bannerImage ? (
                  <div className="relative h-32 w-full">
                    <Image
                      src={config.bannerImage}
                      alt={config.clientFacingName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : service.image ? (
                  <div className="relative h-32 w-full">
                    <Image
                      src={service.image}
                      alt={service.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div
                    className={`flex h-32 w-full items-center justify-center ${
                      selectedService === service.id && !isDisabled
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    } `}
                  >
                    <Icon className="h-12 w-12" />
                  </div>
                )}
                <div className="space-y-3 p-4">
                  <div className="text-center">
                    <p className="font-medium">
                      {isEvaluation
                        ? evaluationConfig.customerName
                        : config?.clientFacingName || service.name}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {isEvaluation
                        ? evaluationConfig.description
                        : config?.slogan || service.description}
                    </p>
                    {config && !isEvaluation && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {isLockedByEvaluation
                          ? "Evaluation required (expired, failed, or not approved)"
                          : isDisabled
                            ? config.status.reason
                            : config.description}
                      </p>
                    )}
                    <p className="text-primary font-semibold">
                      {isEvaluation
                        ? `$${evaluationConfig.price}`
                        : `From $${config?.basePrice || service.basePrice}`}
                    </p>
                  </div>
                </div>
                {selectedService === service.id && !isDisabled && (
                  <Check className="text-primary absolute top-2 right-2 h-5 w-5" />
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
