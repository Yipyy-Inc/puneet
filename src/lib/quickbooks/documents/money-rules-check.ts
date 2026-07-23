import { QUICKBOOKS_MOCK_COMPANY } from "@/data/quickbooks-mock";
import type { CartItem, Return, Transaction } from "@/types/retail";

import { DEFAULT_SETTINGS } from "../settings-store";
import { buildStoreCreditMemo, creditMemoBalances } from "./credit-memo";
import { buildRefundReceipt, refundBalances } from "./refund-receipt";
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
  buildGiftCardBreakageEntry,
  buildGiftCardRedemptionReceipt,
  buildGiftCardSaleReceipt,
  giftCardLiabilityAccount,
  journalEntryBalances,
} from "./gift-card";
import {
  buildMembershipCancellation,
  buildMembershipReceipt,
} from "./membership";
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

/** A retail sale of one product, used for the refund scenario (5). */
function retailTransaction(o: Partial<Transaction> = {}): Transaction {
  return {
    id: "ret-1",
    transactionNumber: "TXN-RET-1",
    items: [
      {
        itemType: "product",
        productId: "p1",
        productName: "Dog Shampoo",
        sku: "SH-1",
        quantity: 1,
        unitPrice: 20,
        discount: 0,
        discountType: "fixed",
        total: 20,
      },
    ],
    subtotal: 20,
    discountTotal: 0,
    taxTotal: 0,
    total: 20,
    paymentMethod: "credit",
    payments: [{ method: "credit", amount: 20 }],
    status: "completed",
    customerName: "Alice Johnson",
    customerEmail: "alice@example.com",
    cashierId: "c1",
    cashierName: "Sam",
    receiptSent: false,
    notes: "",
    createdAt: "2026-07-20T17:00:00",
    ...o,
  } as Transaction;
}

/** A return of that product, for the refund / store-credit scenarios (5). */
function productReturn(o: Partial<Return> = {}): Return {
  return {
    id: "r-1",
    returnNumber: "RET-1",
    transactionId: "ret-1",
    transactionNumber: "TXN-RET-1",
    items: [
      {
        transactionItemId: "",
        productId: "p1",
        productName: "Dog Shampoo",
        sku: "SH-1",
        quantity: 1,
        originalQuantity: 1,
        unitPrice: 20,
        discount: 0,
        total: 20,
        reason: "defective",
        restocked: true,
      },
    ],
    subtotal: 20,
    refundTotal: 20,
    refundMethod: "cash",
    status: "completed",
    customerName: "Alice Johnson",
    customerEmail: "alice@example.com",
    processedBy: "u1",
    processedByName: "Sam",
    createdAt: "2026-07-22T09:00:00",
    completedAt: "2026-07-22T09:00:00",
    ...o,
  } as Return;
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
    "product:p1": { itemId: data.items[0]?.Id, accountId: incomeId },
  };
  const ctx = { data, mappings, settings, catchAllAccountId: incomeId };

  // ── SCENARIO 1 — standard service payment (RULE 5A) ──────────────────────
  // A clean sale: the QuickBooks total must equal the Yipyy total exactly, and
  // with round numbers no adjustment line is needed.
  const clean = buildServiceSalesReceipt(checkoutTransaction(200), ctx);
  add(
    "SCENARIO 1 — a clean sale: QB total equals the Yipyy total, no rounding line",
    clean.receipt.TotalAmt === 200 &&
      receiptBalances(clean.receipt) &&
      !clean.receipt.Line.some((l) => /rounding/i.test(l.Description ?? "")),
    "$200 in, $200 out, lines sum exactly.",
  );

  // A sale whose lines can't sum to the Yipyy total to the cent: 3 × $3.33 is
  // $9.99, but the client was charged $10.00. RULE 5A forces a +$0.01 line so
  // the document still equals what the card was charged.
  const penny = buildServiceSalesReceipt(
    {
      ...retailTransaction(),
      items: [
        {
          itemType: "service",
          serviceId: "groom-1",
          productName: "Nail Trim",
          sku: "NT-1",
          quantity: 3,
          unitPrice: 3.33,
          discount: 0,
          discountType: "fixed",
          total: 9.99,
        } as CartItem,
      ],
      subtotal: 9.99,
      total: 10,
    } as Transaction,
    ctx,
  );
  const roundingLine = penny.receipt.Line.find((l) =>
    /rounding/i.test(l.Description ?? ""),
  );
  add(
    "SCENARIO 1 — a sub-cent mismatch adds a ±$0.01 rounding line",
    Boolean(roundingLine) &&
      Math.abs(Math.round((roundingLine?.Amount ?? 0) * 100)) === 1,
    `Lines were $9.99, charged $10.00 — a ${roundingLine ? `$${roundingLine.Amount.toFixed(2)}` : "missing"} line closes the gap.`,
  );
  add(
    "SCENARIO 1 — after the rounding line, QB total equals the Yipyy total exactly",
    penny.receipt.TotalAmt === 10 && receiptBalances(penny.receipt),
    "The receipt totals $10.00, to the cent, and its lines sum to it.",
  );

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

  // ── SCENARIO 2 — deposit (RULE 5E), the happy path ───────────────────────
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
    "SCENARIO 2 — deposit + applied credit net to zero in Deposits Held",
    rule5e.depositsHeldBalance === 0,
    rule5e.depositsHeldBalance === 0
      ? "$50 taken, $50 released."
      : (rule5e.problems[0] ?? ""),
  );
  add(
    "SCENARIO 2 — the FULL service price lands in income after checkout",
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
    "SCENARIO 2 — a refunded deposit also nets to zero, with no income",
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

  // ── SCENARIO 3 — packages: revenue recognised once ───────────────────────
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
    "SCENARIO 3 — five redemptions recognise the package price once",
    totalIncome(packageRun, data) === 425,
    `Income after the sale and all five passes: $${totalIncome(packageRun, data).toFixed(2)}.`,
  );
  add(
    "SCENARIO 3 — every package redemption receipt totals zero (no double count)",
    packageRun.slice(1).every((d) => d.document.TotalAmt === 0),
    "The service is shown at full price and cancelled by the pass credit.",
  );

  // ── SCENARIO 4 — gift cards: liability, then liability→income ─────────────
  const giftLiability = giftCardLiabilityAccount({ data, settings });
  if (!giftLiability) {
    add(
      "A Gift Card Liability account exists",
      false,
      "The mock company has no liability account matching /gift card/i — 5C cannot be evaluated.",
    );
  } else {
    const gcSale = buildGiftCardSaleReceipt(
      {
        giftCardId: "gc-1",
        code: "GC-1001",
        amount: 100,
        purchasedAt: "2026-07-01T10:00:00",
        customerName: "Alice Johnson",
        customerEmail: "alice@example.com",
      },
      ctx,
    );
    const gcRedeem = buildGiftCardRedemptionReceipt(
      {
        giftCardId: "gc-1",
        code: "GC-1001",
        redemptionId: "gcr-1",
        serviceId: "groom-1",
        serviceName: "Full Groom",
        servicePrice: 60,
        redeemedAt: "2026-07-20T09:00:00",
        customerName: "Alice Johnson",
        customerEmail: "alice@example.com",
      },
      ctx,
    );
    const gcBreakage = buildGiftCardBreakageEntry(
      {
        giftCardId: "gc-1",
        code: "GC-1001",
        balance: 40,
        expiredAt: "2027-07-02",
      },
      { data, settings },
    );

    add(
      "SCENARIO 4 — a gift-card sale hits the liability, never income",
      totalIncome(
        [{ kind: "sales_receipt", document: gcSale.receipt }],
        data,
      ) === 0,
      "Selling a promise isn't a sale; the revenue comes when it is redeemed.",
    );
    add(
      "SCENARIO 4 — redemption recognises the FULL service price as income",
      totalIncome(
        [{ kind: "sales_receipt", document: gcRedeem.receipt }],
        data,
      ) === 60,
      "The card was the tender; the service was the sale.",
    );
    // The move itself: redeeming pushes $60 INTO income and pulls the same $60
    // OUT of the liability (the card is the deposit account), so the single
    // redemption both recognises revenue and draws the liability down.
    const redeemOnly: PostableDocument[] = [
      { kind: "sales_receipt", document: gcRedeem.receipt },
    ];
    const liabilityMove = accountBalance(redeemOnly, giftLiability.value, data);
    add(
      "SCENARIO 4 — redemption MOVES Liability → Income (−$60 liability, +$60 income)",
      liabilityMove === -60 && totalIncome(redeemOnly, data) === 60,
      liabilityMove === -60
        ? "$60 leaves Gift Card Liability and lands in income."
        : `Liability moved ${liabilityMove}, expected −60.`,
    );

    const gcLife: PostableDocument[] = [
      { kind: "sales_receipt", document: gcSale.receipt },
      { kind: "sales_receipt", document: gcRedeem.receipt },
      { kind: "journal_entry", document: gcBreakage.entry },
    ];
    const gcBalance = accountBalance(gcLife, giftLiability.value, data);
    add(
      "SCENARIO 4 — sale, redemption and breakage net the liability to zero",
      gcBalance === 0,
      gcBalance === 0
        ? "$100 sold, $60 spent, $40 expired."
        : `$${gcBalance.toFixed(2)} is stranded in ${giftLiability.name}.`,
    );
    add(
      "Breakage balances as a journal entry",
      journalEntryBalances(gcBreakage.entry),
      "Debits equal credits; the liability moves to Breakage Income.",
    );
  }

  // ── SCENARIO 5 — refund mirrors the sale; store credit is a Credit Memo ───
  const sale = buildServiceSalesReceipt(retailTransaction(), ctx);
  const saleAccount =
    sale.receipt.Line[0].SalesItemLineDetail.ItemAccountRef?.value;

  // (a) Cash refund: a Refund Receipt that mirrors the original sale.
  const cashRefund = buildRefundReceipt(
    retailTransaction(),
    productReturn(),
    ctx,
  );
  const refundAccount =
    cashRefund.refund.Line[0].SalesItemLineDetail.ItemAccountRef?.value;
  add(
    "SCENARIO 5 — a refund mirrors the sale: same amount, same income account",
    cashRefund.refund.TotalAmt === 20 &&
      refundAccount === saleAccount &&
      refundBalances(cashRefund.refund),
    `Refund of $20 reverses ${refundAccount === saleAccount ? "the same" : "a DIFFERENT"} income account the sale used.`,
  );
  add(
    "SCENARIO 5 — sale then full refund nets income to zero",
    totalIncome(
      [
        { kind: "sales_receipt", document: sale.receipt },
        { kind: "refund_receipt", document: cashRefund.refund },
      ],
      data,
    ) === 0,
    "$20 earned, $20 reversed — the books show the sale never stuck.",
  );

  // (b) Store credit: NOT a refund receipt — a Credit Memo, because no cash
  // leaves the business.
  const creditReturn = productReturn({
    refundMethod: "store_credit",
    storeCreditAmount: 20,
  });
  const memo = buildStoreCreditMemo(retailTransaction(), creditReturn, ctx);
  add(
    "SCENARIO 5 — store credit is a Credit Memo for the credit amount",
    memo.memo.TotalAmt === 20 && creditMemoBalances(memo.memo),
    "A return taken as credit becomes a Credit Memo, not a cash refund.",
  );
  add(
    "SCENARIO 5 — the credit memo reverses the SAME income account, touches no bank",
    memo.memo.Line[0].SalesItemLineDetail.ItemAccountRef?.value ===
      saleAccount && !("DepositToAccountRef" in memo.memo),
    "Revenue is reversed; nothing is paid out, because nothing left the till.",
  );

  // ── Memberships: one document per period ─────────────────────────────────
  const period = (start: string, chargeId: string) =>
    buildMembershipReceipt(
      {
        chargeId,
        membershipId: "plan-001",
        planName: "Daycare Basic",
        tierLabel: "Silver",
        amount: 99,
        cycle: "monthly",
        periodStart: start,
        chargedAt: `${start}T06:00:00`,
        customerName: "Alice Johnson",
        customerEmail: "alice@example.com",
      },
      ctx,
    ).receipt;

  const july = period("2026-07-01", "ch-jul");
  const august = period("2026-08-01", "ch-aug");

  add(
    "A membership charge names the period it covers",
    (july.Line[0].Description ?? "").includes("2026-07-01 – 2026-07-31"),
    july.Line[0].Description ?? "",
  );
  add(
    "MEMBERSHIP RULE — each period is its own document and its own revenue",
    july.Line[0].Description !== august.Line[0].Description &&
      totalIncome(
        [
          { kind: "sales_receipt", document: july },
          { kind: "sales_receipt", document: august },
        ],
        data,
      ) === 198,
    "Two months billed, two months of revenue.",
  );

  const cancelledMembership = buildMembershipCancellation(
    {
      chargeId: "ch-jul",
      membershipId: "plan-001",
      planName: "Daycare Basic",
      amount: 99,
      cycle: "monthly",
      periodStart: "2026-07-01",
      chargedAt: "2026-07-01",
      cancelledAt: "2026-08-01",
    },
    ctx,
  );
  add(
    "Cancelling after the period ends produces no entry",
    cancelledMembership.kind === "no_entry",
    "Nothing moved, so nothing is recorded.",
  );

  return { ok: results.every((r) => r.ok), results };
}
