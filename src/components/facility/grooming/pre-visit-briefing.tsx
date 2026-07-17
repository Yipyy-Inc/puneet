"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  History,
  Camera,
  Sparkle,
  ShieldAlert,
  DollarSign,
  Plus,
  Ban,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  applyPreApprovedSurcharge,
  hasPreApprovedSurcharge,
} from "@/lib/grooming/pre-approved-surcharge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  groomingQueries,
  getMostRecentCompletedAppointment,
} from "@/lib/api/grooming";
import type {
  GroomingAppointment,
  BehaviorTag,
  SessionIssueKind,
  SurchargeApproval,
} from "@/types/grooming";
import {
  getYipyyGoConfig,
  getFormTemplateForService,
} from "@/data/yipyygo-config";
import type { CustomQuestion } from "@/types/yipyygo";

const FACILITY_ID = 11;

const ISSUE_LABELS: Record<SessionIssueKind, string> = {
  "matting-found": "Matting found",
  "skin-condition": "Skin condition",
  "ear-issue": "Ear issue",
  "nail-issue": "Nail issue",
  "behavioral-concern": "Behavioral concern",
  "injury-during-groom": "Injury during groom",
};

const MOOD_LABELS: Record<BehaviorTag, string> = {
  calm: "Calm",
  happy: "Happy",
  anxious: "Anxious",
  energetic: "Energetic",
  reactive: "Reactive",
  "needed-muzzle": "Needed muzzle",
};

function formatDateLong(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatAnswer(_q: CustomQuestion | undefined, value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return String(value);
}

/**
 * Grooming pre-visit questions live in the unified Yipyy per-service form
 * (formTemplates.grooming.globalCustomQuestions) so they can be edited in one
 * place alongside daycare/boarding/training. Falls back to the global default
 * template if no grooming override is configured yet.
 */
function readQuestions(): CustomQuestion[] {
  const config = getYipyyGoConfig(FACILITY_ID);
  if (!config) return [];
  return getFormTemplateForService(config, "grooming").globalCustomQuestions;
}

export function PreVisitBriefing({
  appointment,
  layout = "wide",
}: {
  appointment: GroomingAppointment;
  /** "wide" renders 3-column grids; "narrow" stacks for a 420px side-sheet. */
  layout?: "wide" | "narrow";
}) {
  const { data: allAppointments = [] } = useQuery(
    groomingQueries.appointments(),
  );
  const lastVisit = useMemo(
    () =>
      getMostRecentCompletedAppointment(
        appointment.petId,
        allAppointments,
        appointment.id,
      ),
    [allAppointments, appointment.petId, appointment.id],
  );

  const questions = readQuestions();
  const submission = appointment.expressCheckinSubmission;
  const isNarrow = layout === "narrow";

  // Photo lightbox (expandable thumbnails) + full-form drawer.
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [fullFormOpen, setFullFormOpen] = useState(false);

  // Client price pre-approvals (Table 103). Local state just tracks which fees
  // were added this session so the button flips to "Added"; the source of truth
  // is the appointment's priceAdjustments (mutated by the helper).
  const surchargeApprovals = submission?.surchargeApprovals ?? [];
  const [, forceRerender] = useState(0);

  const handleAddFee = (approval: SurchargeApproval) => {
    const adj = applyPreApprovedSurcharge(appointment, approval);
    if (adj) {
      forceRerender((n) => n + 1);
      toast.success(
        `Added $${approval.amount} ${approval.label.toLowerCase()} to ${appointment.petName}'s appointment`,
      );
    } else {
      toast.info("This fee has already been added.");
    }
  };

  return (
    <div className={cn("space-y-3", isNarrow ? "" : "space-y-4")}>
      {/* Pre-visit form responses */}
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="text-muted-foreground size-4" />
            Pre-visit Form Responses
          </div>
          <div className="flex items-center gap-2">
            {submission && (
              <button
                type="button"
                onClick={() => setFullFormOpen(true)}
                className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                View Full Form
              </button>
            )}
            {submission ? (
              <Badge
                className="border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                title={`Submitted ${new Date(submission.submittedAt).toLocaleString("en-CA")}`}
              >
                <CheckCircle2 className="mr-1 size-3" />
                Checked in by client
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <Clock className="mr-1 size-3" />
                Form pending
              </Badge>
            )}
          </div>
        </div>
        <div className="px-4 py-3">
          {submission ? (
            <dl
              className={cn(
                "grid gap-x-4 gap-y-3",
                isNarrow ? "grid-cols-1" : "sm:grid-cols-2",
              )}
            >
              {/* Photo thumbnails render in a row ABOVE the Q&A (Table 104).
                  Tap any thumbnail to expand. */}
              {submission.photosFromClient &&
                submission.photosFromClient.length > 0 && (
                  <div className="col-span-full">
                    <dt className="text-muted-foreground mb-1.5 text-[10px] tracking-wide uppercase">
                      Photos from the client
                    </dt>
                    <dd className="flex flex-wrap gap-2">
                      {submission.photosFromClient.map((url, i) => (
                        <button
                          key={`${url}-${i}`}
                          type="button"
                          onClick={() => setLightboxUrl(url)}
                          title="Tap to expand"
                          className="group focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Client photo ${i + 1}`}
                            className="ring-border size-16 rounded-md object-cover ring-1 transition-transform group-hover:scale-105"
                          />
                        </button>
                      ))}
                    </dd>
                  </div>
                )}
              {questions.map((q) => {
                const value = submission.answers[q.id];
                if (q.type === "file_upload") return null;
                return (
                  <div key={q.id} className="min-w-0">
                    <dt className="text-muted-foreground text-[10px] tracking-wide uppercase">
                      {q.label}
                    </dt>
                    <dd className="text-sm wrap-break-word">
                      {formatAnswer(q, value)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          ) : (
            <p className="text-muted-foreground text-xs italic">
              The client hasn&apos;t submitted the Express Check-In form yet.
              Staff will collect drop-off details on arrival.
            </p>
          )}
        </div>
      </div>

      {/* Client price pre-approvals (Table 103) */}
      {surchargeApprovals.length > 0 && (
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
            <DollarSign className="text-muted-foreground size-4" />
            Price Pre-Approvals
          </div>
          <div className="space-y-2 px-4 py-3">
            {surchargeApprovals.map((sa) => {
              const decidedLabel = new Date(sa.decidedAt).toLocaleString(
                "en-CA",
                {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                },
              );
              if (sa.decision === "approved") {
                const alreadyAdded = hasPreApprovedSurcharge(appointment, sa);
                return (
                  <div
                    key={sa.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/30"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                        <CheckCircle2 className="mr-1 inline size-3.5" />
                        Client approved {sa.label.toLowerCase()} (+$
                        {sa.amount})
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80">
                        Approved {decidedLabel} — add the fee without calling.
                      </p>
                    </div>
                    {alreadyAdded ? (
                      <Badge className="shrink-0 border-0 bg-emerald-600 text-white">
                        <CheckCircle2 className="mr-1 size-3" />
                        Added
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="h-8 shrink-0 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => handleAddFee(sa)}
                      >
                        <Plus className="size-3.5" />
                        Add ${sa.amount} fee
                      </Button>
                    )}
                  </div>
                );
              }
              return (
                <div
                  key={sa.id}
                  className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/30"
                >
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    <Ban className="mr-1 inline size-3.5" />
                    Client declined {sa.label.toLowerCase()} pre-approval —
                    discuss at drop-off
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300/80">
                    Declined {decidedLabel}. Don&apos;t add the ${sa.amount} fee
                    without talking to the owner first.
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Coat + size + service quick facts */}
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
          <Sparkle className="text-muted-foreground size-4" />
          Pet &amp; Service
        </div>
        <div
          className={cn(
            "grid gap-3 px-4 py-3",
            isNarrow ? "grid-cols-2" : "sm:grid-cols-4",
          )}
        >
          <Fact label="Coat" value={appointment.coatType} />
          <Fact label="Size" value={appointment.petSize} />
          <Fact label="Weight" value={`${appointment.petWeight} lbs`} />
          <Fact label="Service" value={appointment.packageName} />
        </div>
        {appointment.addOns.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t px-4 py-2.5">
            <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
              Add-ons
            </span>
            {appointment.addOns.map((ao) => (
              <Badge key={ao} variant="secondary" className="text-xs">
                {ao}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Last visit recap */}
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <History className="text-muted-foreground size-4" />
            Last Visit
          </div>
          {lastVisit && (
            <span className="text-muted-foreground text-[11px]">
              {formatDateLong(lastVisit.date)} · {lastVisit.stylistName}
            </span>
          )}
        </div>
        <div className="px-4 py-3">
          {lastVisit ? (
            <div className="space-y-2.5 text-sm">
              <p className="text-muted-foreground text-xs">
                <span className="text-foreground font-medium">
                  {lastVisit.packageName}
                </span>
                {lastVisit.addOns.length > 0 && (
                  <> · {lastVisit.addOns.join(", ")}</>
                )}
              </p>
              {lastVisit.intake?.sessionNotes && (
                <div>
                  <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                    Groomer&apos;s notes
                  </p>
                  <p className="text-sm/snug">
                    {lastVisit.intake.sessionNotes}
                  </p>
                </div>
              )}
              {lastVisit.intake?.moodTags &&
                lastVisit.intake.moodTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
                      Mood
                    </span>
                    {lastVisit.intake.moodTags.map((t) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="text-[10px] capitalize"
                      >
                        {MOOD_LABELS[t]}
                      </Badge>
                    ))}
                  </div>
                )}
              {(lastVisit.intake?.issues?.length ?? 0) > 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 dark:border-amber-900 dark:bg-amber-950/30">
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wide text-amber-800 uppercase dark:text-amber-200">
                    <ShieldAlert className="size-3" />
                    Issues flagged last time
                  </p>
                  <ul className="space-y-0.5">
                    {lastVisit.intake!.issues!.map((iss) => (
                      <li
                        key={iss.id}
                        className="text-amber-900 dark:text-amber-100"
                      >
                        <span className="font-medium">
                          {ISSUE_LABELS[iss.kind]}
                        </span>
                        {iss.note ? ` — ${iss.note}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {((lastVisit.intake?.beforePhotos?.length ?? 0) > 0 ||
                (lastVisit.afterPhotos?.length ?? 0) > 0) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(lastVisit.intake?.beforePhotos?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px] tracking-wide uppercase">
                        <Camera className="size-3" /> Before
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {lastVisit.intake!.beforePhotos.map((u, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={`b-${u}-${i}`}
                            src={u}
                            alt=""
                            className="ring-border size-12 rounded-md object-cover ring-1"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {(lastVisit.afterPhotos?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px] tracking-wide uppercase">
                        <Camera className="size-3" /> After
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {lastVisit.afterPhotos!.map((p) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={p.id}
                            src={p.url}
                            alt=""
                            className="ring-border size-12 rounded-md object-cover ring-1"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs italic">
              No prior visits on file for {appointment.petName}.
            </p>
          )}
        </div>
      </div>

      {/* Expandable photo lightbox — click any client thumbnail to enlarge. */}
      <Dialog
        open={!!lightboxUrl}
        onOpenChange={(o) => !o && setLightboxUrl(null)}
      >
        <DialogContent className="max-w-2xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Client photo</DialogTitle>
          </DialogHeader>
          {lightboxUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightboxUrl}
              alt="Client photo (enlarged)"
              className="max-h-[80vh] w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Full Express Check-In form in a side drawer. */}
      <Sheet open={fullFormOpen} onOpenChange={setFullFormOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ClipboardList className="size-4" />
              Express Check-In Form
            </SheetTitle>
          </SheetHeader>
          {submission ? (
            <div className="space-y-4 px-4 pb-6">
              <p className="text-muted-foreground text-xs">
                Submitted{" "}
                {new Date(submission.submittedAt).toLocaleString("en-CA")}
              </p>
              <dl className="space-y-3">
                {questions.map((q) => {
                  if (q.type === "file_upload") return null;
                  return (
                    <div key={q.id}>
                      <dt className="text-muted-foreground text-[10px] tracking-wide uppercase">
                        {q.label}
                      </dt>
                      <dd className="text-sm wrap-break-word">
                        {formatAnswer(q, submission.answers[q.id])}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              {submission.photosFromClient &&
                submission.photosFromClient.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-1.5 text-[10px] tracking-wide uppercase">
                      Photos from the client
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {submission.photosFromClient.map((url, i) => (
                        <button
                          key={`full-${url}-${i}`}
                          type="button"
                          onClick={() => setLightboxUrl(url)}
                          title="Click to enlarge"
                          className="focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Client photo ${i + 1}`}
                            className="ring-border aspect-square w-full rounded-md object-cover ring-1"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <p className="text-muted-foreground px-4 text-xs italic">
              The client hasn&apos;t submitted the Express Check-In form yet.
            </p>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-md px-2.5 py-2 text-center">
      <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
        {label}
      </p>
      <p className="text-xs font-semibold capitalize">{value}</p>
    </div>
  );
}
