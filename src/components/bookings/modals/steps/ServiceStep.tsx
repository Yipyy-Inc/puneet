import { useMemo } from "react";
import Image from "next/image";
import { Lock, Ban, Check, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { SERVICE_CATEGORIES, SERVICE_ACCENTS } from "../constants";
import { evaluationConfig } from "@/data/settings";
import type { FacilityBookingFlowConfig } from "@/types/booking";
import type { ModuleConfig } from "@/types/facility";
import type { Pet } from "@/types/pet";
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

const DEFAULT_ACCENT = {
  bg: "bg-primary/5",
  icon: "text-primary",
  price: "text-primary",
  ring: "ring-primary",
  border: "border-primary",
};

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

  type Evaluation = {
    evaluatedAt?: string;
    status?: "passed" | "failed" | "outdated" | string;
    isExpired?: boolean;
    approvedServices?: unknown;
    serviceApprovals?: unknown;
    approvals?: unknown;
  };

  const getLatestEvaluation = (pet: Pet): Evaluation | null => {
    const evals =
      (pet as unknown as { evaluations?: Evaluation[] }).evaluations ?? [];
    if (evals.length === 0) return null;
    return [...evals].sort((a, b) => {
      const da = a?.evaluatedAt ? new Date(a.evaluatedAt).getTime() : 0;
      const db = b?.evaluatedAt ? new Date(b.evaluatedAt).getTime() : 0;
      return db - da;
    })[0];
  };

  const isExpiredEvaluation = (ev: Evaluation | null) =>
    ev?.isExpired === true || ev?.status === "outdated";
  const isPassedEvaluation = (ev: Evaluation | null) => ev?.status === "passed";
  const isFailedEvaluation = (ev: Evaluation | null) => ev?.status === "failed";

  const hasValidEvaluation = (pet: Pet) => {
    const latest = getLatestEvaluation(pet);
    if (!latest) return false;
    if (isFailedEvaluation(latest)) return false;
    if (!isPassedEvaluation(latest)) return false;
    if (isExpiredEvaluation(latest)) return false;
    return true;
  };

  type ApprovalMap = {
    daycare?: boolean;
    boarding?: boolean;
    customApproved?: string[];
    custom?: string[];
  };

  const isServiceApprovedByEvaluation = (
    ev: Evaluation | null,
    serviceId: string,
  ) => {
    if (!ev || !isPassedEvaluation(ev) || isExpiredEvaluation(ev)) return false;
    const approvals =
      ev.approvedServices ?? ev.serviceApprovals ?? ev.approvals ?? null;
    if (!approvals) return true;

    if (typeof approvals === "object" && !Array.isArray(approvals)) {
      const map = approvals as ApprovalMap;
      if (serviceId === "daycare" && typeof map.daycare === "boolean")
        return map.daycare;
      if (serviceId === "boarding" && typeof map.boarding === "boolean")
        return map.boarding;
      if (Array.isArray(map.customApproved))
        return map.customApproved.includes(serviceId);
      if (Array.isArray(map.custom)) return map.custom.includes(serviceId);
    }

    if (Array.isArray(approvals)) return approvals.includes(serviceId);

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

  const visibleServices = useMemo(
    () =>
      allCategories.filter((service) => {
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
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allCategories, bookingFlow, selectedPets],
  );

  // Show "Required first" nudge on evaluation card when facility requires it
  // and at least one selected pet still lacks a valid evaluation
  const showEvaluationNudge =
    bookingFlow.evaluationRequired &&
    (selectedPets.length === 0 ||
      selectedPets.some((p) => !hasValidEvaluation(p)));

  const handleSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    setServiceType("");
    setCurrentSubStep(0);
  };

  const isOddCount = visibleServices.length % 2 !== 0;

  return (
    // #4 — scroll protection so many custom modules don't overflow the modal
    <ScrollArea className="max-h-[440px]">
      {/* #8 — radiogroup role for screen readers */}
      <div
        role="radiogroup"
        aria-label="Select a service"
        className="grid grid-cols-2 gap-3 pr-1 pb-1"
      >
        {visibleServices.map((service, idx) => {
          const Icon = service.icon;
          const config = configs[service.id as keyof typeof configs];
          const isEvaluation = service.id === "evaluation";
          const accent = SERVICE_ACCENTS[service.id] ?? DEFAULT_ACCENT;

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
            ? false
            : (config?.status.disabled ?? false) || isLockedByEvaluation;

          const isSelected = selectedService === service.id && !isDisabled;

          const displayName = isEvaluation
            ? evaluationConfig.customerName
            : (config?.clientFacingName ?? service.name);

          const displaySlogan = isEvaluation
            ? evaluationConfig.description
            : (config?.slogan ?? service.description ?? "");

          // #2 — show "Free" instead of "$0"
          const rawPrice = isEvaluation
            ? evaluationConfig.price
            : (config?.basePrice ?? service.basePrice);
          const displayPrice = rawPrice === 0 ? "Free" : `From $${rawPrice}`;

          const bannerImg = config?.bannerImage ?? service.image ?? null;
          // #7 — only skip optimization for external URLs
          const isExternalImg = bannerImg?.startsWith("http") ?? false;

          // #3 — included bullets: up to 3 items
          const includedItems = service.included.slice(0, 3);

          // #1 — last card spans full row when total count is odd
          const isLastOdd = isOddCount && idx === visibleServices.length - 1;

          return (
            <div
              key={service.id}
              // #8 — accessibility attributes
              role="radio"
              aria-checked={isSelected}
              aria-disabled={isDisabled}
              tabIndex={isDisabled ? -1 : 0}
              onClick={() => {
                if (!isDisabled) handleSelect(service.id);
              }}
              onKeyDown={(e) => {
                if (!isDisabled && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleSelect(service.id);
                }
              }}
              className={cn(
                // #1 — span full row when last in odd-count grid
                isLastOdd && "col-span-2",
                "group relative overflow-hidden rounded-2xl border transition-all duration-200 outline-none select-none",
                isDisabled
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg",
                isSelected
                  ? "border-transparent shadow-lg"
                  : "border-border/60 hover:shadow-md",
              )}
            >
              {/* ── Visual area ─────────────────────────────── */}
              <div className="relative h-36 w-full overflow-hidden">
                {bannerImg ? (
                  <Image
                    src={bannerImg}
                    alt={displayName}
                    fill
                    // #7 — proper sizes hint; unoptimized only for external CDN images
                    sizes="(max-width: 640px) 100vw, 280px"
                    unoptimized={isExternalImg}
                    className={cn(
                      "object-cover transition-transform duration-300",
                      !isDisabled && "group-hover:scale-105",
                    )}
                  />
                ) : (
                  <div
                    className={cn(
                      "flex h-full w-full items-center justify-center",
                      accent.bg,
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-16 transition-transform duration-300",
                        accent.icon,
                        !isDisabled && "group-hover:scale-110",
                      )}
                    />
                  </div>
                )}

                {/* #6 — "Required first" nudge on evaluation card */}
                {isEvaluation && showEvaluationNudge && (
                  <div className="absolute top-2 left-2">
                    <span className="flex items-center gap-1 rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                      <Sparkles className="size-3" />
                      Start here
                    </span>
                  </div>
                )}

                {/* Lock overlay */}
                {isLockedByEvaluation && (
                  <div className="bg-background/75 absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className="bg-destructive/10 border-destructive/20 flex items-center gap-1.5 rounded-full border px-3 py-1.5">
                      <Lock className="text-destructive size-3.5" />
                      <span className="text-destructive text-xs font-semibold">
                        Evaluation required
                      </span>
                    </div>
                  </div>
                )}

                {/* Disabled (non-lock) overlay */}
                {!isLockedByEvaluation && isDisabled && (
                  <div className="bg-background/60 absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Ban className="text-muted-foreground size-8" />
                  </div>
                )}

                {/* Selected checkmark badge */}
                {isSelected && (
                  <div className="bg-primary text-primary-foreground absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full shadow-md">
                    <Check className="size-4" strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* ── Content strip ───────────────────────────── */}
              <div className="p-3.5">
                <p className="text-sm/tight font-semibold">{displayName}</p>
                {displaySlogan && (
                  <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                    {displaySlogan}
                  </p>
                )}

                {/* #3 — included bullets */}
                {includedItems.length > 0 && !isDisabled && (
                  <ul className="mt-2 space-y-0.5">
                    {includedItems.map((item) => (
                      <li
                        key={item}
                        className="text-muted-foreground flex items-center gap-1.5 text-[11px]"
                      >
                        <span
                          className={cn(
                            "size-1 shrink-0 rounded-full",
                            accent.bg
                              .replace("bg-", "bg-")
                              .replace("-50", "-400"),
                          )}
                          aria-hidden
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-2.5">
                  {isLockedByEvaluation ? (
                    <span className="text-destructive flex items-center gap-1 text-xs font-medium">
                      <Lock className="size-3" />
                      Locked — needs evaluation
                    </span>
                  ) : isDisabled && config?.status.reason ? (
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Ban className="size-3" />
                      <span className="line-clamp-1">
                        {config.status.reason}
                      </span>
                    </span>
                  ) : (
                    // #2 — "Free" for $0, colored per accent
                    <span className={cn("text-xs font-bold", accent.price)}>
                      {displayPrice}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
