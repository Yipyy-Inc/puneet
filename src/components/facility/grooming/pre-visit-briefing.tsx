"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  History,
  Camera,
  Sparkle,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  groomingQueries,
  getMostRecentCompletedAppointment,
} from "@/lib/api/grooming";
import type {
  GroomingAppointment,
  BehaviorTag,
  SessionIssueKind,
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

function formatAnswer(
  _q: CustomQuestion | undefined,
  value: unknown,
): string {
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

  return (
    <div className={cn("space-y-3", isNarrow ? "" : "space-y-4")}>
      {/* Pre-visit form responses */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="text-muted-foreground size-4" />
            Pre-visit Form Responses
          </div>
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
        <div className="px-4 py-3">
          {submission ? (
            <dl
              className={cn(
                "grid gap-x-4 gap-y-3",
                isNarrow ? "grid-cols-1" : "sm:grid-cols-2",
              )}
            >
              {questions.map((q) => {
                const value = submission.answers[q.id];
                if (q.type === "file_upload") return null;
                return (
                  <div key={q.id} className="min-w-0">
                    <dt className="text-muted-foreground text-[10px] uppercase tracking-wide">
                      {q.label}
                    </dt>
                    <dd className="text-sm wrap-break-word">
                      {formatAnswer(q, value)}
                    </dd>
                  </div>
                );
              })}
              {submission.photosFromClient &&
                submission.photosFromClient.length > 0 && (
                  <div className="col-span-full">
                    <dt className="text-muted-foreground mb-1.5 text-[10px] uppercase tracking-wide">
                      Photos from the client
                    </dt>
                    <dd className="flex flex-wrap gap-2">
                      {submission.photosFromClient.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={`${url}-${i}`}
                          src={url}
                          alt={`Client photo ${i + 1}`}
                          className="size-16 rounded-md object-cover ring-1 ring-border"
                        />
                      ))}
                    </dd>
                  </div>
                )}
            </dl>
          ) : (
            <p className="text-muted-foreground text-xs italic">
              The client hasn&apos;t submitted the Express Check-In form yet.
              Staff will collect drop-off details on arrival.
            </p>
          )}
        </div>
      </div>

      {/* Coat + size + service quick facts */}
      <div className="rounded-xl border bg-card shadow-sm">
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
            <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
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
      <div className="rounded-xl border bg-card shadow-sm">
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
                <span className="font-medium text-foreground">
                  {lastVisit.packageName}
                </span>
                {lastVisit.addOns.length > 0 && (
                  <> · {lastVisit.addOns.join(", ")}</>
                )}
              </p>
              {lastVisit.intake?.sessionNotes && (
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
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
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
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
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
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
                      <p className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide">
                        <Camera className="size-3" /> Before
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {lastVisit.intake!.beforePhotos.map((u, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={`b-${u}-${i}`}
                            src={u}
                            alt=""
                            className="size-12 rounded-md object-cover ring-1 ring-border"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {(lastVisit.afterPhotos?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide">
                        <Camera className="size-3" /> After
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {lastVisit.afterPhotos!.map((p) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={p.id}
                            src={p.url}
                            alt=""
                            className="size-12 rounded-md object-cover ring-1 ring-border"
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
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-md px-2.5 py-2 text-center">
      <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
        {label}
      </p>
      <p className="text-xs font-semibold capitalize">{value}</p>
    </div>
  );
}
