import type {
  QuickBooksCompanyData,
  QuickBooksCustomer,
  QuickBooksRef,
  QuickBooksSalesLine,
} from "@/types/quickbooks";

// ============================================================================
// What every document builder needs (Phase 6).
//
// Extracted from sales-receipt.ts when the refund, invoice and credit-memo
// builders arrived: a refund that resolved its customer differently from the
// sale it reverses would land on a second QuickBooks customer, and the two
// would never net out. One resolver, one answer.
// ============================================================================

export const CENTS = 100;

export const toCents = (dollars: number): number => Math.round(dollars * CENTS);
export const toDollars = (cents: number): number => cents / CENTS;

/** QuickBooks sorts by DisplayName, so "Johnson, Alice" keeps a client list
 *  alphabetical by surname the way a bookkeeper expects. */
export function toQuickBooksDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const first = parts.slice(0, -1).join(" ");
  return `${last}, ${first}`;
}

export const WALK_IN_CUSTOMER = "Walk-in Customer";

export interface ResolvedCustomer {
  ref: QuickBooksRef;
  create?: QuickBooksCustomer;
  warning?: string;
}

/** Identity is the email address; the name is a fallback and says so. */
export function resolveCustomer(
  party: { customerName?: string; customerEmail?: string },
  data: QuickBooksCompanyData,
): ResolvedCustomer {
  const email = (party.customerEmail ?? "").trim().toLowerCase();

  if (email) {
    const match = data.customers.find(
      (c) => c.PrimaryEmailAddr?.Address?.trim().toLowerCase() === email,
    );
    if (match) return { ref: { value: match.Id, name: match.DisplayName } };
  }

  // A sale with no client on file is a genuine walk-in, not an error.
  if (!party.customerName?.trim()) {
    const walkIn = data.customers.find(
      (c) => c.DisplayName === WALK_IN_CUSTOMER,
    );
    return walkIn
      ? { ref: { value: walkIn.Id, name: walkIn.DisplayName } }
      : {
          ref: { value: "walk-in", name: WALK_IN_CUSTOMER },
          create: {
            Id: "walk-in",
            DisplayName: WALK_IN_CUSTOMER,
            Active: true,
            Balance: 0,
          },
        };
  }

  const displayName = toQuickBooksDisplayName(party.customerName);
  const byName = data.customers.find((c) => c.DisplayName === displayName);
  if (byName) {
    return {
      ref: { value: byName.Id, name: byName.DisplayName },
      // Matching on name is a guess; email is the identity. Say so.
      warning: email
        ? undefined
        : `Matched "${displayName}" by name — this sale had no email address on it.`,
    };
  }

  const parts = party.customerName.trim().split(/\s+/);
  return {
    ref: { value: `new:${displayName}`, name: displayName },
    create: {
      Id: `new:${displayName}`,
      DisplayName: displayName,
      GivenName: parts.slice(0, -1).join(" ") || undefined,
      FamilyName: parts.length > 1 ? parts[parts.length - 1] : undefined,
      PrimaryEmailAddr: email ? { Address: party.customerEmail! } : undefined,
      Active: true,
      Balance: 0,
    },
  };
}

/** QuickBooks' own payment-method vocabulary is short; anything Yipyy supports
 *  that isn't cash or a card is recorded as "Other" rather than invented. */
export function toQuickBooksPaymentMethod(method: string): string {
  switch (method) {
    case "cash":
      return "Cash";
    case "credit":
    case "debit":
      return "Credit Card";
    default:
      // gift card, store credit, package pass, charge-to-account, split …
      return "Other";
  }
}

export function findAccountByName(
  data: QuickBooksCompanyData,
  pattern: RegExp,
): QuickBooksRef | undefined {
  const account = data.accounts.find((a) => a.Active && pattern.test(a.Name));
  return account ? { value: account.Id, name: account.Name } : undefined;
}

export function accountRef(
  data: QuickBooksCompanyData,
  accountId: string | undefined,
): QuickBooksRef | undefined {
  if (!accountId) return undefined;
  return {
    value: accountId,
    name: data.accounts.find((a) => a.Id === accountId)?.Name,
  };
}

/** An explicitly configured account wins; otherwise fall back to one that
 *  looks right by name, so a facility that never opened the settings still
 *  gets tips out of income. */
export function preferredAccount(
  data: QuickBooksCompanyData,
  configuredId: string | undefined,
  fallbackPattern: RegExp,
): QuickBooksRef | undefined {
  return (
    accountRef(data, configuredId) ?? findAccountByName(data, fallbackPattern)
  );
}

/** Cents across a set of lines — the left-hand side of every total check. */
export function lineTotalCents(lines: QuickBooksSalesLine[]): number {
  return lines.reduce((sum, l) => sum + toCents(l.Amount), 0);
}

/**
 * Force a document's lines to sum to the amount Yipyy actually moved.
 *
 * RULE 5A applies to every document, not just the receipt: if QuickBooks
 * disagrees with Yipyy by a cent, someone reconciles it by hand. A penny is
 * rounding and passes quietly; anything larger balances AND complains, because
 * papering over a real pricing bug behind a balanced document is worse than the
 * bug.
 */
export function appendRoundingLine(
  lines: QuickBooksSalesLine[],
  deltaCents: number,
  data: QuickBooksCompanyData,
  warnings: string[],
  label = "Rounding adjustment",
): void {
  if (deltaCents === 0) return;

  lines.push({
    LineNum: lines.length + 1,
    Description: label,
    Amount: toDollars(deltaCents),
    DetailType: "SalesItemLineDetail",
    SalesItemLineDetail: {
      ItemRef: { value: "rounding", name: "Rounding" },
      ItemAccountRef: findAccountByName(data, /discount/i),
      Qty: 1,
    },
  });

  if (Math.abs(deltaCents) > 1) {
    warnings.push(
      `Yipyy total and line total differed by ${toDollars(Math.abs(deltaCents)).toFixed(2)} — forced to match, but this is larger than rounding and worth checking.`,
    );
  }
}
