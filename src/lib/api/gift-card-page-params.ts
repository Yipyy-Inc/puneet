// ============================================================================
// One page of the gift-cards table, as the screen asks for it and the route
// reads it.
//
// The screen loaded every card the facility had ever issued and searched,
// filtered and sorted them in the browser. Measured 2026-09-17 on the e2e
// facility: 6,022 cards, 3,467 KB, 5.5 s before a counter could type.
//
// Cards are never deleted — `gift_cards` has no DELETE policy, deliberately,
// because a bearer instrument is voided rather than erased — so that list only
// grows, at every facility, forever.
//
// This module is the one place both sides agree on what may be asked: shared,
// pure, and unit-tested. Anything malformed is DROPPED rather than guessed — a
// status that is not one, a sort the server does not offer, a page size nobody
// should ask for.
// ============================================================================

/** `gift_cards.status`, as the database has it. */
export const GIFT_CARD_STATUS_VALUES = [
  "active",
  "redeemed",
  "expired",
  "cancelled",
] as const;

/** `gift_cards.kind`. The screen calls these "digital" and "physical". */
export const GIFT_CARD_KIND_VALUES = ["online", "physical"] as const;

/** The columns the server can order by, and the column each one means. */
export const GIFT_CARD_PAGE_SORTS = {
  code: "code",
  issued: "issued_at",
  balance: "balance",
  initialAmount: "initial_amount",
  status: "status",
} as const;
export type GiftCardPageSort = keyof typeof GIFT_CARD_PAGE_SORTS;

export const DEFAULT_PAGE_SIZE = 12;
/**
 * A screen reads a dozen rows; the liability EXPORT pages through the whole
 * matching set, which is why this is larger than any table shows.
 */
export const MAX_PAGE_SIZE = 500;

export interface GiftCardPageParams {
  page?: number;
  pageSize?: number;
  /** Part of a code, a recipient's name, or a recipient's email. */
  q?: string;
  status?: string;
  /** `online` or `physical`. */
  kind?: string;
  sort?: GiftCardPageSort;
  dir?: "asc" | "desc";
}

function positiveInt(value: string | null): number | undefined {
  if (!value || !/^\d{1,9}$/.test(value)) return undefined;
  const n = Number(value);
  return n > 0 ? n : undefined;
}

/**
 * A PostgREST `ilike` pattern matching `term` anywhere, with the wildcards in
 * the term itself neutered.
 *
 * `%` and `_` are wildcards, so a search box that passed them through would let
 * a caller match a code they do not know one character at a time — which on a
 * bearer instrument is a way to find real ones. The backslash is escaped first,
 * or it escapes the escapes.
 */
export function likePattern(term: string): string {
  const escaped = term
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  return `%${escaped}%`;
}

/** The query string for `params`, "" when nothing narrows the list. */
export function giftCardPageSearch(params: GiftCardPageParams = {}): string {
  const search = new URLSearchParams();
  if (params.page && params.page > 1) search.set("page", String(params.page));
  if (params.pageSize) {
    search.set(
      "pageSize",
      String(Math.min(Math.max(1, Math.floor(params.pageSize)), MAX_PAGE_SIZE)),
    );
  }
  const q = params.q?.trim();
  if (q) search.set("q", q);
  if (
    params.status &&
    (GIFT_CARD_STATUS_VALUES as readonly string[]).includes(params.status)
  ) {
    search.set("status", params.status);
  }
  if (
    params.kind &&
    (GIFT_CARD_KIND_VALUES as readonly string[]).includes(params.kind)
  ) {
    search.set("kind", params.kind);
  }
  if (params.sort && params.sort in GIFT_CARD_PAGE_SORTS) {
    search.set("sort", params.sort);
    search.set("dir", params.dir === "asc" ? "asc" : "desc");
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

/** What the route may apply. Anything malformed is dropped, never guessed. */
export function parseGiftCardPageParams(
  search: URLSearchParams,
): Required<Pick<GiftCardPageParams, "page" | "pageSize" | "dir">> &
  GiftCardPageParams {
  const status = search.get("status");
  const kind = search.get("kind");
  const sort = search.get("sort");
  const pageSize = positiveInt(search.get("pageSize"));
  const q = search.get("q")?.trim();
  return {
    page: positiveInt(search.get("page")) ?? 1,
    pageSize: Math.min(pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
    q: q ? q : undefined,
    status:
      status && (GIFT_CARD_STATUS_VALUES as readonly string[]).includes(status)
        ? status
        : undefined,
    kind:
      kind && (GIFT_CARD_KIND_VALUES as readonly string[]).includes(kind)
        ? kind
        : undefined,
    sort:
      sort && sort in GIFT_CARD_PAGE_SORTS
        ? (sort as GiftCardPageSort)
        : undefined,
    // Newest first is the only default a card list should have.
    dir: search.get("dir") === "asc" ? "asc" : "desc",
  };
}
