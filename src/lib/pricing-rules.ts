import { facilityConfig } from "@/data/facility-config";
import { defaultServiceAddOns } from "@/data/service-addons";
import type { ExtraService } from "@/types/booking";
import type {
  CustomFee,
  DiscountStackingMode,
  Exceed24HourFee,
  GroomingConditionAdjustment,
  LatePickupFee,
  MultiNightDiscount,
  MultiPetDiscountRule,
  PeakSurcharge,
  RoomTypeAdjustment,
  ServiceBundleRule,
} from "@/types/boarding";
import type { ServiceAddOn } from "@/types/facility";
import type { Pet } from "@/types/pet";

export const PRICING_RULES_STORAGE_KEY = "settings-pricing-rules";
export const SERVICE_ADDONS_STORAGE_KEY = "settings-service-addons";

function toScopeToken(scopeKey?: string | number): string | null {
  if (scopeKey == null) return null;
  const token = String(scopeKey).trim();
  return token.length > 0 ? token : null;
}

export function getPricingRulesStorageKey(scopeKey?: string | number): string {
  const token = toScopeToken(scopeKey);
  return token
    ? `${PRICING_RULES_STORAGE_KEY}::facility-${token}`
    : PRICING_RULES_STORAGE_KEY;
}

export function getServiceAddOnsStorageKey(scopeKey?: string | number): string {
  const token = toScopeToken(scopeKey);
  return token
    ? `${SERVICE_ADDONS_STORAGE_KEY}::facility-${token}`
    : SERVICE_ADDONS_STORAGE_KEY;
}

export interface StoredPricingRules {
  discountStacking: DiscountStackingMode;
  multiPetDiscounts: MultiPetDiscountRule[];
  latePickupFees: LatePickupFee[];
  exceed24Hour: Exceed24HourFee;
  customFees: CustomFee[];
  multiNightDiscounts: MultiNightDiscount[];
  peakDateSurcharges: PeakSurcharge[];
  roomTypeAdjustments: RoomTypeAdjustment[];
  groomingConditionAdjustments: GroomingConditionAdjustment[];
  serviceBundles: ServiceBundleRule[];
}

export interface PricingRuleAdjustment {
  id: string;
  label: string;
  amount: number;
  source:
    | "multi_pet"
    | "multi_night"
    | "peak_date"
    | "time_fee"
    | "exceed_24h"
    | "room_type"
    | "grooming_condition"
    | "service_bundle"
    | "custom_fee";
}

export interface PricingRuleComputation {
  extraServices: ExtraService[];
  adjustments: PricingRuleAdjustment[];
  addOnsTotal: number;
  adjustmentsTotal: number;
  discountTotal: number;
  surchargeTotal: number;
  total: number;
}

interface PricingContextPet {
  id: number;
  weight?: number;
  coatType?: Pet["coatType"];
  age?: number;
  breed?: string;
  sex?: Pet["sex"];
  petStatus?: Pet["petStatus"];
}

interface PricingContextCustomer {
  status?: string;
  membershipPlan?: string;
  membershipStatus?: string;
  storeCreditBalance?: number;
  hasPackageCredits?: boolean;
}

export interface ApplyPricingRulesInput {
  serviceId: string;
  basePrice: number;
  existingExtraServices: ExtraService[];
  selectedPetIds: number[];
  pets: PricingContextPet[];
  addOnsCatalog: ServiceAddOn[];
  roomAssignments?: Array<{ petId: number; roomId: string }>;
  boardingNights?: number;
  sessionUnits?: number;
  serviceStartDate?: string;
  serviceEndDate?: string;
  serviceDates?: string[];
  groomingDurationMinutes?: number;
  appointmentTime?: string;
  scheduledCheckInTime?: string;
  scheduledCheckOutTime?: string;
  actualCheckInTime?: string;
  actualCheckOutTime?: string;
  isNewCustomer?: boolean;
  newPetIds?: number[];
  customer?: PricingContextCustomer;
}

function defaultPricingRules(): StoredPricingRules {
  const defaults = facilityConfig.pricingRules;
  return {
    discountStacking: (defaults.discountStacking ??
      "best_only") as DiscountStackingMode,
    multiPetDiscounts: defaults.multiPetDiscounts ?? [],
    latePickupFees: defaults.latePickupFees ?? [],
    exceed24Hour:
      defaults.exceed24Hour ??
      ({
        id: "exceed-24h",
        enabled: false,
        amount: 0,
        scope: "per_pet",
      } as Exceed24HourFee),
    customFees: defaults.customFees ?? [],
    multiNightDiscounts: defaults.multiNightDiscounts ?? [],
    peakDateSurcharges: defaults.peakDateSurcharges ?? [],
    roomTypeAdjustments: defaults.roomTypeAdjustments ?? [],
    groomingConditionAdjustments: (defaults.groomingConditionAdjustments ??
      []) as GroomingConditionAdjustment[],
    serviceBundles: defaults.serviceBundles ?? [],
  };
}

function normalizeRuleArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function parseStoredJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function parseStoredJsonFromKeys<T>(keys: string[]): T | null {
  for (const key of keys) {
    const parsed = parseStoredJson<T>(key);
    if (parsed != null) return parsed;
  }
  return null;
}

function uniqueKeys(keys: string[]): string[] {
  return Array.from(new Set(keys.filter((key) => key.trim().length > 0)));
}

export function getStoredPricingRules(
  scopeKey?: string | number,
): StoredPricingRules {
  const defaults = defaultPricingRules();
  const parsed = parseStoredJsonFromKeys<Partial<StoredPricingRules>>(
    uniqueKeys([
      getPricingRulesStorageKey(scopeKey),
      getPricingRulesStorageKey(),
    ]),
  );

  if (!parsed || typeof parsed !== "object") {
    return defaults;
  }

  return {
    discountStacking:
      parsed.discountStacking === "apply_all_sequence"
        ? "apply_all_sequence"
        : "best_only",
    multiPetDiscounts: normalizeRuleArray(
      parsed.multiPetDiscounts,
      defaults.multiPetDiscounts,
    ),
    latePickupFees: normalizeRuleArray(
      parsed.latePickupFees,
      defaults.latePickupFees,
    ),
    exceed24Hour:
      parsed.exceed24Hour && typeof parsed.exceed24Hour === "object"
        ? (parsed.exceed24Hour as Exceed24HourFee)
        : defaults.exceed24Hour,
    customFees: normalizeRuleArray(parsed.customFees, defaults.customFees),
    multiNightDiscounts: normalizeRuleArray(
      parsed.multiNightDiscounts,
      defaults.multiNightDiscounts,
    ),
    peakDateSurcharges: normalizeRuleArray(
      parsed.peakDateSurcharges,
      defaults.peakDateSurcharges,
    ),
    roomTypeAdjustments: normalizeRuleArray(
      parsed.roomTypeAdjustments,
      defaults.roomTypeAdjustments,
    ),
    groomingConditionAdjustments: normalizeRuleArray(
      parsed.groomingConditionAdjustments,
      defaults.groomingConditionAdjustments,
    ),
    serviceBundles: normalizeRuleArray(
      parsed.serviceBundles,
      defaults.serviceBundles,
    ),
  };
}

export function saveStoredPricingRules(rules: StoredPricingRules): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getPricingRulesStorageKey(), JSON.stringify(rules));
}

export function saveStoredPricingRulesForScope(
  rules: StoredPricingRules,
  scopeKey?: string | number,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getPricingRulesStorageKey(scopeKey), JSON.stringify(rules));
}

export function getStoredServiceAddOns(scopeKey?: string | number): ServiceAddOn[] {
  const parsed = parseStoredJsonFromKeys<ServiceAddOn[]>(
    uniqueKeys([getServiceAddOnsStorageKey(scopeKey), getServiceAddOnsStorageKey()]),
  );
  if (Array.isArray(parsed)) return parsed;
  return defaultServiceAddOns;
}

function normalizeServices(applicableServices?: string[]): string[] {
  if (!applicableServices || applicableServices.length === 0) return ["all"];
  return applicableServices.includes("all")
    ? ["all"]
    : Array.from(new Set(applicableServices));
}

function appliesToService(
  serviceId: string,
  applicableServices?: string[],
): boolean {
  const normalized = normalizeServices(applicableServices);
  return normalized.includes("all") || normalized.includes(serviceId);
}

function normalizeExtraServices(services: ExtraService[]): ExtraService[] {
  const map = new Map<string, ExtraService>();

  for (const service of services) {
    if (!service || !service.serviceId) continue;
    if (!Number.isFinite(service.quantity) || !Number.isFinite(service.petId)) {
      continue;
    }
    const quantity = Math.max(0, Math.round(service.quantity));
    if (quantity <= 0) continue;

    const key = `${service.serviceId}::${service.petId}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += quantity;
      continue;
    }

    map.set(key, {
      serviceId: service.serviceId,
      petId: service.petId,
      quantity,
    });
  }

  return Array.from(map.values());
}

function parseTimeToMinutes(value?: string): number | null {
  if (!value) return null;
  const timeMatch = value.match(/(\d{1,2}):(\d{2})/);
  if (!timeMatch) return null;

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const upper = value.toUpperCase();
  if (upper.includes("PM") && hours < 12) hours += 12;
  if (upper.includes("AM") && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function isWithinTimeWindow(
  appointmentMinutes: number,
  windowStart?: string,
  windowEnd?: string,
): boolean {
  const start = parseTimeToMinutes(windowStart);
  const end = parseTimeToMinutes(windowEnd);

  if (start == null && end == null) return true;
  if (start != null && end == null) return appointmentMinutes >= start;
  if (start == null && end != null) return appointmentMinutes <= end;
  if (start == null || end == null) return true;

  if (start <= end) {
    return appointmentMinutes >= start && appointmentMinutes <= end;
  }

  return appointmentMinutes >= start || appointmentMinutes <= end;
}

function parseIsoDateOnly(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildBoardingNightDates(
  startDateIso?: string,
  endDateIso?: string,
): string[] {
  const start = parseIsoDateOnly(startDateIso);
  const end = parseIsoDateOnly(endDateIso);
  if (!start || !end || end <= start) return [];

  const nights: string[] = [];
  const cursor = new Date(start);
  while (cursor < end) {
    nights.push(toIsoDateOnly(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return nights;
}

function buildUnitDates(
  serviceId: string,
  serviceDates: string[] | undefined,
  serviceStartDate: string | undefined,
  serviceEndDate: string | undefined,
): string[] {
  if (serviceDates && serviceDates.length > 0) {
    return Array.from(new Set(serviceDates)).sort();
  }

  if (serviceId === "boarding") {
    return buildBoardingNightDates(serviceStartDate, serviceEndDate);
  }

  if (serviceStartDate) {
    return [serviceStartDate];
  }

  return [];
}

function isDateInRange(
  dateIso: string,
  rangeStartIso: string,
  rangeEndIso: string,
): boolean {
  return dateIso >= rangeStartIso && dateIso <= rangeEndIso;
}

function countPeakUnitsForRule(
  rule: PeakSurcharge,
  unitDates: string[],
): number {
  if (unitDates.length === 0) return 0;

  if (rule.dateMode === "holiday" && rule.holidayDates?.length) {
    const holidaySet = new Set(rule.holidayDates);
    return unitDates.filter((dateIso) => holidaySet.has(dateIso)).length;
  }

  if (rule.dateRanges?.length) {
    return unitDates.filter((dateIso) =>
      rule.dateRanges?.some((range) =>
        isDateInRange(dateIso, range.start, range.end),
      ),
    ).length;
  }

  return unitDates.filter((dateIso) =>
    isDateInRange(dateIso, rule.startDate, rule.endDate),
  ).length;
}

function resolveBundleAddOn(
  rule: ServiceBundleRule,
  catalog: ServiceAddOn[],
): ServiceAddOn | null {
  const active = catalog.filter((addon) => addon.isActive);

  const byId = active.find((addon) => addon.id === rule.bundledService);
  if (byId) return byId;

  const label = rule.bundledServiceLabel.trim().toLowerCase();
  if (label) {
    const exactLabel = active.find(
      (addon) => addon.name.toLowerCase() === label,
    );
    if (exactLabel) return exactLabel;

    const fuzzyLabel = active.find((addon) =>
      addon.name.toLowerCase().includes(label),
    );
    if (fuzzyLabel) return fuzzyLabel;
  }

  if (rule.bundledService === "grooming") {
    const groomingCategory = active.find(
      (addon) =>
        addon.applicableServices.includes(rule.triggerService) &&
        addon.category?.toLowerCase().includes("groom"),
    );
    if (groomingCategory) return groomingCategory;
  }

  if (label.includes("bath")) {
    const bathAddOn = active.find(
      (addon) =>
        addon.applicableServices.includes(rule.triggerService) &&
        addon.name.toLowerCase().includes("bath"),
    );
    if (bathAddOn) return bathAddOn;
  }

  return (
    active.find((addon) =>
      addon.applicableServices.includes(rule.triggerService),
    ) ?? null
  );
}

function computeBundleDelta(
  rule: ServiceBundleRule,
  unitPrice: number,
): number {
  switch (rule.pricingMode) {
    case "included":
      return -unitPrice;
    case "discount_percentage": {
      const pct = Math.max(0, rule.pricingValue ?? 0) / 100;
      return -(unitPrice * pct);
    }
    case "discount_flat": {
      const amount = Math.max(0, rule.pricingValue ?? 0);
      return -Math.min(unitPrice, amount);
    }
    case "fixed_price": {
      const fixed = Math.max(0, rule.pricingValue ?? unitPrice);
      return fixed - unitPrice;
    }
  }
}

function passesMinMax(
  value: number,
  min?: number | null,
  max?: number | null,
): boolean {
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function normalizeLower(values?: string[]): string[] {
  if (!values || values.length === 0) return [];
  return values
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

function matchesCustomerSegment(
  fee: CustomFee,
  customer?: PricingContextCustomer,
): boolean {
  if (!customer) return false;

  const statusTargets = normalizeLower(fee.customerStatuses);
  const planTargets = normalizeLower(fee.membershipPlans);

  const requiresMembership = fee.requireMembershipActive === true;
  const requiresPrepaid = fee.requirePrepaidBalance === true;

  const hasCriteria =
    statusTargets.length > 0 ||
    planTargets.length > 0 ||
    requiresMembership ||
    requiresPrepaid;

  if (!hasCriteria) return false;

  if (statusTargets.length > 0) {
    const customerStatus = customer.status?.trim().toLowerCase();
    if (!customerStatus || !statusTargets.includes(customerStatus)) {
      return false;
    }
  }

  if (planTargets.length > 0) {
    const membershipPlan = customer.membershipPlan?.trim().toLowerCase();
    if (!membershipPlan || !planTargets.includes(membershipPlan)) {
      return false;
    }
  }

  if (requiresMembership) {
    const membershipStatus = customer.membershipStatus?.trim().toLowerCase();
    if (membershipStatus !== "active") return false;
  }

  if (requiresPrepaid) {
    const hasStoreCredit = (customer.storeCreditBalance ?? 0) > 0;
    if (!hasStoreCredit && !customer.hasPackageCredits) return false;
  }

  return true;
}

function hasAddOnPurchaseTrigger(
  fee: CustomFee,
  extraServices: ExtraService[],
): boolean {
  const triggerIds = new Set(normalizeLower(fee.triggerAddOnIds));
  if (triggerIds.size === 0) return false;

  return extraServices.some((service) =>
    triggerIds.has(service.serviceId.trim().toLowerCase()),
  );
}

function computeAddOnsTotal(
  extraServices: ExtraService[],
  addOnsById: Map<string, ServiceAddOn>,
): number {
  return extraServices.reduce((sum, service) => {
    const addOn = addOnsById.get(service.serviceId);
    if (!addOn) return sum;
    return sum + Math.max(0, addOn.price) * service.quantity;
  }, 0);
}

function computeWaivedAddOnTotal(
  fee: CustomFee,
  extraServices: ExtraService[],
  addOnsById: Map<string, ServiceAddOn>,
): number {
  const waivedIds = new Set(normalizeLower(fee.waivedAddOnIds));
  if (waivedIds.size === 0) return 0;

  return extraServices.reduce((sum, service) => {
    if (!waivedIds.has(service.serviceId.trim().toLowerCase())) {
      return sum;
    }

    const addOn = addOnsById.get(service.serviceId);
    if (!addOn) return sum;

    return sum + Math.max(0, addOn.price) * service.quantity;
  }, 0);
}

function findTierForPetCount(
  tiers: MultiPetDiscountRule["tiers"],
  petCount: number,
) {
  return [...tiers]
    .sort((a, b) => b.petCount - a.petCount)
    .find((tier) => petCount >= tier.petCount);
}

function findTierForPetIndex(
  tiers: MultiPetDiscountRule["tiers"],
  petIndex: number,
) {
  return [...tiers]
    .sort((a, b) => b.petCount - a.petCount)
    .find((tier) => petIndex >= tier.petCount);
}

function computeTimeWindowDeltaMinutes(
  condition: LatePickupFee["condition"],
  baselineMinutes: number,
  actualMinutes: number,
): number {
  return condition === "late_pickup"
    ? actualMinutes - baselineMinutes
    : baselineMinutes - actualMinutes;
}

function computeTimeFeeVariableAmount(
  feeType: LatePickupFee["feeType"],
  amount: number,
  billableMinutes: number,
  perUnitBase: number,
): number {
  switch (feeType) {
    case "flat":
      return amount;
    case "per_hour":
      return Math.ceil(billableMinutes / 60) * amount;
    case "per_30min":
      return Math.ceil(billableMinutes / 30) * amount;
    case "per_minute":
      return billableMinutes * amount;
    case "extra_night":
      return perUnitBase;
  }
}

function combineDateAndTime(dateIso?: string, time?: string): Date | null {
  if (!dateIso || !time) return null;
  const date = new Date(`${dateIso}T${time}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function shouldApplyCustomFee(
  fee: CustomFee,
  serviceId: string,
  isNewCustomer: boolean,
  newPetIds: number[],
  customer: PricingContextCustomer | undefined,
  extraServices: ExtraService[],
): boolean {
  if (!fee.isActive) return false;
  if (!appliesToService(serviceId, fee.applicableServices)) return false;

  switch (fee.autoApply) {
    case "at_checkout":
      return true;
    case "by_care_type": {
      const targets = normalizeServices(fee.autoApplyCareTypes);
      return targets.includes("all") || targets.includes(serviceId);
    }
    case "new_customer":
      return isNewCustomer;
    case "new_pet":
      return newPetIds.length > 0;
    case "customer_segment":
      return matchesCustomerSegment(fee, customer);
    case "addon_purchase":
      return hasAddOnPurchaseTrigger(fee, extraServices);
    default:
      return false;
  }
}

export function applyDynamicPricingRules(
  input: ApplyPricingRulesInput,
): PricingRuleComputation {
  const rules = getStoredPricingRules();
  const basePrice = Math.max(0, input.basePrice || 0);
  const selectedPetSet = new Set(input.selectedPetIds);

  const mergedExtraServices = normalizeExtraServices(
    input.existingExtraServices,
  );
  const adjustments: PricingRuleAdjustment[] = [];

  const roomAssignments = (input.roomAssignments ?? []).filter((assignment) =>
    selectedPetSet.has(assignment.petId),
  );

  const boardingNights = Math.max(0, input.boardingNights ?? 0);
  const serviceUnits = Math.max(0, input.sessionUnits ?? 0);
  const isNewCustomer = input.isNewCustomer === true;
  const newPetIds = (input.newPetIds ?? []).filter((petId) =>
    selectedPetSet.has(petId),
  );
  const customer = input.customer;
  const petCount = Math.max(1, input.selectedPetIds.length);

  const unitDates = buildUnitDates(
    input.serviceId,
    input.serviceDates,
    input.serviceStartDate,
    input.serviceEndDate,
  );
  const totalBillableUnits =
    input.serviceId === "boarding"
      ? Math.max(1, boardingNights || unitDates.length)
      : Math.max(1, serviceUnits || unitDates.length || 1);
  const perPetBase = basePrice / petCount;
  const perUnitBase = basePrice / Math.max(1, totalBillableUnits);

  // Multi-pet discounts
  for (const rule of rules.multiPetDiscounts) {
    if (!rule.isActive) continue;
    if (!appliesToService(input.serviceId, rule.applicableServices)) continue;
    if (input.selectedPetIds.length < 2) continue;

    if (rule.sameLodging && roomAssignments.length > 0) {
      const allAssigned = input.selectedPetIds.every((petId) =>
        roomAssignments.some((assignment) => assignment.petId === petId),
      );
      if (!allAssigned) continue;
      const uniqueRooms = new Set(
        roomAssignments.map((assignment) => assignment.roomId),
      );
      if (uniqueRooms.size !== 1) continue;
    }

    const valueType = rule.discountValueType ?? "flat";
    let discountTotal = 0;

    if (rule.discountType === "per_pet") {
      const tier = findTierForPetCount(rule.tiers, input.selectedPetIds.length);
      if (!tier) continue;
      const unitDiscount =
        valueType === "percentage"
          ? (perPetBase * Math.max(0, tier.discountAmount)) / 100
          : Math.max(0, tier.discountAmount);
      discountTotal = unitDiscount * input.selectedPetIds.length;
    } else {
      for (
        let petIndex = 2;
        petIndex <= input.selectedPetIds.length;
        petIndex += 1
      ) {
        const tier = findTierForPetIndex(rule.tiers, petIndex);
        if (!tier) continue;
        const unitDiscount =
          valueType === "percentage"
            ? (perPetBase * Math.max(0, tier.discountAmount)) / 100
            : Math.max(0, tier.discountAmount);
        discountTotal += unitDiscount;
      }
    }

    if (discountTotal <= 0) continue;

    adjustments.push({
      id: rule.id,
      label: rule.name,
      amount: -discountTotal,
      source: "multi_pet",
    });
  }

  // Multi-night / long-haul discounts
  for (const rule of rules.multiNightDiscounts) {
    if (!rule.isActive) continue;
    if (!appliesToService(input.serviceId, rule.applicableServices)) continue;

    const units =
      input.serviceId === "boarding"
        ? Math.max(0, boardingNights)
        : Math.max(0, serviceUnits);
    if (!passesMinMax(units, rule.minNights, rule.maxNights)) continue;

    const discountMode = rule.discountMode ?? "percentage";
    let discountAmount = 0;

    if (discountMode === "percentage") {
      discountAmount = (basePrice * Math.max(0, rule.discountPercent)) / 100;
    } else if (discountMode === "flat") {
      discountAmount = Math.max(0, rule.discountAmount ?? 0);
    } else {
      const freeUnits = Math.max(0, Math.min(units, rule.freeNights ?? 1));
      discountAmount = perUnitBase * freeUnits;
    }

    if (discountAmount <= 0) continue;

    adjustments.push({
      id: rule.id,
      label: rule.name,
      amount: -discountAmount,
      source: "multi_night",
    });
  }

  // Peak-date surcharges
  for (const rule of rules.peakDateSurcharges) {
    if (!rule.isActive) continue;
    if (!appliesToService(input.serviceId, rule.applicableServices)) continue;

    const matchedUnits = countPeakUnitsForRule(rule, unitDates);
    if (matchedUnits <= 0) continue;

    const surchargeType = rule.surchargeType ?? "percentage";
    let surchargeAmount = 0;

    if (surchargeType === "flat") {
      const flat = Math.max(
        0,
        rule.surchargeAmount ?? rule.surchargePercent ?? 0,
      );
      const scopeMultiplier =
        rule.scope === "first_pet_only" ? 1 : input.selectedPetIds.length;
      surchargeAmount = flat * matchedUnits * Math.max(1, scopeMultiplier);
    } else {
      const pct = Math.max(0, rule.surchargePercent ?? 0) / 100;
      const unitRatio = matchedUnits / Math.max(1, totalBillableUnits);
      let baseForSurcharge = basePrice * unitRatio;
      if (rule.scope === "first_pet_only" && input.selectedPetIds.length > 1) {
        baseForSurcharge = baseForSurcharge / input.selectedPetIds.length;
      }
      surchargeAmount = baseForSurcharge * pct;
    }

    if (surchargeAmount <= 0) continue;

    adjustments.push({
      id: rule.id,
      label: rule.name,
      amount: surchargeAmount,
      source: "peak_date",
    });
  }

  // Late pickup / early drop-off fees
  for (const fee of rules.latePickupFees) {
    if (!fee.enabled) continue;
    if (!appliesToService(input.serviceId, fee.applicableServices)) continue;

    const baselineTime =
      fee.basedOn === "custom_time"
        ? fee.customTime
        : fee.condition === "late_pickup"
          ? input.scheduledCheckOutTime
          : input.scheduledCheckInTime;
    const actualTime =
      fee.condition === "late_pickup"
        ? input.actualCheckOutTime
        : input.actualCheckInTime;

    const baselineMinutes = parseTimeToMinutes(baselineTime);
    const actualMinutes = parseTimeToMinutes(actualTime);
    if (baselineMinutes == null || actualMinutes == null) continue;

    if (
      (fee.applyFromTime || fee.applyUntilTime) &&
      !isWithinTimeWindow(actualMinutes, fee.applyFromTime, fee.applyUntilTime)
    ) {
      continue;
    }

    const rawDelta = computeTimeWindowDeltaMinutes(
      fee.condition,
      baselineMinutes,
      actualMinutes,
    );
    const billableMinutes = rawDelta - Math.max(0, fee.graceMinutes);
    if (billableMinutes <= 0) continue;

    let feeAmount = computeTimeFeeVariableAmount(
      fee.feeType,
      Math.max(0, fee.amount),
      billableMinutes,
      perUnitBase,
    );
    if (fee.maxFee != null) {
      feeAmount = Math.min(feeAmount, Math.max(0, fee.maxFee));
    }
    if (feeAmount <= 0) continue;

    const scopeMultiplier =
      fee.scope === "per_pet" ? input.selectedPetIds.length : 1;
    feeAmount = feeAmount * Math.max(1, scopeMultiplier);

    adjustments.push({
      id: fee.id,
      label:
        fee.name ||
        (fee.condition === "late_pickup"
          ? "Late Pickup Fee"
          : "Early Drop-off Fee"),
      amount: feeAmount,
      source: "time_fee",
    });
  }

  // Over-24h overflow fee
  if (
    rules.exceed24Hour.enabled &&
    input.serviceId === "boarding" &&
    input.serviceStartDate &&
    input.serviceEndDate &&
    input.actualCheckInTime &&
    input.actualCheckOutTime
  ) {
    const start = combineDateAndTime(
      input.serviceStartDate,
      input.actualCheckInTime,
    );
    const end = combineDateAndTime(
      input.serviceEndDate,
      input.actualCheckOutTime,
    );
    if (start && end && end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) {
      const scopeMultiplier =
        rules.exceed24Hour.scope === "per_pet"
          ? input.selectedPetIds.length
          : 1;
      const overflowAmount =
        Math.max(0, rules.exceed24Hour.amount) * Math.max(1, scopeMultiplier);
      if (overflowAmount > 0) {
        adjustments.push({
          id: rules.exceed24Hour.id,
          label: rules.exceed24Hour.name || "24-Hour Overflow",
          amount: overflowAmount,
          source: "exceed_24h",
        });
      }
    }
  }

  // Room type discounts/surcharges
  if (input.serviceId === "boarding") {
    for (const rule of rules.roomTypeAdjustments) {
      if (!rule.isActive) continue;
      if (!appliesToService(input.serviceId, rule.applicableServices)) continue;
      if (!passesMinMax(boardingNights, rule.minNights, rule.maxNights))
        continue;

      if (roomAssignments.length === 0) continue;

      const matchingAssignments = roomAssignments.filter((assignment) =>
        rule.roomTypeIds.includes(assignment.roomId),
      );
      if (matchingAssignments.length === 0) continue;

      if (rule.sameRoomRequired) {
        const allAssigned = input.selectedPetIds.every((petId) =>
          roomAssignments.some((assignment) => assignment.petId === petId),
        );
        if (!allAssigned) continue;

        const uniqueRooms = new Set(
          roomAssignments.map((assignment) => assignment.roomId),
        );
        if (uniqueRooms.size !== 1) continue;

        const roomId = roomAssignments[0]?.roomId;
        if (!roomId || !rule.roomTypeIds.includes(roomId)) continue;
      }

      let adjustmentAmount =
        rule.adjustmentType === "percentage"
          ? (basePrice * Math.max(0, rule.amount)) / 100
          : Math.max(0, rule.amount);
      if (rule.adjustmentKind === "discount") {
        adjustmentAmount *= -1;
      }

      if (adjustmentAmount !== 0) {
        adjustments.push({
          id: rule.id,
          label: rule.name,
          amount: adjustmentAmount,
          source: "room_type",
        });
      }
    }
  }

  // Pet-spec discounts/surcharges
  for (const rule of rules.groomingConditionAdjustments) {
    if (!rule.isActive) continue;
    if (!appliesToService(input.serviceId, rule.applicableServices)) continue;

    if (rule.durationMinutesMin != null || rule.durationMinutesMax != null) {
      const duration = input.groomingDurationMinutes;
      if (!Number.isFinite(duration)) continue;
      if (
        !passesMinMax(
          duration ?? Number.NaN,
          rule.durationMinutesMin,
          rule.durationMinutesMax,
        )
      ) {
        continue;
      }
    }

    if (rule.appointmentWindowStart || rule.appointmentWindowEnd) {
      const appointmentMinutes = parseTimeToMinutes(input.appointmentTime);
      if (appointmentMinutes == null) continue;
      if (
        !isWithinTimeWindow(
          appointmentMinutes,
          rule.appointmentWindowStart,
          rule.appointmentWindowEnd,
        )
      ) {
        continue;
      }
    }

    const matchingPets = input.pets.filter((pet) => {
      if (!selectedPetSet.has(pet.id)) return false;

      if (rule.hairTypes?.length) {
        const coat = pet.coatType?.toLowerCase();
        if (!coat || !rule.hairTypes.includes(coat)) return false;
      }

      if (rule.breeds?.length) {
        const allowedBreeds = normalizeLower(rule.breeds);
        const breed = pet.breed?.trim().toLowerCase();
        if (!breed || !allowedBreeds.includes(breed)) return false;
      }

      if (rule.sexes?.length) {
        if (!pet.sex || !rule.sexes.includes(pet.sex)) return false;
      }

      if (rule.petStatuses?.length) {
        if (!pet.petStatus || !rule.petStatuses.includes(pet.petStatus)) {
          return false;
        }
      }

      if (rule.ageMinYears != null || rule.ageMaxYears != null) {
        if (!Number.isFinite(pet.age)) return false;
        if (rule.ageMinYears != null && Number(pet.age) < rule.ageMinYears) {
          return false;
        }
        if (rule.ageMaxYears != null && Number(pet.age) > rule.ageMaxYears) {
          return false;
        }
      }

      if (rule.weightMinKg != null || rule.weightMaxKg != null) {
        if (!Number.isFinite(pet.weight)) return false;
        const weightKg = Number(pet.weight) / 2.20462;
        if (rule.weightMinKg != null && weightKg < rule.weightMinKg) {
          return false;
        }
        if (rule.weightMaxKg != null && weightKg > rule.weightMaxKg) {
          return false;
        }
      }

      return true;
    });

    if (matchingPets.length === 0) continue;

    const matchedCount = matchingPets.length;

    const billingMode = rule.billingMode ?? "one_time";
    const unitType =
      rule.unitType ?? (input.serviceId === "boarding" ? "nights" : "sessions");
    const unitMultiplier =
      billingMode === "per_unit"
        ? unitType === "nights"
          ? Math.max(1, boardingNights || totalBillableUnits)
          : Math.max(1, serviceUnits || totalBillableUnits)
        : 1;

    let adjustmentAmount =
      rule.adjustmentType === "percentage"
        ? (perPetBase *
            matchedCount *
            Math.max(0, rule.amount) *
            unitMultiplier) /
          100
        : Math.max(0, rule.amount) * matchedCount * unitMultiplier;
    if (rule.adjustmentKind === "discount") {
      adjustmentAmount *= -1;
    }

    if (adjustmentAmount !== 0) {
      adjustments.push({
        id: rule.id,
        label: rule.name,
        amount: adjustmentAmount,
        source: "grooming_condition",
      });
    }
  }

  // Service bundle rules (can auto-add mandatory services)
  for (const rule of rules.serviceBundles) {
    if (!rule.isActive) continue;
    if (rule.triggerService !== input.serviceId) continue;
    if (!appliesToService(input.serviceId, rule.applicableServices)) continue;

    const triggerUnits =
      rule.triggerUnit === "nights"
        ? boardingNights
        : rule.triggerUnit === "days"
          ? serviceUnits
          : Math.max(1, serviceUnits);

    if (!passesMinMax(triggerUnits, rule.minUnits, rule.maxUnits)) continue;

    const bundleAddOn = resolveBundleAddOn(rule, input.addOnsCatalog);
    if (!bundleAddOn) continue;

    let eligiblePetIds = input.selectedPetIds;
    if (rule.requireSamePet) {
      eligiblePetIds = [...selectedPetSet];
    } else if (input.selectedPetIds.length > 0) {
      eligiblePetIds = [input.selectedPetIds[0]];
    }

    if (rule.requireSameRoom) {
      const allAssigned = input.selectedPetIds.every((petId) =>
        roomAssignments.some((assignment) => assignment.petId === petId),
      );
      if (!allAssigned) continue;

      const uniqueRooms = new Set(
        roomAssignments.map((assignment) => assignment.roomId),
      );
      if (uniqueRooms.size !== 1) continue;
    }

    const unitPrice = Math.max(0, bundleAddOn.price);
    const perUnitDelta = computeBundleDelta(rule, unitPrice);

    for (const petId of eligiblePetIds) {
      const key = `${bundleAddOn.id}::${petId}`;
      const existingEntry = mergedExtraServices.find(
        (service) => `${service.serviceId}::${service.petId}` === key,
      );

      const existingQuantity = existingEntry?.quantity ?? 0;
      if (rule.bundleMode === "mandatory" && existingQuantity < 1) {
        mergedExtraServices.push({
          serviceId: bundleAddOn.id,
          petId,
          quantity: 1,
        });
      }

      const eligibleQuantity =
        rule.bundleMode === "mandatory"
          ? 1
          : Math.min(1, Math.max(0, existingQuantity));

      if (eligibleQuantity <= 0 || perUnitDelta === 0) continue;

      adjustments.push({
        id: `${rule.id}-${petId}`,
        label: `${rule.bundledServiceLabel} bundle`,
        amount: perUnitDelta * eligibleQuantity,
        source: "service_bundle",
      });
    }
  }

  const normalizedMergedExtraServices =
    normalizeExtraServices(mergedExtraServices);

  const addOnsById = new Map(
    input.addOnsCatalog.map((addon) => [addon.id, addon]),
  );
  const addOnsTotal = computeAddOnsTotal(
    normalizedMergedExtraServices,
    addOnsById,
  );

  // Auto-applied custom fees
  for (const fee of rules.customFees) {
    if (
      !shouldApplyCustomFee(
        fee,
        input.serviceId,
        isNewCustomer,
        newPetIds,
        customer,
        normalizedMergedExtraServices,
      )
    ) {
      continue;
    }

    const hasWaiveTargets = (fee.waivedAddOnIds?.length ?? 0) > 0;
    const adjustmentKind =
      fee.adjustmentKind ??
      (fee.autoApply === "addon_purchase" && hasWaiveTargets
        ? "discount"
        : "fee");

    let multiplier = 1;
    if (fee.autoApply === "new_pet") {
      multiplier = fee.scope === "per_pet" ? newPetIds.length : 1;
    } else if (fee.autoApply !== "addon_purchase") {
      multiplier =
        fee.scope === "per_pet" ? Math.max(1, input.selectedPetIds.length) : 1;
    }

    if (multiplier <= 0) continue;

    let feeTotal = 0;

    if (fee.autoApply === "addon_purchase" && hasWaiveTargets) {
      const waivedBase = computeWaivedAddOnTotal(
        fee,
        normalizedMergedExtraServices,
        addOnsById,
      );
      const waivePct =
        Math.min(100, Math.max(0, fee.waivePercentage ?? 100)) / 100;
      feeTotal = waivedBase * waivePct;
    } else {
      const percentageBase = basePrice + addOnsTotal;
      feeTotal =
        fee.feeType === "percentage"
          ? (percentageBase * Math.max(0, fee.amount)) / 100
          : Math.max(0, fee.amount);
      feeTotal *= multiplier;
    }

    if (feeTotal <= 0) continue;

    adjustments.push({
      id: `${fee.id}-${fee.autoApply}`,
      label: fee.name,
      amount: adjustmentKind === "discount" ? -feeTotal : feeTotal,
      source: "custom_fee",
    });
  }

  let finalAdjustments = adjustments;

  if (rules.discountStacking === "best_only") {
    const discountAdjustments = adjustments.filter(
      (adjustment) => adjustment.amount < 0,
    );

    if (discountAdjustments.length > 1) {
      const bestDiscount = discountAdjustments.reduce((best, current) =>
        Math.abs(current.amount) > Math.abs(best.amount) ? current : best,
      );

      finalAdjustments = [
        ...adjustments.filter((adjustment) => adjustment.amount >= 0),
        bestDiscount,
      ];
    }
  }

  const adjustmentsTotal = finalAdjustments.reduce((sum, adjustment) => {
    return sum + adjustment.amount;
  }, 0);

  const discountTotal = finalAdjustments
    .filter((adjustment) => adjustment.amount < 0)
    .reduce((sum, adjustment) => sum + Math.abs(adjustment.amount), 0);

  const surchargeTotal = finalAdjustments
    .filter((adjustment) => adjustment.amount > 0)
    .reduce((sum, adjustment) => sum + adjustment.amount, 0);

  const total = Math.max(0, basePrice + addOnsTotal + adjustmentsTotal);

  return {
    extraServices: normalizedMergedExtraServices,
    adjustments: finalAdjustments,
    addOnsTotal,
    adjustmentsTotal,
    discountTotal,
    surchargeTotal,
    total,
  };
}
