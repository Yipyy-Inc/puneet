import type {
  BoardClient,
  BoardPet,
  CardStatus,
  EvaluationStatus,
} from "@/lib/evaluations/board-types";
import type { DeliveryMode } from "@/lib/evaluations/delivery";
import type {
  CardTheme,
  CustomQuestion,
  EvaluationResult,
  IntakeAnswers,
} from "@/lib/evaluations/questions";

// ============================================================================
// One evaluation, as the evaluator's dialog and the review dialog read it
// (`GET /api/evaluations/[id]`). Types only.
// ============================================================================

/** How the card looks and what it carries — Setup's, or as it was sent. */
export interface CardOptions {
  theme: CardTheme;
  includePhoto: boolean;
  bookFirstVisitButton: boolean;
  hideInternal: boolean;
}

export interface EvaluationDetail {
  id: string;
  facilityId: string;
  status: EvaluationStatus;
  cardStatus: CardStatus;
  pet: BoardPet & { sex: "male" | "female" | null };
  client: BoardClient & { hasEmail: boolean; hasPhone: boolean };
  facility: { name: string; logoUrl: string | null };
  booking: { id: string; ref: number; startAt: string } | null;
  evaluatorName: string;
  evaluatorStaffId: string | null;
  answers: Record<string, string>;
  strengths: string[];
  watchFor: string[];
  ownerNote: string;
  internalNote: string;
  result: EvaluationResult | null;
  approvedServices: string[];
  /** What "Approved for" offers: the services that need an evaluation here. */
  serviceChoices: string[];
  /** The facility's own questions — as they stood when it was finished. */
  customQuestions: CustomQuestion[];
  /** What the owner said when booking ("About your pet"). */
  intake: IntakeAnswers | null;
  /** A short-lived link to the photo from the visit. */
  photoUrl: string | null;
  photoPath: string | null;
  returnedComment: string | null;
  startedAt: string;
  completedAt: string | null;
  sentAt: string | null;
  sentByName: string | null;
  autoSent: boolean;
  sentChannels: string[];
  openedAt: string | null;
  delivery: {
    mode: DeliveryMode;
    notifyViaEmail: boolean;
    notifyViaSMS: boolean;
  };
  card: CardOptions;
  viewer: { mayRun: boolean; mayReview: boolean };
}
