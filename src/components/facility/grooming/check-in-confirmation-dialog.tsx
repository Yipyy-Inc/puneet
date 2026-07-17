"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  LogIn,
  MapPin,
  Scissors,
  ClipboardEdit,
  Plus,
  Minus,
  AlertTriangle,
  PawPrint,
  Camera,
  X,
  Clock,
  UserX,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useGroomingStations } from "@/hooks/use-grooming-stations";
import { isStationEligibleForPetSize } from "@/components/rooms/GroomingStationsClient";
import { groomingAddOnsList } from "@/data/grooming-pricing-rules";
import { groomingPackages } from "@/data/grooming";
import type {
  ArrivalBehavior,
  ArrivalCoatCondition,
  ArrivalHealthFlag,
  GroomingAppointment,
} from "@/types/grooming";
import type {
  GroomingStation,
  GroomingStationPetSize,
  GroomingStationType,
} from "@/types/rooms";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const STATION_STATUS_LABEL: Record<string, string> = {
  available: "Available",
  "in-use": "In use",
  "needs-cleaning": "Needs cleaning",
};

const SIZE_ORDER: GroomingStationPetSize[] = [
  "small",
  "medium",
  "large",
  "giant",
];

const STATION_TYPE_LABEL: Record<GroomingStationType, string> = {
  table: "table",
  tub: "tub",
  cage_dryer: "cage dryer",
  stand_dryer: "stand dryer",
};

/** Human label for a station's size capacity — "Large/Giant", or "Any size"
 *  for a multi-purpose station with no size restriction. */
function stationSizesLabel(s: GroomingStation): string {
  if (!s.allowedPetSizes || s.allowedPetSizes.length === 0) return "Any size";
  return s.allowedPetSizes
    .map((z) => z.charAt(0).toUpperCase() + z.slice(1))
    .join("/");
}

/**
 * Best station to auto-assign at check-in: the first Available station sized
 * for the pet, preferring an exact size match then the next size up. Only
 * stations whose live status is "available" are considered — in-use /
 * needs-cleaning / out-of-service are skipped. Returns null when every
 * size-eligible station is currently busy (the Table 18 "assign manually"
 * case). Fit distance = how much larger than the pet the station's largest
 * allowed size is (0 = exact); multi-purpose "any size" stations count as
 * giant-capacity so a dedicated table wins over a general-purpose one.
 */
function pickBestStation(
  stations: GroomingStation[],
  petSize: GroomingStationPetSize,
): GroomingStation | null {
  const petIdx = SIZE_ORDER.indexOf(petSize);
  const candidates = stations.filter(
    (s) =>
      s.active &&
      (s.status ?? "available") === "available" &&
      isStationEligibleForPetSize(s, petSize),
  );
  if (candidates.length === 0) return null;
  const fitDistance = (s: GroomingStation): number => {
    const sizes = s.allowedPetSizes;
    const maxIdx =
      !sizes || sizes.length === 0
        ? SIZE_ORDER.length - 1
        : Math.max(...sizes.map((z) => SIZE_ORDER.indexOf(z)));
    return maxIdx - petIdx;
  };
  return [...candidates].sort((a, b) => {
    const da = fitDistance(a);
    const db = fitDistance(b);
    if (da !== db) return da - db;
    const wa = a.maxWeightLbs ?? Number.POSITIVE_INFINITY;
    const wb = b.maxWeightLbs ?? Number.POSITIVE_INFINITY;
    if (wa !== wb) return wa - wb;
    return a.name.localeCompare(b.name);
  })[0];
}

export interface CheckInConfirmation {
  stationId: string;
  stationName: string;
  /** Add-ons after the groomer's last-minute edits (canonical names). */
  addOns: string[];
  /** Anything the owner mentioned at drop-off, or the groomer noticed. */
  dropOffObservations: string;
  /** When the groomer sees significant matting, they can apply this
   *  surcharge on the spot. Amount is 0 when not applied. */
  mattedSurcharge: number;
  /** Quick-tap arrival flags. All optional — the groomer can skip the
   *  Condition step entirely if nothing stands out. Persisted on
   *  `apt.intake` so the session panel and Report Card see them. */
  arrivalCoatCondition?: ArrivalCoatCondition;
  arrivalBehavior?: ArrivalBehavior;
  arrivalHealthFlags?: ArrivalHealthFlag[];
  /** 1–3 pre-groom photos captured at check-in. Liability protection — the
   *  photo proves the condition the pet arrived in. Stored as object URLs in
   *  the prototype; a real backend would upload these to durable storage and
   *  swap in the hosted URLs. */
  beforePhotos: string[];
  /** HH:MM (24h). Computed at check-in from now + service duration + add-on
   *  durations; the groomer can nudge it ±5 min in the dialog before
   *  confirming. Surfaced to the owner in their customer portal. */
  estimatedReadyTime: string;
  /** HH:MM (24h) actual check-in time — editable, pre-filled with now.
   *  Persisted as the appointment's `checkInTime` by {@link applyCheckInResult}. */
  checkInTime: string;
  /** True when staff flagged the pet as a no-show instead of checking in. The
   *  caller flips the appointment to `no-show` and skips the check-in side
   *  effects (no station assignment, no session start). */
  markNoShow: boolean;
}

const MAX_BEFORE_PHOTOS = 3;

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function addMin(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.max(0, Math.min(24 * 60 - 1, h * 60 + m + minutes));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function diffMin(later: string, earlier: string): number {
  const [lh, lm] = later.split(":").map(Number);
  const [eh, em] = earlier.split(":").map(Number);
  return lh * 60 + lm - (eh * 60 + em);
}

const COAT_OPTIONS: { value: ArrivalCoatCondition; label: string }[] = [
  { value: "clean", label: "Clean" },
  { value: "slightly-matted", label: "Slightly matted" },
  { value: "heavily-matted", label: "Heavily matted" },
  { value: "flea-tick", label: "Flea/tick found" },
];
const BEHAVIOR_OPTIONS: { value: ArrivalBehavior; label: string }[] = [
  { value: "calm", label: "Calm" },
  { value: "anxious", label: "Anxious" },
  { value: "aggressive", label: "Aggressive" },
  { value: "better-than-usual", label: "Better than usual" },
];
const HEALTH_OPTIONS: { value: ArrivalHealthFlag; label: string }[] = [
  { value: "none", label: "None" },
  { value: "skin-irritation", label: "Skin irritation visible" },
  { value: "injury", label: "Injury or wound" },
  { value: "other", label: "Other" },
];

interface CheckInConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apt: GroomingAppointment | null;
  onConfirm: (result: CheckInConfirmation) => void;
}

export function CheckInConfirmationDialog({
  open,
  onOpenChange,
  apt,
  onConfirm,
}: CheckInConfirmationDialogProps) {
  const { stations } = useGroomingStations();
  // Step 1 — staff must positively confirm "yes, this is the right pet"
  // before the rest of the dialog accepts input. Prevents the wrong-record
  // check-in mistake (especially when two same-breed dogs arrive together).
  const [petConfirmed, setPetConfirmed] = useState(false);
  const [stationId, setStationId] = useState<string>("");
  // When false, Section 6 shows the auto-assigned station as a confirmed line;
  // set true by "Change" (or when nothing is available) to reveal the manual
  // station picker.
  const [showStationPicker, setShowStationPicker] = useState(false);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [observations, setObservations] = useState<string>("");
  const [mattedSurchargeEnabled, setMattedSurchargeEnabled] = useState(false);
  const [mattedSurchargeAmount, setMattedSurchargeAmount] = useState<number>(0);
  // Quick-tap arrival flags — coat + behavior are single-select; health is
  // multi-select with "none" acting as a clear option.
  const [coatCondition, setCoatCondition] = useState<
    ArrivalCoatCondition | undefined
  >(undefined);
  const [behaviorAtArrival, setBehaviorAtArrival] = useState<
    ArrivalBehavior | undefined
  >(undefined);
  const [healthFlags, setHealthFlags] = useState<ArrivalHealthFlag[]>([]);
  // Pre-groom photos — captured object URLs so previews work locally. Revoked
  // when the photo is removed or the dialog closes to avoid blob leaks.
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Estimated ready time — auto-computed from check-in time + service +
  // add-ons; staff can adjust before confirming.
  const [estimatedReadyTime, setEstimatedReadyTime] = useState<string>("");
  // Captured at dialog open so the displayed "Checked in at" anchor doesn't
  // drift if staff dawdles on Step 4 picking add-ons.
  const [checkInAnchor, setCheckInAnchor] = useState<string>("");
  // True once staff has nudged the time; suppresses the auto-calc effect so
  // their manual value sticks even if add-ons change afterwards.
  const [readyTimeEdited, setReadyTimeEdited] = useState(false);
  // "Mark as No-Show" — when checked, confirm flips the appointment to
  // no-show instead of checking it in (spec Table 17).
  const [markNoShow, setMarkNoShow] = useState(false);
  // Current local minutes-since-midnight, driving the late-arrival indicator
  // (spec Table 18). Ticks while the dialog is open; null when closed.
  const [nowMin, setNowMin] = useState<number | null>(null);

  // Look up this appointment's service config to get the default matted
  // surcharge amount the facility has configured.
  const packageConfig = useMemo(
    () => groomingPackages.find((p) => p.id === apt?.packageId),
    [apt?.packageId],
  );

  // Seed local state from the appointment each time the dialog opens.
  useEffect(() => {
    if (!open) {
      // Revoke any blob URLs from the previous run so they don't leak.
      setBeforePhotos((prev) => {
        for (const url of prev) {
          if (url.startsWith("blob:")) URL.revokeObjectURL(url);
        }
        return [];
      });
      return;
    }
    setPetConfirmed(false);
    setMarkNoShow(false);
    setSelectedAddOns(apt?.addOns ?? []);
    setObservations("");
    setMattedSurchargeEnabled(false);
    // Pre-fill default amount from the service config so the groomer just
    // hits confirm instead of typing.
    const defaultAmt = packageConfig?.mattedSurchargeDefault ?? 25;
    setMattedSurchargeAmount(defaultAmt);
    setCoatCondition(undefined);
    setBehaviorAtArrival(undefined);
    setHealthFlags([]);
    setBeforePhotos([]);
    setCheckInAnchor(nowHHMM());
    setReadyTimeEdited(false);
    setEstimatedReadyTime("");
  }, [open, apt?.id, apt?.addOns, packageConfig?.mattedSurchargeDefault]);

  // Auto-recompute the estimated ready time whenever the add-on selection
  // changes — until staff manually nudges it, at which point we stop
  // overwriting their value.
  useEffect(() => {
    if (!open || !checkInAnchor || readyTimeEdited) return;
    const serviceMin = packageConfig?.duration ?? 60;
    const addOnMin = selectedAddOns.reduce((sum, name) => {
      const addOn = groomingAddOnsList.find((a) => a.name === name);
      return sum + (addOn?.duration ?? 0);
    }, 0);
    setEstimatedReadyTime(addMin(checkInAnchor, serviceMin + addOnMin));
  }, [
    open,
    checkInAnchor,
    readyTimeEdited,
    packageConfig?.duration,
    selectedAddOns,
  ]);

  // Auto-assign the best available station the moment the dialog opens, so the
  // receptionist sees "Assigned to Table 3" instead of hunting a list (spec
  // Table 8). When every size-eligible station is busy, leave it unassigned
  // and open the manual picker with the Table 18 warning. Intentionally keyed
  // to the open/appointment transition only — we don't want a later station
  // status change to silently override a staffer's manual pick.
  useEffect(() => {
    if (!open || !apt) return;
    const best = pickBestStation(
      stations,
      apt.petSize as GroomingStationPetSize,
    );
    setStationId(best?.id ?? "");
    setShowStationPicker(!best);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, apt?.id]);

  // Tick current time while the dialog is open so the late-arrival indicator
  // stays live. Only runs after the dialog opens (client-side), so no
  // hydration mismatch.
  useEffect(() => {
    if (!open) {
      setNowMin(null);
      return;
    }
    const tick = () => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [open]);

  function handlePhotoSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBeforePhotos((prev) => {
      const next = [...prev];
      for (
        let i = 0;
        i < files.length && next.length < MAX_BEFORE_PHOTOS;
        i++
      ) {
        next.push(URL.createObjectURL(files[i]));
      }
      return next;
    });
  }

  function handlePhotoRemove(index: number) {
    setBeforePhotos((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed && removed.startsWith("blob:")) URL.revokeObjectURL(removed);
      return next;
    });
  }

  const eligibleStations = useMemo(() => {
    if (!apt) return [];
    return stations.filter(
      (s) =>
        s.active &&
        (s.status ?? "available") !== "out-of-service" &&
        isStationEligibleForPetSize(s, apt.petSize as GroomingStationPetSize),
    );
  }, [stations, apt]);

  if (!apt) return null;

  const inactiveAddOns = groomingAddOnsList.filter(
    (a) => a.isActive && !selectedAddOns.includes(a.name),
  );

  // Size-eligible stations that are actually free right now. Empty (while
  // eligibleStations is not) => every fitting station is busy: the Table 18
  // "assign manually" case.
  const availableEligible = eligibleStations.filter(
    (s) => (s.status ?? "available") === "available",
  );
  // Distinct station types among the eligible set, for the warning copy
  // ("all table stations are in use…").
  const eligibleTypeLabel = Array.from(
    new Set(eligibleStations.map((s) => s.type)),
  )
    .map((t) => STATION_TYPE_LABEL[t] ?? t)
    .join("/");
  const selectedStation = eligibleStations.find((s) => s.id === stationId);

  // Late-arrival indicator (spec Table 18) — fires once the client is more
  // than 10 minutes past the scheduled start.
  const scheduledStartMin = (() => {
    const [h, m] = apt.startTime.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  })();
  const lateMinutes =
    nowMin !== null && nowMin - scheduledStartMin > 10
      ? nowMin - scheduledStartMin
      : 0;
  const hasExpressCheckin = !!apt.expressCheckinSubmission;

  function toggleAddOn(name: string, on: boolean) {
    setSelectedAddOns((prev) =>
      on ? [...prev, name] : prev.filter((x) => x !== name),
    );
  }

  function handleConfirm() {
    // No-show path — the pet never arrived, so skip station + photos; the
    // caller flips the appointment to no-show.
    if (markNoShow) {
      onConfirm({
        stationId: "",
        stationName: "",
        addOns: selectedAddOns,
        dropOffObservations: observations.trim(),
        mattedSurcharge: 0,
        arrivalCoatCondition: coatCondition,
        arrivalBehavior: behaviorAtArrival,
        arrivalHealthFlags: healthFlags.length > 0 ? healthFlags : undefined,
        beforePhotos: [],
        estimatedReadyTime: estimatedReadyTime,
        checkInTime: checkInAnchor,
        markNoShow: true,
      });
      return;
    }
    const station = eligibleStations.find((s) => s.id === stationId);
    if (!station) return;
    onConfirm({
      stationId: station.id,
      stationName: station.name,
      addOns: selectedAddOns,
      dropOffObservations: observations.trim(),
      mattedSurcharge: mattedSurchargeEnabled ? mattedSurchargeAmount : 0,
      arrivalCoatCondition: coatCondition,
      arrivalBehavior: behaviorAtArrival,
      arrivalHealthFlags: healthFlags.length > 0 ? healthFlags : undefined,
      beforePhotos: beforePhotos,
      estimatedReadyTime: estimatedReadyTime,
      checkInTime: checkInAnchor,
      markNoShow: false,
    });
  }

  // Tapping "None" clears any other health flags; tapping any other flag
  // implicitly removes "none". Lets staff express "no observations" or stack
  // multiple positive observations without contradiction.
  function toggleHealthFlag(value: ArrivalHealthFlag) {
    setHealthFlags((prev) => {
      if (value === "none") return prev.includes("none") ? [] : ["none"];
      const without = prev.filter((v) => v !== "none");
      return without.includes(value)
        ? without.filter((v) => v !== value)
        : [...without, value];
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <LogIn className="size-4 text-emerald-600" />
            Check In — {apt.petName}
          </DialogTitle>
          <p className="text-muted-foreground text-xs">
            Confirm the station, service, and any drop-off observations. The
            appointment moves to <strong>In Progress</strong> after confirming.
          </p>
        </DialogHeader>

        {/* Appointment summary + pre-visit status + check-in time + no-show
            (spec Tables 17 & 18). */}
        <div className="bg-muted/20 space-y-2.5 rounded-xl border px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                Appointment
              </p>
              <p className="text-sm font-bold">
                #{apt.id}
                <span className="text-muted-foreground ml-1.5 font-normal">
                  · {apt.packageName}
                </span>
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                Scheduled
              </p>
              <p className="flex items-center justify-end gap-2 text-sm font-bold tabular-nums">
                {apt.startTime}
                {lateMinutes > 0 && (
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                    Late: {lateMinutes} minutes
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Pre-visit (Express Check-In) form status */}
          {hasExpressCheckin ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
              <CheckCircle2 className="size-3.5 shrink-0" />
              Express Check-In complete — form reviewed
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="size-3.5 shrink-0" />
              Express Check-In not submitted — collect drop-off details verbally
            </div>
          )}

          {/* Editable check-in time + Mark as No-Show */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <label
                htmlFor="checkin-time"
                className="text-muted-foreground text-xs font-medium"
              >
                Check-in Time
              </label>
              <input
                id="checkin-time"
                type="time"
                value={checkInAnchor}
                onChange={(e) => setCheckInAnchor(e.target.value)}
                className="bg-background rounded-md border px-2 py-1 text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none"
              />
            </div>
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs font-medium">
              <Checkbox
                checked={markNoShow}
                onCheckedChange={(c) => setMarkNoShow(c === true)}
              />
              Mark as No-Show
            </label>
          </div>
        </div>

        {/* 1 · Confirm the pet — single-tap identity gate so staff don't
              accidentally check in the wrong animal when two same-breed
              dogs arrive at the same time. */}
        <Section
          step={1}
          icon={PawPrint}
          title="Confirm the pet"
          subtitle="One tap to confirm this is the right animal before we start."
        >
          <div
            role="button"
            tabIndex={0}
            onClick={() => setPetConfirmed(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setPetConfirmed(true);
            }}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors select-none",
              petConfirmed
                ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                : "hover:bg-muted/40 border-dashed",
            )}
          >
            <div className="ring-background relative size-14 shrink-0 overflow-hidden rounded-full ring-2">
              {apt.petPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={apt.petPhotoUrl}
                  alt={apt.petName}
                  width={56}
                  height={56}
                  className="size-full object-cover"
                />
              ) : (
                <div className="bg-muted flex size-full items-center justify-center">
                  <PawPrint className="text-muted-foreground size-6" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold">{apt.petName}</p>
              <p className="text-muted-foreground truncate text-xs">
                {apt.petBreed}
                {apt.petSize ? ` · ${apt.petSize}` : ""}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                Owner: <span className="font-medium">{apt.ownerName}</span>
              </p>
            </div>
            <div
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                petConfirmed
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
              )}
            >
              <CheckCircle2 className="size-3.5" />
              {petConfirmed ? "Confirmed" : `Yes — it's ${apt.petName}`}
            </div>
          </div>
        </Section>

        <Separator />

        {/* 2 · Condition at arrival — quick-tap flags so any signal that
              matters for the session is on the record before the groomer
              starts work. All three rows optional; takes <15s when nothing
              stands out. */}
        <Section
          step={2}
          icon={ClipboardEdit}
          title="Condition at arrival"
          subtitle="Tap anything that applies. Skip if there's nothing to flag."
        >
          <div className="space-y-3">
            <div>
              <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                Coat condition
              </p>
              <div className="flex flex-wrap gap-1.5">
                {COAT_OPTIONS.map((o) => {
                  const active = coatCondition === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() =>
                        setCoatCondition(active ? undefined : o.value)
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        active
                          ? "border-emerald-500 bg-emerald-100 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-100"
                          : "hover:bg-muted/60",
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                Behavior today
              </p>
              <div className="flex flex-wrap gap-1.5">
                {BEHAVIOR_OPTIONS.map((o) => {
                  const active = behaviorAtArrival === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() =>
                        setBehaviorAtArrival(active ? undefined : o.value)
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        active
                          ? "border-emerald-500 bg-emerald-100 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-100"
                          : "hover:bg-muted/60",
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                Skin / health observations
              </p>
              <div className="flex flex-wrap gap-1.5">
                {HEALTH_OPTIONS.map((o) => {
                  const active = healthFlags.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggleHealthFlag(o.value)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        active
                          ? o.value === "none"
                            ? "border-slate-400 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            : "border-amber-500 bg-amber-100 text-amber-900 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-100"
                          : "hover:bg-muted/60",
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>

        <Separator />

        {/* 3 · Pre-groom photo — liability protection. Stored on the
              appointment intake and on the pet's photo history so the
              before-after comparison and any future dispute have evidence. */}
        <Section
          step={3}
          icon={Camera}
          title="Pre-groom photo"
          subtitle="Snap 1–3 quick shots of the coat before you start."
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            // capture="environment" opens the rear camera on mobile devices;
            // desktops fall back to the file picker, which is fine for staff
            // tablets in the salon.
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              handlePhotoSelect(e.target.files);
              // Reset so picking the same file twice in a row still fires
              // onChange (browsers skip the event when value is identical).
              e.target.value = "";
            }}
          />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: MAX_BEFORE_PHOTOS }).map((_, i) => {
              const url = beforePhotos[i];
              if (url) {
                return (
                  <div
                    key={i}
                    className="bg-muted relative aspect-square overflow-hidden rounded-lg border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Before-groom photo ${i + 1}`}
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handlePhotoRemove(i)}
                      title="Remove this photo"
                      className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white shadow-sm hover:bg-black/80"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                );
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-muted/30 text-muted-foreground hover:bg-muted/60 flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed"
                >
                  <Camera className="size-5" />
                  <span className="text-[10px] font-medium tracking-wide uppercase">
                    {beforePhotos.length === 0 ? "Take photo" : "Add"}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-muted-foreground mt-2 text-[10px]">
            {beforePhotos.length}/{MAX_BEFORE_PHOTOS} photos · saved to this
            appointment and {apt.petName}&rsquo;s profile for the before/after
            comparison.
          </p>
        </Section>

        <Separator />

        {/* 4 · Service + add-ons — confirms what's booked and lets the
              groomer add anything the owner verbally requested at drop-off.
              Newly-added items trigger an SMS confirming the change + the
              updated total. */}
        <Section
          step={4}
          icon={Scissors}
          title="Confirm add-ons"
          subtitle="Add anything the owner requested at drop-off. Owner gets an SMS for any add-on added now."
        >
          <div className="bg-muted/30 rounded-md border px-3 py-2 text-sm">
            <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
              Package
            </p>
            <p className="font-medium">{apt.packageName}</p>
          </div>
          <div className="mt-3 space-y-2">
            <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
              Add-ons
            </p>
            {selectedAddOns.length === 0 ? (
              <p className="text-muted-foreground text-xs italic">
                No add-ons selected.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedAddOns.map((name) => {
                  const isNew = !(apt.addOns ?? []).includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleAddOn(name, false)}
                      className={cn(
                        "group flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                        isNew
                          ? "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
                          : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
                      )}
                      title={
                        isNew
                          ? "Added at check-in — owner will be notified via SMS"
                          : "Booked at scheduling"
                      }
                    >
                      {name}
                      {isNew && (
                        <span className="rounded-sm bg-amber-500 px-1 text-[8px] font-bold tracking-wide text-white uppercase">
                          New
                        </span>
                      )}
                      <Minus className="size-3 opacity-60 group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>
            )}
            {inactiveAddOns.length > 0 && (
              <div className="mt-2">
                <p className="text-muted-foreground mb-1 text-[10px] tracking-wide uppercase">
                  Add another
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {inactiveAddOns.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAddOn(a.name, true)}
                      className="bg-background hover:bg-muted/60 flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                    >
                      <Plus className="size-3" />
                      {a.name}
                      <span className="text-muted-foreground">+${a.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        <Separator />

        {/* 5 · Estimated ready time — auto = check-in + service duration +
              sum of add-on durations. Staff can nudge ±5 min before confirm. */}
        <Section
          step={5}
          icon={Clock}
          title="Estimated ready time"
          subtitle={`Auto-calculated from check-in + service + add-ons. Owner will see this in their portal.`}
        >
          {(() => {
            const serviceMin = packageConfig?.duration ?? 60;
            const addOnMin = selectedAddOns.reduce((sum, name) => {
              const addOn = groomingAddOnsList.find((a) => a.name === name);
              return sum + (addOn?.duration ?? 0);
            }, 0);
            const autoTotal = serviceMin + addOnMin;
            const adjustment = estimatedReadyTime
              ? diffMin(estimatedReadyTime, addMin(checkInAnchor, autoTotal))
              : 0;
            return (
              <>
                <div className="flex items-center gap-3 rounded-lg border bg-emerald-50/50 px-3 py-2.5 dark:bg-emerald-950/20">
                  <button
                    type="button"
                    onClick={() => {
                      setReadyTimeEdited(true);
                      setEstimatedReadyTime((prev) =>
                        prev ? addMin(prev, -5) : prev,
                      );
                    }}
                    className="bg-background hover:bg-muted/60 flex size-7 items-center justify-center rounded-full border"
                    aria-label="Decrease by 5 minutes"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <input
                    type="time"
                    value={estimatedReadyTime}
                    onChange={(e) => {
                      setReadyTimeEdited(true);
                      setEstimatedReadyTime(e.target.value);
                    }}
                    className="bg-background flex-1 rounded-md border px-3 py-1.5 text-center text-base font-bold tabular-nums focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setReadyTimeEdited(true);
                      setEstimatedReadyTime((prev) =>
                        prev ? addMin(prev, 5) : prev,
                      );
                    }}
                    className="bg-background hover:bg-muted/60 flex size-7 items-center justify-center rounded-full border"
                    aria-label="Increase by 5 minutes"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <p className="text-muted-foreground mt-1.5 text-[10px]">
                  Checked in {checkInAnchor} · service {serviceMin} min
                  {addOnMin > 0 ? ` + add-ons ${addOnMin} min` : ""} = auto
                  total {autoTotal} min
                  {readyTimeEdited && adjustment !== 0 && (
                    <>
                      {" "}
                      ·{" "}
                      <span
                        className={cn(
                          "font-semibold",
                          adjustment > 0
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-emerald-700 dark:text-emerald-300",
                        )}
                      >
                        groomer {adjustment > 0 ? "+" : ""}
                        {adjustment} min
                      </span>
                    </>
                  )}
                  {readyTimeEdited && (
                    <>
                      {" · "}
                      <button
                        type="button"
                        onClick={() => {
                          setReadyTimeEdited(false);
                          setEstimatedReadyTime(
                            addMin(checkInAnchor, autoTotal),
                          );
                        }}
                        className="hover:text-foreground underline underline-offset-2"
                      >
                        Reset to auto
                      </button>
                    </>
                  )}
                </p>
              </>
            );
          })()}
        </Section>

        <Separator />

        {/* 6 · Station assignment — the system auto-assigns the best available
              station on open (spec Table 8); "Change" reveals the manual picker,
              which also appears with an amber warning when everything is busy
              (spec Table 18). */}
        <Section
          step={6}
          icon={MapPin}
          title="Station assignment"
          subtitle={`Auto-assigned to the best available station for this ${apt.petSize} pet — change if needed.`}
        >
          {eligibleStations.length === 0 ? (
            <p className="text-muted-foreground py-3 text-center text-xs">
              No stations are currently sized for a {apt.petSize} pet.
            </p>
          ) : selectedStation && !showStationPicker ? (
            /* Confirmed auto-assignment — one glance, with a Change affordance. */
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-2.5 dark:border-emerald-700 dark:bg-emerald-950/30">
                <div className="flex min-w-0 items-center gap-2.5">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold tracking-wider text-emerald-800 uppercase dark:text-emerald-300">
                      Assigned Station
                    </p>
                    <p className="truncate text-sm font-semibold">
                      {selectedStation.name}{" "}
                      <span className="text-muted-foreground font-normal">
                        ({stationSizesLabel(selectedStation)})
                      </span>
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 text-xs"
                  onClick={() => setShowStationPicker(true)}
                >
                  Change
                </Button>
              </div>
              <p className="text-muted-foreground text-[10px]">
                Best available station for a {apt.petSize} pet — tap Change to
                pick a different one.
              </p>
            </div>
          ) : (
            /* Manual picker — after "Change", or when nothing is available.
               Busy stations stay selectable here so staff can force an
               override (they know it's about to free up). */
            <div className="space-y-2">
              {availableEligible.length === 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <p>
                    No station available for {apt.petSize} — all{" "}
                    {eligibleTypeLabel} stations are in use or need cleaning.{" "}
                    <span className="font-semibold">Assign manually:</span>
                  </p>
                </div>
              )}
              <div className="grid gap-1.5 sm:grid-cols-2">
                {eligibleStations.map((s) => {
                  const status = s.status ?? "available";
                  const busy =
                    status === "in-use" || status === "needs-cleaning";
                  const isSelected = stationId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStationId(s.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                        isSelected
                          ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                          : "hover:bg-muted/40",
                        busy && !isSelected && "opacity-70",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <p
                          className={cn(
                            "text-[11px] capitalize",
                            busy
                              ? "text-amber-700 dark:text-amber-300"
                              : "text-muted-foreground",
                          )}
                        >
                          {STATION_STATUS_LABEL[status] ?? status}
                          {s.maxWeightLbs ? ` · max ${s.maxWeightLbs} lbs` : ""}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Section>

        <Separator />

        {/* 7 · Drop-off observations */}
        <Section
          step={7}
          icon={ClipboardEdit}
          title="Drop-off observations"
          subtitle="Anything the owner mentioned, or you noticed coming in?"
        >
          <Textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="e.g. Owner mentioned a sore paw — be gentle with the back-left foot. Coat is more matted than last visit."
            rows={3}
            className="text-sm"
          />
          {apt.intake?.behaviorNotes && (
            <Badge
              variant="outline"
              className="mt-2 text-[10px] font-normal"
              title="Behavior notes already on file for this pet"
            >
              On file: {apt.intake.behaviorNotes}
            </Badge>
          )}
        </Section>

        <Separator />

        {/* 8 · Matted surcharge */}
        <Section
          step={8}
          icon={AlertTriangle}
          title="Matted surcharge"
          subtitle="Apply if the coat requires significant dematting work. The owner will be notified."
        >
          {/* Toggle */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setMattedSurchargeEnabled((v) => !v)}
            onKeyDown={(e) =>
              e.key === "Enter" && setMattedSurchargeEnabled((v) => !v)
            }
            className={cn(
              "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition-colors select-none",
              mattedSurchargeEnabled
                ? "border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"
                : "hover:bg-muted/40",
            )}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {mattedSurchargeEnabled
                  ? "Matting fee applied"
                  : "Apply matting fee"}
              </p>
              <p className="text-muted-foreground mt-0.5 text-[10px]">
                {mattedSurchargeEnabled
                  ? "Owner will see this charge on the invoice and receive a notification."
                  : "Tap to add a matting surcharge to this appointment."}
              </p>
            </div>
            <div
              className={cn(
                "flex size-5 items-center justify-center rounded-full border-2 transition-colors",
                mattedSurchargeEnabled
                  ? "border-amber-500 bg-amber-500"
                  : "border-muted-foreground/40",
              )}
            >
              {mattedSurchargeEnabled && (
                <CheckCircle2 className="size-3.5 text-white" />
              )}
            </div>
          </div>

          {/* Amount input — only visible when enabled */}
          {mattedSurchargeEnabled && (
            <div className="mt-2.5 flex items-center gap-3">
              <div className="relative w-32">
                <span className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2 text-xs">
                  $
                </span>
                <Input
                  type="number"
                  min={0}
                  step={5}
                  value={mattedSurchargeAmount || ""}
                  placeholder="0"
                  onChange={(e) =>
                    setMattedSurchargeAmount(
                      Math.max(0, Number(e.target.value)),
                    )
                  }
                  className="h-8 pl-6 text-sm"
                />
              </div>
              <p className="text-muted-foreground text-[11px]">
                {mattedSurchargeAmount > 0
                  ? `$${mattedSurchargeAmount} will appear as a "Matting Fee" line on the invoice.`
                  : "Enter the surcharge amount above."}
              </p>
            </div>
          )}
        </Section>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!petConfirmed || (!markNoShow && !stationId)}
            className={cn(
              "text-white",
              markNoShow
                ? "bg-red-600 hover:bg-red-700"
                : "bg-emerald-600 hover:bg-emerald-700",
            )}
            onClick={handleConfirm}
          >
            {markNoShow ? (
              <>
                <UserX className="mr-1.5 size-4" />
                Mark No-Show
              </>
            ) : (
              <>
                <LogIn className="mr-1.5 size-4" />
                Confirm &amp; Start
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  step,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  step: number;
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-2">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
          {step}
        </span>
        <Icon className="text-muted-foreground size-4" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {subtitle && (
        <p className="text-muted-foreground mb-2 ml-8 text-xs">{subtitle}</p>
      )}
      <div className="ml-8">{children}</div>
    </div>
  );
}
