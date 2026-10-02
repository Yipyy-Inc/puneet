import type { EvaluationResult } from "@/lib/evaluations/questions";

// ============================================================================
// Operations › Evaluations, as `GET /api/evaluations` hands it to the page —
// the client's mock (2026-10-02): Today, Report cards to review, All
// evaluations. Types only; the server builds it (board-server.ts).
// ============================================================================

export interface BoardPet {
  id: string;
  ref: number;
  name: string;
  breed: string | null;
  species: string | null;
  imageUrl: string | null;
}

export interface BoardClient {
  id: string;
  ref: number;
  name: string;
}

/** Why the pet is here: a first evaluation, or another after an earlier one. */
export type VisitReason = "first_visit" | "re_evaluation";

export type EvaluationStatus = "in_progress" | "completed";
export type CardStatus = "draft" | "in_review" | "sent";

/** One pet of one evaluation booking today — a card on "Today". */
export interface TodayVisit {
  bookingId: string;
  bookingRef: number;
  startAt: string;
  pet: BoardPet;
  client: BoardClient;
  /** The services it unlocks: the booking's own ("Request an evaluation"
   *  from a locked service), else the facility's list. */
  unlocks: string[];
  reason: VisitReason;
  /** Who the booking is assigned to; null is "Unassigned". */
  assignedName: string | null;
  evaluation: {
    id: string;
    status: EvaluationStatus;
    cardStatus: CardStatus;
    evaluatorName: string;
    returnedComment: string | null;
    result: EvaluationResult | null;
  } | null;
}

export interface BoardStats {
  scheduled: number;
  completed: number;
  toReview: number;
  /** Passes over finished evaluations in the last 90 days, 0–100; null with none. */
  passRate: number | null;
}

/** A card waiting in "Report cards to review". */
export interface QueueRow {
  id: string;
  pet: BoardPet;
  client: BoardClient;
  evaluatorName: string;
  submittedAt: string;
  result: EvaluationResult | null;
  /** The viewer may review and send this one. */
  mayReview: boolean;
}

/** A card on "Sent to owners". */
export interface SentRow {
  id: string;
  pet: BoardPet;
  client: BoardClient;
  sentAt: string;
  /** Null when it went out by itself ("Auto-sent"). */
  sentByName: string | null;
  autoSent: boolean;
  result: EvaluationResult | null;
  openedAt: string | null;
  /** A service booked for the pet since the card went out. */
  bookedService: string | null;
}

export type AllRowState = "scheduled" | "in_progress" | "in_review" | "sent";

/** A row of "All evaluations". */
export interface AllRow {
  /** The evaluation's id, or `booking:pet` for one only scheduled. */
  key: string;
  evaluationId: string | null;
  pet: BoardPet;
  client: BoardClient;
  state: AllRowState;
  result: EvaluationResult | null;
  /** When it was finished. */
  completedAt: string | null;
  /** When a scheduled one starts. */
  scheduledAt: string | null;
  evaluatorName: string | null;
  approvedServices: string[];
}

export interface BoardViewer {
  mayRun: boolean;
  mayReview: boolean;
  maySelfSend: boolean;
  staffId: string | null;
}

export interface EvaluationsBoard {
  timeZone: string;
  /** YYYY-MM-DD on the facility's clock. */
  today: string;
  visits: TodayVisit[];
  stats: BoardStats;
  waiting: QueueRow[];
  sent: SentRow[];
  all: AllRow[];
  viewer: BoardViewer;
}

/** One of a pet's evaluations, on its profile. */
export interface PetEvaluationRow {
  id: string;
  status: EvaluationStatus;
  cardStatus: CardStatus;
  result: EvaluationResult | null;
  evaluatorName: string;
  startedAt: string;
  completedAt: string | null;
  sentAt: string | null;
}
