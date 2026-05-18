/**
 * Training Report Card helpers.
 *
 * A training report card is a cumulative progress summary across every
 * session in an enrollment up to `throughSessionNumber`. This module owns:
 *   - `buildTrainingReportCard()` — pure builder that turns attendance
 *     records into a draft card (used by auto-generation on session
 *     completion + the mock seed).
 *   - Cache fan-out helpers mirroring the homework pattern so the per-pet
 *     tab, the customer view, and any future global board stay in sync via
 *     a single mutation.
 */
import type { QueryClient } from "@tanstack/react-query";
import type {
  SessionAttendance,
  TrainingEnrollment,
  TrainingLevel,
  TrainingReportCard,
  TrainingReportCardExerciseSummary,
  TrainingReportCardHomework,
  TrainingReportCardKind,
  TrainingReportCardPhoto,
} from "@/lib/training-enrollment";
import type { ReportCardTheme } from "@/types/pet";

/** Ordered Training Level progression — iterate this for segmented pickers
 *  so the visual order matches the journey arc (newcomer → mastery). */
export const TRAINING_LEVELS: readonly TrainingLevel[] = [
  "foundation",
  "progressing",
  "developing",
  "proficient",
  "excellent",
] as const;

export const TRAINING_LEVEL_LABELS: Record<TrainingLevel, string> = {
  foundation: "Foundation",
  progressing: "Progressing",
  developing: "Developing",
  proficient: "Proficient",
  excellent: "Excellent",
};

/** One-line hints surfaced under the level badge in the trainer-side
 *  picker. Helps standardize how trainers map skill to badge. */
export const TRAINING_LEVEL_HELP: Record<TrainingLevel, string> = {
  foundation: "Brand new — building the very first habits.",
  progressing: "Learning the basics — reliable in low-distraction.",
  developing: "Building skill — generalizing to new contexts.",
  proficient: "Skills are solid — consistent under distraction.",
  excellent: "Top-tier — ready for advanced challenges or competition.",
};

/** Escalating palette: slate → sky → indigo → emerald → amber. */
export const TRAINING_LEVEL_BADGE_CLS: Record<TrainingLevel, string> = {
  foundation: "border-slate-200 bg-slate-50 text-slate-700",
  progressing: "border-sky-200 bg-sky-50 text-sky-700",
  developing: "border-indigo-200 bg-indigo-50 text-indigo-700",
  proficient: "border-emerald-200 bg-emerald-50 text-emerald-700",
  excellent: "border-amber-200 bg-amber-50 text-amber-700",
};

/** Theme metadata used by both trainer (preview swatch) + customer (top
 *  accent bar). Themes that should feel celebratory get richer gradients;
 *  the everyday theme is intentionally subtle. */
export const REPORT_CARD_THEME_LABELS: Record<ReportCardTheme, string> = {
  everyday: "Everyday",
  halloween: "Halloween",
  christmas: "Christmas",
  valentines: "Valentines",
  easter: "Easter",
  summer: "Summer",
  winter: "Winter",
};

export const REPORT_CARD_THEME_ACCENT: Record<ReportCardTheme, string> = {
  everyday: "from-indigo-200 via-sky-200 to-indigo-200",
  halloween: "from-orange-400 via-purple-500 to-orange-500",
  christmas: "from-rose-500 via-emerald-500 to-rose-500",
  valentines: "from-pink-400 via-rose-500 to-pink-400",
  easter: "from-yellow-300 via-pink-300 to-sky-300",
  summer: "from-amber-300 via-orange-400 to-pink-400",
  winter: "from-sky-300 via-indigo-300 to-sky-400",
};

/** Small dot used in segmented pickers + label rows so the theme reads at
 *  a glance without needing the full accent bar. */
export const REPORT_CARD_THEME_DOT: Record<ReportCardTheme, string> = {
  everyday: "bg-indigo-300",
  halloween: "bg-orange-500",
  christmas: "bg-emerald-500",
  valentines: "bg-pink-500",
  easter: "bg-yellow-400",
  summer: "bg-amber-400",
  winter: "bg-sky-400",
};

interface BuildInput {
  kind: TrainingReportCardKind;
  enrollment: TrainingEnrollment;
  /** Every attendance record on file for the enrollment. The builder filters
   *  down to records with sessionNumber ≤ throughSessionNumber so the
   *  cumulative numbers stay honest. */
  attendances: SessionAttendance[];
  /** The latest session this card should cover. For series-completion cards
   *  pass `enrollment.totalSessions`. */
  throughSessionNumber: number;
  /** Trainer who triggered the draft — used as createdBy. */
  createdBy: string;
  createdById: number;
  /** ISO timestamp for `createdAt`. Defaults to "now" when omitted but the
   *  auto-generator passes the session date so mock data stays
   *  deterministic. */
  createdAt?: string;
  /** ISO date for the card (matches session date or series end date). */
  date: string;
  /** The dog's avatar URL, resolved by the caller from `Pet.imageUrl`.
   *  Optional because not every facility has photos on file yet. */
  petImageUrl?: string;
  /** Homework records assigned alongside this report card — the owner sees
   *  these as a "what to work on" block. The auto-generator passes the
   *  homework it just created; mock seeds can pass an empty array. */
  assignedHomework?: TrainingReportCardHomework[];
  /** Trainer-uploaded session photos. Empty by default — reserved for the
   *  future session-photo-upload flow. */
  photos?: TrainingReportCardPhoto[];
  /** Optional override — when not provided, the narrative is auto-drafted
   *  from the latest trainer notes + progress arc. */
  progressNarrative?: string;
  /** Optional override — when not provided, the builder pulls the session
   *  summary from the triggering attendance's `trainerNotes`. */
  sessionSummary?: string;
  /** Trainer's overall assessment — replaces the legacy `instructorNotes`
   *  field. Empty by default; the trainer edits before sending. */
  overallAssessment?: string;
  /** Override the auto-defaulted Training Level. Auto-default is
   *  `proficient` for graduation cards and `progressing` for session cards. */
  trainingLevel?: TrainingLevel;
  /** Override the default theme. Defaults to `"everyday"`. */
  theme?: ReportCardTheme;
}

/** Compute summary stats per exercise across the relevant attendance records.
 *  Excludes absent / excused rows since they have no exercises logged. */
function summarizeExercises(
  attendances: SessionAttendance[],
): Map<string, { sum: number; count: number }> {
  const tally = new Map<string, { sum: number; count: number }>();
  for (const a of attendances) {
    if (a.status === "absent" || a.status === "excused") continue;
    for (const ex of a.exercises ?? []) {
      const prev = tally.get(ex.exerciseName) ?? { sum: 0, count: 0 };
      prev.sum += ex.rating;
      prev.count += 1;
      tally.set(ex.exerciseName, prev);
    }
  }
  return tally;
}

function toSummaries(
  tally: Map<string, { sum: number; count: number }>,
): TrainingReportCardExerciseSummary[] {
  return Array.from(tally.entries()).map(([name, { sum, count }]) => ({
    name,
    avgRating: Math.round((sum / count) * 10) / 10,
    ratingsCount: count,
  }));
}

/** Pick the top N by avgRating, tiebreak by ratingsCount descending then
 *  name ascending. Filter out exercises that were only rated once when N is
 *  small — a single 5-star reading isn't really a "top exercise". */
function pickTopExercises(
  summaries: TrainingReportCardExerciseSummary[],
  n: number,
): TrainingReportCardExerciseSummary[] {
  return summaries
    .slice()
    .sort(
      (a, b) =>
        b.avgRating - a.avgRating ||
        b.ratingsCount - a.ratingsCount ||
        a.name.localeCompare(b.name),
    )
    .slice(0, n);
}

function pickNeedsWorkExercises(
  summaries: TrainingReportCardExerciseSummary[],
  n: number,
): TrainingReportCardExerciseSummary[] {
  return summaries
    .slice()
    .sort(
      (a, b) =>
        a.avgRating - b.avgRating ||
        b.ratingsCount - a.ratingsCount ||
        a.name.localeCompare(b.name),
    )
    .slice(0, n);
}

/** Auto-draft a narrative from the latest trainer notes + a simple progress
 *  arc (first session avg vs latest session avg). Trainers can edit before
 *  sending — this is just a starting point. */
function autoDraftNarrative(
  kind: TrainingReportCardKind,
  attendances: SessionAttendance[],
  petName: string,
  seriesName: string,
): string {
  const sorted = attendances.slice().sort((a, b) => a.sessionNumber - b.sessionNumber);
  const withExercises = sorted.filter(
    (a) => (a.exercises?.length ?? 0) > 0,
  );
  if (withExercises.length === 0) {
    return kind === "series-completion"
      ? `${petName} completed every session of ${seriesName}.`
      : `${petName} is making steady progress in ${seriesName}.`;
  }
  const avg = (rows: typeof withExercises) => {
    let sum = 0;
    let count = 0;
    for (const r of rows) {
      for (const ex of r.exercises ?? []) {
        sum += ex.rating;
        count += 1;
      }
    }
    return count === 0 ? 0 : sum / count;
  };
  const first = withExercises[0]!;
  const last = withExercises[withExercises.length - 1]!;
  const firstAvg = avg([first]);
  const lastAvg = avg([last]);
  const delta = lastAvg - firstAvg;

  const arc =
    delta >= 0.75
      ? `clear progression from a ${firstAvg.toFixed(1)}-star average in Session ${first.sessionNumber} to ${lastAvg.toFixed(1)} stars in Session ${last.sessionNumber}`
      : delta <= -0.5
        ? `regression worth watching — averages slipped from ${firstAvg.toFixed(1)} to ${lastAvg.toFixed(1)} stars`
        : `consistent ratings hovering around ${lastAvg.toFixed(1)} stars`;

  const latestNote = last.trainerNotes?.trim();
  const lede =
    kind === "series-completion"
      ? `${petName} graduated from ${seriesName} after ${sorted.length} session${sorted.length === 1 ? "" : "s"}.`
      : `Through Session ${last.sessionNumber}, ${petName} is showing ${arc}.`;
  const tail = latestNote ? ` ${latestNote}` : "";
  return `${lede}${kind === "series-completion" ? ` Showing ${arc}.` : ""}${tail}`.trim();
}

/** Default sort for the "exercises covered" grid — exercises with more
 *  ratings rise to the top (= things the dog has had real reps with),
 *  tiebroken by avgRating descending then name ascending. */
function sortExercisesCovered(
  summaries: TrainingReportCardExerciseSummary[],
): TrainingReportCardExerciseSummary[] {
  return summaries
    .slice()
    .sort(
      (a, b) =>
        b.ratingsCount - a.ratingsCount ||
        b.avgRating - a.avgRating ||
        a.name.localeCompare(b.name),
    );
}

/** Series-completion narrative is a bit longer and explicitly graduational.
 *  Pulls the highest-rated exercises into the wrap-up so the owner sees a
 *  highlight reel even if they don't expand the card. */
function autoDraftSeriesSummary(
  attendances: SessionAttendance[],
  exercisesCovered: TrainingReportCardExerciseSummary[],
  petName: string,
  seriesName: string,
): string {
  const present = attendances.filter(
    (a) => a.status === "present" || a.status === "late",
  ).length;
  const total = attendances.length;
  const top = exercisesCovered
    .slice()
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 2)
    .map((e) => e.name);
  const topPhrase =
    top.length === 0
      ? ""
      : ` Highlights this series: ${top.join(" and ")}.`;
  return `${petName} completed ${present} of ${total} sessions in ${seriesName}.${topPhrase}`;
}

export function buildTrainingReportCard(input: BuildInput): TrainingReportCard {
  const { kind, enrollment, throughSessionNumber, createdBy, createdById, date } =
    input;
  const scope = input.attendances.filter(
    (a) =>
      a.enrollmentId === enrollment.id &&
      a.sessionNumber <= throughSessionNumber,
  );
  const breakdown = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const a of scope) {
    breakdown[a.status] += 1;
  }
  const sessionsAttended = breakdown.present + breakdown.late;
  const tally = summarizeExercises(scope);
  const summaries = toSummaries(tally);
  const exercisesCovered = sortExercisesCovered(summaries);
  const topExercises = pickTopExercises(summaries, 3);
  const needsWorkExercises = pickNeedsWorkExercises(summaries, 3);
  const progressNarrative =
    input.progressNarrative ??
    autoDraftNarrative(kind, scope, enrollment.petName, enrollment.seriesName);

  // Pull the session-summary text. For session cards it's the triggering
  // attendance's `trainerNotes`; for series-completion it's an aggregated
  // wrap-up that surfaces the top exercises as a highlight reel.
  let sessionSummary = input.sessionSummary;
  if (sessionSummary === undefined) {
    if (kind === "series-completion") {
      sessionSummary = autoDraftSeriesSummary(
        scope,
        exercisesCovered,
        enrollment.petName,
        enrollment.seriesName,
      );
    } else {
      const triggering = scope.find(
        (a) => a.sessionNumber === throughSessionNumber,
      );
      sessionSummary = triggering?.trainerNotes?.trim() ?? "";
    }
  }

  // For graduation cards, surface the date range the series spanned. The
  // sort here is on the date strings (ISO YYYY-MM-DD) so lexical = chronological.
  let seriesStartDate: string | undefined;
  let seriesEndDate: string | undefined;
  if (kind === "series-completion" && scope.length > 0) {
    const dates = scope
      .map((a) => a.sessionDate)
      .filter((d): d is string => !!d)
      .sort();
    seriesStartDate = dates[0];
    seriesEndDate = dates[dates.length - 1];
  }

  const createdAt = input.createdAt ?? new Date().toISOString();
  const idSuffix = kind === "series-completion" ? "graduation" : `s${throughSessionNumber}`;
  return {
    id: `training-report-${enrollment.id}-${idSuffix}`,
    petId: enrollment.petId,
    petName: enrollment.petName,
    petImageUrl: input.petImageUrl,
    enrollmentId: enrollment.id,
    seriesId: enrollment.seriesId,
    seriesName: enrollment.seriesName,
    courseName: enrollment.courseTypeName,
    kind,
    date,
    seriesStartDate,
    seriesEndDate,
    throughSessionNumber,
    totalSessions: enrollment.totalSessions,
    sessionsAttended,
    attendanceBreakdown: breakdown,
    exercisesCovered,
    topExercises,
    needsWorkExercises,
    sessionSummary,
    progressNarrative,
    assignedHomework: input.assignedHomework ?? [],
    photos: input.photos ?? [],
    overallAssessment: input.overallAssessment ?? "",
    trainingLevel:
      input.trainingLevel ??
      (kind === "series-completion" ? "proficient" : "progressing"),
    theme: input.theme ?? "everyday",
    scheduledSendAt: null,
    createdBy,
    createdById,
    createdAt,
    sentToOwner: false,
    sentAt: null,
    viewedByOwner: null,
  };
}

/** Insert-or-replace a report card across every cached training-report-cards
 *  query. The query keys we walk are:
 *   - `["training","report-cards","all"]` → unscoped catalog
 *   - `["training","report-cards","pet", petId]` → per-pet lists
 *  Per-pet caches only accept records whose petId matches. */
export function fanOutReportCardUpsert(
  queryClient: QueryClient,
  record: TrainingReportCard,
): void {
  const cache = queryClient.getQueryCache();
  cache.findAll({ queryKey: ["training", "report-cards"] }).forEach((query) => {
    const key = query.queryKey;
    if (key.length < 3) return;
    const scope = key[2];
    let accepts = false;
    if (scope === "all") accepts = true;
    else if (scope === "pet" && key[3] === record.petId) accepts = true;
    if (!accepts) {
      queryClient.setQueryData<TrainingReportCard[]>(key, (prev = []) =>
        prev.filter((r) => r.id !== record.id),
      );
      return;
    }
    queryClient.setQueryData<TrainingReportCard[]>(key, (prev = []) => {
      const idx = prev.findIndex((r) => r.id === record.id);
      if (idx === -1) return [record, ...prev];
      const next = prev.slice();
      next[idx] = record;
      return next;
    });
  });
}

export function fanOutReportCardDelete(
  queryClient: QueryClient,
  id: string,
): void {
  const cache = queryClient.getQueryCache();
  cache.findAll({ queryKey: ["training", "report-cards"] }).forEach((query) => {
    queryClient.setQueryData<TrainingReportCard[]>(query.queryKey, (prev = []) =>
      prev.filter((r) => r.id !== id),
    );
  });
}
