import type {
  QuickBooksAccount,
  QuickBooksCompanyData,
} from "@/types/quickbooks";

import type { QuickBooksMapping } from "./mappings-store";
import type { MappableGroup, MappableItem } from "./yipyy-catalog";

// ============================================================================
// Smart defaults for the mapping screen (Phase 3.4a).
//
// A suggestion is a proposal, never a decision. Nothing here writes to the
// mappings store — the screen shows each suggestion behind an amber "Suggested"
// badge and the facility applies it, one row or all at once. Silently
// pre-filling would mean a facility could finish setup having agreed to
// postings they never actually read.
// ============================================================================

export interface MappingSuggestion extends QuickBooksMapping {
  /** Why this was proposed, shown on hover so a suggestion is auditable. */
  reason: string;
}

export type SuggestionSet = Record<string, MappingSuggestion>;

const activeAccounts = (data: QuickBooksCompanyData) =>
  data.accounts.filter((a) => a.Active);

function incomeAccounts(data: QuickBooksCompanyData): QuickBooksAccount[] {
  return activeAccounts(data).filter(
    (a) =>
      a.AccountType === "Income" &&
      a.AccountSubType !== "DiscountsRefundsGiven",
  );
}

/** An income account whose name mentions the service, e.g. "Grooming Income"
 *  or "Grooming Revenue" for a grooming service. */
function incomeAccountFor(
  data: QuickBooksCompanyData,
  keyword: string,
): QuickBooksAccount | undefined {
  const pattern = new RegExp(keyword.replace(/[^a-z0-9]+/gi, ".?"), "i");
  return incomeAccounts(data).find((a) => pattern.test(a.Name));
}

function liabilityAccountFor(
  data: QuickBooksCompanyData,
  pattern: RegExp,
): QuickBooksAccount | undefined {
  return activeAccounts(data).find(
    (a) => a.Classification === "Liability" && pattern.test(a.Name),
  );
}

function generalLiability(
  data: QuickBooksCompanyData,
): QuickBooksAccount | undefined {
  return activeAccounts(data).find(
    (a) =>
      a.AccountType === "Other Current Liability" &&
      a.AccountSubType !== "GlobalTaxPayable" &&
      !/gift\s*card|deposit|tip|gratuit/i.test(a.Name),
  );
}

/** The QuickBooks item each group is normally sold as. */
const ITEM_BY_GROUP: Partial<Record<MappableGroup["key"], RegExp>> = {
  addons: /add-?on/i,
  memberships: /membership/i,
  gift_cards: /gift\s*card/i,
  deposits: /deposit/i,
  retail: /retail/i,
  discounts: /discount/i,
  tips: /tip/i,
};

/** Service items are chosen by the service's own type, not its group. */
const ITEM_BY_SERVICE_TYPE: { match: RegExp; item: RegExp }[] = [
  { match: /groom/i, item: /grooming/i },
  { match: /board/i, item: /boarding/i },
  { match: /daycare/i, item: /daycare/i },
  { match: /train/i, item: /training/i },
];

function suggestItem(
  data: QuickBooksCompanyData,
  group: MappableGroup,
  item: MappableItem,
): string | undefined {
  const items = data.items.filter((i) => i.Active);
  if (group.key === "services") {
    const rule = ITEM_BY_SERVICE_TYPE.find((r) => r.match.test(item.type));
    const hit = rule && items.find((i) => rule.item.test(i.Name));
    if (hit) return hit.Id;
  }
  const pattern = ITEM_BY_GROUP[group.key];
  const named = pattern && items.find((i) => pattern.test(i.Name));
  if (named) return named.Id;

  // Packages and surcharges have no QuickBooks item of their own, so without a
  // fallback they would stay half-suggested forever — "Confirm all" would claim
  // more than it could finish, and those rows could never be completed in bulk.
  return items.find((i) => i.Type === "Service")?.Id;
}

function suggestAccount(
  data: QuickBooksCompanyData,
  group: MappableGroup,
  item: MappableItem,
): { account?: QuickBooksAccount; reason: string } {
  // Money held for someone else never gets an income account.
  if (item.postsToLiability) {
    const pattern =
      group.key === "gift_cards"
        ? /gift\s*card/i
        : group.key === "deposits"
          ? /deposit/i
          : /tip|gratuit/i;
    const specific = liabilityAccountFor(data, pattern);
    if (specific)
      return { account: specific, reason: "Matched by name and account type." };
    const general = generalLiability(data);
    return general
      ? {
          account: general,
          reason: "No dedicated liability account — using the general one.",
        }
      : { reason: "No suitable liability account found." };
  }

  if (item.isContraRevenue) {
    const discounts = activeAccounts(data).find(
      (a) =>
        a.AccountSubType === "DiscountsRefundsGiven" ||
        /discount/i.test(a.Name),
    );
    return discounts
      ? { account: discounts, reason: "Discounts post to contra-revenue." }
      : { reason: "No discounts account found." };
  }

  // Everything else is revenue. Prefer an account named after the thing sold.
  const keyword =
    group.key === "retail"
      ? "Retail"
      : group.key === "memberships"
        ? "Membership"
        : item.type;

  const named = incomeAccountFor(data, keyword);
  if (named)
    return {
      account: named,
      reason: `Matched "${keyword}" in the account name.`,
    };

  const first = incomeAccounts(data)[0];
  return first
    ? {
        account: first,
        reason: "No matching account — using your first income account.",
      }
    : { reason: "No income account found." };
}

/**
 * Propose a mapping for every item that doesn't already have one.
 *
 * Items the facility has already mapped are skipped entirely: a suggestion must
 * never appear to second-guess a decision that has been made.
 */
export function suggestMappings(
  groups: MappableGroup[],
  data: QuickBooksCompanyData,
  existing: Record<string, QuickBooksMapping>,
): SuggestionSet {
  const out: SuggestionSet = {};
  for (const group of groups) {
    // Tax is mapped to a QuickBooks tax code in sync settings, not to an item
    // and account, so there is nothing here to propose.
    if (group.key === "taxes") continue;

    for (const item of group.items) {
      const current = existing[item.id];
      if (current?.itemId && current?.accountId) continue;

      const { account, reason } = suggestAccount(data, group, item);
      const itemId = suggestItem(data, group, item);
      if (!account && !itemId) continue;

      out[item.id] = {
        // Never propose over something already chosen.
        itemId: current?.itemId ? undefined : itemId,
        accountId: current?.accountId ? undefined : account?.Id,
        reason,
      };
      if (!out[item.id].itemId && !out[item.id].accountId) delete out[item.id];
    }
  }
  return out;
}

/** Strip the reason so a suggestion can be written to the mappings store. */
export function toMapping(suggestion: MappingSuggestion): QuickBooksMapping {
  const mapping: QuickBooksMapping = {};
  if (suggestion.itemId) mapping.itemId = suggestion.itemId;
  if (suggestion.accountId) mapping.accountId = suggestion.accountId;
  return mapping;
}
