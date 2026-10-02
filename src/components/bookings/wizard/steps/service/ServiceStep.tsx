"use client";

import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ClipboardCheck,
  FileSignature,
  Flag,
  Info,
  Lock,
  PawPrint,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCustomServices } from "@/hooks/use-custom-services";
import { useSettings } from "@/hooks/use-settings";
import { useBoardingMenu } from "@/lib/api/boarding-catalogue";
import { useDaycareMenu } from "@/lib/api/daycare-catalogue";
import { useGroomingMenu } from "@/lib/api/grooming-catalogue";
import { fetchTrainingPrograms } from "@/lib/api/training-book";
import {
  petUnlockedForService,
  petsAllEvaluated,
  serviceNeedsEvaluation,
} from "@/lib/bookings/wizard/service-eligibility";
import { serviceCardPrices } from "@/lib/bookings/wizard/service-prices";
import { formatMoney, isPluralOne } from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import { getPetSize } from "@/lib/pet-size";
import { getAllServiceCategories } from "@/lib/service-registry";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { FacilityBookingFlowConfig } from "@/types/booking";
import type { ModuleConfig } from "@/types/facility";
import type { Pet } from "@/types/pet";

import { SERVICE_CATEGORIES } from "@/components/bookings/modals/constants";

import { useUnsignedAgreements } from "./use-unsigned-agreements";

// ============================================================================
// Step 2, "Service" (the client's mock, 2026-10-01): compact cards — photo,
// kind, the facility's name for it, its line, a price, and chips. Choosing a
// card marks it and does not open it: everything about the service comes in
// its Details screens.
//
//   Customer  a service the pets are not evaluated for is LOCKED, with
//             "Request an evaluation", which chooses the evaluation instead.
//   Staff     nothing is locked; "Evaluation required" says what Confirm will
//             ask, and "2 unsigned agreements" what the client still owes.
// ============================================================================

/** The mock's order: boarding, daycare, grooming, training; then the rest. */
const CARD_ORDER = ["boarding", "daycare", "grooming", "training"];
const NO_ITEMS: never[] = [];

const KIND_KEYS: Record<string, string> = {
  boarding: "wizKindBoarding",
  daycare: "wizKindDaycare",
  grooming: "wizKindGrooming",
  training: "wizKindTraining",
  evaluation: "wizKindEvaluation",
};

export function ServiceStep({
  isCustomerMode,
  selectedService,
  onSelect,
  configs,
  bookingFlow,
  selectedPets,
  clientRef,
  belowCards,
  onRequestEvaluation,
}: {
  isCustomerMode: boolean;
  selectedService: string;
  onSelect: (serviceId: string) => void;
  configs: Record<string, ModuleConfig>;
  bookingFlow: FacilityBookingFlowConfig;
  selectedPets: readonly Pet[];
  /** The client's ref, for staff's unsigned-agreement counts. */
  clientRef: number | undefined;
  /** Staff's evaluation decision while it still lives on this step. */
  belowCards?: ReactNode;
  /** "Request an evaluation" on a locked card: the evaluation, for that
   *  service (its Summary's "Unlocks", 2026-10-02). */
  onRequestEvaluation?: (forService: string) => void;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const { evaluation: evaluationConfig } = useSettings();
  const { activeModules } = useCustomServices();
  // Each card quotes the menu its Details screens book from.
  const petRefs = selectedPets.map((pet) => pet.id);
  const { data: boardingMenu = NO_ITEMS } = useBoardingMenu({
    asCustomer: isCustomerMode,
    petRefs,
  });
  const { data: daycareMenu = NO_ITEMS } = useDaycareMenu({
    asCustomer: isCustomerMode,
    petRefs,
  });
  const { data: groomingMenu = NO_ITEMS } = useGroomingMenu({
    asCustomer: isCustomerMode,
  });
  const audience = isCustomerMode ? "customer" : "staff";
  const { data: programs = NO_ITEMS } = useQuery({
    queryKey: ["training", "packages", audience] as const,
    queryFn: () => fetchTrainingPrograms(audience),
  });
  const prices = serviceCardPrices({
    boarding: boardingMenu,
    daycare: daycareMenu,
    grooming: groomingMenu,
    programs,
  });
  const unsigned = useUnsignedAgreements({
    clientRef,
    enabled: !isCustomerMode,
  });

  const categories = useMemo(
    () => getAllServiceCategories(SERVICE_CATEGORIES, activeModules),
    [activeModules],
  );

  const petSizes = Array.from(new Set(selectedPets.map(getPetSize)));
  const sizeFilter =
    bookingFlow.onlyShowApplicableServices === true && selectedPets.length > 0;

  const ranked = [...categories].sort((a, b) => {
    const rank = (id: string) => {
      const at = CARD_ORDER.indexOf(id);
      return at < 0 ? CARD_ORDER.length : at;
    };
    return rank(a.id) - rank(b.id);
  });
  const visible = ranked.filter((service) => {
    if (service.id === "evaluation") return true;
    if (bookingFlow.hiddenServices.includes(service.id)) return false;
    // "Hide services until evaluation completed" (Booking rules): a
    // customer does not see a service that needs an evaluation until their
    // pets have passed one for it. Since 2026-10-02 it follows the one rule
    // of which services need one (lib/evaluations/requirement.ts), not the
    // retired "every service" switch.
    if (
      isCustomerMode &&
      bookingFlow.hideServicesUntilEvaluationCompleted &&
      serviceNeedsEvaluation(service.id, configs[service.id], bookingFlow) &&
      (selectedPets.length === 0 ||
        selectedPets.some((pet) => !petUnlockedForService(pet, service.id)))
    ) {
      return false;
    }
    if (sizeFilter) {
      const sizes = (service as { eligibleSizes?: string[] }).eligibleSizes;
      if (
        sizes &&
        sizes.length > 0 &&
        !petSizes.some((s) => sizes.includes(s))
      ) {
        return false;
      }
    }
    return true;
  });

  const priceLabel = (serviceId: string): string | null => {
    const money = (amount: number) =>
      formatMoney(amount, locale, { whole: Number.isInteger(amount) });
    const from = (amount: number | null) =>
      amount === null ? null : fill(t("priceFrom"), { amount: money(amount) });
    switch (serviceId) {
      case "evaluation": {
        // "$45 per pet" (the client's mock, 2026-10-02).
        const amount = evaluationConfig.price;
        if (amount === undefined) return null;
        return amount === 0
          ? t("priceFree")
          : fill(t("wizEvPerPet"), { amount: money(amount) });
      }
      case "boarding":
        return prices.boarding
          ? fill(
              t(
                prices.boarding.unit === "day"
                  ? "wizFromPerDay"
                  : "wizFromPerNight",
              ),
              { amount: money(prices.boarding.amount) },
            )
          : null;
      case "daycare": {
        const { full, half } = prices.daycare;
        if (full !== null && half !== null) {
          return fill(t("wizFullHalfDay"), {
            full: money(full),
            half: money(half),
          });
        }
        const one = full ?? half;
        return one === null
          ? null
          : fill(t("wizFromPerDay"), { amount: money(one) });
      }
      case "grooming":
        return from(prices.grooming);
      case "training":
        return from(prices.training);
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {sizeFilter ? (
        <p className="text-meta text-ink-secondary flex items-start gap-2">
          <Info aria-hidden className="text-info mt-0.5 size-4 shrink-0" />
          {selectedPets.length === 1
            ? t("eligibilityFilterOne")
            : t("eligibilityFilterMany")}
        </p>
      ) : null}
      <div
        role="radiogroup"
        aria-label={t("selectAService")}
        className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,400px),1fr))] gap-3.5"
      >
        {visible.map((service) => {
          const isEvaluation = service.id === "evaluation";
          const config = configs[service.id];
          const needsEvaluation =
            !isEvaluation &&
            serviceNeedsEvaluation(service.id, config, bookingFlow);
          const blockedPets = needsEvaluation
            ? selectedPets.filter(
                (pet) => !petUnlockedForService(pet, service.id),
              )
            : [];
          const locked = isCustomerMode && blockedPets.length > 0;
          const disabled =
            locked || (!isEvaluation && (config?.status.disabled ?? false));
          const on = selectedService === service.id && !disabled;
          const name = isEvaluation
            ? evaluationConfig.customerName
            : (config?.clientFacingName ?? service.name);
          const line = isEvaluation
            ? evaluationConfig.description
            : (config?.slogan ?? service.description ?? "");
          const photo = config?.bannerImage ?? service.image ?? null;
          const Icon = service.icon;
          const price = priceLabel(service.id);
          const owed = isCustomerMode ? 0 : unsigned(service.id);
          const kind = t(KIND_KEYS[service.id] ?? "wizKindCustom");
          const evaluationChosen = selectedService === "evaluation";

          return (
            <div
              key={service.id}
              role="radio"
              aria-checked={on}
              aria-disabled={disabled || undefined}
              tabIndex={disabled ? -1 : 0}
              data-on={on}
              data-disabled={disabled || undefined}
              onClick={() => {
                if (!disabled) onSelect(service.id);
              }}
              onKeyDown={(event) => {
                if (disabled || (event.key !== "Enter" && event.key !== " ")) {
                  return;
                }
                event.preventDefault();
                onSelect(service.id);
              }}
              className="border-line-strong bg-card hover:border-ink-disabled focus-visible:outline-primary data-[disabled=true]:bg-surface-inset data-[disabled=true]:hover:border-line-strong relative flex min-w-0 cursor-pointer gap-4 rounded-2xl border p-3.5 transition-[box-shadow,border-color] duration-120 ease-[ease] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 data-[disabled=true]:cursor-not-allowed data-[on=true]:border-transparent data-[on=true]:shadow-[inset_0_0_0_2px_var(--primary)] motion-reduce:transition-none"
            >
              <div className="bg-surface-inset text-ink-tertiary flex size-[84px] shrink-0 items-center justify-center overflow-hidden rounded-xl sm:size-[132px]">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a facility's own banner may live on any host
                  <img
                    src={photo}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <Icon aria-hidden className="size-6" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1 py-1 pr-7">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-micro text-ink-tertiary uppercase">
                    {kind}
                  </p>
                  {/* "Start here" (the evaluation mock): the visit a pet
                      without a pass begins with. */}
                  {isEvaluation &&
                  selectedPets.length > 0 &&
                  !petsAllEvaluated(selectedPets) ? (
                    <Badge variant="default">
                      <Flag aria-hidden />
                      {t("wizEvStartHere")}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-section text-body-ink">{name}</p>
                {line ? (
                  <p className="text-meta text-ink-secondary text-pretty">
                    {line}
                  </p>
                ) : null}
                {price ? (
                  <p className="text-body-strong text-body-ink mt-0.5 tabular-nums">
                    {price}
                  </p>
                ) : null}
                {isEvaluation &&
                evaluationConfig.multiPet === false &&
                selectedPets.length > 1 ? (
                  <Badge
                    variant="pending"
                    className="mt-0.5 h-auto min-h-[26px] self-start py-1 whitespace-normal"
                  >
                    <PawPrint aria-hidden />
                    {t("wizEvOnePetAtATime")}
                  </Badge>
                ) : null}
                {!isEvaluation &&
                config?.status.disabled &&
                config.status.reason ? (
                  <p className="text-meta text-ink-secondary">
                    {config.status.reason}
                  </p>
                ) : null}
                {needsEvaluation || owed > 0 ? (
                  <div className="mt-0.5 flex flex-wrap gap-1.5">
                    {locked ? (
                      <Badge
                        variant="overdue"
                        className="h-auto min-h-[26px] py-1 whitespace-normal"
                      >
                        <Lock aria-hidden />
                        {fill(
                          t(
                            isPluralOne(blockedPets.length, locale)
                              ? "wizLockedNeedsEvalOne"
                              : "wizLockedNeedsEvalOther",
                          ),
                          {
                            pets: blockedPets.map((pet) => pet.name).join(", "),
                          },
                        )}
                      </Badge>
                    ) : needsEvaluation ? (
                      <Badge variant="pending">
                        <ClipboardCheck aria-hidden />
                        {t("evaluationRequired")}
                      </Badge>
                    ) : null}
                    {owed > 0 ? (
                      <Badge variant="cancelled">
                        <FileSignature aria-hidden />
                        {fill(
                          t(
                            isPluralOne(owed, locale)
                              ? "wizUnsignedOne"
                              : "wizUnsignedOther",
                          ),
                          { count: owed },
                        )}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
                {locked ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-1.5 self-start"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (onRequestEvaluation) onRequestEvaluation(service.id);
                      else onSelect("evaluation");
                    }}
                  >
                    {evaluationChosen ? (
                      <>
                        <Check aria-hidden />
                        {t("wizEvaluationRequested")}
                      </>
                    ) : (
                      t("wizRequestEvaluation")
                    )}
                  </Button>
                ) : null}
              </div>
              {on ? (
                <span
                  aria-hidden
                  className="bg-primary text-primary-foreground absolute top-3.5 right-3.5 flex size-6 items-center justify-center rounded-full"
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {belowCards}
    </div>
  );
}
