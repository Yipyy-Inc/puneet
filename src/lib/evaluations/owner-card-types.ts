import type { CardTheme, EvaluationResult } from "@/lib/evaluations/questions";

// ============================================================================
// A SENT evaluation report card as its owner receives it — what
// public.evaluation_card_for_owner() projects (20261002195001): nothing staff
// kept to themselves, and the photo as a short-lived link. Types only.
// ============================================================================

export interface OwnerCard {
  id: string;
  facility: {
    id: string;
    name: string;
    logoUrl: string | null;
    email: string | null;
    phone: string | null;
  };
  pet: {
    id: string;
    ref: number;
    name: string;
    breed: string | null;
    species: string | null;
    imageUrl: string | null;
    sex: "male" | "female" | null;
  };
  ownerName: string;
  evaluatorName: string;
  result: EvaluationResult | null;
  answers: Record<string, string>;
  customQuestions: Array<{
    id: string;
    label: string;
    type: "yn" | "lmh" | "choice" | "text";
  }>;
  strengths: string[];
  watchFor: string[];
  ownerNote: string;
  internalNote: string;
  approvedServices: string[];
  photoUrl: string | null;
  theme: CardTheme;
  bookFirstVisitButton: boolean;
  hideInternal: boolean;
  completedAt: string | null;
  sentAt: string | null;
  openedAt: string | null;
}

/** One of the owner's cards, as their report cards list it. */
export interface OwnerCardListItem {
  id: string;
  facilityId: string;
  petId: string;
  petName: string;
  result: EvaluationResult | null;
  completedAt: string | null;
  sentAt: string;
  openedAt: string | null;
}
