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
