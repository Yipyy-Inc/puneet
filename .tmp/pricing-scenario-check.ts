class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, key)
      ? this.store[key]
      : null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

const localStorageMock = new LocalStorageMock();
(globalThis as { localStorage?: LocalStorageMock }).localStorage = localStorageMock;
(globalThis as { window?: { localStorage: LocalStorageMock } }).window = {
  localStorage: localStorageMock,
};

import {
  applyDynamicPricingRules,
  getStoredPricingRules,
  PRICING_RULES_STORAGE_KEY,
  type StoredPricingRules,
} from "../src/lib/pricing-rules";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function pickRule<T extends { id: string }>(rules: T[], id: string): T {
  const rule = rules.find((item) => item.id === id);
  if (!rule) {
    throw new Error(`Missing rule: ${id}`);
  }
  return clone(rule);
}

const defaults = getStoredPricingRules();

function emptyRules(): StoredPricingRules {
  return {
    ...clone(defaults),
    multiPetDiscounts: [],
    latePickupFees: [],
    customFees: [],
    multiNightDiscounts: [],
    peakDateSurcharges: [],
    roomTypeAdjustments: [],
    groomingConditionAdjustments: [],
    serviceBundles: [],
    exceed24Hour: {
      ...clone(defaults.exceed24Hour),
      enabled: false,
    },
  };
}

function setRules(rules: StoredPricingRules): void {
  localStorageMock.setItem(PRICING_RULES_STORAGE_KEY, JSON.stringify(rules));
}

function summarize(name: string, result: ReturnType<typeof applyDynamicPricingRules>): void {
  const adjustmentSummary =
    result.adjustments.length > 0
      ? result.adjustments
          .map((adjustment) => `${adjustment.label}:${adjustment.amount.toFixed(2)}`)
          .join(" | ")
      : "none";

  console.log(name);
  console.log(`  total: ${result.total.toFixed(2)}`);
  console.log(`  adjustments: ${adjustmentSummary}`);
}

const basePet = {
  id: 1,
  age: 4,
  weight: 35,
  breed: "mixed",
  petStatus: "active" as const,
};

// 1) Multi-pet shared accommodation tiered discount
{
  const rules = emptyRules();
  const mp = pickRule(defaults.multiPetDiscounts, "mpd-003");
  mp.isActive = true;
  rules.multiPetDiscounts = [mp];
  setRules(rules);

  const result = applyDynamicPricingRules({
    serviceId: "boarding",
    basePrice: 300,
    existingExtraServices: [],
    selectedPetIds: [1, 2, 3],
    pets: [
      { ...basePet, id: 1 },
      { ...basePet, id: 2 },
      { ...basePet, id: 3 },
    ],
    addOnsCatalog: [],
    roomAssignments: [
      { petId: 1, roomId: "suite-a" },
      { petId: 2, roomId: "suite-a" },
      { petId: 3, roomId: "suite-a" },
    ],
    boardingNights: 1,
    sessionUnits: 1,
    serviceStartDate: "2026-05-01",
    serviceEndDate: "2026-05-02",
  });

  summarize("1) Multi-pet shared tiered", result);
}

// 2) Holiday rush per-night surcharge
{
  const rules = emptyRules();
  const peak = pickRule(defaults.peakDateSurcharges, "pds-003");
  peak.isActive = true;
  rules.peakDateSurcharges = [peak];
  setRules(rules);

  const result = applyDynamicPricingRules({
    serviceId: "boarding",
    basePrice: 400,
    existingExtraServices: [],
    selectedPetIds: [1, 2],
    pets: [{ ...basePet, id: 1 }, { ...basePet, id: 2 }],
    addOnsCatalog: [],
    boardingNights: 2,
    sessionUnits: 2,
    serviceStartDate: "2025-12-25",
    serviceEndDate: "2025-12-27",
  });

  summarize("2) Holiday rush per-night", result);
}

// 3) Puppy + senior daily special-care fees
{
  const rules = emptyRules();
  const puppy = pickRule(defaults.groomingConditionAdjustments, "gca-004");
  const senior = pickRule(defaults.groomingConditionAdjustments, "gca-005");
  puppy.isActive = true;
  senior.isActive = true;
  rules.groomingConditionAdjustments = [puppy, senior];
  setRules(rules);

  const result = applyDynamicPricingRules({
    serviceId: "daycare",
    basePrice: 180,
    existingExtraServices: [],
    selectedPetIds: [1, 2],
    pets: [
      {
        id: 1,
        age: 0.8,
        weight: 18,
        breed: "mixed",
        petStatus: "active",
      },
      {
        id: 2,
        age: 12,
        weight: 42,
        breed: "mixed",
        petStatus: "active",
      },
    ],
    addOnsCatalog: [],
    sessionUnits: 3,
    serviceDates: ["2026-04-01", "2026-04-02", "2026-04-03"],
    serviceStartDate: "2026-04-01",
    serviceEndDate: "2026-04-03",
  });

  summarize("3) Puppy/senior daily fee", result);
}

// 4) 15th night free
{
  const rules = emptyRules();
  const longStay = pickRule(defaults.multiNightDiscounts, "mnd-003");
  longStay.isActive = true;
  rules.multiNightDiscounts = [longStay];
  setRules(rules);

  const result = applyDynamicPricingRules({
    serviceId: "boarding",
    basePrice: 1500,
    existingExtraServices: [],
    selectedPetIds: [1],
    pets: [{ ...basePet, id: 1 }],
    addOnsCatalog: [],
    boardingNights: 15,
    sessionUnits: 15,
    serviceStartDate: "2026-06-01",
    serviceEndDate: "2026-06-16",
  });

  summarize("4) 15th night free", result);
}

// 5a) Late pickup buffer window fee
{
  const rules = emptyRules();
  const halfDay = pickRule(defaults.latePickupFees, "late-window-half-day");
  halfDay.enabled = true;
  rules.latePickupFees = [halfDay];
  setRules(rules);

  const result = applyDynamicPricingRules({
    serviceId: "boarding",
    basePrice: 120,
    existingExtraServices: [],
    selectedPetIds: [1],
    pets: [{ ...basePet, id: 1 }],
    addOnsCatalog: [],
    boardingNights: 1,
    sessionUnits: 1,
    serviceStartDate: "2026-07-01",
    serviceEndDate: "2026-07-02",
    scheduledCheckOutTime: "17:00",
    actualCheckOutTime: "18:30",
  });

  summarize("5a) Late pickup buffer window", result);
}

// 5b) Late pickup extra-night window
{
  const rules = emptyRules();
  const halfDay = pickRule(defaults.latePickupFees, "late-window-half-day");
  const extraNight = pickRule(defaults.latePickupFees, "late-window-extra-night");
  halfDay.enabled = true;
  extraNight.enabled = true;
  rules.latePickupFees = [halfDay, extraNight];
  setRules(rules);

  const result = applyDynamicPricingRules({
    serviceId: "boarding",
    basePrice: 120,
    existingExtraServices: [],
    selectedPetIds: [1],
    pets: [{ ...basePet, id: 1 }],
    addOnsCatalog: [],
    boardingNights: 1,
    sessionUnits: 1,
    serviceStartDate: "2026-07-01",
    serviceEndDate: "2026-07-02",
    scheduledCheckOutTime: "17:00",
    actualCheckOutTime: "20:30",
  });

  summarize("5b) Late pickup extra-night", result);
}

// 6) Giant breed surcharge
{
  const rules = emptyRules();
  const giant = pickRule(defaults.groomingConditionAdjustments, "gca-006");
  giant.isActive = true;
  rules.groomingConditionAdjustments = [giant];
  setRules(rules);

  const result = applyDynamicPricingRules({
    serviceId: "boarding",
    basePrice: 300,
    existingExtraServices: [],
    selectedPetIds: [1],
    pets: [
      {
        id: 1,
        age: 5,
        weight: 90,
        breed: "mixed",
        petStatus: "active",
      },
    ],
    addOnsCatalog: [],
    boardingNights: 3,
    sessionUnits: 3,
    serviceStartDate: "2026-08-01",
    serviceEndDate: "2026-08-04",
  });

  summarize("6) Giant breed surcharge", result);
}
