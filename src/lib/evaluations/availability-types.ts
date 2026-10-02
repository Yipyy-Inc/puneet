import type { EvaluationDay } from "@/lib/evaluations/availability";
import type { OfferMode } from "@/lib/evaluations/schedule";

// When an evaluation can start — the shape both availability routes answer
// with (`/api/evaluations/availability` and its customer twin), apart from
// the server-only code that computes it, so a client can name it.

export interface EvaluatorOption {
  /** The staff row's id — what a booking's `assigned_staff_id` holds. */
  id: string;
  /** Staff: the full name. A customer: "Sarah J.". */
  name: string | null;
  /** Their job title, else null. */
  role: string | null;
}

export interface EvaluationAvailability {
  mode: OfferMode;
  /** The session's length. */
  minutes: number;
  /** Pets at the same time. */
  capacity: number;
  /** "Set days & hours": each window's id and the facility's name for it. */
  windows: Array<{ id: string; label: string }>;
  /** "Certain days only": the drop-off window, minutes from midnight. */
  dropOff: { start: number; end: number } | null;
  /** May this viewer pick an evaluator? Staff always; a customer when the
   *  facility lets clients choose. */
  picksEvaluator: boolean;
  evaluators: EvaluatorOption[];
  days: EvaluationDay[];
}
