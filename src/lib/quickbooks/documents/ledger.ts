import type {
  QuickBooksCompanyData,
  QuickBooksCreditMemo,
  QuickBooksJournalEntry,
  QuickBooksRefundReceipt,
  QuickBooksSalesLine,
  QuickBooksSalesReceipt,
} from "@/types/quickbooks";

import { toCents, toDollars } from "./shared";

// ============================================================================
// What a set of documents actually does to the accounts (Phase 6).
//
// The document builders each look right in isolation. The rules that matter —
// 5E's "deposits must net to zero", packages' "revenue is recognised once" —
// are properties of a SEQUENCE of documents, and cannot be checked by reading
// any one of them.
//
// So: a tiny ledger. Post the documents, read the balances, assert the rule.
// Not a general accounting engine — just enough to prove the invariants the
// spec states, in the same units the builders work in.
// ============================================================================

export type PostableDocument =
  | { kind: "sales_receipt"; document: QuickBooksSalesReceipt }
  | { kind: "refund_receipt"; document: QuickBooksRefundReceipt }
  | { kind: "credit_memo"; document: QuickBooksCreditMemo }
  | { kind: "journal_entry"; document: QuickBooksJournalEntry };

/** Refunds and credit memos reverse what a sale did. */
function signFor(kind: PostableDocument["kind"]): 1 | -1 {
  return kind === "sales_receipt" ? 1 : -1;
}

function linesOf(doc: PostableDocument): QuickBooksSalesLine[] {
  return doc.kind === "journal_entry" ? [] : doc.document.Line;
}

/**
 * Journal entries carry their direction in `PostingType` rather than the sign.
 *
 * Translated to this ledger's convention (positive = the account increased):
 * a CREDIT increases income and liabilities, a DEBIT decreases them. That is
 * what makes breakage read correctly — the liability goes down, income goes up.
 */
function postJournalEntry(
  entry: QuickBooksJournalEntry,
  balances: Map<string, number>,
): void {
  for (const line of entry.Line) {
    const detail = line.JournalEntryLineDetail;
    const accountId = detail.AccountRef?.value;
    if (!accountId) continue;
    const cents = toCents(line.Amount);
    const delta = detail.PostingType === "Credit" ? cents : -cents;
    balances.set(accountId, (balances.get(accountId) ?? 0) + delta);
  }
}

/**
 * The other side of a receipt: where the money landed.
 *
 * A Sales Receipt DEBITS its deposit account. For a bank that is an increase;
 * for a liability used as the tender (a gift card paying for a service) it is a
 * decrease. Without this the gift-card liability would only ever go up, because
 * the drawdown is expressed as the deposit account rather than as a line.
 *
 * Only posted when company data is supplied, since the direction depends on the
 * account's classification.
 */
function postDepositSide(
  accountId: string | undefined,
  totalCents: number,
  sign: 1 | -1,
  data: QuickBooksCompanyData | undefined,
  balances: Map<string, number>,
): void {
  if (!accountId || !data) return;
  const account = data.accounts.find((a) => a.Id === accountId);
  if (!account) return;
  // Debit: assets up, liabilities down.
  const direction = account.Classification === "Asset" ? 1 : -1;
  balances.set(
    accountId,
    (balances.get(accountId) ?? 0) + sign * direction * totalCents,
  );
}

/**
 * Net movement per account, in cents. Positive = the account increased
 * (income earned, liability taken on).
 *
 * Pass `data` to also post the deposit side of each receipt — needed for any
 * rule about a liability that is spent as a tender.
 */
export function postToLedger(
  documents: PostableDocument[],
  data?: QuickBooksCompanyData,
): Map<string, number> {
  const balances = new Map<string, number>();

  for (const doc of documents) {
    if (doc.kind === "journal_entry") {
      postJournalEntry(doc.document, balances);
      continue;
    }
    const sign = signFor(doc.kind);
    for (const line of linesOf(doc)) {
      const accountId = line.SalesItemLineDetail.ItemAccountRef?.value;
      // A line with no account is already reported as a warning by the builder
      // that made it; here it simply has nowhere to land.
      if (!accountId) continue;
      balances.set(
        accountId,
        (balances.get(accountId) ?? 0) + sign * toCents(line.Amount),
      );
    }

    if (doc.kind !== "credit_memo") {
      postDepositSide(
        doc.document.DepositToAccountRef?.value,
        toCents(doc.document.TotalAmt),
        sign,
        data,
        balances,
      );
    }
  }

  return balances;
}

/** One account's net movement, in dollars. */
export function accountBalance(
  documents: PostableDocument[],
  accountId: string,
  data?: QuickBooksCompanyData,
): number {
  return toDollars(postToLedger(documents, data).get(accountId) ?? 0);
}

/** Everything that landed in income, in dollars. */
export function totalIncome(
  documents: PostableDocument[],
  data: QuickBooksCompanyData,
): number {
  const revenue = new Set(
    data.accounts
      .filter((a) => a.Classification === "Revenue")
      .map((a) => a.Id),
  );
  let cents = 0;
  // Income is line-based only: the deposit side never touches revenue.
  for (const [accountId, amount] of postToLedger(documents)) {
    if (revenue.has(accountId)) cents += amount;
  }
  return toDollars(cents);
}

export interface DepositRuleCheck {
  /** What is left sitting in Deposits Held. Must be 0 once the stay is paid. */
  depositsHeldBalance: number;
  /** What reached income. Must be the FULL service price, not the balance. */
  incomeRecognised: number;
  satisfied: boolean;
  /** Why it failed, when it did — phrased for a person, not a stack trace. */
  problems: string[];
}

/**
 * RULE 5E, as a check anyone can run.
 *
 * Give it the deposit receipt and the checkout receipt (and the refund, if the
 * booking fell through) and it says whether the liability cleared and whether
 * the right amount of revenue was recognised.
 */
export function checkDepositRule(
  documents: PostableDocument[],
  options: {
    depositsHeldAccountId: string;
    data: QuickBooksCompanyData;
    /** Full price of the service delivered — what income should end up at. */
    expectedIncome: number;
  },
): DepositRuleCheck {
  const depositsHeldBalance = accountBalance(
    documents,
    options.depositsHeldAccountId,
  );
  const incomeRecognised = totalIncome(documents, options.data);
  const problems: string[] = [];

  if (toCents(depositsHeldBalance) !== 0) {
    problems.push(
      depositsHeldBalance > 0
        ? `${depositsHeldBalance.toFixed(2)} is still sitting in Deposits Held after checkout — the liability was never released.`
        : `Deposits Held is overdrawn by ${Math.abs(depositsHeldBalance).toFixed(2)} — more was applied than was ever collected.`,
    );
  }

  if (toCents(incomeRecognised) !== toCents(options.expectedIncome)) {
    problems.push(
      `Income recognised ${incomeRecognised.toFixed(2)}, expected the full service price of ${options.expectedIncome.toFixed(2)}.`,
    );
  }

  return {
    depositsHeldBalance,
    incomeRecognised,
    satisfied: problems.length === 0,
    problems,
  };
}
