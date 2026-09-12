"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  MobileGroomingVan,
  ServiceArea,
  StaffServiceAreaSchedule,
  TravelZone,
} from "@/types/grooming";
import type { CustomServicesAudience } from "@/hooks/use-custom-services";
import { facilitySettingsQueries } from "@/lib/api/facility-settings";
import { facilityProfileQueries } from "@/lib/api/facility-profile";
import {
  MOBILE_GROOMING_OFF,
  type MobileGroomingSettings,
} from "@/lib/settings/mobile-grooming";
import { NO_ITEMS } from "@/lib/no-items";

// ============================================================================
// Mobile grooming — the facility's own setting.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// Everything here lived in the browser's localStorage, seeded with two
// invented vans, two Montréal service areas, three travel zones and a week of
// area schedules for fixture staff — and ZIP tax rates defaulting to Québec's.
// It is the `mobile_grooming` settings domain now
// (lib/settings/mobile-grooming.ts), off until a facility sets it up. The ZIP
// tax rates are gone: tax comes from the facility's tax settings.
//
// ── TWO AUDIENCES ─────────────────────────────────────────────────────────
//
//   staff      reads and writes the setting; the base postal code is the
//              facility profile's.
//   customer   reads `public.offered_mobile_grooming()` through
//              /api/customer/mobile-grooming — the switches, active areas and
//              zones, whether a van is running, and the base postal code. No
//              vans, no staff schedules, and no writes.
//
// ── WRITES ARE PROMISES ───────────────────────────────────────────────────
//
// Each write reads the CURRENT setting from the server, changes only its own
// part, saves, and resolves once saved — or rejects with the server's reason.
// They were synchronous localStorage writes, toasted before anything could
// have failed.
// ============================================================================

interface MobileGroomingContextValue {
  enabled: boolean;
  vans: MobileGroomingVan[];
  /**
   * Single source of truth for "is mobile actually usable right now?" —
   * a facility may have the feature flag on but zero active vans (or zero
   * vans at all), in which case every consumer of the mobile UI (nav tabs,
   * booking-flow location chooser, facility dialog mobile toggle) must
   * hide. Centralized here so call sites don't re-derive the predicate.
   */
  hasActiveVans: boolean;
  serviceAreas: ServiceArea[];
  /** Travel zones used to compute mobile-grooming distance surcharges. */
  travelZones: TravelZone[];
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
  /** The postal code a travel zone's distance is measured from — the
   *  facility's own. It was a constant ("H2X 1Z4") for every facility. */
  basePostalCode: string | undefined;
  /** True until the facility's setting has arrived. */
  isPending: boolean;

  setEnabled: (next: boolean) => Promise<void>;
  setArrivalWindowMinutes: (next: number) => Promise<void>;
  setCertainAreaEnabled: (next: boolean) => Promise<void>;
  addVan: (van: MobileGroomingVan) => Promise<void>;
  updateVan: (van: MobileGroomingVan) => Promise<void>;
  deleteVan: (id: string) => Promise<void>;
  toggleVanActive: (id: string) => Promise<void>;

  addServiceArea: (area: ServiceArea) => Promise<void>;
  updateServiceArea: (area: ServiceArea) => Promise<void>;
  deleteServiceArea: (id: string) => Promise<void>;
  toggleServiceAreaActive: (id: string) => Promise<void>;

  /** Replace one day in a staff's weekly template (dow = 0=Sun … 6=Sat). */
  setStaffWeeklyDay: (
    staffId: string,
    dayOfWeek: number,
    areaId: string | null,
  ) => Promise<void>;
  /** Set / clear a per-date override for a staff. Pass `undefined` to remove. */
  setStaffDateOverride: (
    staffId: string,
    dateStr: string,
    areaId: string | null | undefined,
  ) => Promise<void>;

  /** Add or replace a travel zone (matched by id). */
  upsertTravelZone: (zone: TravelZone) => Promise<void>;
  deleteTravelZone: (id: string) => Promise<void>;
}

/** What a customer is shown (`public.offered_mobile_grooming()`). */
interface OfferedMobileGrooming {
  enabled: boolean;
  hasActiveVans: boolean;
  arrivalWindowMinutes: number;
  certainAreaEnabled: boolean;
  serviceAreas: ServiceArea[];
  travelZones: TravelZone[];
  basePostalCode: string | null;
}

const NOTHING_OFFERED: OfferedMobileGrooming = {
  enabled: false,
  hasActiveVans: false,
  arrivalWindowMinutes: MOBILE_GROOMING_OFF.arrivalWindowMinutes,
  certainAreaEnabled: false,
  serviceAreas: [],
  travelZones: [],
  basePostalCode: null,
};

const OFFERED_KEY = ["customer", "mobile-grooming"] as const;

async function readError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return new Error(body?.error ?? fallback);
}

async function fetchOffered(): Promise<OfferedMobileGrooming> {
  const response = await fetch("/api/customer/mobile-grooming");
  if (response.status === 401 || response.status === 404) {
    return NOTHING_OFFERED;
  }
  if (!response.ok) {
    throw await readError(response, "Could not load mobile grooming.");
  }
  return {
    ...NOTHING_OFFERED,
    ...((await response.json()) as Partial<OfferedMobileGrooming>),
  };
}

const NOT_YOURS = "Mobile grooming is set up by the facility.";

function makeEmptyWeekly(): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (let d = 0; d < 7; d++) out[String(d)] = null;
  return out;
}

export function MobileGroomingProvider({
  children,
  audience = "staff",
}: {
  children: ReactNode;
  audience?: CustomServicesAudience;
}) {
  const queryClient = useQueryClient();
  const staff = audience === "staff";

  const settingsQuery = useQuery({
    ...facilitySettingsQueries.all(),
    enabled: staff,
  });
  const profileQuery = useQuery({
    ...facilityProfileQueries.detail(),
    enabled: staff,
  });
  const offeredQuery = useQuery({
    queryKey: OFFERED_KEY,
    queryFn: fetchOffered,
    enabled: !staff,
  });

  const saved = settingsQuery.data?.mobile_grooming?.value;

  // ── The current setting, from the server, changed in one part ──────────
  const save = useCallback(
    async (
      change: (prev: MobileGroomingSettings) => MobileGroomingSettings,
    ): Promise<void> => {
      if (!staff) throw new Error(NOT_YOURS);
      const settings = await queryClient.fetchQuery({
        ...facilitySettingsQueries.all(),
        staleTime: 0,
      });
      const prev: MobileGroomingSettings = {
        ...MOBILE_GROOMING_OFF,
        ...(settings.mobile_grooming?.value ?? {}),
      };
      const response = await fetch("/api/facility/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: "mobile_grooming",
          value: change(prev),
        }),
      });
      if (!response.ok) {
        throw await readError(response, `Request failed (${response.status})`);
      }
      await queryClient.invalidateQueries({
        queryKey: ["facility", "settings"],
      });
    },
    [staff, queryClient],
  );

  const setEnabled = useCallback(
    (next: boolean) => save((prev) => ({ ...prev, enabled: next })),
    [save],
  );

  const setArrivalWindowMinutes = useCallback(
    (next: number) =>
      save((prev) => ({
        ...prev,
        arrivalWindowMinutes: Math.max(0, Math.min(240, Math.round(next))),
      })),
    [save],
  );

  const setCertainAreaEnabled = useCallback(
    (next: boolean) => save((prev) => ({ ...prev, certainAreaEnabled: next })),
    [save],
  );

  const addVan = useCallback(
    (van: MobileGroomingVan) =>
      save((prev) => ({
        ...prev,
        vans: prev.vans.some((v) => v.id === van.id)
          ? prev.vans.map((v) => (v.id === van.id ? van : v))
          : [...prev.vans, van],
      })),
    [save],
  );

  const updateVan = useCallback(
    (van: MobileGroomingVan) =>
      save((prev) => ({
        ...prev,
        vans: prev.vans.map((v) => (v.id === van.id ? van : v)),
      })),
    [save],
  );

  const deleteVan = useCallback(
    (id: string) =>
      save((prev) => ({ ...prev, vans: prev.vans.filter((v) => v.id !== id) })),
    [save],
  );

  const toggleVanActive = useCallback(
    (id: string) =>
      save((prev) => ({
        ...prev,
        vans: prev.vans.map((v) =>
          v.id === id ? { ...v, active: !v.active } : v,
        ),
      })),
    [save],
  );

  const addServiceArea = useCallback(
    (area: ServiceArea) =>
      save((prev) => ({
        ...prev,
        serviceAreas: prev.serviceAreas.some((a) => a.id === area.id)
          ? prev.serviceAreas.map((a) => (a.id === area.id ? area : a))
          : [...prev.serviceAreas, area],
      })),
    [save],
  );

  const updateServiceArea = useCallback(
    (area: ServiceArea) =>
      save((prev) => ({
        ...prev,
        serviceAreas: prev.serviceAreas.map((a) =>
          a.id === area.id ? area : a,
        ),
      })),
    [save],
  );

  const deleteServiceArea = useCallback(
    (id: string) =>
      save((prev) => ({
        ...prev,
        serviceAreas: prev.serviceAreas.filter((a) => a.id !== id),
      })),
    [save],
  );

  const toggleServiceAreaActive = useCallback(
    (id: string) =>
      save((prev) => ({
        ...prev,
        serviceAreas: prev.serviceAreas.map((a) =>
          a.id === id ? { ...a, active: !a.active } : a,
        ),
      })),
    [save],
  );

  const setStaffWeeklyDay = useCallback(
    (staffId: string, dayOfWeek: number, areaId: string | null) =>
      save((prev) => {
        const existing = prev.staffSchedules.find((s) => s.staffId === staffId);
        const staffSchedules = existing
          ? prev.staffSchedules.map((s) =>
              s.staffId === staffId
                ? {
                    ...s,
                    weeklyTemplate: {
                      ...s.weeklyTemplate,
                      [String(dayOfWeek)]: areaId,
                    },
                  }
                : s,
            )
          : [
              ...prev.staffSchedules,
              {
                staffId,
                weeklyTemplate: {
                  ...makeEmptyWeekly(),
                  [String(dayOfWeek)]: areaId,
                },
                dateOverrides: {},
              },
            ];
        return { ...prev, staffSchedules };
      }),
    [save],
  );

  const setStaffDateOverride = useCallback(
    (staffId: string, dateStr: string, areaId: string | null | undefined) =>
      save((prev) => {
        const existing = prev.staffSchedules.find((s) => s.staffId === staffId);
        if (existing) {
          const overrides = { ...existing.dateOverrides };
          if (areaId === undefined) {
            delete overrides[dateStr];
          } else {
            overrides[dateStr] = areaId;
          }
          return {
            ...prev,
            staffSchedules: prev.staffSchedules.map((s) =>
              s.staffId === staffId ? { ...s, dateOverrides: overrides } : s,
            ),
          };
        }
        // Don't create a schedule entry just to record an override clear.
        if (areaId === undefined) return prev;
        return {
          ...prev,
          staffSchedules: [
            ...prev.staffSchedules,
            {
              staffId,
              weeklyTemplate: makeEmptyWeekly(),
              dateOverrides: { [dateStr]: areaId },
            },
          ],
        };
      }),
    [save],
  );

  const upsertTravelZone = useCallback(
    (zone: TravelZone) =>
      save((prev) => ({
        ...prev,
        travelZones: prev.travelZones.some((z) => z.id === zone.id)
          ? prev.travelZones.map((z) => (z.id === zone.id ? zone : z))
          : [...prev.travelZones, zone],
      })),
    [save],
  );

  const deleteTravelZone = useCallback(
    (id: string) =>
      save((prev) => ({
        ...prev,
        travelZones: prev.travelZones.filter((z) => z.id !== id),
      })),
    [save],
  );

  const offered = offeredQuery.data;
  const zipCode = profileQuery.data?.address?.zipCode?.trim();

  const value = useMemo<MobileGroomingContextValue>(() => {
    const writes = {
      setEnabled,
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
    };
    if (!staff) {
      const shown = offered ?? NOTHING_OFFERED;
      return {
        enabled: shown.enabled,
        vans: NO_ITEMS,
        hasActiveVans: shown.hasActiveVans,
        serviceAreas: shown.serviceAreas,
        travelZones: shown.travelZones,
        arrivalWindowMinutes: shown.arrivalWindowMinutes,
        certainAreaEnabled: shown.certainAreaEnabled,
        staffSchedules: NO_ITEMS,
        basePostalCode: shown.basePostalCode ?? undefined,
        isPending: offeredQuery.isPending,
        ...writes,
      };
    }
    const setting = { ...MOBILE_GROOMING_OFF, ...(saved ?? {}) };
    // Vans whose staff assignment was cleared get auto-deactivated so the
    // hasActiveVans gate stays consistent with what the rest of the app
    // treats as "operable."
    const resolvedVans = setting.vans.map((v) =>
      v.assignedStaffIds.length === 0 ? { ...v, active: false } : v,
    );
    return {
      enabled: setting.enabled,
      vans: resolvedVans,
      hasActiveVans: resolvedVans.some((v) => v.active),
      serviceAreas: setting.serviceAreas,
      travelZones: setting.travelZones,
      arrivalWindowMinutes: setting.arrivalWindowMinutes,
      certainAreaEnabled: setting.certainAreaEnabled,
      staffSchedules: setting.staffSchedules,
      basePostalCode: zipCode || undefined,
      isPending: settingsQuery.isPending,
      ...writes,
    };
  }, [
    staff,
    offered,
    offeredQuery.isPending,
    saved,
    zipCode,
    settingsQuery.isPending,
    setEnabled,
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
  ]);

  return (
    <MobileGroomingContext.Provider value={value}>
      {children}
    </MobileGroomingContext.Provider>
  );
}

const MobileGroomingContext = createContext<MobileGroomingContextValue | null>(
  null,
);

export function useMobileGrooming(): MobileGroomingContextValue {
  const ctx = useContext(MobileGroomingContext);
  if (!ctx) {
    throw new Error(
      "useMobileGrooming must be used inside MobileGroomingProvider",
    );
  }
  return ctx;
}
