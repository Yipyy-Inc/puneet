// ============================================================================
// QuickBooks Online entity shapes (Phase 2).
//
// These mirror the real Accounting API entities — PascalCase fields, `Ref`
// objects, `Id` as a string — rather than a Yipyy-flavoured simplification, so
// swapping the canned data in src/data/quickbooks-mock.ts for a real
// Account/Item/Customer/TaxCode read is a change of source, not of shape.
//
// Trimmed to the fields this integration actually uses. Anything the real API
// returns and we ignore is simply absent, never renamed.
// ============================================================================

/** QuickBooks' reference object — `value` is the entity Id. */
export interface QuickBooksRef {
  value: string;
  name?: string;
}

// ── Account (Chart of Accounts) ─────────────────────────────────────────────

/** QuickBooks' top-level account classification. */
export type QuickBooksClassification =
  | "Asset"
  | "Liability"
  | "Equity"
  | "Revenue"
  | "Expense";

/** The AccountType values this integration cares about. QuickBooks defines
 *  more; the health check (Table 1) only ever looks for these. */
export type QuickBooksAccountType =
  | "Income"
  | "Bank"
  | "Accounts Receivable"
  | "Other Current Asset"
  | "Other Current Liability"
  | "Expense"
  | "Cost of Goods Sold";

export interface QuickBooksAccount {
  Id: string;
  Name: string;
  /** Includes the parent path for sub-accounts, e.g. "Income:Grooming Income". */
  FullyQualifiedName: string;
  AccountType: QuickBooksAccountType;
  /** QuickBooks' finer-grained type, e.g. "ServiceFeeIncome",
   *  "UndepositedFunds", "OtherCurrentLiabilities". Drives the health check's
   *  matching, since Name is facility-chosen and AccountType alone is coarse. */
  AccountSubType: string;
  Classification: QuickBooksClassification;
  CurrentBalance: number;
  Active: boolean;
  AcctNum?: string;
  Description?: string;
  ParentRef?: QuickBooksRef;
}

// ── Item (Products & Services) ──────────────────────────────────────────────

export type QuickBooksItemType =
  | "Service"
  | "Inventory"
  | "NonInventory"
  | "Category"
  | "Bundle";

export interface QuickBooksItem {
  Id: string;
  Name: string;
  FullyQualifiedName: string;
  Type: QuickBooksItemType;
  Active: boolean;
  Taxable: boolean;
  UnitPrice: number;
  /** Where revenue for this item lands. The mapping UI's whole job is choosing
   *  the item; this is what makes that choice mean something. */
  IncomeAccountRef: QuickBooksRef;
  Description?: string;
  Sku?: string;
  ParentRef?: QuickBooksRef;
}

// ── Customer ────────────────────────────────────────────────────────────────

export interface QuickBooksEmailAddress {
  Address: string;
}

export interface QuickBooksPhoneNumber {
  FreeFormNumber: string;
}

export interface QuickBooksCustomer {
  Id: string;
  /** QuickBooks' unique display key. Yipyy writes "[Last], [First]". */
  DisplayName: string;
  GivenName?: string;
  FamilyName?: string;
  PrimaryEmailAddr?: QuickBooksEmailAddress;
  PrimaryPhone?: QuickBooksPhoneNumber;
  Active: boolean;
  Balance: number;
  CurrencyRef?: QuickBooksRef;
}

// ── Tax ─────────────────────────────────────────────────────────────────────

export interface QuickBooksTaxRate {
  Id: string;
  Name: string;
  /** Percent, as QuickBooks returns it: 9.975, not 0.09975. */
  RateValue: number;
  Active: boolean;
  Description?: string;
}

export type QuickBooksTaxApplicableOn = "Sales" | "Purchase";

export interface QuickBooksTaxRateDetail {
  TaxRateRef: QuickBooksRef;
  TaxTypeApplicable: QuickBooksTaxApplicableOn;
  /** Order the rates compound in. Quebec applies GST and QST side by side, both
   *  on the pre-tax amount, so both are order 0. */
  TaxOrder: number;
}

export interface QuickBooksTaxCode {
  Id: string;
  Name: string;
  Description?: string;
  Active: boolean;
  Taxable: boolean;
  /** True when the code bundles more than one rate (e.g. GST + QST). */
  TaxGroup: boolean;
  SalesTaxRateList: { TaxRateDetail: QuickBooksTaxRateDetail[] };
}

// ── Sales Receipt (Table 4) ─────────────────────────────────────────────────

export interface QuickBooksSalesItemLineDetail {
  ItemRef: QuickBooksRef;
  /** Where this line's money lands. QuickBooks normally infers it from the
   *  item, but Yipyy sends it so a facility's mapping wins. */
  ItemAccountRef?: QuickBooksRef;
  UnitPrice?: number;
  Qty?: number;
  TaxCodeRef?: QuickBooksRef;
}

export interface QuickBooksSalesLine {
  LineNum: number;
  Description?: string;
  /** Negative for discounts and for a downward rounding adjustment. */
  Amount: number;
  DetailType: "SalesItemLineDetail";
  SalesItemLineDetail: QuickBooksSalesItemLineDetail;
}

export interface QuickBooksTxnTaxDetail {
  TxnTaxCodeRef?: QuickBooksRef;
  /** The amount Yipyy already charged, not a QuickBooks recalculation. */
  TotalTax: number;
}

export interface QuickBooksSalesReceipt {
  /** Assigned by QuickBooks on create; absent on the document we send. */
  Id?: string;
  DocNumber?: string;
  /** "YYYY-MM-DD" — the date the payment was taken. */
  TxnDate: string;
  CustomerRef: QuickBooksRef;
  DepositToAccountRef?: QuickBooksRef;
  PaymentMethodRef?: QuickBooksRef;
  CurrencyRef?: QuickBooksRef;
  Line: QuickBooksSalesLine[];
  TxnTaxDetail?: QuickBooksTxnTaxDetail;
  /** Internal memo — never shown to the client. */
  PrivateNote?: string;
  TotalAmt: number;
}

// ── Linked transactions ─────────────────────────────────────────────────────

/** QuickBooks' cross-document link. A Payment carries one per Invoice it pays;
 *  a Credit Memo carries one per Invoice it offsets. */
export interface QuickBooksLinkedTxn {
  TxnId: string;
  /** "Invoice", "SalesReceipt", "CreditMemo", "Payment". */
  TxnType: string;
  TxnLineId?: string;
}

// ── Refund Receipt (Table 9) ────────────────────────────────────────────────

/**
 * The mirror of a Sales Receipt: money leaving the same account it arrived in.
 *
 * QuickBooks has no formal parent link from a Refund Receipt back to the Sales
 * Receipt it reverses, so the reference lives in `PrivateNote` and, where Yipyy
 * knows the posted document, in `LinkedTxn` — belt and braces, because a refund
 * nobody can trace to its sale is the thing that makes a reconciliation fail.
 */
export interface QuickBooksRefundReceipt {
  Id?: string;
  DocNumber?: string;
  TxnDate: string;
  CustomerRef: QuickBooksRef;
  /** The account the money is paid back OUT of. */
  DepositToAccountRef?: QuickBooksRef;
  PaymentMethodRef?: QuickBooksRef;
  CurrencyRef?: QuickBooksRef;
  Line: QuickBooksSalesLine[];
  TxnTaxDetail?: QuickBooksTxnTaxDetail;
  LinkedTxn?: QuickBooksLinkedTxn[];
  PrivateNote?: string;
  TotalAmt: number;
}

// ── Invoice + Payment (Table 10) ────────────────────────────────────────────

export interface QuickBooksInvoice {
  Id?: string;
  DocNumber?: string;
  TxnDate: string;
  /** "YYYY-MM-DD". What makes an invoice an invoice rather than a receipt. */
  DueDate: string;
  CustomerRef: QuickBooksRef;
  CurrencyRef?: QuickBooksRef;
  Line: QuickBooksSalesLine[];
  TxnTaxDetail?: QuickBooksTxnTaxDetail;
  /** Outstanding amount. Equal to TotalAmt on a freshly created invoice, and
   *  reduced by each Payment applied against it. */
  Balance: number;
  /** Shown to the client on the invoice itself. */
  CustomerMemo?: { value: string };
  PrivateNote?: string;
  TotalAmt: number;
}

/** A payment applied against one or more invoices. Never a document of its own
 *  in the client's eyes — it is what moves an Invoice toward Paid. */
export interface QuickBooksPayment {
  Id?: string;
  TxnDate: string;
  CustomerRef: QuickBooksRef;
  PaymentMethodRef?: QuickBooksRef;
  DepositToAccountRef?: QuickBooksRef;
  CurrencyRef?: QuickBooksRef;
  LinkedTxn: QuickBooksLinkedTxn[];
  PrivateNote?: string;
  TotalAmt: number;
  /** Left over when the payment exceeds what it was applied to. */
  UnappliedAmt?: number;
}

// ── Credit Memo (store credit, write-offs) ──────────────────────────────────

/**
 * A credit the customer holds against the facility.
 *
 * Two very different things arrive here: a refund the client took as store
 * credit (revenue reversed, credit owed) and an invoice written off as
 * uncollectable (revenue reversed against Bad Debt). Both are Credit Memos in
 * QuickBooks; what separates them is the account the line posts to.
 */
export interface QuickBooksCreditMemo {
  Id?: string;
  DocNumber?: string;
  TxnDate: string;
  CustomerRef: QuickBooksRef;
  CurrencyRef?: QuickBooksRef;
  Line: QuickBooksSalesLine[];
  TxnTaxDetail?: QuickBooksTxnTaxDetail;
  LinkedTxn?: QuickBooksLinkedTxn[];
  /** What is still available to spend. */
  RemainingCredit?: number;
  CustomerMemo?: { value: string };
  PrivateNote?: string;
  TotalAmt: number;
}

// ── The company snapshot the cache holds ────────────────────────────────────

/** One read of a QuickBooks company: everything the setup wizard and the
 *  mapping UI need, in one shape. A real implementation fills this from four
 *  separate API queries. */
export interface QuickBooksCompanyData {
  accounts: QuickBooksAccount[];
  items: QuickBooksItem[];
  customers: QuickBooksCustomer[];
  taxCodes: QuickBooksTaxCode[];
  taxRates: QuickBooksTaxRate[];
}
