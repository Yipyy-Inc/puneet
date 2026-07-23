import type {
  QuickBooksCompanyData,
  QuickBooksCreditMemo,
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
  | { kind: "credit_memo"; document: QuickBooksCreditMemo };

/** Refunds and credit memos reverse what a sale did. */
function signFor(kind: PostableDocument["kind"]): 1 | -1 {
  return kind === "sales_receipt" ? 1 : -1;
}

function linesOf(doc: PostableDocument): QuickBooksSalesLine[] {
  return doc.document.Line;
}

/** Net movement per account, in cents. Positive = the account increased
 *  (income earned, liability taken on). */
export function postToLedger(
  documents: PostableDocument[],
): Map<string, number> {
  const balances = new Map<string, number>();

  for (const doc of documents) {
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
  }

  return balances;
}

/** One account's net movement, in dollars. */
export function accountBalance(
  documents: PostableDocument[],
  accountId: string,
): number {
  return toDollars(postToLedger(documents).get(accountId) ?? 0);
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
