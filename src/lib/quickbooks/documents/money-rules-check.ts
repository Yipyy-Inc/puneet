import { QUICKBOOKS_MOCK_COMPANY } from "@/data/quickbooks-mock";
import type { CartItem, Transaction } from "@/types/retail";

import { DEFAULT_SETTINGS } from "../settings-store";
import {
  applyDepositToReceipt,
  buildDepositReceipt,
  buildDepositRefundReceipt,
  depositsHeldAccount,
} from "./deposit";
import {
  accountBalance,
  checkDepositRule,
  totalIncome,
  type PostableDocument,
} from "./ledger";
import {
  buildPackageRedemptionReceipt,
  buildPackageSaleReceipt,
} from "./package";
import { buildServiceSalesReceipt, receiptBalances } from "./sales-receipt";

// ============================================================================
// The money rules, as runnable scenarios (`bun run check:quickbooks`).
//
// These are the invariants that cannot be checked by looking at one document:
// they are properties of a SEQUENCE. A deposit receipt is correct on its own
// and still wrong if nothing ever releases the liability. A package sale is
// correct on its own and still wrong if every redemption re-recognises the
// revenue.
//
// There is no test runner in this repo, so these live in src and are driven by
// a script — the same shape as the grooming pricing-consistency check.
// ============================================================================

export interface RuleScenarioResult {
  name: string;
  ok: boolean;
  detail: string;
}

export interface MoneyRulesReport {
  ok: boolean;
  results: RuleScenarioResult[];
}

const data = QUICKBOOKS_MOCK_COMPANY;

function firstIncomeAccountId(): string {
  const account = data.accounts.find((a) => a.Classification === "Revenue");
  if (!account) throw new Error("mock company has no income account");
  return account.Id;
}

function bankAccountId(): string | undefined {
  return data.accounts.find((a) => a.AccountType === "Bank")?.Id;
}

function serviceItem(o: Partial<CartItem>): CartItem {
  return {
    itemType: "service",
    serviceId: "groom-1",
    productName: "Full Groom",
    sku: "S-1",
    quantity: 1,
    unitPrice: 200,
    discount: 0,
    discountType: "fixed",
    total: 200,
    ...o,
  };
}

function checkoutTransaction(total: number): Transaction {
  return {
    id: "chk-1",
    transactionNumber: "TXN-CHK-1",
    items: [serviceItem({ unitPrice: total, total })],
    subtotal: total,
    discountTotal: 0,
    taxTotal: 0,
    total,
    paymentMethod: "credit",
    payments: [{ method: "credit", amount: total }],
    status: "completed",
    customerName: "Alice Johnson",
    customerEmail: "alice@example.com",
    cashierId: "c1",
    cashierName: "Sam",
    receiptSent: false,
    notes: "",
    createdAt: "2026-07-20T17:00:00",
  } as Transaction;
}

/**
 * Run every money-rule scenario.
 *
 * Each one states the rule in the name, so a failure in CI reads as the broken
 * promise rather than as a broken assertion.
 */
export function runQuickBooksMoneyRuleChecks(): MoneyRulesReport {
  const results: RuleScenarioResult[] = [];
  const add = (name: string, ok: boolean, detail: string) =>
    results.push({ name, ok, detail });

  const incomeId = firstIncomeAccountId();
  const settings = { ...DEFAULT_SETTINGS, depositAccountId: bankAccountId() };
  const mappings = {
    "service:groom-1": { itemId: data.items[0]?.Id, accountId: incomeId },
    "package:gpp-001": { itemId: data.items[0]?.Id, accountId: incomeId },
  };
  const ctx = { data, mappings, settings, catchAllAccountId: incomeId };

  const held = depositsHeldAccount({ data, settings });
  if (!held) {
    add(
      "A Deposits Held liability account exists",
      false,
      "The mock company has no liability account matching /deposit/i — RULE 5E cannot be evaluated.",
    );
    return { ok: false, results };
  }
  add(
    "A Deposits Held liability account exists",
    true,
    `Deposits post to "${held.name}".`,
  );

  // ── RULE 5E, the happy path ──────────────────────────────────────────────
  const deposit = buildDepositReceipt(
    {
      depositId: "dep-1",
      amount: 50,
      collectedAt: "2026-07-10T09:00:00",
      bookingId: 4821,
      receiptNumber: "DEP-1",
      customerName: "Alice Johnson",
      customerEmail: "alice@example.com",
    },
    { data, mappings, settings },
  );

  add(
    "A deposit reaches the liability, never income",
    totalIncome(
      [{ kind: "sales_receipt", document: deposit.receipt }],
      data,
    ) === 0,
    "The stay hasn't happened; the money may go back.",
  );

  const checkout = buildServiceSalesReceipt(checkoutTransaction(200), ctx);
  const applied = applyDepositToReceipt(
    checkout.receipt,
    { amount: 50, depositReceiptNumber: "DEP-1" },
    { data, settings },
  );

  const settled: PostableDocument[] = [
    { kind: "sales_receipt", document: deposit.receipt },
    { kind: "sales_receipt", document: applied.receipt },
  ];
  const rule5e = checkDepositRule(settled, {
    depositsHeldAccountId: held.value,
    data,
    expectedIncome: 200,
  });

  add(
    "RULE 5E — deposit + applied credit net to zero in Deposits Held",
    rule5e.depositsHeldBalance === 0,
    rule5e.depositsHeldBalance === 0
      ? "$50 taken, $50 released."
      : (rule5e.problems[0] ?? ""),
  );
  add(
    "RULE 5E — the FULL service price lands in income after checkout",
    rule5e.incomeRecognised === 200,
    rule5e.incomeRecognised === 200
      ? "$200 of revenue, not the $150 balance collected."
      : (rule5e.problems.find((p) => p.includes("expected")) ?? ""),
  );
  add(
    "The checkout receipt totals the cash actually collected",
    applied.receipt.TotalAmt === 150 && receiptBalances(applied.receipt),
    `Client pays $${applied.receipt.TotalAmt.toFixed(2)} at checkout; lines still sum to the total.`,
  );

  // ── RULE 5E, the cancellation path ───────────────────────────────────────
  const refund = buildDepositRefundReceipt(
    {
      depositId: "dep-1",
      amount: 50,
      collectedAt: "2026-07-10T09:00:00",
      refundedAt: "2026-07-12T10:00:00",
      receiptNumber: "DEP-1",
      customerName: "Alice Johnson",
      customerEmail: "alice@example.com",
    },
    { data, mappings, settings },
  );
  const cancelled: PostableDocument[] = [
    { kind: "sales_receipt", document: deposit.receipt },
    { kind: "refund_receipt", document: refund.refund },
  ];
  add(
    "RULE 5E — a refunded deposit also nets to zero, with no income",
    accountBalance(cancelled, held.value) === 0 &&
      totalIncome(cancelled, data) === 0,
    "Nothing was earned, so nothing is recognised.",
  );

  // ── The check has to be able to FAIL ─────────────────────────────────────
  const neverReleased = checkDepositRule(
    [
      { kind: "sales_receipt", document: deposit.receipt },
      { kind: "sales_receipt", document: checkout.receipt },
    ],
    { depositsHeldAccountId: held.value, data, expectedIncome: 200 },
  );
  add(
    "The rule catches a deposit that was never released",
    !neverReleased.satisfied,
    "A check that cannot fail proves nothing.",
  );

  const balanceOnly = buildServiceSalesReceipt(checkoutTransaction(150), ctx);
  const underRecognised = checkDepositRule(
    [
      { kind: "sales_receipt", document: deposit.receipt },
      {
        kind: "sales_receipt",
        document: applyDepositToReceipt(
          balanceOnly.receipt,
          { amount: 50 },
          { data, settings },
        ).receipt,
      },
    ],
    { depositsHeldAccountId: held.value, data, expectedIncome: 200 },
  );
  add(
    "The rule catches billing only the balance at checkout",
    !underRecognised.satisfied,
    "Income would be $150 against a $200 service.",
  );

  // ── Packages: revenue is recognised exactly once ─────────────────────────
  const packageSale = buildPackageSaleReceipt(
    {
      customerPackageId: "cp-001",
      packageId: "gpp-001",
      packageName: "5x Full Groom Pack",
      packagePrice: 425,
      passesTotal: 5,
      purchasedAt: "2026-07-01T10:00:00",
      receiptNumber: "PKG-1",
      customerName: "Alice Johnson",
      customerEmail: "alice@example.com",
    },
    ctx,
  );

  const packageRun: PostableDocument[] = [
    { kind: "sales_receipt", document: packageSale.receipt },
    ...Array.from({ length: 5 }, (_, i) => ({
      kind: "sales_receipt" as const,
      document: buildPackageRedemptionReceipt(
        {
          customerPackageId: "cp-001",
          packageName: "5x Full Groom Pack",
          redemptionId: `red-cp-001-${i + 1}`,
          serviceId: "groom-1",
          serviceName: "Full Groom",
          servicePrice: 100,
          redeemedAt: "2026-07-15T09:00:00",
          passNumber: i + 1,
          passesTotal: 5,
          packageReceiptNumber: "PKG-1",
        },
        ctx,
      ).receipt,
    })),
  ];

  add(
    "A package sale has no discount line",
    !packageSale.receipt.Line.some((l) =>
      /discount/i.test(l.Description ?? ""),
    ),
    "The package is the product at its own price; the à-la-carte saving never hit a ledger.",
  );
  add(
    "PACKAGE RULE — five redemptions recognise the package price once",
    totalIncome(packageRun, data) === 425,
    `Income after the sale and all five passes: $${totalIncome(packageRun, data).toFixed(2)}.`,
  );
  add(
    "Every redemption receipt totals zero",
    packageRun.slice(1).every((d) => d.document.TotalAmt === 0),
    "The service is shown at full price and cancelled by the pass credit.",
  );

  return { ok: results.every((r) => r.ok), results };
}
