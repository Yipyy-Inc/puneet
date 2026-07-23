import type {
  QuickBooksAccount,
  QuickBooksCompanyData,
} from "@/types/quickbooks";

// ============================================================================
// Table 1 — the accounts Yipyy needs in a facility's chart of accounts, and how
// to recognise them (Phase 3.3).
//
// Pure: takes a company snapshot, returns findings. The health-check screen
// renders these; nothing here knows about React.
//
// Matching leans on AccountType/AccountSubType first and falls back to the
// account's name, because Name is facility-chosen ("Tips Payable", "Staff
// Gratuities", "Tips owing") while the type is not.
// ============================================================================

/** Whether a missing account blocks setup or merely warns. */
export type RequirementLevel = "required" | "optional";

export interface AccountRequirement {
  key: string;
  /** Shown on the amber row: "Not found — [label]". */
  label: string;
  level: RequirementLevel;
  /** The "What is this?" tooltip, in the facility's language, not an
   *  accountant's. */
  explain: string;
  /** What happens if it stays missing. Only meaningful for optional rows. */
  fallbackNote?: string;
}

export interface AccountFinding extends AccountRequirement {
  /** The account that satisfies this requirement, if the company has one. */
  account?: QuickBooksAccount;
  /** A general account Yipyy will post to instead, when the specific one is
   *  missing but something usable exists. */
  fallback?: QuickBooksAccount;
}

export interface AccountHealth {
  findings: AccountFinding[];
  /** Required rows that are missing. Non-empty means setup cannot proceed. */
  blocking: AccountFinding[];
  /** Optional rows that are missing — carried forward as a summary (3.5). */
  warnings: AccountFinding[];
  canProceed: boolean;
}

const REQUIREMENTS: AccountRequirement[] = [
  {
    key: "income",
    label: "Income account",
    level: "required",
    explain:
      "Where the money you earn is recorded. Yipyy posts each service's revenue to an income account, so you can see what grooming brought in versus boarding.",
  },
  {
    key: "accounts_receivable",
    label: "Accounts Receivable",
    level: "required",
    explain:
      "Money clients owe you. When a booking is invoiced instead of paid on the spot, the amount sits here until it's settled.",
  },
  {
    key: "undeposited_funds",
    label: "Undeposited Funds",
    level: "optional",
    explain:
      "A holding spot for payments you've taken but haven't banked yet. It's what lets a day's card payments match the single deposit that lands in your bank.",
    fallbackNote:
      "Payments will post straight to a bank account instead, so they won't group into one deposit.",
  },
  {
    key: "gift_card_liability",
    label: "Gift Card Liability",
    level: "optional",
    explain:
      "Gift cards you've sold but nobody has spent yet. It isn't income until it's redeemed — it's money you owe in services.",
    fallbackNote:
      "Gift card sales will post to a general liability account instead.",
  },
  {
    key: "deposits_held",
    label: "Deposits Held",
    level: "optional",
    explain:
      "Booking deposits you've taken for stays that haven't happened. Like gift cards, it isn't earned yet — it becomes income at checkout.",
    fallbackNote: "Deposits will post to a general liability account instead.",
  },
  {
    key: "tips_payable",
    label: "Tips Payable",
    level: "optional",
    explain:
      "Tips collected on your staff's behalf. The money passes through you on its way to them, so it's owed, not earned.",
    fallbackNote: "Tips will post to a general liability account instead.",
  },
  {
    key: "discounts",
    label: "Discounts account",
    level: "optional",
    explain:
      "Keeps discounts visible as their own line rather than quietly shrinking your sales figures, so you can see what you gave away.",
    fallbackNote:
      "Discounts will reduce the service's income line directly, so they won't be reportable on their own.",
  },
];

const active = (accounts: QuickBooksAccount[]) =>
  accounts.filter((a) => a.Active);

/** Liability accounts that are already earmarked for one of Table 1's specific
 *  purposes. A company with Gift Card Liability but no Tips Payable must not be
 *  told tips will post to the gift card account — that misstates both balances,
 *  and the whole reason these accounts exist is to keep the two apart. */
const EARMARKED_LIABILITY = /gift\s*card|deposit|tip|gratuit/i;

/** A genuinely general Other Current Liability the three specific ones can fall
 *  back to. Tax payable is excluded too: posting gift cards or tips into a tax
 *  account would misstate what the business owes the government. */
function generalLiability(
  accounts: QuickBooksAccount[],
): QuickBooksAccount | undefined {
  const candidates = active(accounts).filter(
    (a) =>
      a.AccountType === "Other Current Liability" &&
      a.AccountSubType !== "GlobalTaxPayable" &&
      !EARMARKED_LIABILITY.test(a.Name),
  );
  // Prefer an explicitly general account over whatever happens to be first.
  return (
    candidates.find((a) => /other current liabilit/i.test(a.Name)) ??
    candidates[0]
  );
}

function findIncome(
  accounts: QuickBooksAccount[],
): QuickBooksAccount | undefined {
  return active(accounts).find(
    (a) =>
      a.AccountType === "Income" &&
      // Contra-revenue is an income-type account, but a company whose ONLY
      // income account is "Discounts Given" has nowhere to book a sale.
      a.AccountSubType !== "DiscountsRefundsGiven",
  );
}

function findLiabilityNamed(
  accounts: QuickBooksAccount[],
  pattern: RegExp,
): QuickBooksAccount | undefined {
  return active(accounts).find(
    (a) => a.AccountType === "Other Current Liability" && pattern.test(a.Name),
  );
}

/** Run Table 1 against a company snapshot. */
export function checkAccountHealth(data: QuickBooksCompanyData): AccountHealth {
  const accounts = data.accounts;
  const general = generalLiability(accounts);

  const matchers: Record<string, () => QuickBooksAccount | undefined> = {
    income: () => findIncome(accounts),
    accounts_receivable: () =>
      active(accounts).find((a) => a.AccountType === "Accounts Receivable"),
    undeposited_funds: () =>
      active(accounts).find((a) => a.AccountSubType === "UndepositedFunds"),
    gift_card_liability: () => findLiabilityNamed(accounts, /gift\s*card/i),
    deposits_held: () => findLiabilityNamed(accounts, /deposit/i),
    tips_payable: () => findLiabilityNamed(accounts, /tip|gratuit/i),
    discounts: () =>
      active(accounts).find(
        (a) =>
          a.AccountSubType === "DiscountsRefundsGiven" ||
          /discount/i.test(a.Name),
      ),
  };

  /** Which requirements can borrow the general liability account. */
  const LIABILITY_FALLBACK = new Set([
    "gift_card_liability",
    "deposits_held",
    "tips_payable",
  ]);

  const findings: AccountFinding[] = REQUIREMENTS.map((req) => {
    const account = matchers[req.key]?.();
    const fallback =
      !account && LIABILITY_FALLBACK.has(req.key) ? general : undefined;
    return { ...req, account, fallback };
  });

  const blocking = findings.filter((f) => f.level === "required" && !f.account);
  const warnings = findings.filter((f) => f.level === "optional" && !f.account);

  return {
    findings,
    blocking,
    warnings,
    canProceed: blocking.length === 0,
  };
}

/** One-line summaries of the optional gaps, carried into the setup summary so
 *  a facility that clicked past them still sees what they chose to skip. */
export function summariseWarnings(health: AccountHealth): string[] {
  return health.warnings.map((w) =>
    w.fallback
      ? `${w.label} not found — posting to "${w.fallback.Name}" instead.`
      : `${w.label} not found — ${w.fallbackNote ?? "Yipyy will use its closest match."}`,
  );
}

/** Stubbed deeplink into QuickBooks' chart of accounts.
 *
 *  TODO: real QuickBooks deeplink — the live URL is company-scoped
 *  (…/app/accountlist?realmId=…) and should carry the account type to
 *  pre-select, so the facility lands on a half-filled form rather than a list. */
export function quickBooksCreateAccountUrl(realmId?: string): string {
  const base = "https://qbo.intuit.com/app/accountlist";
  return realmId ? `${base}?realmId=${encodeURIComponent(realmId)}` : base;
}
