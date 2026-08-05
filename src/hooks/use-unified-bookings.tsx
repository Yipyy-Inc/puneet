"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DaycareCheckIn } from "@/types/daycare";
import {
  useBoardingCheckIn,
  useBoardingDay,
  useBoardingRevert,
  useBoardingStayUpdate,
} from "@/lib/api/boarding-attendance";
import type { BoardingArrival } from "@/lib/api/mappers/boarding-arrival";
import {
  useDaycareCheckIn,
  useDaycareDay,
  useDaycareRevert,
  useDaycareVisitUpdate,
} from "@/lib/api/daycare-attendance";
import { groomingQueries } from "@/lib/api/grooming";
import {
  useTrainingCheckIn,
  useTrainingDay,
  useTrainingRevert,
  useTrainingVisitUpdate,
} from "@/lib/api/training-attendance";
import { useMarkBookingNoShow } from "@/lib/api/booking-money";
import { useSetGroomingAppointmentStatus } from "@/lib/api/grooming-appointments";
import {
  customServiceCheckIns,
  type CustomServiceCheckIn,
} from "@/data/custom-service-checkins";
import { useCustomServices } from "@/hooks/use-custom-services";
import { COLOR_HEX_MAP, getCategoryMeta } from "@/data/custom-services";
import type { CustomServiceModule } from "@/types/facility";
import { useLocationContext } from "@/hooks/use-location-context";
import { deriveLocationId } from "@/data/locations";

// ============================================================================
// One list of everyone in the building today.
//
// ── WHAT THIS WAS, AND WHY IT HAD TO CHANGE NOW ───────────────────────────
//
// Five module arrays in `useState`. That was uniformly wrong and therefore
// harmless — until boarding and daycare arrivals became real (20260806880000,
// 20260806900000). Then the facility home page counted arrivals from fixtures
// dated March 2024 while the check-in board one click away counted them from
// Postgres. SAME FACILITY, SAME DAY, TWO ANSWERS. A stale screen is a
// nuisance; two live screens that disagree is the thing people stop trusting.
//
// ── THREE SOURCES ARE REAL, TWO ARE NOT, AND THE SEAM IS DELIBERATE ───────
//
// Boarding, daycare and grooming have tables and endpoints, so they are read
// through them. Training and custom services have neither — no table, no API —
// so they stay `useState` over a fixture and are marked as such at every point
// they are used. Inventing tables for them to make this file tidy would be a
// schema decision smuggled in as a refactor.
//
// The counts are therefore honest for three services and fictional for two,
// which is worse-looking and better than one number that averages the two
// kinds together without saying so.
// ============================================================================

export type UnifiedStatus = "scheduled" | "checked-in" | "checked-out";

export interface EarlyCheckoutAdjustment {
  unusedNights: number;
  unusedValue: number;
  policy: "none" | "full_refund" | "partial_refund" | "credit" | "fee";
  refundAmount: number;
  creditAmount: number;
  feeAmount: number;
  creditExpiresDays?: number;
  customerNote?: string;
}

export type BookingSource =
  | "boarding"
  | "daycare"
  | "grooming"
  | "training"
  | "custom";

export interface UnifiedBooking {
  id: string;
  rawId: string;
  source: BookingSource;
  serviceKey: string;
  serviceLabel: string;
  serviceColor: string;
  serviceIcon: string;
  petId: number;
  petName: string;
  petBreed: string;
  ownerId?: number;
  ownerName: string;
  ownerPhone: string;
  status: UnifiedStatus;
  scheduledStart: string;
  actualStart: string | null;
  scheduledEnd: string;
  actualEnd: string | null;
  isGoingHomeToday: boolean;
  resourceLabel?: string;
  staffLabel?: string;
  notes?: string;
  price?: number;
  /**
   * The booking's money, for the till at pickup.
   *
   * `price` alone was not enough and was often absent: the card computed
   * "amount due" as `price + lateFee`, which for boarding and daycare was
   * `undefined + 0`. These come from the booking's derived columns, so a
   * payment taken here is for what is actually outstanding.
   *
   * Absent for training and custom services, which have no bookings table.
   */
  amountDue?: number;
  amountPaid?: number;
  totalNights?: number;
  groupNote?: string;
}

export interface ServiceMeta {
  key: string;
  label: string;
  color: string;
  icon: string;
  /** True for custom-service modules (vs. the built-in standard services). */
  isCustom?: boolean;
}

export interface UnifiedBookingsContextValue {
  bookings: UnifiedBooking[];
  services: ServiceMeta[];
  counts: {
    currentGuests: number;
    todaysArrivals: number;
    goingHomeToday: number;
    checkedOutToday: number;
    expectedToday: number;
    byService: Record<string, number>;
  };
  updateStatus: (
    bookingId: string,
    next: UnifiedStatus,
    options?: {
      timestamp?: string;
      noShow?: boolean;
      earlyCheckout?: EarlyCheckoutAdjustment;
    },
  ) => void;
}

const PET_IMAGE_MAP: Record<number, string> = {
  1: "/dogs/dog-1.jpg",
  2: "/dogs/dog-2.jpg",
  3: "/dogs/dog-3.jpg",
  4: "/dogs/dog-4.jpg",
  5: "/dogs/dog-1.jpg",
  6: "/dogs/dog-2.jpg",
  7: "/dogs/dog-3.jpg",
  8: "/dogs/dog-4.jpg",
  13: "/dogs/dog-2.jpg",
  14: "/dogs/dog-3.jpg",
  20: "/dogs/dog-1.jpg",
  21: "/dogs/dog-2.jpg",
};

export function getPetImage(petId: number): string | null {
  return PET_IMAGE_MAP[petId] ?? null;
}

const Ctx = createContext<UnifiedBookingsContextValue | null>(null);

const BUILTIN_SERVICES: ServiceMeta[] = [
  { key: "daycare", label: "Daycare", color: "#3b82f6", icon: "Sun" },
  { key: "boarding", label: "Boarding", color: "#a855f7", icon: "Bed" },
  { key: "grooming", label: "Grooming", color: "#ec4899", icon: "Scissors" },
  {
    key: "training",
    label: "Training",
    color: "#f59e0b",
    icon: "GraduationCap",
  },
];

function endOfTodayMs(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * A boarding guest, from `/api/boarding/attendance`.
 *
 * `released` collapses into `checked-out` for the board's three-state view. The
 * day query cannot actually produce it — a released stay is a cancelled booking,
 * which the overlap query excludes, and the on-site query only returns guests
 * who are checked in. It is mapped rather than left to fall through to
 * `scheduled`, which would put a cancelled booking in Today's Arrivals.
 */
function normalizeBoarding(g: BoardingArrival): UnifiedBooking {
  const status: UnifiedStatus =
    g.status === "checked-out" || g.status === "released"
      ? "checked-out"
      : g.status === "checked-in"
        ? "checked-in"
        : "scheduled";
  return {
    id: `boarding:${g.id}`,
    rawId: g.id,
    source: "boarding",
    serviceKey: "boarding",
    serviceLabel: "Boarding",
    serviceColor: "#a855f7",
    serviceIcon: "Bed",
    petId: g.petId,
    // A boarding booking can cover several pets and they stay together — the
    // stay keys on the booking, not the pet. One card, both names.
    petName: g.petNames.join(", ") || "Guest",
    petBreed: g.petBreed,
    ownerId: g.ownerId,
    ownerName: g.ownerName,
    ownerPhone: g.ownerPhone,
    status,
    scheduledStart: g.scheduledArrival,
    actualStart: g.checkedInAt,
    scheduledEnd: g.scheduledDeparture,
    actualEnd: g.checkedOutAt,
    // `isOverdue` counts too. A guest who should have gone home on Sunday is
    // still going home today, and the old computation — end date within today —
    // silently dropped them off the departures tile.
    isGoingHomeToday:
      status === "checked-in" &&
      (g.isDepartingToday ||
        g.isOverdue ||
        new Date(g.scheduledDeparture).getTime() <= endOfTodayMs()),
    ...(g.roomName ? { resourceLabel: g.roomName } : {}),
    price: g.totalCost,
    amountDue: g.amountDue,
    amountPaid: g.amountPaid,
    totalNights: g.nights,
  };
}

function normalizeDaycare(d: DaycareCheckIn): UnifiedBooking {
  const status: UnifiedStatus =
    d.status === "checked-out"
      ? "checked-out"
      : d.status === "checked-in"
        ? "checked-in"
        : "scheduled";
  return {
    id: `daycare:${d.id}`,
    rawId: d.id,
    source: "daycare",
    serviceKey: "daycare",
    serviceLabel: "Daycare",
    serviceColor: "#3b82f6",
    serviceIcon: "Sun",
    petId: d.petId,
    petName: d.petName,
    petBreed: d.petBreed,
    ownerId: d.ownerId,
    ownerName: d.ownerName,
    ownerPhone: d.ownerPhone,
    status,
    scheduledStart: d.checkInTime,
    actualStart: d.checkInTime || null,
    scheduledEnd: d.scheduledCheckOut,
    actualEnd: d.checkOutTime ?? null,
    isGoingHomeToday: status === "checked-in",
    resourceLabel: d.playGroup ?? undefined,
    notes: d.notes,
    ...(d.totalCost !== undefined ? { price: d.totalCost } : {}),
    ...(d.amountDue !== undefined ? { amountDue: d.amountDue } : {}),
    ...(d.amountPaid !== undefined ? { amountPaid: d.amountPaid } : {}),
  };
}

interface MinimalGroomingAppt {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  petId: number;
  petName: string;
  petBreed: string;
  ownerId: number;
  ownerName: string;
  ownerPhone: string;
  stylistName: string;
  packageName: string;
  status: string;
  totalPrice: number;
  amountDue?: number;
  amountPaid?: number;
  checkInTime: string | null;
  checkOutTime: string | null;
  notes: string;
}

function normalizeGrooming(a: MinimalGroomingAppt): UnifiedBooking {
  const status: UnifiedStatus =
    a.status === "completed" ||
    a.status === "ready-for-pickup" ||
    a.status === "cancelled" ||
    a.status === "no-show"
      ? "checked-out"
      : a.status === "checked-in" || a.status === "in-progress"
        ? "checked-in"
        : "scheduled";
  const scheduledStart = `${a.date}T${a.startTime}:00`;
  const scheduledEnd = `${a.date}T${a.endTime}:00`;
  return {
    id: `grooming:${a.id}`,
    rawId: a.id,
    source: "grooming",
    serviceKey: "grooming",
    serviceLabel: "Grooming",
    serviceColor: "#ec4899",
    serviceIcon: "Scissors",
    petId: a.petId,
    petName: a.petName,
    petBreed: a.petBreed,
    ownerId: a.ownerId,
    ownerName: a.ownerName,
    ownerPhone: a.ownerPhone,
    status,
    scheduledStart,
    actualStart: a.checkInTime ?? null,
    scheduledEnd,
    actualEnd: a.checkOutTime ?? null,
    isGoingHomeToday: status === "checked-in",
    resourceLabel: a.packageName,
    staffLabel: a.stylistName,
    notes: a.notes,
    price: a.totalPrice,
    amountDue: a.amountDue ?? a.totalPrice,
    amountPaid: a.amountPaid ?? 0,
  };
}

function normalizeCustom(
  c: CustomServiceCheckIn,
  module?: CustomServiceModule,
): UnifiedBooking {
  const status: UnifiedStatus =
    c.status === "completed" || c.status === "checked-out"
      ? "checked-out"
      : c.status === "checked-in" || c.status === "in-progress"
        ? "checked-in"
        : "scheduled";
  const meta = module ? getCategoryMeta(module.category) : undefined;
  const color =
    (module && COLOR_HEX_MAP[module.iconColor]) ??
    (meta?.color === "blue"
      ? "#0ea5e9"
      : meta?.color === "purple"
        ? "#8b5cf6"
        : meta?.color === "green"
          ? "#10b981"
          : meta?.color === "orange"
            ? "#f59e0b"
            : meta?.color === "teal"
              ? "#14b8a6"
              : "#64748b");
  return {
    id: `custom:${c.id}`,
    rawId: c.id,
    source: "custom",
    serviceKey: c.moduleSlug,
    serviceLabel: c.moduleName,
    serviceColor: color,
    serviceIcon: module?.icon ?? "PawPrint",
    petId: c.petId,
    petName: c.petName,
    petBreed: c.petBreed,
    ownerId: c.ownerId,
    ownerName: c.ownerName,
    ownerPhone: c.ownerPhone,
    status,
    scheduledStart: c.checkInTime,
    actualStart: c.checkInTime,
    scheduledEnd: c.scheduledCheckOut,
    actualEnd: c.checkOutTime,
    isGoingHomeToday: status === "checked-in",
    resourceLabel: c.resourceName,
    staffLabel: c.staffAssigned,
    notes: c.notes,
    price: c.price,
  };
}

export function UnifiedBookingsProvider({ children }: { children: ReactNode }) {
  const { activeModules } = useCustomServices();
  const { currentLocationId, isHQView } = useLocationContext();

  // ── The three that are real ──────────────────────────────────────────────
  const { data: boardingDay } = useBoardingDay();
  const { data: daycareDay } = useDaycareDay();
  const { data: groomingData } = useQuery(groomingQueries.appointments());
  const { data: trainingDay } = useTrainingDay();

  const boardingState = useMemo(() => boardingDay?.guests ?? [], [boardingDay]);
  const daycareState = useMemo(() => daycareDay?.visits ?? [], [daycareDay]);

  /**
   * Grooming, narrowed to today.
   *
   * The other two endpoints are day-scoped; this one is not — it serves the
   * calendar and the appointment detail page as well, so it returns every
   * appointment there has ever been. Unfiltered, a groom completed in June
   * would land in "Checked Out" on a tile labelled *today*, and the board would
   * fill with pets who are not in the building.
   *
   * Filtered here rather than by adding a day variant to `groomingQueries`:
   * that entry is already cached for six other screens, so reusing it costs no
   * request, and a second key would fetch the same rows again.
   */
  const groomingState = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (groomingData ?? []).filter((a) => a.date === today);
  }, [groomingData]);

  // ── The one that is not ──────────────────────────────────────────────────
  //
  // Custom-service modules have no table and no endpoint, so they keep the old
  // `useState` shape and every count they feed is a count of a fixture. Marked
  // here rather than fixed here.
  //
  // Training used to be in this paragraph. It has `training_attendance` now
  // (20260806980000) and reads through it above.
  const [customState, setCustomState] = useState<CustomServiceCheckIn[]>(
    customServiceCheckIns,
  );

  const moduleMap = useMemo(() => {
    const m = new Map<string, CustomServiceModule>();
    for (const mod of activeModules) m.set(mod.id, mod);
    return m;
  }, [activeModules]);

  const customServiceMetas = useMemo<ServiceMeta[]>(() => {
    const seen = new Set<string>();
    const out: ServiceMeta[] = [];
    for (const c of customState) {
      if (seen.has(c.moduleSlug)) continue;
      seen.add(c.moduleSlug);
      const mod = moduleMap.get(c.moduleId);
      const sample = normalizeCustom(c, mod);
      out.push({
        key: c.moduleSlug,
        label: c.moduleName,
        color: sample.serviceColor,
        icon: sample.serviceIcon,
        isCustom: true,
      });
    }
    return out;
  }, [customState, moduleMap]);

  const services: ServiceMeta[] = useMemo(
    () => [...BUILTIN_SERVICES, ...customServiceMetas],
    [customServiceMetas],
  );

  /**
   * Training, from `/api/training/attendance`.
   *
   * This was `trainingSessions` and `enrollments` — two module arrays fanned
   * out into one row per attendee with a composite id (`sess-3:enr-12`) that
   * referred to nothing. A booking is already per-pet, so there is one row per
   * booking now and `rawId` is the booking's own ref, which is what the write
   * path takes.
   *
   * `groupNote` is gone with the fixture: "Class size: 6" was a count of an
   * `attendees` array, and no table holds a class yet. `resourceLabel` is the
   * booking's service variant rather than a class name, for the same reason.
   */
  const trainingBookings = useMemo<UnifiedBooking[]>(
    () =>
      (trainingDay?.attendees ?? []).map((a) => {
        const status: UnifiedStatus =
          a.status === "checked-out"
            ? "checked-out"
            : a.status === "checked-in"
              ? "checked-in"
              : "scheduled";
        return {
          id: `training:${a.id}`,
          rawId: a.id,
          source: "training",
          serviceKey: "training",
          serviceLabel: "Training",
          serviceColor: "#f59e0b",
          serviceIcon: "GraduationCap",
          petId: a.petId,
          petName: a.petName,
          petBreed: a.petBreed,
          ownerId: a.ownerId,
          ownerName: a.ownerName,
          ownerPhone: a.ownerPhone,
          status,
          scheduledStart: a.scheduledStart,
          actualStart: a.checkedInAt,
          scheduledEnd: a.scheduledEnd,
          actualEnd: a.checkedOutAt,
          isGoingHomeToday: status === "checked-in",
          ...(a.sessionType ? { resourceLabel: a.sessionType } : {}),
          ...(a.trainerName ? { staffLabel: a.trainerName } : {}),
          notes: a.notes,
        };
      }),
    [trainingDay],
  );

  const bookings = useMemo<UnifiedBooking[]>(() => {
    const list: UnifiedBooking[] = [];
    for (const b of boardingState) list.push(normalizeBoarding(b));
    for (const d of daycareState) list.push(normalizeDaycare(d));
    for (const g of groomingState) list.push(normalizeGrooming(g));
    for (const t of trainingBookings) list.push(t);
    for (const c of customState) {
      const mod = moduleMap.get(c.moduleId);
      list.push(normalizeCustom(c, mod));
    }
    // THE LOCATION FILTER APPLIES TO FIXTURE ROWS ONLY, and that is a fix.
    //
    // `deriveLocationId` is `trailingNumber % 3` — a fixture-era stand-in for a
    // location the mock data never carried. Applied to real rows it would hide
    // two thirds of a facility's actual bookings, chosen by booking reference,
    // the moment somebody picked a location from the selector. The rows that
    // come from Postgres are already scoped by `facility_id`; they have no
    // location to derive and must not be guessed at.
    if (!isHQView && currentLocationId) {
      return list.filter(
        (b) =>
          b.source === "boarding" ||
          b.source === "daycare" ||
          b.source === "grooming" ||
          deriveLocationId(b.rawId) === currentLocationId,
      );
    }
    return list;
  }, [
    boardingState,
    daycareState,
    groomingState,
    trainingBookings,
    customState,
    moduleMap,
    currentLocationId,
    isHQView,
  ]);

  const counts = useMemo(() => {
    let currentGuests = 0;
    let todaysArrivals = 0;
    let goingHomeToday = 0;
    let checkedOutToday = 0;
    const byService: Record<string, number> = {};
    for (const b of bookings) {
      if (b.status === "checked-in") currentGuests++;
      if (b.status === "scheduled") todaysArrivals++;
      if (b.isGoingHomeToday) goingHomeToday++;
      if (b.status === "checked-out") checkedOutToday++;
      if (b.status === "scheduled" || b.status === "checked-in") {
        byService[b.serviceKey] = (byService[b.serviceKey] ?? 0) + 1;
      }
    }
    return {
      currentGuests,
      todaysArrivals,
      goingHomeToday,
      checkedOutToday,
      expectedToday: currentGuests + todaysArrivals,
      byService,
    };
  }, [bookings]);

  // ── The writes ───────────────────────────────────────────────────────────
  //
  // Every one of these used to be a `setState` followed by an UNCONDITIONAL
  // success toast. The toast is in `onSuccess` now, and there is an `onError`,
  // because "Checked In" over a request that was refused is the failure mode
  // this whole run of work keeps finding.
  const boardingCheckIn = useBoardingCheckIn();
  const boardingUpdate = useBoardingStayUpdate();
  const boardingRevert = useBoardingRevert();
  const daycareCheckIn = useDaycareCheckIn();
  const daycareUpdate = useDaycareVisitUpdate();
  const daycareRevert = useDaycareRevert();
  const setGroomingStatus = useSetGroomingAppointmentStatus();
  const trainingCheckIn = useTrainingCheckIn();
  const trainingUpdate = useTrainingVisitUpdate();
  const trainingRevert = useTrainingRevert();
  const markNoShow = useMarkBookingNoShow();

  const updateStatus = useCallback(
    (
      bookingId: string,
      next: UnifiedStatus,
      options?: {
        timestamp?: string;
        noShow?: boolean;
        earlyCheckout?: EarlyCheckoutAdjustment;
      },
    ) => {
      const target = bookings.find((b) => b.id === bookingId);
      if (!target) return;
      const now = options?.timestamp ?? new Date().toISOString();
      const isNoShow = options?.noShow === true;
      const earlyCheckout = options?.earlyCheckout;

      const verb = isNoShow
        ? "Marked No-Show"
        : next === "checked-in"
          ? "Checked In"
          : next === "checked-out"
            ? earlyCheckout && earlyCheckout.unusedNights > 0
              ? "Early Checkout"
              : "Checked Out"
            : "Reset to Scheduled";

      let description = target.serviceLabel;
      if (earlyCheckout && earlyCheckout.unusedNights > 0) {
        const parts: string[] = [
          `${earlyCheckout.unusedNights} night${earlyCheckout.unusedNights > 1 ? "s" : ""} unused`,
        ];
        if (earlyCheckout.refundAmount > 0)
          parts.push(`refund $${earlyCheckout.refundAmount.toFixed(2)}`);
        if (earlyCheckout.creditAmount > 0)
          parts.push(`credit $${earlyCheckout.creditAmount.toFixed(2)}`);
        if (earlyCheckout.feeAmount > 0)
          parts.push(`fee $${earlyCheckout.feeAmount.toFixed(2)}`);
        // "to action", not a past tense. NOTHING APPLIES THESE. The old code
        // wrote the adjustment onto a local fixture object, so the money was
        // never moved then either — but the toast read as though it had been.
        description = `${target.serviceLabel} · ${parts.join(" · ")} to action`;
      }

      const succeeded = () =>
        toast.success(`${target.petName} — ${verb}`, { description });
      const failed = (error: Error) =>
        toast.error(`${target.petName} — not ${verb.toLowerCase()}`, {
          description: error.message,
        });
      const handlers = { onSuccess: succeeded, onError: failed };

      // A no-show is a booking transition, not a departure. Sending `check_out`
      // for one asks the database to record a guest leaving who never arrived,
      // and both boarding and daycare refuse it — correctly, and uselessly.
      if (
        isNoShow &&
        target.source !== "training" &&
        target.source !== "custom"
      ) {
        if (target.source === "grooming") {
          setGroomingStatus.mutate(
            { id: target.rawId, status: "no-show" },
            handlers,
          );
        } else {
          markNoShow.mutate(Number(target.rawId), handlers);
        }
        return;
      }

      switch (target.source) {
        case "boarding": {
          const ref = Number(target.rawId);
          if (next === "checked-in") boardingCheckIn.mutate(ref, handlers);
          else if (next === "checked-out")
            boardingUpdate.mutate(
              { bookingRef: ref, checkOut: true },
              handlers,
            );
          else boardingRevert.mutate(ref, handlers);
          break;
        }
        case "daycare": {
          const ref = Number(target.rawId);
          if (next === "checked-in")
            daycareCheckIn.mutate({ bookingRef: ref }, handlers);
          else if (next === "checked-out")
            daycareUpdate.mutate({ bookingRef: ref, checkOut: true }, handlers);
          else daycareRevert.mutate(ref, handlers);
          break;
        }
        case "grooming":
          setGroomingStatus.mutate(
            {
              id: target.rawId,
              status:
                next === "checked-in"
                  ? "in-progress"
                  : next === "checked-out"
                    ? "completed"
                    : "scheduled",
            },
            handlers,
          );
          break;

        case "training": {
          const ref = Number(target.rawId);
          if (next === "checked-in")
            trainingCheckIn.mutate({ bookingRef: ref }, handlers);
          else if (next === "checked-out")
            trainingUpdate.mutate(
              { bookingRef: ref, checkOut: true },
              handlers,
            );
          else trainingRevert.mutate(ref, handlers);
          break;
        }

        // ── Fixture-backed from here down ────────────────────────────────
        //
        // No table, no request. The state change is local and dies with the
        // tab, and the toast SAYS SO rather than claiming a record that does
        // not exist.
        case "custom":
          setCustomState((prev) =>
            prev.map((c) =>
              c.id === target.rawId
                ? {
                    ...c,
                    status:
                      next === "checked-in"
                        ? "checked-in"
                        : next === "checked-out"
                          ? "checked-out"
                          : "scheduled",
                    checkInTime: next === "checked-in" ? now : c.checkInTime,
                    checkOutTime: next === "checked-out" ? now : c.checkOutTime,
                  }
                : c,
            ),
          );
          toast.success(`${target.petName} — ${verb}`, {
            description: `${target.serviceLabel} · not recorded yet (no custom-service table)`,
          });
          break;
      }
    },
    [
      bookings,
      boardingCheckIn,
      boardingUpdate,
      boardingRevert,
      daycareCheckIn,
      daycareUpdate,
      daycareRevert,
      setGroomingStatus,
      trainingCheckIn,
      trainingUpdate,
      trainingRevert,
      markNoShow,
    ],
  );

  const value = useMemo<UnifiedBookingsContextValue>(
    () => ({ bookings, services, counts, updateStatus }),
    [bookings, services, counts, updateStatus],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUnifiedBookings(): UnifiedBookingsContextValue {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error(
      "useUnifiedBookings must be used inside <UnifiedBookingsProvider>",
    );
  return ctx;
}
