"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { boardingGuests, type BoardingGuest } from "@/data/boarding";
import { daycareCheckIns, type DaycareCheckIn } from "@/data/daycare";
import { groomingAppointments } from "@/data/grooming";
import { trainingSessions, enrollments } from "@/data/training";
import {
  customServiceCheckIns,
  type CustomServiceCheckIn,
} from "@/data/custom-service-checkins";
import { useCustomServices } from "@/hooks/use-custom-services";
import {
  COLOR_HEX_MAP,
  getCategoryMeta,
} from "@/data/custom-services";
import type { CustomServiceModule } from "@/types/facility";

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
  totalNights?: number;
  groupNote?: string;
}

export interface ServiceMeta {
  key: string;
  label: string;
  color: string;
  icon: string;
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
  { key: "training", label: "Training", color: "#f59e0b", icon: "GraduationCap" },
];

function endOfTodayMs(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function normalizeBoarding(g: BoardingGuest): UnifiedBooking {
  const status: UnifiedStatus =
    g.status === "checked-out" || g.status === "cancelled"
      ? "checked-out"
      : g.status === "checked-in"
        ? "checked-in"
        : "scheduled";
  const scheduledEndMs = new Date(g.checkOutDate).getTime();
  return {
    id: `boarding:${g.id}`,
    rawId: g.id,
    source: "boarding",
    serviceKey: "boarding",
    serviceLabel: "Boarding",
    serviceColor: "#a855f7",
    serviceIcon: "Bed",
    petId: g.petId,
    petName: g.petName,
    petBreed: g.petBreed,
    ownerId: g.ownerId,
    ownerName: g.ownerName,
    ownerPhone: g.ownerPhone,
    status,
    scheduledStart: g.checkInDate,
    actualStart: g.actualCheckIn ?? null,
    scheduledEnd: g.checkOutDate,
    actualEnd: g.actualCheckOut ?? null,
    isGoingHomeToday:
      status === "checked-in" && scheduledEndMs <= endOfTodayMs(),
    resourceLabel: g.kennelName,
    notes: g.notes,
    price: g.totalPrice,
    totalNights: g.totalNights,
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

  const [boardingState, setBoardingState] =
    useState<BoardingGuest[]>(boardingGuests);
  const [daycareState, setDaycareState] =
    useState<DaycareCheckIn[]>(daycareCheckIns);
  const [groomingState, setGroomingState] = useState(
    groomingAppointments.map((a) => ({
      ...a,
    })),
  );
  const [trainingState, setTrainingState] = useState(trainingSessions);
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
      });
    }
    return out;
  }, [customState, moduleMap]);

  const services: ServiceMeta[] = useMemo(
    () => [...BUILTIN_SERVICES, ...customServiceMetas],
    [customServiceMetas],
  );

  const trainingBookings = useMemo(() => {
    const enrollMap = new Map(enrollments.map((e) => [e.id, e]));
    const out: UnifiedBooking[] = [];
    for (const session of trainingState) {
      const status: UnifiedStatus =
        session.status === "completed"
          ? "checked-out"
          : session.status === "in-progress"
            ? "checked-in"
            : "scheduled";
      const scheduledStart = `${session.date}T${session.startTime}:00`;
      const scheduledEnd = `${session.date}T${session.endTime}:00`;
      for (const aId of session.attendees ?? []) {
        const e = enrollMap.get(aId);
        if (!e) continue;
        out.push({
          id: `training:${session.id}:${aId}`,
          rawId: `${session.id}:${aId}`,
          source: "training",
          serviceKey: "training",
          serviceLabel: "Training",
          serviceColor: "#f59e0b",
          serviceIcon: "GraduationCap",
          petId: e.petId,
          petName: e.petName,
          petBreed: e.petBreed,
          ownerId: e.ownerId,
          ownerName: e.ownerName,
          ownerPhone: e.ownerPhone,
          status,
          scheduledStart,
          actualStart: status !== "scheduled" ? scheduledStart : null,
          scheduledEnd,
          actualEnd: status === "checked-out" ? scheduledEnd : null,
          isGoingHomeToday: status === "checked-in",
          resourceLabel: session.className,
          staffLabel: session.trainerName,
          groupNote: `Class size: ${session.attendees.length}`,
        });
      }
    }
    return out;
  }, [trainingState]);

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
    return list;
  }, [
    boardingState,
    daycareState,
    groomingState,
    trainingBookings,
    customState,
    moduleMap,
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

      switch (target.source) {
        case "boarding":
          setBoardingState((prev) =>
            prev.map((g) =>
              g.id === target.rawId
                ? {
                    ...g,
                    status: next,
                    actualCheckIn:
                      next === "checked-in" ? now : g.actualCheckIn,
                    actualCheckOut:
                      next === "checked-out" ? now : g.actualCheckOut,
                    ...(next === "checked-out" && earlyCheckout
                      ? { earlyCheckoutAdjustment: earlyCheckout }
                      : {}),
                  }
                : g,
            ),
          );
          break;
        case "daycare":
          setDaycareState((prev) =>
            prev.map((d) =>
              d.id === target.rawId
                ? {
                    ...d,
                    status: next,
                    checkInTime:
                      next === "checked-in" ? now : d.checkInTime,
                    checkOutTime:
                      next === "checked-out" ? now : d.checkOutTime,
                  }
                : d,
            ),
          );
          break;
        case "grooming":
          setGroomingState((prev) =>
            prev.map((g) =>
              g.id === target.rawId
                ? {
                    ...g,
                    status:
                      next === "checked-in"
                        ? "in-progress"
                        : next === "checked-out"
                          ? "completed"
                          : "scheduled",
                    checkInTime:
                      next === "checked-in" ? now : g.checkInTime,
                    checkOutTime:
                      next === "checked-out" ? now : g.checkOutTime,
                  }
                : g,
            ),
          );
          break;
        case "training": {
          const [sessionId] = target.rawId.split(":");
          setTrainingState((prev) =>
            prev.map((s) =>
              s.id === sessionId
                ? {
                    ...s,
                    status:
                      next === "checked-in"
                        ? "in-progress"
                        : next === "checked-out"
                          ? "completed"
                          : "scheduled",
                  }
                : s,
            ),
          );
          break;
        }
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
                    checkInTime:
                      next === "checked-in" ? now : c.checkInTime,
                    checkOutTime:
                      next === "checked-out" ? now : c.checkOutTime,
                  }
                : c,
            ),
          );
          break;
      }

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
        description = `${target.serviceLabel} · ${parts.join(" · ")}`;
      }
      toast.success(`${target.petName} — ${verb}`, { description });
    },
    [bookings],
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
