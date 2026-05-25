"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  AlarmClock,
  Ban,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  GripVertical,
  Hourglass,
  Inbox,
  Mail,
  MailCheck,
  MinusCircle,
  Phone,
  RotateCcw,
  Send,
  StickyNote,
  Sun,
  Sunrise,
  Sunset,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import type {
  TrainingEnrollment,
  WaitlistOffer,
} from "@/lib/training-enrollment";
import type { TrainingSeries } from "@/lib/training-series";
import { clients } from "@/data/clients";

interface Props {
  series: TrainingSeries;
}

function formatDateLong(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type PreferredTimeOfDay = "morning" | "afternoon" | "no-preference";

const TIME_PREFERENCE_META: Record<
  PreferredTimeOfDay,
  { label: string; icon: LucideIcon; cls: string }
> = {
  morning: {
    label: "Morning",
    icon: Sunrise,
    cls: "border-amber-200 bg-amber-50 text-amber-700",
  },
  afternoon: {
    label: "Afternoon",
    icon: Sunset,
    cls: "border-orange-200 bg-orange-50 text-orange-700",
  },
  "no-preference": {
    label: "Any time",
    icon: Sun,
    cls: "border-slate-200 bg-slate-50 text-slate-600",
  },
};

function relativeDays(iso: string, todayISO: string): string {
  const today = new Date(`${todayISO}T00:00:00`).getTime();
  const target = new Date(`${iso}T00:00:00`).getTime();
  const days = Math.round((today - target) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export function SeriesWaitlistTab({ series }: Props) {
  const queryClient = useQueryClient();
  const todayISO = useMemo(
    () => new Date().toISOString().split("T")[0]!,
    [],
  );

  const { data: enrollments = [] } = useQuery(
    trainingQueries.seriesEnrollments(series.id),
  );
  const { data: moduleSettings } = useQuery(trainingQueries.moduleSettings());
  const holdHours = Math.max(1, moduleSettings?.waitlistHoldHours ?? 24);
  const reminderHours = Math.max(1, Math.round(holdHours / 2));

  const [offerTarget, setOfferTarget] = useState<TrainingEnrollment | null>(
    null,
  );
  const [removeTarget, setRemoveTarget] = useState<TrainingEnrollment | null>(
    null,
  );
  const [cancelTarget, setCancelTarget] = useState<TrainingEnrollment | null>(
    null,
  );

  // Re-render at a steady cadence so the "expires in Xh Ym" countdown ticks
  // forward without each row needing its own interval.
  const [, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const nowMs = Date.now();

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = waitlist.findIndex((e) => e.id === active.id);
    const newIndex = waitlist.findIndex((e) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(waitlist, oldIndex, newIndex);
    const nowISO = new Date().toISOString();
    // Persist explicit positions 1..N for every visible entry so the new
    // priority order survives re-renders + auto-promotion.
    reordered.forEach((entry, idx) => {
      const position = idx + 1;
      if (entry.waitlistPosition === position) return;
      updateEnrollmentInCaches(entry.id, (e) => ({
        ...e,
        waitlistPosition: position,
        updatedAt: nowISO,
      }));
    });
    const moved = reordered[newIndex]!;
    toast(
      `${moved.petName} is now #${newIndex + 1} on the waitlist.`,
      {
        description:
          newIndex < oldIndex
            ? "They'll be offered the next available spot before the others below."
            : "They'll be offered a spot after the people above them.",
      },
    );
  }

  // Resolve each pet's photo from the clients mock so the row renders with
  // a real avatar — the waitlist is much more humanizing with a face.
  const petImageByPetId = useMemo(() => {
    const m = new Map<number, string | undefined>();
    for (const c of clients) {
      for (const pet of c.pets) m.set(pet.id, pet.imageUrl);
    }
    return m;
  }, []);

  // Order priority: manager-set `waitlistPosition` first (lower = higher
  // priority), then signup date as the first-come-first-served tiebreaker
  // for entries that have never been manually re-ordered.
  const waitlist = useMemo(() => {
    return enrollments
      .filter((e) => e.status === "waitlisted")
      .slice()
      .sort(compareWaitlistPosition);
  }, [enrollments]);

  const enrolledCount = useMemo(
    () => enrollments.filter((e) => e.status === "enrolled").length,
    [enrollments],
  );
  const spotsLeft = Math.max(0, series.maxCapacity - enrolledCount);
  const seriesEnded =
    series.status === "completed" || series.status === "cancelled";

  function updateEnrollmentInCaches(
    enrollmentId: string,
    update: (e: TrainingEnrollment) => TrainingEnrollment | null,
  ) {
    const cache = queryClient.getQueryCache();
    cache
      .findAll({ queryKey: ["training", "series-enrollments"] })
      .forEach((query) => {
        queryClient.setQueryData<TrainingEnrollment[]>(
          query.queryKey,
          (prev = []) => {
            const idx = prev.findIndex((e) => e.id === enrollmentId);
            if (idx === -1) return prev;
            const next = prev.slice();
            const updated = update(prev[idx]!);
            if (updated === null) {
              next.splice(idx, 1);
            } else {
              next[idx] = updated;
            }
            return next;
          },
        );
      });
    // The per-series detail also reads `seriesEnrollments(seriesId)` which
    // lives under ["training","series", seriesId, "enrollments"].
    cache
      .findAll({ queryKey: ["training", "series"] })
      .forEach((query) => {
        const key = query.queryKey;
        if (key[3] !== "enrollments") return;
        queryClient.setQueryData<TrainingEnrollment[]>(
          key,
          (prev = []) => {
            const idx = prev.findIndex((e) => e.id === enrollmentId);
            if (idx === -1) return prev;
            const next = prev.slice();
            const updated = update(prev[idx]!);
            if (updated === null) {
              next.splice(idx, 1);
            } else {
              next[idx] = updated;
            }
            return next;
          },
        );
      });
  }

  function buildOffer(): WaitlistOffer {
    const sent = new Date();
    const expires = new Date(sent.getTime() + holdHours * 60 * 60 * 1000);
    return {
      sentAtISO: sent.toISOString(),
      expiresAtISO: expires.toISOString(),
      reminderSentAtISO: null,
      outcome: "active",
    };
  }

  function handleOfferSpot() {
    if (!offerTarget) return;
    const offer = buildOffer();
    updateEnrollmentInCaches(offerTarget.id, (e) => ({
      ...e,
      offer,
      updatedAt: new Date().toISOString(),
    }));
    toast.success(
      `Offer sent to ${offerTarget.ownerName} — SMS + email holding the spot for ${holdHours}h.`,
      {
        description: `${offerTarget.petName} stays on the waitlist until they confirm or the hold expires.`,
        duration: 6_000,
      },
    );
    setOfferTarget(null);
  }

  function handleCancelOffer() {
    if (!cancelTarget) return;
    const nowISO = new Date().toISOString();
    updateEnrollmentInCaches(cancelTarget.id, (e) => ({
      ...e,
      offer: e.offer
        ? {
            ...e.offer,
            outcome: "cancelled",
            cancelledAtISO: nowISO,
          }
        : undefined,
      updatedAt: nowISO,
    }));
    toast(
      `Offer to ${cancelTarget.ownerName} cancelled. ${cancelTarget.petName} stays on the waitlist.`,
    );
    setCancelTarget(null);
  }

  function handleRemove() {
    if (!removeTarget) return;
    updateEnrollmentInCaches(removeTarget.id, () => null);
    toast(`${removeTarget.petName} removed from the waitlist.`);
    setRemoveTarget(null);
  }

  // ──── Offer lifecycle tick ──────────────────────────────────────────
  // Once per render (mount + every 30s via the `nowTick` re-render), scan
  // the active offers and fire reminders / expirations whose time has come.
  // We use a ref to dedupe so toasts only land once per state transition.
  const processedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const reminderWindowMs = reminderHours * 60 * 60 * 1000;
    for (const entry of enrollments) {
      if (entry.status !== "waitlisted") continue;
      const offer = entry.offer;
      if (!offer || offer.outcome !== "active") continue;
      const expiresMs = new Date(offer.expiresAtISO).getTime();
      const sentMs = new Date(offer.sentAtISO).getTime();

      if (nowMs >= expiresMs) {
        const dedupeKey = `expire:${entry.id}:${offer.expiresAtISO}`;
        if (processedRef.current.has(dedupeKey)) continue;
        processedRef.current.add(dedupeKey);
        const expiredISO = new Date().toISOString();
        updateEnrollmentInCaches(entry.id, (e) => ({
          ...e,
          offer: e.offer
            ? {
                ...e.offer,
                outcome: "expired",
                expiredAtISO: expiredISO,
              }
            : undefined,
          updatedAt: expiredISO,
        }));
        // Find next waitlist person without an active offer and send them one.
        // Use the same priority order as the rendered list so manager
        // re-ordering carries through to auto-promotion.
        const nextCandidate = enrollments
          .filter(
            (e) =>
              e.id !== entry.id &&
              e.status === "waitlisted" &&
              (!e.offer || e.offer.outcome !== "active"),
          )
          .sort(compareWaitlistPosition)[0];
        if (nextCandidate) {
          const nextOffer = buildOffer();
          updateEnrollmentInCaches(nextCandidate.id, (e) => ({
            ...e,
            offer: nextOffer,
            updatedAt: expiredISO,
          }));
          toast.warning(
            `${entry.petName} let the spot expire — auto-offered to ${nextCandidate.petName} (${nextCandidate.ownerName}).`,
            { duration: 8_000 },
          );
        } else {
          toast.warning(
            `${entry.petName} let the spot expire. No one else is on the waitlist.`,
            { duration: 8_000 },
          );
        }
        continue;
      }

      // Reminder check — fires once when wall clock crosses sentAt + reminderHours.
      if (
        !offer.reminderSentAtISO &&
        nowMs >= sentMs + reminderWindowMs
      ) {
        const dedupeKey = `remind:${entry.id}:${offer.sentAtISO}`;
        if (processedRef.current.has(dedupeKey)) continue;
        processedRef.current.add(dedupeKey);
        const reminderISO = new Date().toISOString();
        updateEnrollmentInCaches(entry.id, (e) => ({
          ...e,
          offer: e.offer
            ? { ...e.offer, reminderSentAtISO: reminderISO }
            : undefined,
          updatedAt: reminderISO,
        }));
        toast(
          `Reminder sent to ${entry.ownerName} — ${entry.petName}'s offer expires in ${reminderHours}h.`,
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollments, nowMs, reminderHours, holdHours]);

  if (waitlist.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-12 text-center text-sm">
        <Inbox className="text-muted-foreground/30 mx-auto mb-2 size-8" />
        <p className="font-medium text-slate-700">No one on the waitlist.</p>
        <p className="text-muted-foreground mt-1">
          When the series fills up, clients who try to enroll can be added
          here so you can offer them a spot if room opens up.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header strip — spots-left vs waitlist length context. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
        <div className="flex items-center gap-3 text-slate-700">
          <Hourglass className="text-amber-500 size-4" />
          <span>
            <span className="font-semibold tabular-nums text-slate-900">
              {waitlist.length}
            </span>{" "}
            on the waitlist
            <span className="text-muted-foreground">
              {" "}
              · series capacity{" "}
              <span className="font-semibold tabular-nums text-slate-700">
                {enrolledCount}
              </span>
              /{series.maxCapacity}
            </span>
          </span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "gap-1 border",
            spotsLeft > 0
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-600",
          )}
        >
          {spotsLeft > 0 ? (
            <>
              <CheckCircle2 className="size-3" />
              {spotsLeft} spot{spotsLeft === 1 ? "" : "s"} available
            </>
          ) : (
            <>Series full</>
          )}
        </Badge>
      </div>

      {/* Numbered, drag-reorderable list */}
      <DndContext
        sensors={dndSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={waitlist.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {waitlist.map((entry, idx) => {
              const position = idx + 1;
              const petImage = petImageByPetId.get(entry.petId);
              return (
                <SortableWaitlistRow key={entry.id} id={entry.id}>
                  <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                    {/* Drag handle + Position chip */}
                    <div className="flex shrink-0 items-center gap-2">
                      <WaitlistDragHandle petName={entry.petName} />
                      <div className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <span className="text-sm font-bold tabular-nums">
                          #{position}
                        </span>
                      </div>
                  {petImage ? (
                    <div className="size-10 overflow-hidden rounded-xl ring-2 ring-white shadow-sm">
                      <Image
                        src={petImage}
                        alt={entry.petName}
                        width={40}
                        height={40}
                        className="size-full object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl ring-2 ring-white shadow-sm text-[10px] font-semibold">
                      {entry.petName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Identity + contact */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="text-sm font-semibold text-slate-800">
                      {entry.petName}
                    </p>
                    <span className="text-muted-foreground text-[11.5px]">
                      {entry.petBreed}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      ·
                    </span>
                    <span className="text-[12px] text-slate-700">
                      {entry.ownerName}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                    {entry.ownerPhone && (
                      <a
                        href={`tel:${entry.ownerPhone}`}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                      >
                        <Phone className="size-3" />
                        {entry.ownerPhone}
                      </a>
                    )}
                    {entry.ownerEmail && (
                      <a
                        href={`mailto:${entry.ownerEmail}`}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 truncate"
                      >
                        <Mail className="size-3" />
                        {entry.ownerEmail}
                      </a>
                    )}
                    <span
                      className="text-muted-foreground inline-flex items-center gap-1"
                      title={`Joined ${relativeDays(entry.enrollmentDate, todayISO)}`}
                    >
                      <CalendarClock className="size-3" />
                      Joined {formatDateLong(entry.enrollmentDate)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PreferredTimeBadge
                      preference={entry.preferredTimeOfDay}
                    />
                    <OfferStateBadge offer={entry.offer} nowMs={nowMs} />
                  </div>
                  {entry.notes && (
                    <div className="text-muted-foreground inline-flex items-start gap-1 rounded-md bg-slate-50 px-2 py-1 text-[11.5px] leading-snug dark:bg-slate-900/40">
                      <StickyNote className="size-3 mt-0.5 shrink-0" />
                      <span className="font-medium text-slate-700">
                        {entry.notes}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <RowActions
                  entry={entry}
                  spotsLeft={spotsLeft}
                  seriesEnded={seriesEnded}
                  holdHours={holdHours}
                  onOffer={() => setOfferTarget(entry)}
                  onCancel={() => setCancelTarget(entry)}
                  onRemove={() => setRemoveTarget(entry)}
                />
              </div>
            </SortableWaitlistRow>
          );
        })}
          </ul>
        </SortableContext>
      </DndContext>

      <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
        <GripVertical className="size-3" />
        Drag rows to re-prioritize. The next available spot offers to whoever
        sits at the top.
      </p>

      {/* Offer-spot confirmation */}
      <Dialog
        open={!!offerTarget}
        onOpenChange={(o) => !o && setOfferTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Send className="size-5 text-emerald-600" />
              Send offer to {offerTarget?.ownerName}?
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              We&apos;ll text and email {offerTarget?.ownerName} a confirmation
              link for{" "}
              <span className="font-medium">{series.seriesName}</span> (starts{" "}
              {formatDateLong(series.startDate)}) and hold the spot for{" "}
              <span className="font-semibold tabular-nums">{holdHours}h</span>.
              A reminder fires at {reminderHours}h. If they don&apos;t confirm
              in time, the spot auto-moves to the next person on the list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOfferTarget(null)}
              className="h-10 w-full sm:w-auto"
            >
              Not yet
            </Button>
            <Button
              type="button"
              onClick={handleOfferSpot}
              className="h-10 w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
            >
              <Send className="mr-1.5 size-4" />
              Send offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel-offer confirmation */}
      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cancel the offer to {cancelTarget?.ownerName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The pending invitation will be voided. {cancelTarget?.petName}{" "}
              stays on the waitlist and you can re-offer the spot later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the offer</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOffer}
              className="bg-slate-600 text-white hover:bg-slate-700"
            >
              <Ban className="mr-1.5 size-4" />
              Cancel offer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove confirmation */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {removeTarget?.petName} from the waitlist?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.ownerName} won&apos;t be notified automatically.
              They can re-join the waitlist if they want.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              <Trash2 className="mr-1.5 size-4" />
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function compareWaitlistPosition(
  a: TrainingEnrollment,
  b: TrainingEnrollment,
): number {
  const aHas = a.waitlistPosition !== undefined;
  const bHas = b.waitlistPosition !== undefined;
  if (aHas && bHas) {
    return (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0);
  }
  // Manager-positioned entries always sit above un-positioned (newly-joined)
  // ones, which retain first-come-first-served order among themselves.
  if (aHas !== bHas) return aHas ? -1 : 1;
  return a.enrollmentDate.localeCompare(b.enrollmentDate);
}

function SortableWaitlistRow({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  // We expose the drag-handle's listeners through React context so the
  // dedicated grip button inside the row can attach them. Stuffing the
  // handle props on the whole `<li>` would make every contact point
  // grabbable, which fights the action buttons + tappable contact links.
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "bg-card rounded-xl border shadow-sm transition-shadow",
        isDragging && "shadow-lg ring-2 ring-indigo-200",
      )}
    >
      <DragHandleContext.Provider value={{ attributes, listeners }}>
        {children}
      </DragHandleContext.Provider>
    </li>
  );
}

type DragHandleProps = {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
};

// Per-row dnd-kit handle attributes flow through context so only the grip
// button is grabbable — the rest of the card stays clickable.
const DragHandleContext = createContext<DragHandleProps | null>(null);

function WaitlistDragHandle({ petName }: { petName: string }) {
  const ctx = useContext(DragHandleContext);
  if (!ctx) return null;
  return (
    <button
      type="button"
      {...ctx.attributes}
      {...ctx.listeners}
      className="text-muted-foreground hover:text-foreground -ml-1 cursor-grab touch-none rounded p-1 active:cursor-grabbing"
      title="Drag to re-prioritize"
      aria-label={`Drag handle for ${petName}`}
    >
      <GripVertical className="size-4" />
    </button>
  );
}

function OfferStateBadge({
  offer,
  nowMs,
}: {
  offer: WaitlistOffer | undefined;
  nowMs: number;
}) {
  if (!offer) return null;
  if (offer.outcome === "accepted") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
      >
        <CheckCircle2 className="size-3" />
        Offer accepted
      </Badge>
    );
  }
  if (offer.outcome === "cancelled") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-slate-200 bg-slate-50 text-[10px] text-slate-600"
      >
        <Ban className="size-3" />
        Offer cancelled
      </Badge>
    );
  }
  if (offer.outcome === "expired") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700"
        title={
          offer.expiredAtISO
            ? `Expired ${new Date(offer.expiredAtISO).toLocaleString()}`
            : undefined
        }
      >
        <AlarmClock className="size-3" />
        Offer expired — no response
      </Badge>
    );
  }
  // Active offer — show countdown.
  const expiresMs = new Date(offer.expiresAtISO).getTime();
  const remainingMs = Math.max(0, expiresMs - nowMs);
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <Badge
        variant="outline"
        className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-800"
        title={`Sent ${new Date(offer.sentAtISO).toLocaleString()} · expires ${new Date(offer.expiresAtISO).toLocaleString()}`}
      >
        <Send className="size-3" />
        Offer sent · expires in {formatRemaining(remainingMs)}
      </Badge>
      {offer.reminderSentAtISO && (
        <Badge
          variant="outline"
          className="gap-1 border-sky-200 bg-sky-50 text-[10px] text-sky-700"
          title={`Reminder sent ${new Date(offer.reminderSentAtISO).toLocaleString()}`}
        >
          <MailCheck className="size-3" />
          Reminder sent
        </Badge>
      )}
    </div>
  );
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function RowActions({
  entry,
  spotsLeft,
  seriesEnded,
  holdHours,
  onOffer,
  onCancel,
  onRemove,
}: {
  entry: TrainingEnrollment;
  spotsLeft: number;
  seriesEnded: boolean;
  holdHours: number;
  onOffer: () => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const offer = entry.offer;
  const isActive = offer?.outcome === "active";

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {isActive ? (
        <>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground h-9 gap-1.5"
            title="Open the customer's confirmation link in a new tab."
          >
            <a
              href={`/customer/training/accept-offer/${entry.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-3.5" />
              View link
            </a>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="h-9 gap-1.5"
            title="Cancel the pending offer and keep them on the waitlist."
          >
            <Ban className="size-3.5" />
            Cancel offer
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          onClick={onOffer}
          disabled={spotsLeft === 0 || seriesEnded}
          title={
            spotsLeft === 0
              ? "Series is full — wait for a spot to open."
              : seriesEnded
                ? "Series is finished — no spots to offer."
                : `Send ${entry.petName}'s owner an SMS + email holding the spot for ${holdHours}h.`
          }
          className="h-9 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {offer?.outcome === "expired" ? (
            <>
              <RotateCcw className="size-3.5" />
              Re-offer spot
            </>
          ) : (
            <>
              <Send className="size-3.5" />
              Offer spot
            </>
          )}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={onRemove}
        className="h-9 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
        title="Remove from waitlist"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

function PreferredTimeBadge({
  preference,
}: {
  preference: PreferredTimeOfDay | undefined;
}) {
  if (!preference) {
    // No preference on file — the client didn't pick one when joining the
    // waitlist. Show a quiet "not specified" chip so staff don't wonder
    // whether the data is missing or the client genuinely had no preference.
    return (
      <Badge
        variant="outline"
        className="gap-1 border-slate-200 bg-white text-[10px] text-slate-500"
      >
        <MinusCircle className="size-3" />
        Time preference not specified
      </Badge>
    );
  }
  const meta = TIME_PREFERENCE_META[preference];
  const Icon = meta.icon;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 border text-[10px]", meta.cls)}
      title={`Prefers ${meta.label.toLowerCase()} sessions`}
    >
      <Icon className="size-3" />
      Prefers {meta.label}
    </Badge>
  );
}
