import { liveWrite } from "@/lib/api/live-fetch";
import type { NewReportCard, ReportCard } from "@/types/report-card";

// ============================================================================
// Report cards, from Postgres.
//
// NO `liveFetch` and no fixture fallback, deliberately. That seam exists for
// screens whose tables do not exist yet, and its own header says it goes when
// they land — this one has landed. A report card that fails to load must show
// an error, not eleven hand-authored cards belonging to somebody else's dog.
// ============================================================================

async function fetchReportCards(params?: {
  petRef?: number;
  status?: string;
  sentOnly?: boolean;
}): Promise<ReportCard[]> {
  const search = new URLSearchParams();
  if (params?.petRef != null) search.set("petRef", String(params.petRef));
  if (params?.status) search.set("status", params.status);
  if (params?.sentOnly) search.set("sentOnly", "true");

  const qs = search.toString();
  const response = await fetch(`/api/report-cards${qs ? `?${qs}` : ""}`);

  if (!response.ok) {
    const detail = await response
      .json()
      .then((b: { error?: string }) => b.error)
      .catch(() => null);
    throw new Error(
      detail ?? `Failed to load report cards (${response.status})`,
    );
  }

  return (await response.json()) as ReportCard[];
}

export const reportCardQueries = {
  /** Every card this caller may see. Staff: their facility's. */
  all: () => ({
    queryKey: ["report-cards", "all"] as const,
    queryFn: () => fetchReportCards(),
  }),

  byPet: (petRef: number) => ({
    queryKey: ["report-cards", "pet", petRef] as const,
    queryFn: () => fetchReportCards({ petRef }),
  }),

  /**
   * The owner's portal.
   *
   * `sentOnly` because RLS admits a client to their card the moment it exists
   * — the card IS theirs — so a draft the facility is still writing would
   * otherwise appear in the owner's list mid-sentence. "Not yet sent" is a
   * filter, not a policy, and this is the call site that applies it.
   */
  mine: () => ({
    queryKey: ["report-cards", "mine"] as const,
    queryFn: () => fetchReportCards({ sentOnly: true }),
  }),
};

/**
 * Create one.
 *
 * `liveWrite`, not `liveWriteOptional` — a report card's whole purpose is to
 * persist, so a write that quietly returns null signed-out would recreate the
 * exact failure this table was added to end.
 */
export async function createReportCard(
  input: NewReportCard,
): Promise<ReportCard> {
  return liveWrite<ReportCard>("/api/report-cards", "POST", input);
}

// ── The owner's four writes ─────────────────────────────────────────────────
//
// Each goes through the SECURITY DEFINER function of the same name. They throw
// on refusal rather than resolving quietly, so a caller cannot report success
// for something the database declined — which is what the fixture versions of
// these did.

type OwnerAction =
  | { action: "viewed" }
  | { action: "favourite"; favourite: boolean }
  | { action: "reply"; message: string }
  | { action: "rate"; stars: number; comment?: string };

async function ownerAction(cardId: string, body: OwnerAction): Promise<void> {
  await liveWrite<{ ok: true }>(
    `/api/report-cards/${cardId}`,
    "PATCH",
    body as unknown,
  );
}

/** First view only — the function coalesces, so calling twice is harmless. */
export const markReportCardViewed = (cardId: string) =>
  ownerAction(cardId, { action: "viewed" });

export const setReportCardFavourite = (cardId: string, favourite: boolean) =>
  ownerAction(cardId, { action: "favourite", favourite });

export const replyToReportCard = (cardId: string, message: string) =>
  ownerAction(cardId, { action: "reply", message });

/** Rated once. A second attempt is refused by the database, not by the screen. */
export const rateReportCard = (
  cardId: string,
  stars: number,
  comment?: string,
) => ownerAction(cardId, { action: "rate", stars, comment });
