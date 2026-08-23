import type { Tables } from "@/types/database";

// ============================================================================
// Gift card rows -> what the screens read.
//
// In a mapper rather than in the route because three routes need the same
// select and the same shape — list, detail and redeem — and importing runtime
// values ACROSS route modules to share them would make one route's module load
// another's. Same reason `mappers/client.ts` exists.
//
// ── EXPIRY IS DECIDED HERE, NOT ON THE ROW ────────────────────────────────
//
// Nothing sweeps expired cards, so `status` still reads `active` on a card that
// is past its date. `redeem_gift_card` refuses it against the DATABASE's clock,
// so a screen trusting the column alone would offer the customer a card the
// till is about to reject.
//
// `toCardRow` takes `now` rather than calling `Date.now()` itself: every card
// in one response is then judged against a single instant, and a test can hand
// it a date instead of waiting for one.
// ============================================================================

export type GiftCardKind = "online" | "physical";
export type GiftCardStatus = "active" | "redeemed" | "expired" | "cancelled";

export interface GiftCardRow {
  id: string;
  code: string;
  kind: GiftCardKind;
  initialAmount: number;
  balance: number;
  currency: string;
  /** What the column says. */
  status: GiftCardStatus;
  /** What the till will actually do — expiry applied. See the header. */
  effectiveStatus: GiftCardStatus;
  purchasedByClientId: string | null;
  /** The small integer every screen and URL uses, when there is a buyer. */
  purchasedByClientRef: number | null;
  purchasedByName: string | null;
  recipientName: string | null;
  recipientEmail: string | null;
  message: string | null;
  expiresAt: string | null;
  issuedBy: string | null;
  issuedAt: string;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BuyerEmbed {
  ref: number;
  name: string;
}

export type CardRecord = Tables<"gift_cards"> & {
  // `clients` is a TO-ONE relation here (a nullable FK), so PostgREST returns
  // an object or null — not an array. Reading a to-one as an array is what
  // emptied the boarding board once, so `buyerOf` tolerates both rather than
  // trusting which one arrives.
  clients?: BuyerEmbed | BuyerEmbed[] | null;
};

export const CARD_SELECT =
  "id, code, kind, initial_amount, balance, currency, status, purchased_by_client_id, recipient_name, recipient_email, message, expires_at, issued_by, issued_at, last_used_at, created_at, updated_at, clients:purchased_by_client_id(ref, name)";

function buyerOf(row: CardRecord): BuyerEmbed | null {
  const embedded = row.clients;
  if (!embedded) return null;
  return Array.isArray(embedded) ? (embedded[0] ?? null) : embedded;
}

/**
 * The status a customer would actually experience.
 *
 * `cancelled` outranks expiry: somebody decided that, and it should not be
 * relabelled as though the calendar did it.
 */
export function toCardRow(row: CardRecord, now: number): GiftCardRow {
  const status = row.status as GiftCardStatus;
  const expired =
    status !== "cancelled" &&
    row.expires_at !== null &&
    new Date(row.expires_at).getTime() <= now;

  const buyer = buyerOf(row);

  return {
    id: row.id,
    code: row.code,
    kind: row.kind as GiftCardKind,
    initialAmount: Number(row.initial_amount),
    balance: Number(row.balance),
    currency: row.currency,
    status,
    effectiveStatus: expired ? "expired" : status,
    purchasedByClientId: row.purchased_by_client_id,
    purchasedByClientRef: buyer?.ref ?? null,
    purchasedByName: buyer?.name ?? null,
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email,
    message: row.message,
    expiresAt: row.expires_at,
    issuedBy: row.issued_by,
    issuedAt: row.issued_at,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
