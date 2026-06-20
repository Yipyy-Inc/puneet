"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  reputationSettings as baseSettings,
  reputationRequests as baseRequests,
} from "@/data/reputation";
import type {
  ReputationSettings,
  ReputationRequest,
  ReputationCheckoutEvent,
} from "@/types/reputation";
import {
  buildScheduledRequest,
  evaluateCheckout,
  processDueRequests,
  processSequenceReminders,
  findHappyNudges,
  type CheckoutEvaluation,
} from "@/lib/reputation/trigger-engine";
import {
  loadQueue,
  saveQueue,
  loadRatingOverlays,
  loadReputationSettings,
  updateRatingOverlay,
  applyOverlay,
  resolveEscalationAssignees,
  resolveOutreachLocale,
  REPUTATION_SETTINGS_KEY,
  type RatingOverlay,
} from "@/lib/reputation/review-link";
import { addFacilityNotification } from "@/data/facility-notifications";
import {
  addStandaloneTask,
  hasReputationTaskFor,
  completeTaskForReputationRequest,
} from "@/data/work-tasks";
import { buildReputationEscalationTask } from "@/lib/reputation/escalation-task";
import { grantApologyCredit } from "@/lib/store-credit";

/** How often the scheduled queue is checked for due sends. */
const TICK_MS = 30_000;

/** Facility whose manager receives escalation alerts (matches layout). */
const ESCALATION_FACILITY_ID = 11;
const NOTIFIED_KEY = "reputation-escalations-notified";

interface ReputationContextValue {
  /** Current effective settings (mock defaults merged with saved overrides). */
  settings: ReputationSettings;
  /** Replace settings wholesale (persists). */
  updateSettings: (next: ReputationSettings) => void;
  /** Shallow-patch settings (persists). */
  patchSettings: (patch: Partial<ReputationSettings>) => void;
  /** Drop saved overrides, reverting to mock defaults. */
  resetSettings: () => void;
  /** Runtime-generated requests followed by the static mock requests. */
  requests: ReputationRequest[];
  /** Only the runtime-generated requests (the live queue). */
  runtimeRequests: ReputationRequest[];
  /** Log a checkout (T0) and, if allowed, schedule the outreach. */
  recordCheckout: (
    event: ReputationCheckoutEvent,
  ) => CheckoutEvaluation & { request?: ReputationRequest };
  /** Remove a runtime request (e.g. when a checkout is undone). */
  cancelScheduled: (requestId: string) => void;
  /** Resolve an escalation ticket (closes it + completes the manager task). */
  resolveEscalation: (requestId: string) => void;
  /** Grant apology store credit to the client behind an escalation. */
  grantApology: (requestId: string, amount: number) => void;
  /** Outcome of the most recent recordCheckout call. */
  lastResult: (CheckoutEvaluation & { request?: ReputationRequest }) | null;
}

const ReputationContext = createContext<ReputationContextValue | null>(null);

export function ReputationProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ReputationSettings>(() =>
    loadReputationSettings(),
  );
  const [runtimeRequests, setRuntimeRequests] = useState<ReputationRequest[]>(
    () => loadQueue(),
  );
  const [lastResult, setLastResult] = useState<
    (CheckoutEvaluation & { request?: ReputationRequest }) | null
  >(null);
  const [overlays, setOverlays] = useState<Record<string, RatingOverlay>>(() =>
    loadRatingOverlays(),
  );

  const persistQueue = useCallback((next: ReputationRequest[]) => {
    saveQueue(next);
  }, []);

  const persistSettings = useCallback((next: ReputationSettings) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        REPUTATION_SETTINGS_KEY,
        JSON.stringify(next),
      );
    }
  }, []);

  // ─── Settings mutations ──────────────────────────────────────────────────
  const updateSettings = useCallback(
    (next: ReputationSettings) => {
      setSettings(next);
      persistSettings(next);
    },
    [persistSettings],
  );

  const patchSettings = useCallback(
    (patch: Partial<ReputationSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        persistSettings(next);
        return next;
      });
    },
    [persistSettings],
  );

  const resetSettings = useCallback(() => {
    setSettings(baseSettings);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(REPUTATION_SETTINGS_KEY);
    }
  }, []);

  // ─── Checkout → schedule ─────────────────────────────────────────────────
  const recordCheckout = useCallback(
    (event: ReputationCheckoutEvent) => {
      const now = new Date();
      // Profile-based localization routing: explicit pref (Alpha) or stacked
      // bilingual fallback (Beta) when no preference at a bilingual facility.
      const ev = settings.localization?.enabled
        ? {
            ...event,
            ...resolveOutreachLocale(settings, event.clientId, event.locale),
          }
        : event;
      // Evaluate against overlay-applied state so survey ratings (e.g. a recent
      // negative review) are visible to the protection rules.
      const existing = [...runtimeRequests, ...baseRequests].map((r) =>
        applyOverlay(r, overlays[r.id]),
      );
      const evaluation = evaluateCheckout({
        event: ev,
        settings,
        existing,
        now,
      });

      if (!evaluation.allowed) {
        setLastResult(evaluation);
        return evaluation;
      }

      const request = buildScheduledRequest({
        event: ev,
        settings,
        now,
      });
      setRuntimeRequests((prev) => {
        const next = [request, ...prev];
        persistQueue(next);
        return next;
      });
      const result = { ...evaluation, request };
      setLastResult(result);
      return result;
    },
    [runtimeRequests, overlays, settings, persistQueue],
  );

  const cancelScheduled = useCallback(
    (requestId: string) => {
      setRuntimeRequests((prev) => {
        const next = prev.filter((r) => r.id !== requestId);
        persistQueue(next);
        return next;
      });
    },
    [persistQueue],
  );

  // ─── Manager actions on escalation tickets ────────────────────────────────
  const resolveEscalation = useCallback((requestId: string) => {
    const now = new Date().toISOString();
    updateRatingOverlay(requestId, { resolved: true, resolvedAt: now });
    completeTaskForReputationRequest(requestId);
    setOverlays(loadRatingOverlays());
  }, []);

  const grantApology = useCallback(
    (requestId: string, amount: number) => {
      const req = [...runtimeRequests, ...baseRequests].find(
        (r) => r.id === requestId,
      );
      // Idempotent: apologyCredit overlay stores the absolute amount, so only
      // apply the delta to the client ledger (re-issuing reconciles, never stacks).
      const previous = overlays[requestId]?.apologyCredit ?? 0;
      const delta = amount - previous;
      if (req && delta !== 0) {
        grantApologyCredit(
          req.clientId,
          delta,
          `Apology — ${req.serviceLabel} review`,
          req.bookingId,
        );
      }
      updateRatingOverlay(requestId, { apologyCredit: amount });
      setOverlays(loadRatingOverlays());
    },
    [runtimeRequests, overlays],
  );

  // ─── Tick: due sends + no-response reminders + survey ratings refresh ─────
  useEffect(() => {
    function tick() {
      const now = new Date();
      const freshSettings = loadReputationSettings();
      const freshOverlays = loadRatingOverlays();
      const ratedIds = new Set(
        Object.entries(freshOverlays)
          .filter(([, o]) => o.rating != null)
          .map(([id]) => id),
      );
      setRuntimeRequests((prev) => {
        const due = processDueRequests(prev, now);
        const rem = processSequenceReminders(
          due.requests,
          freshSettings,
          now,
          ratedIds,
        );
        if (due.changedIds.length === 0 && rem.changedIds.length === 0) {
          return prev;
        }
        persistQueue(rem.requests);
        return rem.requests;
      });
      setOverlays(freshOverlays);
    }
    tick(); // run once on mount so anything already due is promoted
    const interval = setInterval(tick, TICK_MS);

    // Pick up ratings submitted on the survey page (other tab) immediately.
    function onStorage(e: StorageEvent) {
      if (e.key === "reputation-ratings") setOverlays(loadRatingOverlays());
    }
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
    };
  }, [persistQueue]);

  const requests = useMemo(
    () =>
      [...runtimeRequests, ...baseRequests].map((r) =>
        applyOverlay(r, overlays[r.id]),
      ),
    [runtimeRequests, overlays],
  );

  // ─── Escalation side effects: manager task + instant bell alert ────────────
  useEffect(() => {
    const open = requests.filter(
      (r) => r.escalatedToManager && r.status !== "closed",
    );
    if (open.length === 0) return;

    let notified: string[] = [];
    try {
      notified = JSON.parse(window.localStorage.getItem(NOTIFIED_KEY) ?? "[]");
    } catch {
      notified = [];
    }
    const notifiedSet = new Set(notified);
    let changed = false;

    for (const req of open) {
      // Route to the responsible staff for this service (one task each).
      const assignees = resolveEscalationAssignees(settings, req.service);
      for (const a of assignees) {
        if (!hasReputationTaskFor(req.id, a.id)) {
          addStandaloneTask(buildReputationEscalationTask(req, a));
        }
      }
      // Fire the instant bell alert once per escalation.
      if (!notifiedSet.has(req.id)) {
        const routedTo = assignees.map((a) => a.name).join(", ");
        addFacilityNotification({
          type: "warning",
          title: `Negative review — action required${req.rating ? ` (${req.rating}★)` : ""}`,
          message: req.feedbackText
            ? `${req.clientName} · ${req.serviceLabel} → ${routedTo}: “${req.feedbackText.slice(0, 60)}${req.feedbackText.length > 60 ? "…" : ""}”`
            : `${req.clientName} rated ${req.petName}'s ${req.serviceLabel} visit ${req.rating ?? ""}★ — routed to ${routedTo}.`,
          facilityId: ESCALATION_FACILITY_ID,
          category: "reputation",
          link: "/facility/dashboard/marketing/reputation-booster",
        });
        notifiedSet.add(req.id);
        changed = true;
      }
    }

    if (changed) {
      window.localStorage.setItem(
        NOTIFIED_KEY,
        JSON.stringify([...notifiedSet]),
      );
    }
    // `settings` is read for escalation routing, so re-run when routes change.
  }, [requests, settings]);

  // ─── Happy-but-silent nudge: one gentle reminder to share publicly ────────
  useEffect(() => {
    const nudges = findHappyNudges(
      requests,
      loadReputationSettings(),
      new Date(),
    );
    if (nudges.length === 0) return;
    const at = new Date().toISOString();
    for (const id of nudges) {
      updateRatingOverlay(id, { happyReminderSentAt: at });
    }
    setOverlays(loadRatingOverlays());
  }, [requests]);

  const value = useMemo<ReputationContextValue>(
    () => ({
      settings,
      updateSettings,
      patchSettings,
      resetSettings,
      requests,
      runtimeRequests,
      recordCheckout,
      cancelScheduled,
      resolveEscalation,
      grantApology,
      lastResult,
    }),
    [
      settings,
      updateSettings,
      patchSettings,
      resetSettings,
      requests,
      runtimeRequests,
      recordCheckout,
      cancelScheduled,
      resolveEscalation,
      grantApology,
      lastResult,
    ],
  );

  return (
    <ReputationContext.Provider value={value}>
      {children}
    </ReputationContext.Provider>
  );
}

export function useReputation() {
  const ctx = useContext(ReputationContext);
  if (!ctx) {
    throw new Error("useReputation must be used within a ReputationProvider");
  }
  return ctx;
}
