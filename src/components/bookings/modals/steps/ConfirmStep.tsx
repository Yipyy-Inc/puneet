import { useState } from "react";
import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import {
  formatDateLong,
  formatDateShort,
  formatMoney,
  formatPercent,
  formatTimeOfDay,
} from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import Image from "next/image";
import {
  PawPrint,
  CalendarDays,
  Clock,
  DoorOpen,
  Utensils,
  Pill,
  Sparkles,
  Mail,
  Smartphone,
  User,
  Users,
  CheckCircle2,
  Pencil,
  AlertTriangle,
  Moon,
  ClipboardCheck,
  Info,
  FileSignature,
  Pen,
  CheckCircle,
  Gift,
  MessageSquareText,
} from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/hooks/use-settings";
import { useRooms } from "@/hooks/use-rooms";
import type { ServiceModule } from "@/types/facility-staff";
import { useQuery } from "@tanstack/react-query";

import { useGroomingMenu } from "@/lib/api/grooming-catalogue";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { bookableLookup, type BookableAddOn } from "@/lib/add-ons/bookable";
import type { FeedingScheduleItem, MedicationItem } from "@/types/booking";
import {
  useBookingApproval,
  useFeedingInstructions,
  useMedicationInstructions,
} from "@/lib/api/facility-settings";
import { responseHoursFor } from "@/lib/settings/booking-approval";
import { describeFeeding } from "@/lib/feeding/describe";
import { describeMedication } from "@/lib/medications/describe";
import type { MedStay } from "@/lib/medications/schedule";
import { staffQueries } from "@/lib/api/staff";
import { AddOnStaffSelect } from "./AddOnStaffSelect";

import type { Pet } from "@/types/pet";
import { localToday } from "@/lib/vaccinations";
import type { Client } from "@/types/client";
import { SERVICE_CATEGORIES } from "../constants";
import { AgreementSigningDialog } from "@/components/shared/AgreementSigningDialog";
import { Textarea } from "@/components/ui/textarea";
import { useSignWaiver, type WaiverRow } from "@/lib/api/waivers";
import { useBookingWaivers } from "../use-booking-waivers";
import type { SignatureResult } from "@/components/shared/SignaturePad";
import { Button } from "@/components/ui/button";

interface ConfirmStepProps {
  selectedClient: Client | undefined;
  selectedPets: Pet[];
  selectedService: string;
  serviceType: string;
  startDate: string;
  endDate: string;
  checkInTime: string;
  checkOutTime: string;
  daycareSelectedDates: Date[];
  /** The day picker's own times, per day — what a daycare booking is made at. */
  daycareDateTimes?: Array<{
    date: string;
    checkInTime: string;
    checkOutTime: string;
  }>;
  boardingRangeStart: Date | null;
  boardingRangeEnd: Date | null;
  boardingDateTimes: Array<{
    date: string;
    checkInTime: string;
    checkOutTime: string;
  }>;
  roomAssignments: Array<{ petId: number; roomId: string }>;
  feedingSchedule: FeedingScheduleItem[];
  medications: MedicationItem[];
  /** The stay the Medications step counted its days in. */
  medicationStay?: MedStay;
  extraServices: Array<{
    serviceId: string;
    quantity: number;
    petId: number;
    /** Who an add-on that needs somebody is assigned to. */
    staffId?: string;
  }>;
  /**
   * Assigns an add-on line to a member of staff, or to nobody. Staff only —
   * a customer's booking leaves it for the facility to decide.
   */
  onAddOnStaffChange?: (
    serviceId: string,
    petId: number,
    staffId: string | null,
  ) => void;
  /**
   * The add-ons the booking was priced from (`usePricedAddOns`), so a line
   * here says the name and the price the total was built with.
   */
  addOnsCatalog: BookableAddOn[];
  calculatePrice: {
    basePrice: number;
    subtotal?: number;
    addOnsTotal?: number;
    taxRate?: number;
    taxAmount?: number;
    total: number;
    adjustments?: Array<{ id: string; label: string; amount: number }>;
    medicationFeeTotal?: number;
    feedingFeeTotal?: number;
    serviceFeeItems?: Array<{ label: string; amount: number }>;
    /** Per-pet pricing-rule trace for grooming bookings — surfaced under the
     *  service row so staff/customer can see why the number is what it is
     *  (size bucket, coat modifier, breed override, tier delta). */
    groomingPriceBreakdown?: Array<{ petName: string; lines: string[] }>;
  };
  notificationEmail: boolean;
  setNotificationEmail: (value: boolean) => void;
  notificationSMS: boolean;
  setNotificationSMS: (value: boolean) => void;
  /** What the owner asked for, saved on the booking as `special_requests`. */
  specialRequests: string;
  setSpecialRequests: (value: string) => void;
  /** A customer must sign what applies before asking; staff see what is
   *  outstanding and may capture it at the counter, but a phone booking is
   *  not refused over a waiver the client will sign at check-in. */
  isCustomerMode: boolean;
  /**
   * Set to the id of a client package when staff opts to redeem a session
   * at confirmation. Otherwise null. Honored on submit (the booking gets
   * marked as covered by the package).
   */
  redeemedPackageId: string | null;
  setRedeemedPackageId: (id: string | null) => void;
  /**
   * Id of the primary staff member assigned to this booking. Drives which
   * calendar column the appointment appears in (groomer column for grooming,
   * trainer column for training, etc.). Optional — unassigned bookings land
   * in the "Unassigned" column.
   */
  selectedStaffId: string | null;
  setSelectedStaffId: (id: string | null) => void;
  /** Grooming-only: true when the customer chose mobile (van) service. Drives
   *  the "Mobile" badge + the "Arrival window" time label. */
  isMobileGrooming?: boolean;
  /** Individual tax lines from the facility's tax config (for per-tax breakdown) */
  facilityTaxes?: Array<{ name: string; rate: number }>;
  /** Jump to a specific wizard step (index) + optional sub-step */
  onEditStep?: (stepIndex: number, subStep?: number) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtTime = formatTimeOfDay;

function fmtDateLong(d: Date | string, locale: AppLocale) {
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return formatDateLong(date, locale);
}

function nightsBetween(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

// ── Section header with optional Edit button ──────────────────────────────────

function SectionHeader({
  icon: Icon,
  label,
  onEdit,
}: {
  icon: React.ElementType;
  label: string;
  onEdit?: () => void;
}) {
  const t = useShellText("booking");
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Icon className="text-muted-foreground size-3.5" />
        <span className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
          {label}
        </span>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="text-muted-foreground hover:text-primary flex items-center gap-1 text-[10px] font-medium transition-colors"
        >
          <Pencil className="size-2.5" />
          {t("edit")}
        </button>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConfirmStep({
  selectedClient,
  selectedPets,
  selectedService,
  serviceType,
  startDate,
  endDate,
  checkInTime,
  checkOutTime,
  daycareSelectedDates,
  daycareDateTimes = [],
  boardingRangeStart,
  boardingRangeEnd,
  boardingDateTimes,
  roomAssignments,
  feedingSchedule,
  medications,
  medicationStay,
  extraServices,
  onAddOnStaffChange,
  addOnsCatalog,
  calculatePrice,
  notificationEmail,
  setNotificationEmail,
  notificationSMS,
  specialRequests,
  setSpecialRequests,
  isCustomerMode,
  redeemedPackageId,
  setRedeemedPackageId,
  selectedStaffId,
  setSelectedStaffId,
  isMobileGrooming,
  setNotificationSMS,
  facilityTaxes,
  onEditStep,
}: ConfirmStepProps) {
  // The FACILITY's evaluation settings — name, description, duration and
  // PRICE. Read from the fixture until now, so every facility offered the
  // same evaluation, described the same way, at the same price, regardless
  // of what they had configured.
  const { evaluation: evaluationConfig } = useSettings();
  // Names the chosen groom on the confirmation. Read from the facility's menu
  // rather than a fixture so the summary cannot name a service the booking is
  // not actually for — and from the CUSTOMER's menu when a customer is
  // reading it, so it cannot name one belonging to the other business they
  // are also a client of (20260924160000).
  const { data: groomingMenu = [] } = useGroomingMenu({
    asCustomer: isCustomerMode,
  });
  const serviceInfo = SERVICE_CATEGORIES.find((s) => s.id === selectedService);
  const ServiceIcon = serviceInfo?.icon ?? PawPrint;
  const hasAddons = extraServices.length > 0;
  const hasRooms = roomAssignments.length > 0;
  const isEvaluation = selectedService === "evaluation";
  const isDaycareOrBoarding =
    selectedService === "daycare" || selectedService === "boarding";
  // By whatever a line names its add-on by. The catalogue used to fall back
  // to this browser's localStorage, so a confirmation screen could price an
  // extra the booking screen had never offered.
  const addOnsByRef = bookableLookup(addOnsCatalog);
  const t = useShellText("booking");
  // The room step keeps an id — a room type from its cards, a room from the
  // occupancy grid. This printed the id itself, so a dog placed in the
  // Condominium read "Buddy → Cat Condo" ("cat" for category).
  const { categories: roomCategories, rooms: facilityRooms } = useRooms();
  const roomLabel = (id: string) =>
    facilityRooms.find((room) => room.id === id)?.name ??
    roomCategories.find((category) => category.id === id)?.name ??
    id;
  const { approval } = useBookingApproval();
  const { instructions: medicationSettings } = useMedicationInstructions();
  const { instructions: feedingSettings } = useFeedingInstructions();
  const { data: staffProfiles } = useQuery(staffQueries.profiles());
  const locale = useShellLocale();
  // Who an add-on may be given to: everybody working here now, and whoever
  // the line already names even if they no longer are — a name that vanished
  // from the control would read as "nobody".
  const addOnStaffOptions = (current?: string) =>
    (staffProfiles ?? [])
      .filter((s) => s.status === "active" || s.id === current)
      .map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`.trim() }));

  // The facility's waivers that apply here, less what this client has
  // validly signed — see use-booking-waivers for what this replaced.
  const clientRef =
    selectedClient && selectedClient.id > 0 ? selectedClient.id : undefined;
  const { pending: pendingWaivers, applicable: applicableWaivers } =
    useBookingWaivers({
      service: selectedService,
      clientRef,
      asCustomer: isCustomerMode,
    });
  const signWaiver = useSignWaiver();
  const [signingWaiver, setSigningWaiver] = useState<WaiverRow | null>(null);
  // A signature is a ROW now: the server copies the waiver's text and hashes
  // it, and the list above re-reads once it lands.
  const handleWaiverSigned = (result: SignatureResult) => {
    if (!signingWaiver || !selectedClient || clientRef === undefined) return;
    const waiver = signingWaiver;
    signWaiver.mutate(
      {
        waiverId: waiver.id,
        clientRef,
        signatureName: selectedClient.name,
        signatureData: result.signatureData,
        witnessName: result.witnessName,
      },
      {
        onSuccess: () => {
          setSigningWaiver(null);
          toast.success(
            t("agreementSignedToast").replace("{name}", waiver.name),
          );
        },
        onError: (error) =>
          toast.error(t("agreementNotSigned"), { description: error.message }),
      },
    );
  };

  // #1 — Missing data warnings
  const roomsIncomplete =
    isDaycareOrBoarding && selectedPets.length > roomAssignments.length;

  // #5 — Boarding nights count
  const boardingNights =
    boardingRangeStart && boardingRangeEnd
      ? nightsBetween(boardingRangeStart, boardingRangeEnd)
      : 0;

  // Daycare is booked at the day picker's times — the first day's here. This
  // showed the form's own defaults instead, so Confirm said 8:00–17:00 over a
  // booking made for 7:00–19:00.
  const firstDaycareDay =
    selectedService === "daycare" && daycareSelectedDates.length > 0
      ? localToday(
          [...daycareSelectedDates].sort(
            (a, b) => a.getTime() - b.getTime(),
          )[0],
        )
      : undefined;
  const daycareTimes = firstDaycareDay
    ? daycareDateTimes.find((d) => d.date === firstDaycareDay)
    : undefined;

  // Time display
  const timeDisplay =
    selectedService === "boarding" && boardingDateTimes.length > 0
      ? `${fmtTime(boardingDateTimes[0]?.checkInTime || checkInTime, locale)} — ${fmtTime(boardingDateTimes[boardingDateTimes.length - 1]?.checkOutTime || checkOutTime, locale)}`
      : daycareTimes
        ? `${fmtTime(daycareTimes.checkInTime || checkInTime, locale)} — ${fmtTime(daycareTimes.checkOutTime || checkOutTime, locale)}`
        : checkInTime
          ? `${fmtTime(checkInTime, locale)}${checkOutTime ? ` — ${fmtTime(checkOutTime, locale)}` : ""}`
          : "";

  // Step index helpers for edit jumps (step ids: client-pet=0, service=1, details=2, confirm=3)
  const clientPetStepIdx = onEditStep ? 0 : -1;
  const detailsStepIdx = onEditStep ? 2 : -1;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 flex size-12 shrink-0 items-center justify-center rounded-2xl">
          <ServiceIcon className="text-primary size-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{t("reviewYourBooking")}</h2>
          <p className="text-muted-foreground text-sm">
            {serviceInfo?.name}
            {(() => {
              if (!serviceType) return "";
              // For grooming, serviceType is the package id — resolve to name.
              if (selectedService === "grooming") {
                const pkg = groomingMenu.find((p) => p.id === serviceType);
                return pkg ? ` · ${pkg.name}` : "";
              }
              return ` · ${serviceType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}`;
            })()}
          </p>
        </div>
      </div>

      {/* ── Approval Required Banner ──────────────────────────── */}
      {/* Every booking a customer makes is a request the team confirms —
          the database decides that, not a setting. */}
      {isCustomerMode && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-blue-600" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">{t("requiresApproval")}</p>
            <p className="mt-0.5 text-blue-700">
              {t("requiresApprovalHelp").replace(
                "{hours}",
                String(responseHoursFor(approval, selectedService)),
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── #1 — Warnings ───────────────────────────────────────── */}
      {roomsIncomplete && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <AlertTriangle className="size-4 shrink-0 text-amber-600" />
          <p className="text-xs font-medium text-amber-800">
            {(selectedPets.length - roomAssignments.length === 1
              ? t("petsWithoutRoomOne")
              : t("petsWithoutRoomMany")
            ).replace(
              "{count}",
              String(selectedPets.length - roomAssignments.length),
            )}{" "}
            {onEditStep && (
              <button
                type="button"
                onClick={() => onEditStep(detailsStepIdx, 1)}
                className="font-semibold underline"
              >
                {t("assignNow")}
              </button>
            )}
          </p>
        </div>
      )}

      {/* ── Client & Pets ───────────────────────────────────────── */}
      <div
        className={cn(
          "grid gap-3",
          selectedPets.length === 1 && "sm:grid-cols-2",
        )}
      >
        <div className="rounded-2xl border p-4">
          <SectionHeader
            icon={User}
            label={t("client")}
            onEdit={onEditStep ? () => onEditStep(clientPetStepIdx) : undefined}
          />
          <p className="text-sm font-semibold">{selectedClient?.name ?? "—"}</p>
          {selectedClient?.email && (
            <p className="text-muted-foreground mt-0.5 text-xs">
              {selectedClient.email}
            </p>
          )}
          {selectedClient?.phone && (
            <p className="text-muted-foreground text-xs">
              {selectedClient.phone}
            </p>
          )}
        </div>

        <div className="rounded-2xl border p-4">
          <SectionHeader
            icon={PawPrint}
            label={selectedPets.length > 1 ? t("petsLabel") : t("petLabel")}
            onEdit={onEditStep ? () => onEditStep(clientPetStepIdx) : undefined}
          />
          {selectedPets.length === 1 ? (
            <div className="flex items-center gap-2.5">
              {selectedPets[0].imageUrl ? (
                <Image
                  src={selectedPets[0].imageUrl}
                  alt={selectedPets[0].name}
                  width={40}
                  height={40}
                  className="ring-background size-10 shrink-0 rounded-xl object-cover ring-2"
                />
              ) : (
                <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <PawPrint className="size-4" />
                </div>
              )}
              <div>
                <p className="text-sm leading-none font-semibold">
                  {selectedPets[0].name}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  {selectedPets[0].type} · {selectedPets[0].breed}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedPets.map((pet) => (
                <div
                  key={pet.id}
                  className="border-border/60 bg-muted/30 flex items-center gap-3 rounded-xl border p-2.5"
                >
                  {pet.imageUrl ? (
                    <Image
                      src={pet.imageUrl}
                      alt={pet.name}
                      width={40}
                      height={40}
                      className="ring-background size-10 shrink-0 rounded-xl object-cover ring-2"
                    />
                  ) : (
                    <div className="bg-primary/10 text-primary ring-background flex size-10 shrink-0 items-center justify-center rounded-xl ring-2">
                      <PawPrint className="size-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-none font-semibold">
                      {pet.name}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                      {pet.type} · {pet.breed}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── #4 — Evaluation info card ───────────────────────────── */}
      {isEvaluation && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4">
          <SectionHeader icon={ClipboardCheck} label={t("evaluationDetails")} />
          <p className="text-sm font-semibold">
            {evaluationConfig.customerName}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {evaluationConfig.description}
          </p>
          <div className="mt-2 flex items-center gap-4">
            <div>
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                {t("duration")}
              </p>
              <p className="text-xs font-semibold">
                {t("minutesShort").replace(
                  "{count}",
                  String(evaluationConfig.schedule.defaultDurationMinutes),
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                {t("price")}
              </p>
              <p className="text-xs font-semibold text-emerald-600">
                {t("priceFree")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Package Redemption ──────────────────────────────────── */}
      {(() => {
        const matchingPackages = (selectedClient?.packages ?? []).filter(
          (p) => p.remainingCredits > 0 && p.moduleId === selectedService,
        );
        if (matchingPackages.length === 0) return null;
        return (
          <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
                <Gift className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {t("packageWithSessions")}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {t("packageWithSessionsHelp")}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              {matchingPackages.map((pkg) => {
                const applied = redeemedPackageId === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    className={cn(
                      "bg-card flex items-center justify-between gap-3 rounded-lg border px-3 py-2",
                      applied &&
                        "border-emerald-300 ring-1 ring-emerald-300 dark:border-emerald-700 dark:ring-emerald-700",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{pkg.name}</p>
                      <p className="text-muted-foreground text-[11px]">
                        {(pkg.remainingCredits === 1
                          ? t("sessionsRemainingOne")
                          : t("sessionsRemainingMany")
                        ).replace("{count}", String(pkg.remainingCredits))}
                        {pkg.expiryDate
                          ? ` · ${t("expiresOn").replace(
                              "{date}",
                              formatDateLong(pkg.expiryDate, locale),
                            )}`
                          : ""}
                      </p>
                    </div>
                    {applied ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                          <CheckCircle2 className="size-3" />
                          {t("applied")}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => setRedeemedPackageId(null)}
                        >
                          {t("remove")}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 gap-1 bg-emerald-600 px-2.5 text-[11px] hover:bg-emerald-700"
                        onClick={() => setRedeemedPackageId(pkg.id)}
                      >
                        <Gift className="size-3" />
                        {t("redeemOneSession")}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Staff Assignment ────────────────────────────────────── */}
      {(() => {
        // Map the wizard's service id to the ServiceModule values used in
        // staff.serviceAssignments. "evaluation"/"custom" don't have a
        // dedicated module, so we don't show the selector for them.
        const moduleMap: Record<string, ServiceModule> = {
          grooming: "grooming",
          training: "training",
          daycare: "daycare",
          boarding: "boarding",
        };
        const serviceModule = moduleMap[selectedService];
        if (!serviceModule) return null;
        const eligible = (staffProfiles ?? []).filter(
          (s) =>
            s.status === "active" &&
            s.serviceAssignments.includes(serviceModule),
        );
        if (eligible.length === 0) return null;

        const roleLabel =
          serviceModule === "grooming"
            ? t("roleGroomer")
            : serviceModule === "training"
              ? t("roleTrainer")
              : t("roleAttendant");
        const selected = eligible.find((s) => s.id === selectedStaffId);

        return (
          <div className="rounded-2xl border p-4">
            <SectionHeader
              icon={Users}
              label={t("roleAssignment").replace("{role}", roleLabel)}
            />
            <p className="text-muted-foreground mb-3 text-[11px]">
              {t("roleAssignmentHelp")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedStaffId(null)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  selectedStaffId === null
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted",
                )}
              >
                <User className="size-3" />
                {t("unassigned")}
              </button>
              {eligible.map((s) => {
                const active = selectedStaffId === s.id;
                const initials = `${s.firstName[0] ?? ""}${
                  s.lastName[0] ?? ""
                }`.toUpperCase();
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStaffId(s.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-muted",
                    )}
                  >
                    <span
                      className="flex size-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: s.colorHex }}
                    >
                      {initials}
                    </span>
                    {s.firstName} {s.lastName}
                    {s.jobTitle && (
                      <span className="text-muted-foreground text-[10px] font-normal">
                        · {s.jobTitle}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {selected && (
              <p className="text-muted-foreground mt-2 text-[11px]">
                {t("bookingAppearsOn").replace("{name}", selected.firstName)}
              </p>
            )}
          </div>
        );
      })()}

      {/* ── Schedule ────────────────────────────────────────────── */}
      <div className="rounded-2xl border p-4">
        <SectionHeader
          icon={CalendarDays}
          label={t("schedule")}
          onEdit={onEditStep ? () => onEditStep(detailsStepIdx, 0) : undefined}
        />

        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
              {t("date")}
            </p>
            {selectedService === "daycare" &&
            daycareSelectedDates.length > 0 ? (
              <div className="mt-0.5 flex flex-wrap gap-1">
                {daycareSelectedDates.map((date, idx) => (
                  <span
                    key={idx}
                    className="bg-muted rounded-md px-2 py-0.5 text-xs font-medium"
                  >
                    {formatDateShort(date, locale)}
                  </span>
                ))}
              </div>
            ) : selectedService === "boarding" &&
              boardingRangeStart &&
              boardingRangeEnd ? (
              <p className="text-sm font-semibold">
                {fmtDateLong(boardingRangeStart, locale)} →{" "}
                {fmtDateLong(boardingRangeEnd, locale)}
              </p>
            ) : startDate ? (
              <p className="text-sm font-semibold">
                {fmtDateLong(startDate, locale)}
                {endDate && endDate !== startDate && (
                  <> → {fmtDateLong(endDate, locale)}</>
                )}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">{t("notSet")}</p>
            )}
          </div>

          {/* #5 — Boarding nights count */}
          {selectedService === "boarding" && boardingNights > 0 && (
            <div>
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                {t("duration")}
              </p>
              <p className="flex items-center gap-1 text-sm font-semibold">
                <Moon className="text-muted-foreground size-3" />
                {(boardingNights === 1
                  ? t("nightsCountOne")
                  : t("nightsCountMany")
                ).replace("{count}", String(boardingNights))}
              </p>
            </div>
          )}

          {timeDisplay && (
            <div>
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                {selectedService === "grooming" && isMobileGrooming
                  ? t("arrivalWindow")
                  : t("timeLabel")}
              </p>
              <p className="flex items-center gap-1 text-sm font-semibold">
                <Clock className="text-muted-foreground size-3" />
                {timeDisplay}
              </p>
              {selectedService === "grooming" && isMobileGrooming && (
                <p className="text-muted-foreground mt-0.5 text-[10px]">
                  {t("textWhenNearby")}
                </p>
              )}
            </div>
          )}

          {selectedService === "grooming" && (
            <div>
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                {t("serviceMode")}
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-pink-100 px-2 py-0.5 text-xs font-semibold text-pink-800">
                {isMobileGrooming
                  ? t("serviceModeMobile")
                  : t("serviceModeSalon")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Room Assignments ────────────────────────────────────── */}
      {(hasRooms || roomsIncomplete) && (
        <div className="rounded-2xl border p-4">
          <SectionHeader
            icon={DoorOpen}
            label={t("roomAssignments")}
            onEdit={
              onEditStep ? () => onEditStep(detailsStepIdx, 1) : undefined
            }
          />
          {hasRooms ? (
            <div className="flex flex-wrap gap-2">
              {roomAssignments.map((a) => {
                const pet = selectedPets.find((p) => p.id === a.petId);
                return (
                  <div
                    key={a.petId}
                    className="bg-muted/50 flex items-center gap-2 rounded-lg border px-3 py-2"
                  >
                    <span className="bg-primary/10 text-primary flex size-5 items-center justify-center rounded-full text-[9px] font-bold">
                      {pet?.name[0]}
                    </span>
                    <span className="text-xs font-medium">{pet?.name}</span>
                    <span className="text-muted-foreground text-xs">→</span>
                    <span className="text-xs font-semibold">
                      {roomLabel(a.roomId)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              {t("noRoomsAssigned")}
            </p>
          )}
        </div>
      )}

      {/* ── Add-ons ─────────────────────────────────────────────── */}
      {hasAddons &&
        (() => {
          return (
            <div className="rounded-2xl border p-4">
              <SectionHeader
                icon={Sparkles}
                label={t("addOnsLabel")}
                onEdit={
                  onEditStep ? () => onEditStep(detailsStepIdx, 2) : undefined
                }
              />
              <div className="space-y-2">
                {extraServices.map((es) => {
                  const pet = selectedPets.find((p) => p.id === es.petId);
                  const addon = addOnsByRef.get(es.serviceId);
                  const unitPrice = addon?.price ?? 0;
                  const lineTotal = unitPrice * es.quantity;
                  // "Does this add-on require staff?" — asked of staff, for
                  // the add-ons set up that way; a customer's request leaves
                  // it to the facility.
                  const asksForStaff =
                    !isCustomerMode &&
                    Boolean(onAddOnStaffChange) &&
                    addon?.requiresStaff === true;
                  return (
                    <div
                      key={`${es.serviceId}-${es.petId}`}
                      className="space-y-2 rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="bg-primary/10 text-primary flex size-5 items-center justify-center rounded-full text-[9px] font-bold">
                            {pet?.name[0]}
                          </span>
                          <div>
                            <span className="text-xs font-medium">
                              {addon?.name ?? es.serviceId.replace(/-/g, " ")}
                            </span>
                            <span className="text-muted-foreground ml-1.5 text-[10px]">
                              {pet?.name}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">
                            {formatMoney(unitPrice, locale)}
                            {addon ? `/${t("unitItem")}` : ""} × {es.quantity}
                          </span>
                          <span className="font-semibold tabular-nums">
                            {formatMoney(lineTotal, locale)}
                          </span>
                        </div>
                      </div>
                      {asksForStaff && (
                        <AddOnStaffSelect
                          label={t("addOnAssignedTo")}
                          ariaLabel={t("addOnStaffFor").replace(
                            "{name}",
                            addon?.name ?? es.serviceId,
                          )}
                          nobodyLabel={t("addOnNotAssigned")}
                          staff={addOnStaffOptions(es.staffId)}
                          value={es.staffId ?? null}
                          onChange={(staffId) =>
                            onAddOnStaffChange?.(
                              es.serviceId,
                              es.petId,
                              staffId,
                            )
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      {/* ── Care Notes ──────────────────────────────────────────── */}
      {isDaycareOrBoarding && (
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Feeding */}
          <div className="rounded-2xl border p-4">
            <SectionHeader
              icon={Utensils}
              label={t("feeding")}
              onEdit={
                onEditStep ? () => onEditStep(detailsStepIdx, 3) : undefined
              }
            />
            {feedingSchedule.length > 0 ? (
              <div className="space-y-3">
                {feedingSchedule.map((item, idx) => {
                  // The step's own words for the plan — its meals, each food
                  // and how to serve it, what the facility provides — so
                  // this reads exactly as the plan the owner wrote.
                  const lines = describeFeeding(item, {
                    t,
                    locale,
                    stay: medicationStay ?? { days: [], overnight: false },
                    settings: feedingSettings,
                    service: selectedService,
                  });
                  const petName =
                    selectedPets.length > 1
                      ? selectedPets.find((pet) => pet.id === item.petId)?.name
                      : undefined;
                  return (
                    <div key={item.id || idx} className="space-y-0.5">
                      {petName ? (
                        <p className="text-body-strong text-body-ink">
                          {petName}
                        </p>
                      ) : null}
                      <p className="text-meta text-ink-secondary">
                        {lines.meals}
                      </p>
                      {lines.foods.map((food, index) => (
                        <p
                          key={`${index}-${food}`}
                          className="text-meta text-ink-secondary"
                        >
                          {food}
                        </p>
                      ))}
                      {lines.extras.map((extra) => (
                        <p key={extra} className="text-meta text-ink-tertiary">
                          {extra}
                        </p>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* #1 — empty state */
              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                <Info className="size-3 shrink-0" />
                {t("noFeedingInstructions")}
              </p>
            )}
          </div>

          {/* Medications */}
          <div className="rounded-2xl border p-4">
            <SectionHeader
              icon={Pill}
              label={t("medications")}
              onEdit={
                onEditStep ? () => onEditStep(detailsStepIdx, 4) : undefined
              }
            />
            {medications.length > 0 ? (
              <div className="space-y-3">
                {medications.map((med, idx) => {
                  // The step's own words for it — dose, days and times, how
                  // it is given and what the facility supplies — so this
                  // reads exactly as the card the owner saved.
                  const lines = describeMedication(med, {
                    t,
                    locale,
                    stay: medicationStay,
                    settings: medicationSettings,
                  });
                  const petName =
                    selectedPets.length > 1
                      ? selectedPets.find((pet) => pet.id === med.petId)?.name
                      : undefined;
                  return (
                    <div key={med.id || idx} className="space-y-0.5">
                      <p className="text-body-strong text-body-ink">
                        {med.name ||
                          t("medicationNumber").replace("{n}", String(idx + 1))}
                        {petName ? (
                          <span className="text-meta text-ink-tertiary font-normal">
                            {" "}
                            · {petName}
                          </span>
                        ) : null}
                      </p>
                      {lines.dose ? (
                        <p className="text-meta text-ink-secondary">
                          {lines.dose}
                        </p>
                      ) : null}
                      {lines.schedule ? (
                        <p className="text-meta text-ink-secondary">
                          {lines.schedule}
                        </p>
                      ) : null}
                      <p className="text-meta text-ink-tertiary">
                        {lines.method}
                      </p>
                      {lines.extras.map((extra) => (
                        <p key={extra} className="text-meta text-ink-tertiary">
                          {extra}
                        </p>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* #1 — empty state */
              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                <Info className="size-3 shrink-0" />
                {t("noMedications")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Notifications ───────────────────────────────────────── */}
      <div className="rounded-2xl border p-4">
        <SectionHeader icon={Mail} label={t("notifications")} />
        <p className="text-muted-foreground mb-3 text-[11px]">
          {t("notificationsHelp")}
        </p>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <Label
              htmlFor="confirm-email"
              className="flex cursor-pointer items-start gap-2"
            >
              <Mail className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{t("emailConfirmation")}</p>
                {/* #6 — explanation */}
                <p className="text-muted-foreground text-[11px]">
                  {t("emailConfirmationHelp")}
                </p>
              </div>
            </Label>
            <Switch
              id="confirm-email"
              checked={notificationEmail}
              onCheckedChange={setNotificationEmail}
            />
          </div>
          <div className="flex items-start justify-between gap-4">
            <Label
              htmlFor="confirm-sms"
              className="flex cursor-pointer items-start gap-2"
            >
              <Smartphone className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{t("smsNotification")}</p>
                {/* #6 — explanation */}
                <p className="text-muted-foreground text-[11px]">
                  {t("smsNotificationHelp")}
                </p>
              </div>
            </Label>
            <Switch
              id="confirm-sms"
              checked={notificationSMS}
              onCheckedChange={setNotificationSMS}
            />
          </div>
        </div>
      </div>

      {/* ── Special requests ──────────────────────────────────── */}
      <div className="rounded-2xl border p-4">
        <SectionHeader icon={MessageSquareText} label={t("specialRequests")} />
        <Label htmlFor="booking-special-requests" className="sr-only">
          {t("specialRequests")}
        </Label>
        <Textarea
          id="booking-special-requests"
          value={specialRequests}
          onChange={(event) => setSpecialRequests(event.target.value)}
          placeholder={t("specialRequestsPlaceholder")}
          rows={3}
        />
        <p className="text-muted-foreground mt-2 text-[11px]">
          {t("specialRequestsHelp")}
        </p>
      </div>

      {/* ── Pending Waivers ───────────────────────────────────── */}
      {pendingWaivers.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <SectionHeader icon={FileSignature} label={t("agreementsRequired")} />
          <div className="space-y-2">
            {pendingWaivers.map((waiver) => (
              <div
                key={waiver.id}
                className="flex items-center justify-between rounded-xl border border-amber-200 bg-white px-4 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{waiver.name}</p>
                  <p className="text-muted-foreground text-[11px]">
                    v{waiver.version}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setSigningWaiver(waiver)}
                  disabled={clientRef === undefined || signWaiver.isPending}
                >
                  <Pen className="size-3" />
                  {t("signAgreement")}
                </Button>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-2 text-[11px]">
            {isCustomerMode
              ? t("agreementsRequiredHelp")
              : t("agreementsOutstandingHelp")}
          </p>
        </div>
      )}

      {/* Signed waivers confirmation */}
      {pendingWaivers.length === 0 && applicableWaivers.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5">
          <CheckCircle className="size-4 text-green-600" />
          <p className="text-xs font-medium text-green-800">
            {t("agreementsAllSigned")}
          </p>
        </div>
      )}

      {/* Signing dialog */}
      {signingWaiver && (
        <AgreementSigningDialog
          open={!!signingWaiver}
          onOpenChange={() => setSigningWaiver(null)}
          title={signingWaiver.name}
          agreementContent={signingWaiver.body}
          requiresWitness={signingWaiver.requiresWitness}
          onSigned={handleWaiverSigned}
          clientName={selectedClient?.name}
          serviceName={serviceInfo?.name}
        />
      )}

      {/* ── #3 — Price breakdown ────────────────────────────────── */}
      <div
        className={cn(
          "overflow-hidden rounded-2xl border-2",
          "border-primary/30",
        )}
      >
        {/* Line items */}
        <div className="space-y-1.5 px-5 pt-4 pb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {serviceInfo?.name}
              {(() => {
                if (!serviceType) return "";
                if (selectedService === "grooming") {
                  const pkg = groomingMenu.find((p) => p.id === serviceType);
                  return pkg ? ` (${pkg.name})` : "";
                }
                return ` (${serviceType.replace(/_/g, " ")})`;
              })()}
              {selectedService === "daycare" && daycareSelectedDates.length > 1
                ? ` × ${t("daysCount").replace("{count}", String(daycareSelectedDates.length))}`
                : ""}
              {selectedService === "boarding" && boardingNights > 0
                ? ` × ${t("nightsCountMany").replace("{count}", String(boardingNights))}`
                : ""}
            </span>
            <span className="font-medium tabular-nums">
              {formatMoney(calculatePrice.basePrice, locale)}
            </span>
          </div>
          {/* Grooming rate-engine trace — one indented line per pet showing
              the modifiers that fired (size · coat · breed · tier). Purely
              explanatory; the price above already includes them. */}
          {(calculatePrice.groomingPriceBreakdown ?? []).length > 0 && (
            <div className="space-y-0.5">
              {calculatePrice.groomingPriceBreakdown!.map((b) => (
                <p
                  key={b.petName}
                  className="text-muted-foreground ml-1 text-[11px] italic"
                >
                  <span className="font-medium not-italic">{b.petName}:</span>{" "}
                  {b.lines.join(" · ")}
                </p>
              ))}
            </div>
          )}
          {hasAddons &&
            (() => {
              const addonsTotal =
                calculatePrice.addOnsTotal ??
                calculatePrice.total - calculatePrice.basePrice;
              return (
                <div className="space-y-1">
                  {extraServices.map((es, i) => {
                    const addon = addOnsByRef.get(es.serviceId);
                    const lineTotal = (addon?.price ?? 0) * es.quantity;
                    return (
                      <div
                        key={i}
                        className="text-muted-foreground flex items-center justify-between text-xs"
                      >
                        <span>
                          {addon?.name ?? es.serviceId} × {es.quantity}
                        </span>
                        <span className="tabular-nums">
                          {formatMoney(lineTotal, locale)}
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">
                      {t("addOnsSubtotal")}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatMoney(addonsTotal, locale)}
                    </span>
                  </div>
                </div>
              );
            })()}
          {(calculatePrice.adjustments ?? [])
            .filter((adjustment) => adjustment.amount !== 0)
            .map((adjustment) => (
              <div
                key={adjustment.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {adjustment.label}
                </span>
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    adjustment.amount < 0 && "text-emerald-600",
                  )}
                >
                  {adjustment.amount < 0 ? "−" : "+"}
                  {formatMoney(Math.abs(adjustment.amount), locale)}
                </span>
              </div>
            ))}
          {(calculatePrice.serviceFeeItems ?? []).length > 0 &&
            (calculatePrice.serviceFeeItems ?? []).map((fee, i) => (
              <div
                key={`svc-fee-${i}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{fee.label}</span>
                <span className="font-medium tabular-nums">
                  +{formatMoney(fee.amount, locale)}
                </span>
              </div>
            ))}
          {(calculatePrice.taxAmount ?? 0) > 0 &&
            (facilityTaxes && facilityTaxes.length > 0 ? (
              facilityTaxes.map((tax, i) => {
                const base =
                  calculatePrice.subtotal ??
                  calculatePrice.total - (calculatePrice.taxAmount ?? 0);
                const taxAmt = base * tax.rate;
                const pct = parseFloat((tax.rate * 100).toFixed(4));
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {tax.name} ({formatPercent(pct, locale, 2)})
                    </span>
                    <span className="font-medium tabular-nums">
                      +{formatMoney(taxAmt, locale)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("taxWithRate").replace(
                    "{rate}",
                    formatPercent(
                      (calculatePrice.taxRate ?? 0) * 100,
                      locale,
                      2,
                    ),
                  )}
                </span>
                <span className="font-medium tabular-nums">
                  +{formatMoney(calculatePrice.taxAmount ?? 0, locale)}
                </span>
              </div>
            ))}
        </div>

        {/* Total */}
        <div className="bg-primary/5 flex items-center justify-between border-t px-5 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-primary size-5" />
            <span className="text-sm font-bold">{t("total")}</span>
          </div>
          <span className="text-primary text-xl font-bold tabular-nums">
            {redeemedPackageId && calculatePrice.total === 0 ? (
              <span className="text-sm text-emerald-600">
                {t("packagePassApplied")}
              </span>
            ) : (
              formatMoney(calculatePrice.total, locale)
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
