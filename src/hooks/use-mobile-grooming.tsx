"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type {
  MobileGroomingVan,
  ServiceArea,
  StaffServiceAreaSchedule,
  TravelZone,
  ZipTaxRate,
} from "@/types/grooming";
import { staffAreaSchedules as DEFAULT_STAFF_SCHEDULES } from "@/data/staff-area-schedules";

const ENABLED_KEY = "yipyy_mobile_grooming_enabled";
const VANS_KEY = "yipyy_mobile_grooming_vans";
const AREAS_KEY = "yipyy_mobile_grooming_service_areas";
const ARRIVAL_WINDOW_KEY = "yipyy_mobile_arrival_window_minutes";
const STAFF_SCHEDULES_KEY = "yipyy_mobile_grooming_staff_schedules";
const CERTAIN_AREA_KEY = "yipyy_mobile_certain_area_enabled";
const TRAVEL_ZONES_KEY = "yipyy_mobile_travel_zones";
const ZIP_TAX_KEY = "yipyy_mobile_zip_tax_rates";

const DEFAULT_ARRIVAL_WINDOW_MINUTES = 60;

const DEFAULT_SERVICE_AREAS: ServiceArea[] = [
  {
    id: "area-north",
    facilityId: 11,
    name: "North Montréal",
    type: "postal",
    postalCodes: ["H2P", "H2N", "H2M", "H2L"],
    daysOfWeek: [1, 3], // Mon, Wed
    active: true,
    color: "#0ea5e9",
  },
  {
    id: "area-south",
    facilityId: 11,
    name: "South Shore",
    type: "radius",
    centerAddress: "Longueuil, QC",
    radiusKm: 12,
    daysOfWeek: [2, 4], // Tue, Thu
    active: true,
    color: "#a855f7",
  },
];

const DEFAULT_TRAVEL_ZONES: TravelZone[] = [
  {
    id: "zone-1",
    label: "Zone 1 · 0–5 mi",
    maxMiles: 5,
    surchargeMode: "flat",
    surchargeAmount: 0,
    active: true,
  },
  {
    id: "zone-2",
    label: "Zone 2 · 5–15 mi",
    maxMiles: 15,
    surchargeMode: "flat",
    surchargeAmount: 10,
    active: true,
  },
  {
    id: "zone-3",
    label: "Zone 3 · 15–25 mi",
    maxMiles: 25,
    surchargeMode: "flat",
    surchargeAmount: 20,
    active: true,
  },
];

const DEFAULT_ZIP_TAX_RATES: ZipTaxRate[] = [
  {
    id: "zip-tax-qc",
    prefix: "H",
    ratePercent: 14.975,
    label: "Québec (GST + QST)",
    isDefault: true,
  },
  {
    id: "zip-tax-on",
    prefix: "M",
    ratePercent: 13,
    label: "Ontario (HST)",
  },
  {
    id: "zip-tax-h3a",
    prefix: "H3A",
    ratePercent: 14.975,
    label: "Downtown Montréal",
  },
];

const DEFAULT_VANS: MobileGroomingVan[] = [
  {
    id: "van-1",
    facilityId: 11,
    name: "Van 1",
    licensePlate: "MG-4422",
    homeBaseAddress: "1450 Saint-Catherine St W, Montréal, QC",
    assignedStaffIds: [],
    active: true,
    calendarColor: "#0ea5e9",
  },
  {
    id: "van-2",
    facilityId: 11,
    name: "Van 2",
    licensePlate: "MG-7891",
    homeBaseAddress: "1450 Saint-Catherine St W, Montréal, QC",
    assignedStaffIds: [],
    active: true,
    calendarColor: "#a855f7",
  },
];

interface MobileGroomingContextValue {
  enabled: boolean;
  vans: MobileGroomingVan[];
  serviceAreas: ServiceArea[];
  /** Travel zones used to compute mobile-grooming distance surcharges. */
  travelZones: TravelZone[];
  /** Per-ZIP / postal-prefix tax rates. */
  zipTaxRates: ZipTaxRate[];
  /** Client-facing arrival window size (in minutes). Internal times stay precise. */
  arrivalWindowMinutes: number;
  /**
   * "Certain Area for Certain Days" — when enabled, smart scheduling and
   * online booking filter slots by the staff-area schedule below. When off,
   * coverage falls back to the area-level daysOfWeek setting.
   */
  certainAreaEnabled: boolean;
  /** Per-staff weekly area templates + per-date overrides. */
  staffSchedules: StaffServiceAreaSchedule[];

  setEnabled: (next: boolean) => void;
  setArrivalWindowMinutes: (next: number) => void;
  setCertainAreaEnabled: (next: boolean) => void;
  addVan: (van: MobileGroomingVan) => void;
  updateVan: (van: MobileGroomingVan) => void;
  deleteVan: (id: string) => void;
  toggleVanActive: (id: string) => void;

  addServiceArea: (area: ServiceArea) => void;
  updateServiceArea: (area: ServiceArea) => void;
  deleteServiceArea: (id: string) => void;
  toggleServiceAreaActive: (id: string) => void;

  /** Replace one day in a staff's weekly template (dow = 0=Sun … 6=Sat). */
  setStaffWeeklyDay: (
    staffId: string,
    dayOfWeek: number,
    areaId: string | null,
  ) => void;
  /** Set / clear a per-date override for a staff. Pass `undefined` to remove. */
  setStaffDateOverride: (
    staffId: string,
    dateStr: string,
    areaId: string | null | undefined,
  ) => void;

  /** Add or replace a travel zone (matched by id). */
  upsertTravelZone: (zone: TravelZone) => void;
  deleteTravelZone: (id: string) => void;

  /** Add or replace a ZIP tax rate (matched by id). */
  upsertZipTaxRate: (rate: ZipTaxRate) => void;
  deleteZipTaxRate: (id: string) => void;
  /**
   * Mark exactly one ZIP tax rate as the default fallback. Clears the flag
   * on every other entry to keep the invariant of "exactly one default."
   */
  setDefaultZipTaxRate: (id: string) => void;
}

const MobileGroomingContext = createContext<MobileGroomingContextValue | null>(
  null,
);

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch {
    // ignore
  }
  return fallback;
}

export function MobileGroomingProvider({ children }: { children: ReactNode }) {
  // Start with defaults on both server and first client render so SSR markup
  // matches; hydrate from localStorage in an effect.
  const [enabled, setEnabledState] = useState<boolean>(false);
  const [vans, setVans] = useState<MobileGroomingVan[]>(DEFAULT_VANS);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>(
    DEFAULT_SERVICE_AREAS,
  );
  const [arrivalWindowMinutes, setArrivalWindowMinutesState] = useState<number>(
    DEFAULT_ARRIVAL_WINDOW_MINUTES,
  );
  const [certainAreaEnabled, setCertainAreaEnabledState] = useState<boolean>(
    true,
  );
  const [staffSchedules, setStaffSchedules] = useState<
    StaffServiceAreaSchedule[]
  >(DEFAULT_STAFF_SCHEDULES);
  const [travelZones, setTravelZones] = useState<TravelZone[]>(
    DEFAULT_TRAVEL_ZONES,
  );
  const [zipTaxRates, setZipTaxRates] = useState<ZipTaxRate[]>(
    DEFAULT_ZIP_TAX_RATES,
  );
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setEnabledState(loadStored<boolean>(ENABLED_KEY, false));
    setVans(loadStored<MobileGroomingVan[]>(VANS_KEY, DEFAULT_VANS));
    setServiceAreas(
      loadStored<ServiceArea[]>(AREAS_KEY, DEFAULT_SERVICE_AREAS),
    );
    setArrivalWindowMinutesState(
      loadStored<number>(ARRIVAL_WINDOW_KEY, DEFAULT_ARRIVAL_WINDOW_MINUTES),
    );
    setCertainAreaEnabledState(loadStored<boolean>(CERTAIN_AREA_KEY, true));
    setStaffSchedules(
      loadStored<StaffServiceAreaSchedule[]>(
        STAFF_SCHEDULES_KEY,
        DEFAULT_STAFF_SCHEDULES,
      ),
    );
    setTravelZones(
      loadStored<TravelZone[]>(TRAVEL_ZONES_KEY, DEFAULT_TRAVEL_ZONES),
    );
    setZipTaxRates(
      loadStored<ZipTaxRate[]>(ZIP_TAX_KEY, DEFAULT_ZIP_TAX_RATES),
    );
    setHasHydrated(true);
  }, []);

  const setArrivalWindowMinutes = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(240, Math.round(next)));
      setArrivalWindowMinutesState(clamped);
      if (hasHydrated) {
        queueMicrotask(() =>
          localStorage.setItem(ARRIVAL_WINDOW_KEY, JSON.stringify(clamped)),
        );
      }
    },
    [hasHydrated],
  );

  const persistEnabled = useCallback(
    (next: boolean) => {
      setEnabledState(next);
      if (hasHydrated) {
        queueMicrotask(() =>
          localStorage.setItem(ENABLED_KEY, JSON.stringify(next)),
        );
      }
    },
    [hasHydrated],
  );

  const persistVans = useCallback(
    (updater: (prev: MobileGroomingVan[]) => MobileGroomingVan[]) => {
      setVans((prev) => {
        const next = updater(prev);
        if (hasHydrated) {
          queueMicrotask(() =>
            localStorage.setItem(VANS_KEY, JSON.stringify(next)),
          );
        }
        return next;
      });
    },
    [hasHydrated],
  );

  const addVan = useCallback(
    (van: MobileGroomingVan) =>
      persistVans((prev) =>
        prev.find((v) => v.id === van.id)
          ? prev.map((v) => (v.id === van.id ? van : v))
          : [...prev, van],
      ),
    [persistVans],
  );

  const updateVan = useCallback(
    (van: MobileGroomingVan) =>
      persistVans((prev) => prev.map((v) => (v.id === van.id ? van : v))),
    [persistVans],
  );

  const deleteVan = useCallback(
    (id: string) => persistVans((prev) => prev.filter((v) => v.id !== id)),
    [persistVans],
  );

  const toggleVanActive = useCallback(
    (id: string) =>
      persistVans((prev) =>
        prev.map((v) => (v.id === id ? { ...v, active: !v.active } : v)),
      ),
    [persistVans],
  );

  const persistAreas = useCallback(
    (updater: (prev: ServiceArea[]) => ServiceArea[]) => {
      setServiceAreas((prev) => {
        const next = updater(prev);
        if (hasHydrated) {
          queueMicrotask(() =>
            localStorage.setItem(AREAS_KEY, JSON.stringify(next)),
          );
        }
        return next;
      });
    },
    [hasHydrated],
  );

  const addServiceArea = useCallback(
    (area: ServiceArea) =>
      persistAreas((prev) =>
        prev.find((a) => a.id === area.id)
          ? prev.map((a) => (a.id === area.id ? area : a))
          : [...prev, area],
      ),
    [persistAreas],
  );

  const updateServiceArea = useCallback(
    (area: ServiceArea) =>
      persistAreas((prev) => prev.map((a) => (a.id === area.id ? area : a))),
    [persistAreas],
  );

  const deleteServiceArea = useCallback(
    (id: string) => persistAreas((prev) => prev.filter((a) => a.id !== id)),
    [persistAreas],
  );

  const toggleServiceAreaActive = useCallback(
    (id: string) =>
      persistAreas((prev) =>
        prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)),
      ),
    [persistAreas],
  );

  const setCertainAreaEnabled = useCallback(
    (next: boolean) => {
      setCertainAreaEnabledState(next);
      if (hasHydrated) {
        queueMicrotask(() =>
          localStorage.setItem(CERTAIN_AREA_KEY, JSON.stringify(next)),
        );
      }
    },
    [hasHydrated],
  );

  const persistSchedules = useCallback(
    (
      updater: (prev: StaffServiceAreaSchedule[]) => StaffServiceAreaSchedule[],
    ) => {
      setStaffSchedules((prev) => {
        const next = updater(prev);
        if (hasHydrated) {
          queueMicrotask(() =>
            localStorage.setItem(STAFF_SCHEDULES_KEY, JSON.stringify(next)),
          );
        }
        return next;
      });
    },
    [hasHydrated],
  );

  function makeEmptyWeekly(): Record<string, string | null> {
    const out: Record<string, string | null> = {};
    for (let d = 0; d < 7; d++) out[String(d)] = null;
    return out;
  }

  const setStaffWeeklyDay = useCallback(
    (staffId: string, dayOfWeek: number, areaId: string | null) =>
      persistSchedules((prev) => {
        const existing = prev.find((s) => s.staffId === staffId);
        if (existing) {
          return prev.map((s) =>
            s.staffId === staffId
              ? {
                  ...s,
                  weeklyTemplate: {
                    ...s.weeklyTemplate,
                    [String(dayOfWeek)]: areaId,
                  },
                }
              : s,
          );
        }
        return [
          ...prev,
          {
            staffId,
            weeklyTemplate: {
              ...makeEmptyWeekly(),
              [String(dayOfWeek)]: areaId,
            },
            dateOverrides: {},
          },
        ];
      }),
    [persistSchedules],
  );

  const persistTravelZones = useCallback(
    (updater: (prev: TravelZone[]) => TravelZone[]) => {
      setTravelZones((prev) => {
        const next = updater(prev);
        if (hasHydrated) {
          queueMicrotask(() =>
            localStorage.setItem(TRAVEL_ZONES_KEY, JSON.stringify(next)),
          );
        }
        return next;
      });
    },
    [hasHydrated],
  );

  const upsertTravelZone = useCallback(
    (zone: TravelZone) =>
      persistTravelZones((prev) =>
        prev.find((z) => z.id === zone.id)
          ? prev.map((z) => (z.id === zone.id ? zone : z))
          : [...prev, zone],
      ),
    [persistTravelZones],
  );

  const deleteTravelZone = useCallback(
    (id: string) =>
      persistTravelZones((prev) => prev.filter((z) => z.id !== id)),
    [persistTravelZones],
  );

  const persistZipTaxRates = useCallback(
    (updater: (prev: ZipTaxRate[]) => ZipTaxRate[]) => {
      setZipTaxRates((prev) => {
        const next = updater(prev);
        if (hasHydrated) {
          queueMicrotask(() =>
            localStorage.setItem(ZIP_TAX_KEY, JSON.stringify(next)),
          );
        }
        return next;
      });
    },
    [hasHydrated],
  );

  const upsertZipTaxRate = useCallback(
    (rate: ZipTaxRate) =>
      persistZipTaxRates((prev) =>
        prev.find((r) => r.id === rate.id)
          ? prev.map((r) => (r.id === rate.id ? rate : r))
          : [...prev, rate],
      ),
    [persistZipTaxRates],
  );

  const deleteZipTaxRate = useCallback(
    (id: string) =>
      persistZipTaxRates((prev) => prev.filter((r) => r.id !== id)),
    [persistZipTaxRates],
  );

  const setDefaultZipTaxRate = useCallback(
    (id: string) =>
      persistZipTaxRates((prev) =>
        prev.map((r) => ({ ...r, isDefault: r.id === id })),
      ),
    [persistZipTaxRates],
  );

  const setStaffDateOverride = useCallback(
    (
      staffId: string,
      dateStr: string,
      areaId: string | null | undefined,
    ) =>
      persistSchedules((prev) => {
        const existing = prev.find((s) => s.staffId === staffId);
        if (existing) {
          const overrides = { ...existing.dateOverrides };
          if (areaId === undefined) {
            delete overrides[dateStr];
          } else {
            overrides[dateStr] = areaId;
          }
          return prev.map((s) =>
            s.staffId === staffId ? { ...s, dateOverrides: overrides } : s,
          );
        }
        // Don't create a schedule entry just to record an override clear.
        if (areaId === undefined) return prev;
        return [
          ...prev,
          {
            staffId,
            weeklyTemplate: makeEmptyWeekly(),
            dateOverrides: { [dateStr]: areaId },
          },
        ];
      }),
    [persistSchedules],
  );

  const value = useMemo<MobileGroomingContextValue>(
    () => ({
      enabled,
      vans,
      serviceAreas,
      arrivalWindowMinutes,
      certainAreaEnabled,
      staffSchedules,
      travelZones,
      zipTaxRates,
      setEnabled: persistEnabled,
      setArrivalWindowMinutes,
      setCertainAreaEnabled,
      addVan,
      updateVan,
      deleteVan,
      toggleVanActive,
      addServiceArea,
      updateServiceArea,
      deleteServiceArea,
      toggleServiceAreaActive,
      setStaffWeeklyDay,
      setStaffDateOverride,
      upsertTravelZone,
      deleteTravelZone,
      upsertZipTaxRate,
      deleteZipTaxRate,
      setDefaultZipTaxRate,
    }),
    [
      enabled,
      vans,
      serviceAreas,
      arrivalWindowMinutes,
      certainAreaEnabled,
      staffSchedules,
      travelZones,
      zipTaxRates,
      persistEnabled,
      setArrivalWindowMinutes,
      setCertainAreaEnabled,
      addVan,
      updateVan,
      deleteVan,
      toggleVanActive,
      addServiceArea,
      updateServiceArea,
      deleteServiceArea,
      toggleServiceAreaActive,
      setStaffWeeklyDay,
      setStaffDateOverride,
      upsertTravelZone,
      deleteTravelZone,
      upsertZipTaxRate,
      deleteZipTaxRate,
      setDefaultZipTaxRate,
    ],
  );

  return (
    <MobileGroomingContext.Provider value={value}>
      {children}
    </MobileGroomingContext.Provider>
  );
}

export function useMobileGrooming(): MobileGroomingContextValue {
  const ctx = useContext(MobileGroomingContext);
  if (!ctx) {
    throw new Error(
      "useMobileGrooming must be used inside MobileGroomingProvider",
    );
  }
  return ctx;
}
