import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { viewerMayReview } from "@/lib/evaluations/board";
import type {
  CardStatus,
  EvaluationStatus,
} from "@/lib/evaluations/board-types";
import type {
  CardOptions,
  EvaluationDetail,
} from "@/lib/evaluations/detail-types";
import {
  CARD_THEMES,
  type CardTheme,
  type CustomQuestion,
  type EvaluationResult,
  type IntakeAnswers,
} from "@/lib/evaluations/questions";
import { evaluationServicesRequired } from "@/lib/evaluations/requirement-server";
import { settingsFromRows } from "@/lib/settings/from-rows";
import type {
  EvaluationFormTemplate,
  EvaluationReportCardConfig,
} from "@/types/facility";

// ============================================================================
// One evaluation for the evaluator's dialog and the review dialog, read
// through the member's own session: RLS says whether they may see it at all
// (view_evaluations or perform_evaluations at its facility). Null when not.
// ============================================================================

export const EVALUATION_PHOTO_BUCKET = "evaluation-photos";

interface Row {
  id: string;
  facility_id: string;
  status: EvaluationStatus;
  card_status: CardStatus;
  evaluator_name: string;
  evaluator_staff_id: string | null;
  answers: Record<string, unknown> | null;
  strengths: string[] | null;
  watch_for: string[] | null;
  owner_note: string;
  internal_note: string;
  result: EvaluationResult | null;
  approved_services: string[] | null;
  custom_questions: unknown;
  photo_path: string | null;
  card_options: Record<string, unknown> | null;
  returned_comment: string | null;
  started_at: string;
  completed_at: string | null;
  sent_at: string | null;
  sent_by_name: string | null;
  auto_sent: boolean;
  sent_channels: string[] | null;
  opened_at: string | null;
  pets: {
    id: string;
    ref: number;
    name: string;
    breed: string | null;
    species: string | null;
    image_url: string | null;
    sex: string | null;
  } | null;
  clients: {
    id: string;
    ref: number;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  bookings: {
    id: string;
    ref: number;
    start_at: string;
    details: Record<string, unknown> | null;
  } | null;
}

const COLUMNS = `id, facility_id, status, card_status, evaluator_name, evaluator_staff_id,
  answers, strengths, watch_for, owner_note, internal_note, result, approved_services,
  custom_questions, photo_path, card_options, returned_comment, started_at, completed_at,
  sent_at, sent_by_name, auto_sent, sent_channels, opened_at,
  pets(id, ref, name, breed, species, image_url, sex),
  clients(id, ref, name, email, phone),
  bookings(id, ref, start_at, details)`;

function stringAnswers(value: Record<string, unknown> | null) {
  return Object.fromEntries(
    Object.entries(value ?? {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function cardOptionsOf(
  stored: Record<string, unknown> | null,
  settings: EvaluationReportCardConfig,
  sent: boolean,
): CardOptions {
  const source =
    sent && stored ? stored : (settings as unknown as Record<string, unknown>);
  const theme = String(source["theme"] ?? "green");
  return {
    theme: (CARD_THEMES as readonly string[]).includes(theme)
      ? (theme as CardTheme)
      : "green",
    includePhoto: source["includePhoto"] !== false,
    bookFirstVisitButton: source["bookFirstVisitButton"] !== false,
    hideInternal: source["hideInternal"] !== false,
  };
}

export async function evaluationDetail(
  supabase: SupabaseClient,
  id: string,
): Promise<EvaluationDetail | null> {
  const { data } = await supabase
    .from("evaluations")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  const row = data as unknown as Row | null;
  if (!row || !row.pets || !row.clients) return null;

  const [
    { data: settingRows },
    { data: facility },
    { data: viewerRows },
    required,
    photo,
  ] = await Promise.all([
    supabase
      .from("facility_settings")
      .select("domain, value")
      .eq("facility_id", row.facility_id)
      .in("domain", ["evaluation_report_card", "evaluation_form_template"]),
    supabase
      .from("facilities")
      .select("name, logo_url")
      .eq("id", row.facility_id)
      .maybeSingle(),
    supabase.rpc("evaluation_viewer", { p_facility_id: row.facility_id }),
    evaluationServicesRequired(supabase, row.facility_id),
    row.photo_path
      ? supabase.storage
          .from(EVALUATION_PHOTO_BUCKET)
          .createSignedUrl(row.photo_path, 300)
      : Promise.resolve({ data: null }),
  ]);

  const settings = settingsFromRows(
    (settingRows ?? []) as Array<{ domain: string; value: unknown }>,
  );
  // Parsed against each domain's schema by settingsFromRows; typed here.
  const card = settings.evaluation_report_card
    .value as EvaluationReportCardConfig;
  const template = settings.evaluation_form_template
    .value as EvaluationFormTemplate;
  const finished = row.status === "completed";
  const customQuestions = (
    finished && Array.isArray(row.custom_questions)
      ? row.custom_questions
      : (template.customQuestions ?? [])
  ) as CustomQuestion[];

  const viewer = (
    (viewerRows ?? []) as Array<{
      may_run: boolean;
      may_review: boolean;
      may_self_send: boolean;
      staff_id: string | null;
    }>
  )[0];
  const intakeAll = row.bookings?.details?.["evaluationIntake"];
  const intake =
    intakeAll && typeof intakeAll === "object"
      ? ((intakeAll as Record<string, IntakeAnswers>)[String(row.pets.ref)] ??
        null)
      : null;

  const approved = row.approved_services ?? [];
  // What "Approved for" offers: the services that need an evaluation here, the
  // ones this booking was made to unlock, and any already approved.
  const bookedFor = row.bookings?.details?.["evaluationFor"];
  const serviceChoices = [
    ...new Set([
      ...(required.length > 0 ? required : ["daycare", "boarding"]),
      ...(Array.isArray(bookedFor)
        ? bookedFor.filter((s): s is string => typeof s === "string")
        : []),
      ...approved,
    ]),
  ];

  return {
    id: row.id,
    facilityId: row.facility_id,
    status: row.status,
    cardStatus: row.card_status,
    pet: {
      id: row.pets.id,
      ref: Number(row.pets.ref),
      name: row.pets.name,
      breed: row.pets.breed,
      species: row.pets.species,
      imageUrl: row.pets.image_url,
      sex:
        row.pets.sex === "male" || row.pets.sex === "female"
          ? row.pets.sex
          : null,
    },
    client: {
      id: row.clients.id,
      ref: Number(row.clients.ref),
      name: row.clients.name,
      hasEmail: Boolean(row.clients.email?.trim()),
      hasPhone: Boolean(row.clients.phone?.trim()),
    },
    facility: {
      name: (facility as { name?: string } | null)?.name ?? "",
      logoUrl:
        (facility as { logo_url?: string | null } | null)?.logo_url ?? null,
    },
    booking: row.bookings
      ? {
          id: row.bookings.id,
          ref: Number(row.bookings.ref),
          startAt: row.bookings.start_at,
        }
      : null,
    evaluatorName: row.evaluator_name,
    evaluatorStaffId: row.evaluator_staff_id,
    answers: stringAnswers(row.answers),
    strengths: row.strengths ?? [],
    watchFor: row.watch_for ?? [],
    ownerNote: row.owner_note,
    internalNote: row.internal_note,
    result: row.result,
    approvedServices: approved,
    serviceChoices,
    customQuestions,
    intake,
    photoUrl: (photo.data as { signedUrl?: string } | null)?.signedUrl ?? null,
    photoPath: row.photo_path,
    returnedComment: row.returned_comment,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    sentAt: row.sent_at,
    sentByName: row.sent_by_name,
    autoSent: row.auto_sent,
    sentChannels: row.sent_channels ?? [],
    openedAt: row.opened_at,
    delivery: {
      mode: card.deliveryMode,
      notifyViaEmail: card.notifyViaEmail,
      notifyViaSMS: card.notifyViaSMS,
    },
    card: cardOptionsOf(row.card_options, card, row.card_status === "sent"),
    viewer: {
      mayRun: viewer?.may_run ?? false,
      mayReview: viewer
        ? viewerMayReview(
            {
              mayRun: viewer.may_run,
              mayReview: viewer.may_review,
              maySelfSend: viewer.may_self_send,
              staffId: viewer.staff_id,
            },
            row.evaluator_staff_id,
          )
        : false,
    },
  };
}
