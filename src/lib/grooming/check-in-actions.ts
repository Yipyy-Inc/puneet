import type { AlertNote, GroomingAppointment } from "@/types/grooming";
import type { GroomingStation, GroomingStationStatus } from "@/types/rooms";
import type { Client } from "@/types/client";
import type { Pet } from "@/types/pet";
import type { CheckInConfirmation } from "@/components/facility/grooming/check-in-confirmation-dialog";
import type { MarkReadyConfirmation } from "@/components/facility/grooming/mark-ready-dialog";
import type { PaymentResult } from "@/components/facility/grooming/payment-dialog";
import { groomingAddOnsList } from "@/data/grooming-pricing-rules";

export interface CheckInActionDeps {
  clients: Client[];
  setStationStatus: (
    id: string,
    status: GroomingStationStatus,
    occupancy?: { petName?: string; stylistName?: string },
  ) => void;
  /** Notification sink — sonner toast in production callers, no-op in tests. */
  notify: (
    title: string,
    detail: { description: string; duration?: number },
  ) => void;
}

export interface CheckInActionSummary {
  /** Names of add-ons added at check-in (not present in the original booking). */
  newlyAddedAddOns: string[];
  /** Total $ added from those new add-ons. */
  addedTotal: number;
  /** Alert notes promoted from this check-in's arrival flags. */
  promotedAlerts: AlertNote[];
  /**
   * What the check-in recorded about the drop-off, ready to send to
   * `useSaveAppointmentIntake`.
   *
   * RETURNED RATHER THAN WRITTEN HERE. This module is imported by three screens
   * and is not a React component, so it cannot hold the mutation hook — and
   * making it fetch directly would put a second network path beside the one the
   * query cache knows about. The callers persist it; this decides what.
   *
   * `complete: true` because a check-in IS the intake being completed — that is
   * the moment the field exists to record.
   */
  intakePatch: {
    arrivalCoatCondition?: string;
    arrivalBehavior?: string;
    arrivalHealthFlags?: string[];
    dropOffObservations?: string | null;
    mattingFeeWarning: boolean;
    mattingFeeAmount: number | null;
    sessionStartedAt: string;
    complete: true;
  };
}

/**
 * Single source of truth for the side effects a check-in must produce.
 *
 * Mutates the appointment in place, mirrors the photos onto the pet's profile,
 * flips the station card on the Grooming Stations board, promotes notable
 * arrival flags into carry-forward alert notes, and fires the customer SMS
 * for any add-on added at the door. Returns a summary the caller can use for
 * its own history-log / status-update concerns.
 *
 * Pure-mutation policy: callers handle their own React state (status,
 * dialog open/close) and their own history-record bookkeeping. This helper
 * doesn't know about either.
 */
export function applyCheckInResult(
  apt: GroomingAppointment,
  result: CheckInConfirmation,
  deps: CheckInActionDeps,
): CheckInActionSummary {
  const nowIso = new Date().toISOString();
  // Honor the (editable) check-in time from the dialog; fall back to now.
  const checkInIso = (() => {
    if (!result.checkInTime) return nowIso;
    const [h, m] = result.checkInTime.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return nowIso;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  })();

  // ── 1. Newly-added add-ons (vs. original booking) → price + SMS ─────────
  const originalAddOns = apt.addOns ?? [];
  const newlyAdded = result.addOns.filter(
    (name) => !originalAddOns.includes(name),
  );
  const newlyAddedDetails = newlyAdded
    .map((name) => groomingAddOnsList.find((a) => a.name === name))
    .filter((a): a is (typeof groomingAddOnsList)[number] => !!a);
  const addedTotal = newlyAddedDetails.reduce((sum, a) => sum + a.price, 0);

  // ── 2. Mutate the appointment record ───────────────────────────────────
  (apt as typeof apt & { intake?: typeof apt.intake }).intake = {
    ...(apt.intake ?? {
      coatCondition: "normal",
      behaviorNotes: "",
      allergies: apt.allergies,
      specialInstructions: apt.specialInstructions,
      beforePhotos: [],
      mattingFeeWarning: result.mattedSurcharge > 0,
      mattingFeeAmount:
        result.mattedSurcharge > 0 ? result.mattedSurcharge : undefined,
    }),
    dropOffObservations:
      result.dropOffObservations || apt.intake?.dropOffObservations,
    arrivalCoatCondition: result.arrivalCoatCondition,
    arrivalBehavior: result.arrivalBehavior,
    arrivalHealthFlags: result.arrivalHealthFlags,
    beforePhotos: [
      ...(apt.intake?.beforePhotos ?? []),
      ...(result.beforePhotos ?? []),
    ],
    sessionStartedAt: nowIso,
  };
  apt.addOns = result.addOns;
  apt.checkInTime = checkInIso;
  if (result.estimatedReadyTime) {
    apt.estimatedReadyTime = result.estimatedReadyTime;
  }

  // ── 3. Matted surcharge → priceAdjustment ──────────────────────────────
  if (result.mattedSurcharge > 0) {
    apt.priceAdjustments = [
      ...apt.priceAdjustments,
      {
        id: `adj-matted-${Date.now()}`,
        amount: result.mattedSurcharge,
        reason: "matting-fee" as const,
        description: `Matting surcharge added at check-in — $${result.mattedSurcharge}`,
        addedBy: "Staff",
        addedAt: nowIso,
        customerNotified: false,
      },
    ];
    apt.totalPrice = apt.totalPrice + result.mattedSurcharge;
  }

  // ── 4. Newly-added add-ons → priceAdjustments + SMS toast ──────────────
  if (newlyAddedDetails.length > 0) {
    apt.priceAdjustments = [
      ...apt.priceAdjustments,
      ...newlyAddedDetails.map((a, i) => ({
        id: `adj-addon-${Date.now()}-${i}`,
        amount: a.price,
        reason: "other" as const,
        description: `${a.name} added at check-in — +$${a.price}`,
        addedBy: "Staff",
        addedAt: nowIso,
        customerNotified: true,
      })),
    ];
    apt.totalPrice = apt.totalPrice + addedTotal;
    const labelList =
      newlyAdded.length === 1
        ? `[${newlyAdded[0]}]`
        : `[${newlyAdded.join(", ")}]`;
    const smsBody = `We've added ${labelList} to ${apt.petName}'s appointment today. Updated total: $${apt.totalPrice.toFixed(2)}.`;
    deps.notify(`SMS sent to ${apt.ownerName}`, {
      description: smsBody,
      duration: 8000,
    });
  }

  // ── 5. Promote arrival flags into carry-forward alert notes ────────────
  // Only "notable" values get promoted (clean / calm / better-than-usual /
  // none are positive signals — not worth alerting future groomers about).
  const promotedAlerts: AlertNote[] = [];
  const existingAlertTexts = new Set((apt.alertNotes ?? []).map((n) => n.text));
  function promoteAlert(text: string) {
    if (existingAlertTexts.has(text)) return;
    const note: AlertNote = {
      id: `alert-${Date.now()}-${promotedAlerts.length}`,
      text,
      createdBy: "Check-in",
      createdAt: nowIso,
      appliesToFuture: true,
    };
    promotedAlerts.push(note);
    existingAlertTexts.add(text);
  }
  if (result.arrivalCoatCondition === "slightly-matted") {
    promoteAlert("Slightly matted coat at last visit");
  }
  if (result.arrivalCoatCondition === "heavily-matted") {
    promoteAlert("Heavily matted at last visit — extra time required");
  }
  if (result.arrivalCoatCondition === "flea-tick") {
    promoteAlert("Flea/tick found at last visit — re-check on arrival");
  }
  if (result.arrivalBehavior === "anxious") {
    promoteAlert("Anxious at last visit — go slow");
  }
  if (result.arrivalBehavior === "aggressive") {
    promoteAlert("Aggressive at last visit — caution + handler awareness");
  }
  for (const flag of result.arrivalHealthFlags ?? []) {
    if (flag === "skin-irritation") {
      promoteAlert("Skin irritation observed at last visit");
    } else if (flag === "injury") {
      promoteAlert("Injury/wound noted at last visit");
    } else if (flag === "other") {
      promoteAlert("Other health observation at last visit — see notes");
    }
  }
  if (promotedAlerts.length > 0) {
    apt.alertNotes = [...(apt.alertNotes ?? []), ...promotedAlerts];
  }

  // ── 6. Pet profile updates — visit photos ──────────────────────────────
  // Find the pet across the clients list and append each captured before-
  // photo as a visitPhoto entry. Initializes the array if absent.
  if (result.beforePhotos && result.beforePhotos.length > 0) {
    outer: for (const client of deps.clients) {
      for (const pet of client.pets as Pet[]) {
        if (pet.id !== apt.petId) continue;
        const next = pet as Pet & { visitPhotos?: Pet["visitPhotos"] };
        next.visitPhotos = [
          ...(next.visitPhotos ?? []),
          ...result.beforePhotos.map((url) => ({
            url,
            capturedAt: nowIso,
            appointmentId: apt.id,
            kind: "before" as const,
          })),
        ];
        break outer;
      }
    }
  }

  // ── 7. Station board real-time update ──────────────────────────────────
  deps.setStationStatus(result.stationId, "in-use", {
    petName: apt.petName,
    stylistName: apt.stylistName,
  });

  return {
    newlyAddedAddOns: newlyAdded,
    addedTotal,
    promotedAlerts,
    // The drop-off, for the caller to persist. `beforePhotos` is deliberately
    // absent: photos are rows with their own upload path now
    // (20260806180000), not a list carried on the intake.
    intakePatch: {
      ...(result.arrivalCoatCondition
        ? { arrivalCoatCondition: result.arrivalCoatCondition }
        : {}),
      ...(result.arrivalBehavior
        ? { arrivalBehavior: result.arrivalBehavior }
        : {}),
      ...(result.arrivalHealthFlags
        ? { arrivalHealthFlags: result.arrivalHealthFlags }
        : {}),
      dropOffObservations: result.dropOffObservations || null,
      // Both together or neither — the database refuses half a matting fee, and
      // a surcharge of 0 is not a fee that was warned about.
      mattingFeeWarning: result.mattedSurcharge > 0,
      mattingFeeAmount:
        result.mattedSurcharge > 0 ? result.mattedSurcharge : null,
      sessionStartedAt: nowIso,
      complete: true,
    },
  };
}

/** Re-export so callers don't have to remember where GroomingStation came from. */
export type { GroomingStation };

/**
 * Append a station-assignment entry to the appointment history so station
 * utilization can be reported later (spec Table 9). Like the apply* helpers
 * this mutates the appointment in place — kept in this pure-mutation module so
 * the direct mutation lives out of component code — but the check-in caller
 * decides when to call it, owning its own history bookkeeping.
 */
export function recordStationAssignmentHistory(
  apt: GroomingAppointment,
  stationName: string,
  staff: string,
): void {
  apt.history = [
    ...(apt.history ?? []),
    {
      id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      staff,
      description: `Assigned to ${stationName} at check-in`,
    },
  ];
}

/**
 * Flip an appointment to no-show in place (mock store). Invoked from the
 * check-in dialog's "Mark as No-Show" path. Kept here in the pure-mutation
 * module so the direct status mutation lives out of component code — no
 * station assignment or session side effects run for a pet that didn't arrive.
 */
export function markAppointmentNoShow(apt: GroomingAppointment): void {
  apt.status = "no-show";
}

export interface MarkReadyActionDeps {
  clients: Client[];
  setStationStatus: (
    id: string,
    status: GroomingStationStatus,
    occupancy?: { petName?: string; stylistName?: string },
  ) => void;
  notify: (
    title: string,
    detail: { description: string; duration?: number },
  ) => void;
  /** Facility name interpolated into the pickup SMS. */
  facilityName: string;
}

export interface MarkReadyActionSummary {
  /** Final-charge dollar total added at mark-ready. */
  finalChargesTotal: number;
  /** New apt.totalPrice (after final charges, pre-tax). */
  updatedTotal: number;
}

/**
 * Mark-ready counterpart to {@link applyCheckInResult}. Owns every side
 * effect the "Notify Owner — Ready for Pickup" action implies: stores the
 * after-photos on the appointment and on the pet's profile, persists the
 * groomer's session notes, appends final-charge price adjustments, fires the
 * pickup SMS with the updated total, and releases the station.
 *
 * Pure-mutation policy: callers handle their own React state (status flip,
 * dialog close) and their own history-record bookkeeping.
 */
export function applyMarkReadyResult(
  apt: GroomingAppointment,
  result: MarkReadyConfirmation,
  deps: MarkReadyActionDeps,
): MarkReadyActionSummary {
  const nowIso = new Date().toISOString();

  // ── 1. After-photos onto the appointment record ────────────────────────
  const newAfterPhotos = result.afterPhotos.map((url, i) => ({
    id: `photo-after-${Date.now()}-${i}`,
    url,
    type: "after" as const,
    takenAt: nowIso,
    takenBy: "Groomer",
  }));
  apt.afterPhotos = [...(apt.afterPhotos ?? []), ...newAfterPhotos];

  // ── 2. Session notes onto the intake ───────────────────────────────────
  if (result.sessionNotes) {
    (apt as typeof apt & { intake?: typeof apt.intake }).intake = {
      ...(apt.intake ?? {
        coatCondition: "normal",
        behaviorNotes: "",
        allergies: apt.allergies,
        specialInstructions: apt.specialInstructions,
        beforePhotos: [],
        mattingFeeWarning: false,
      }),
      sessionNotes: result.sessionNotes,
    };
  }

  // ── 3. Final charges → priceAdjustments + total bump ───────────────────
  const finalChargesTotal = result.finalCharges.reduce(
    (sum, c) => sum + c.amount,
    0,
  );
  if (result.finalCharges.length > 0) {
    apt.priceAdjustments = [
      ...apt.priceAdjustments,
      ...result.finalCharges.map((c) => ({
        id: c.id,
        amount: c.amount,
        reason: "other" as const,
        description: `${c.label} (added at mark-ready)`,
        addedBy: "Groomer",
        addedAt: nowIso,
        customerNotified: true,
      })),
    ];
    apt.totalPrice = apt.totalPrice + finalChargesTotal;
  }

  // ── 4. Pet profile updates — push after-photos to visitPhotos ──────────
  if (result.afterPhotos.length > 0) {
    outer: for (const client of deps.clients) {
      for (const pet of client.pets as Pet[]) {
        if (pet.id !== apt.petId) continue;
        const next = pet as Pet & { visitPhotos?: Pet["visitPhotos"] };
        next.visitPhotos = [
          ...(next.visitPhotos ?? []),
          ...result.afterPhotos.map((url) => ({
            url,
            capturedAt: nowIso,
            appointmentId: apt.id,
            kind: "after" as const,
          })),
        ];
        break outer;
      }
    }
  }

  // ── 5. Release the station to needs-cleaning ───────────────────────────
  if (apt.stationId) {
    deps.setStationStatus(apt.stationId, "needs-cleaning");
  }

  // ── 6. Pickup SMS — bundles ready + updated total per the spec ─────────
  const smsBody = `${apt.petName} is clean and ready! 🐾 Come pick them up at ${deps.facilityName}. Your total today is $${apt.totalPrice.toFixed(2)}.`;
  deps.notify(`SMS sent to ${apt.ownerName}`, {
    description: smsBody,
    duration: 8000,
  });

  return {
    finalChargesTotal,
    updatedTotal: apt.totalPrice,
  };
}

export interface PaymentActionDeps {
  clients: Client[];
  setStationStatus: (
    id: string,
    status: GroomingStationStatus,
    occupancy?: { petName?: string; stylistName?: string },
  ) => void;
  notify: (
    title: string,
    detail: { description: string; duration?: number },
  ) => void;
  facilityName: string;
}

export interface PaymentActionSummary {
  /** Final dollar amount charged to the payment method. */
  amountCharged: number;
  /** Grand total before pass / store-credit reductions. */
  grandTotal: number;
  /** Number of passes left on the customer package after this redemption. */
  packagePassesLeft?: number;
  /** Store-credit balance after this payment. */
  storeCreditAfter?: number;
  /**
   * The payment to record, ready for `useRecordPayment`.
   *
   * RETURNED RATHER THAN WRITTEN, for the same reason as `intakePatch`: this
   * module is imported by three screens and is not a React component, so it
   * cannot hold a mutation hook, and making it fetch would put a second network
   * path beside the one the query cache knows about.
   *
   * The store-credit ledger entry is NOT in here. It is written by the same
   * database transaction as the payment (`record_payment`, 20260806260000) —
   * two calls could half-succeed, and the half that survives would be a payment
   * claiming to have spent credit that was never deducted.
   */
  paymentRecord: {
    appointmentId: string;
    method: PaymentResult["method"];
    subtotal: number;
    tax: number;
    tip: number;
    storeCreditApplied: number;
    packagePassApplied: number;
    loyaltyDiscountApplied: number;
    amountCharged: number;
    grandTotal: number;
    cashReceived?: number;
    savedCardId?: string;
    packagePassId?: string;
    receiptChannels: string[];
    creditNote: string;
    customerPackageId?: string;
    petName: string;
    serviceLabel: string;
  };
}

/**
 * Payment counterpart to {@link applyCheckInResult} / {@link applyMarkReadyResult}.
 * Closes out the booking: flips status to completed, stamps the payment
 * method + tip + applied credits onto the appointment, redeems any package
 * pass + decrements store credit on the client, releases the station to
 * available, and fires the receipt notification(s).
 */
export function applyPaymentResult(
  apt: GroomingAppointment,
  result: PaymentResult,
  deps: PaymentActionDeps,
): PaymentActionSummary {
  const nowIso = new Date().toISOString();

  // ── 1. Stamp payment metadata + status onto the appointment ────────────
  apt.status = "completed";
  apt.checkOutTime = nowIso;
  (
    apt as typeof apt & {
      paymentStatus?: "pending" | "paid" | "refunded";
      paidAt?: string;
      paymentMethod?: PaymentResult["method"];
      tipAmount?: number;
      appliedStoreCredit?: number;
      appliedPackagePassId?: string;
    }
  ).paymentStatus = "paid";
  (apt as typeof apt & { paidAt?: string }).paidAt = nowIso;
  (
    apt as typeof apt & { paymentMethod?: PaymentResult["method"] }
  ).paymentMethod = result.method;
  (apt as typeof apt & { tipAmount?: number }).tipAmount = result.tipAmount;
  if (result.appliedStoreCredit > 0) {
    (apt as typeof apt & { appliedStoreCredit?: number }).appliedStoreCredit =
      result.appliedStoreCredit;
  }
  if (result.appliedPackagePassId) {
    (
      apt as typeof apt & { appliedPackagePassId?: string }
    ).appliedPackagePassId = result.appliedPackagePassId;
  }

  // ── 2. The package pass ────────────────────────────────────────────────
  //
  // NOT REDEEMED HERE ANY MORE. This used to call `redeemPackagePass`, which
  // mutated a module-level array — three counters kept in step by hand, all of
  // them gone on reload (20260806280000, Decision 1).
  //
  // The pass is now spent by `record_payment`, in the SAME transaction as the
  // payment itself: a payment that names a pass and a pass that was never spent
  // is the same class of bug as credit applied but never deducted. If the pass
  // cannot be spent — exhausted, expired, another facility's — the whole
  // payment is refused rather than recorded against a pass still sitting on the
  // customer's account.
  //
  // `packagePassesLeft` therefore comes back from the server, through the
  // caller, rather than being known at this point.
  const packagePassesLeft: number | undefined = undefined;

  // ── 3. Decrement store credit on the client ────────────────────────────
  let storeCreditAfter: number | undefined;
  if (result.appliedStoreCredit > 0) {
    for (const client of deps.clients) {
      if (client.id !== apt.ownerId) continue;
      if (!client.storeCredit) break;
      client.storeCredit.balance = Math.max(
        0,
        client.storeCredit.balance - result.appliedStoreCredit,
      );
      client.storeCredit.transactions = [
        ...client.storeCredit.transactions,
        {
          date: nowIso,
          amount: -result.appliedStoreCredit,
          type: "redeemed" as const,
          source: `Grooming · ${apt.packageName}`,
        },
      ];
      storeCreditAfter = client.storeCredit.balance;
      break;
    }
  }

  // ── 4. Release the station — ready for the next pet ────────────────────
  if (apt.stationId) {
    deps.setStationStatus(apt.stationId, "available");
  }

  // ── 5. Receipt notification(s) — SMS / Email per the channels picked ───
  const channelLabel = result.receiptChannels
    .map((c) => (c === "sms" ? "SMS" : "Email"))
    .join(" + ");
  const methodLabel = (() => {
    switch (result.method) {
      case "card-on-file":
        return "card on file";
      case "new-card":
        return "new card";
      case "cash":
        return "cash";
      case "package-pass":
        return "package pass";
      case "store-credit":
        return "store credit";
    }
  })();
  const receiptBody = `Receipt · ${methodLabel} · charged $${result.amountCharged.toFixed(2)} (total $${result.grandTotal.toFixed(2)}). Thanks for visiting ${deps.facilityName}!`;
  deps.notify(`Receipt sent to ${apt.ownerName} (${channelLabel})`, {
    description: receiptBody,
    duration: 8000,
  });

  return {
    amountCharged: result.amountCharged,
    grandTotal: result.grandTotal,
    packagePassesLeft,
    storeCreditAfter,
    paymentRecord: {
      appointmentId: apt.id,
      method: result.method,
      subtotal: result.subtotal,
      tax: result.tax,
      tip: result.tipAmount,
      // APPLIED, not nominal. The dialog clamps each reduction at what was
      // still owed (20260806240000), and the database refuses a sale that
      // charges a negative amount — so sending the headline value of a voucher
      // worth more than the ticket would be rejected rather than silently
      // recorded as fully spent.
      storeCreditApplied: result.appliedStoreCredit,
      packagePassApplied: result.packagePassDiscount,
      loyaltyDiscountApplied: result.loyaltyDiscount,
      amountCharged: result.amountCharged,
      grandTotal: result.grandTotal,
      ...(result.cashReceived !== undefined
        ? { cashReceived: result.cashReceived }
        : {}),
      ...(result.savedCardId ? { savedCardId: result.savedCardId } : {}),
      ...(result.appliedPackagePassId
        ? { packagePassId: result.appliedPackagePassId }
        : {}),
      receiptChannels: result.receiptChannels,
      creditNote: `${apt.packageName} · ${apt.petName}`,
      // The pass to spend, and what it was spent on. Resolved to a uuid by the
      // route; redeemed by the same transaction that writes the payment.
      ...(result.appliedPackagePassId
        ? { customerPackageId: result.appliedPackagePassId }
        : {}),
      petName: apt.petName,
      serviceLabel: apt.packageName,
    },
  };
}
