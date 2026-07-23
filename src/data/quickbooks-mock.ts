import type {
  QuickBooksClass,
  QuickBooksAccount,
  QuickBooksCompanyData,
  QuickBooksCustomer,
  QuickBooksItem,
  QuickBooksTaxCode,
  QuickBooksTaxRate,
} from "@/types/quickbooks";

// ============================================================================
// Canned QuickBooks company data (Phase 2.1) — what a real read of the
// Account / Item / Customer / TaxCode endpoints would return right after OAuth.
//
// Shaped as QuickBooks returns it (see src/types/quickbooks.ts), so the mapping
// UI, the account health check and the document builders are written against
// the real entity shape from day one.
//
// The company is Quebec-based, matching the rest of the app: GST 5% + QST
// 9.975%, CAD. HST codes are included because a facility that expands to
// Ontario or the Maritimes needs them, and the tax-code dropdown must not look
// Quebec-only.
//
// TODO: real QuickBooks read APIs (Account, Item, Customer, TaxCode) — replace
// these constants with paged queries; the shapes do not change.
// ============================================================================

// ── Chart of Accounts (Section 2A / Table 1) ────────────────────────────────

/** Income, plus the asset and liability accounts the document builders post to.
 *  Balances are plausible for a mid-size facility a few months into the year. */
const ACCOUNTS: QuickBooksAccount[] = [
  // Income — one per Yipyy service module, which is what makes the mapping
  // step's smart defaults (3.4) able to match "Grooming" to "Grooming Income".
  {
    Id: "79",
    Name: "Grooming Income",
    FullyQualifiedName: "Grooming Income",
    AccountType: "Income",
    AccountSubType: "ServiceFeeIncome",
    Classification: "Revenue",
    CurrentBalance: 48210.75,
    Active: true,
    AcctNum: "4100",
    Description: "Revenue from grooming services.",
  },
  {
    Id: "80",
    Name: "Boarding Income",
    FullyQualifiedName: "Boarding Income",
    AccountType: "Income",
    AccountSubType: "ServiceFeeIncome",
    Classification: "Revenue",
    CurrentBalance: 92840.4,
    Active: true,
    AcctNum: "4110",
    Description: "Revenue from overnight boarding.",
  },
  {
    Id: "81",
    Name: "Daycare Income",
    FullyQualifiedName: "Daycare Income",
    AccountType: "Income",
    AccountSubType: "ServiceFeeIncome",
    Classification: "Revenue",
    CurrentBalance: 66120.0,
    Active: true,
    AcctNum: "4120",
    Description: "Revenue from daycare.",
  },
  {
    Id: "82",
    Name: "Training Income",
    FullyQualifiedName: "Training Income",
    AccountType: "Income",
    AccountSubType: "ServiceFeeIncome",
    Classification: "Revenue",
    CurrentBalance: 18450.0,
    Active: true,
    AcctNum: "4130",
    Description: "Revenue from training programs and classes.",
  },
  {
    Id: "83",
    Name: "Retail Income",
    FullyQualifiedName: "Retail Income",
    AccountType: "Income",
    AccountSubType: "SalesOfProductIncome",
    Classification: "Revenue",
    CurrentBalance: 21770.9,
    Active: true,
    AcctNum: "4200",
    Description: "Product sales.",
  },
  {
    Id: "84",
    Name: "Membership Income",
    FullyQualifiedName: "Membership Income",
    AccountType: "Income",
    AccountSubType: "ServiceFeeIncome",
    Classification: "Revenue",
    CurrentBalance: 9600.0,
    Active: true,
    AcctNum: "4300",
  },
  {
    Id: "85",
    Name: "Breakage Income",
    FullyQualifiedName: "Breakage Income",
    AccountType: "Income",
    AccountSubType: "OtherPrimaryIncome",
    Classification: "Revenue",
    CurrentBalance: 340.0,
    Active: true,
    AcctNum: "4900",
    Description: "Expired gift card balances recognised as income.",
  },

  // Assets
  {
    Id: "91",
    Name: "Accounts Receivable (A/R)",
    FullyQualifiedName: "Accounts Receivable (A/R)",
    AccountType: "Accounts Receivable",
    AccountSubType: "AccountsReceivable",
    Classification: "Asset",
    CurrentBalance: 3184.25,
    Active: true,
    AcctNum: "1200",
    Description: "Outstanding invoices.",
  },
  {
    Id: "92",
    Name: "Undeposited Funds",
    FullyQualifiedName: "Undeposited Funds",
    AccountType: "Other Current Asset",
    AccountSubType: "UndepositedFunds",
    Classification: "Asset",
    CurrentBalance: 1290.5,
    Active: true,
    AcctNum: "1350",
    Description: "Payments received but not yet deposited to the bank.",
  },
  {
    Id: "93",
    Name: "Business Chequing",
    FullyQualifiedName: "Business Chequing",
    AccountType: "Bank",
    AccountSubType: "Checking",
    Classification: "Asset",
    CurrentBalance: 54210.18,
    Active: true,
    AcctNum: "1000",
  },

  // Liabilities — money held on behalf of clients. These must never be booked
  // as income; that is the whole point of Tables 6 and 8.
  {
    Id: "101",
    Name: "Gift Card Liability",
    FullyQualifiedName: "Gift Card Liability",
    AccountType: "Other Current Liability",
    AccountSubType: "OtherCurrentLiabilities",
    Classification: "Liability",
    CurrentBalance: 2450.0,
    Active: true,
    AcctNum: "2300",
    Description: "Unredeemed gift card balances owed to clients.",
  },
  {
    Id: "102",
    Name: "Deposits Held",
    FullyQualifiedName: "Deposits Held",
    AccountType: "Other Current Liability",
    AccountSubType: "OtherCurrentLiabilities",
    Classification: "Liability",
    CurrentBalance: 1875.0,
    Active: true,
    AcctNum: "2310",
    Description: "Booking deposits collected but not yet earned.",
  },
  {
    Id: "103",
    Name: "Tips Payable",
    FullyQualifiedName: "Tips Payable",
    AccountType: "Other Current Liability",
    AccountSubType: "OtherCurrentLiabilities",
    Classification: "Liability",
    CurrentBalance: 612.4,
    Active: true,
    AcctNum: "2320",
    Description: "Tips collected on behalf of staff, owed at payroll.",
  },
  {
    // The catch-all most companies already have. Table 1 lets the three
    // specific liabilities fall back to a general one, so the health check
    // needs a real account to name when it does.
    Id: "105",
    Name: "Other Current Liabilities",
    FullyQualifiedName: "Other Current Liabilities",
    AccountType: "Other Current Liability",
    AccountSubType: "OtherCurrentLiabilities",
    Classification: "Liability",
    CurrentBalance: 0,
    Active: true,
    AcctNum: "2000",
  },
  {
    Id: "104",
    Name: "GST/QST Payable",
    FullyQualifiedName: "GST/QST Payable",
    AccountType: "Other Current Liability",
    AccountSubType: "GlobalTaxPayable",
    Classification: "Liability",
    CurrentBalance: 4108.66,
    Active: true,
    AcctNum: "2200",
  },

  // Contra-revenue / expense
  {
    Id: "111",
    Name: "Discounts Given",
    FullyQualifiedName: "Discounts Given",
    AccountType: "Income",
    AccountSubType: "DiscountsRefundsGiven",
    Classification: "Revenue",
    CurrentBalance: -3210.5,
    Active: true,
    AcctNum: "4800",
    Description:
      "Contra-revenue. Discount lines post here so gross revenue stays visible.",
  },
  {
    Id: "112",
    Name: "Bad Debt",
    FullyQualifiedName: "Bad Debt",
    AccountType: "Expense",
    AccountSubType: "BadDebts",
    Classification: "Expense",
    CurrentBalance: 245.0,
    Active: true,
    AcctNum: "6800",
    Description: "Written-off uncollectable invoices.",
  },
  {
    Id: "113",
    Name: "Merchant Processing Fees",
    FullyQualifiedName: "Merchant Processing Fees",
    AccountType: "Expense",
    AccountSubType: "BankCharges",
    Classification: "Expense",
    CurrentBalance: 1842.11,
    Active: true,
    AcctNum: "6100",
  },
];

// ── Products & Services ─────────────────────────────────────────────────────

const ITEMS: QuickBooksItem[] = [
  {
    Id: "201",
    Name: "Grooming Service",
    FullyQualifiedName: "Grooming Service",
    Type: "Service",
    Active: true,
    Taxable: true,
    UnitPrice: 0,
    IncomeAccountRef: { value: "79", name: "Grooming Income" },
    Description: "Bath, haircut and finishing services.",
  },
  {
    Id: "202",
    Name: "Boarding Night",
    FullyQualifiedName: "Boarding Night",
    Type: "Service",
    Active: true,
    Taxable: true,
    UnitPrice: 65,
    IncomeAccountRef: { value: "80", name: "Boarding Income" },
    Description: "One night of boarding.",
  },
  {
    Id: "203",
    Name: "Daycare Day",
    FullyQualifiedName: "Daycare Day",
    Type: "Service",
    Active: true,
    Taxable: true,
    UnitPrice: 42,
    IncomeAccountRef: { value: "81", name: "Daycare Income" },
  },
  {
    Id: "204",
    Name: "Training Session",
    FullyQualifiedName: "Training Session",
    Type: "Service",
    Active: true,
    Taxable: true,
    UnitPrice: 95,
    IncomeAccountRef: { value: "82", name: "Training Income" },
  },
  {
    Id: "205",
    Name: "Add-On Service",
    FullyQualifiedName: "Add-On Service",
    Type: "Service",
    Active: true,
    Taxable: true,
    UnitPrice: 0,
    IncomeAccountRef: { value: "79", name: "Grooming Income" },
    Description: "Nail trim, teeth brushing, de-shedding and similar.",
  },
  {
    Id: "206",
    Name: "Retail Product",
    FullyQualifiedName: "Retail Product",
    Type: "NonInventory",
    Active: true,
    Taxable: true,
    UnitPrice: 0,
    IncomeAccountRef: { value: "83", name: "Retail Income" },
    Sku: "YIPYY-RETAIL",
  },
  {
    Id: "207",
    Name: "Gift Card",
    FullyQualifiedName: "Gift Card",
    Type: "Service",
    Active: true,
    // A gift card sale is not a taxable supply — tax applies when it is
    // redeemed for a service (Table 6).
    Taxable: false,
    UnitPrice: 0,
    IncomeAccountRef: { value: "101", name: "Gift Card Liability" },
    Description: "Sale posts to liability, not income.",
  },
  {
    Id: "208",
    Name: "Booking Deposit",
    FullyQualifiedName: "Booking Deposit",
    Type: "Service",
    Active: true,
    Taxable: false,
    UnitPrice: 0,
    IncomeAccountRef: { value: "102", name: "Deposits Held" },
    Description: "Deposit collected up front; earned at checkout (Table 8).",
  },
  {
    Id: "209",
    Name: "Tips",
    FullyQualifiedName: "Tips",
    Type: "Service",
    Active: true,
    Taxable: false,
    UnitPrice: 0,
    IncomeAccountRef: { value: "103", name: "Tips Payable" },
  },
  {
    Id: "210",
    Name: "Membership",
    FullyQualifiedName: "Membership",
    Type: "Service",
    Active: true,
    Taxable: true,
    UnitPrice: 0,
    IncomeAccountRef: { value: "84", name: "Membership Income" },
  },
  {
    Id: "211",
    Name: "Discount",
    FullyQualifiedName: "Discount",
    Type: "Service",
    Active: true,
    Taxable: false,
    UnitPrice: 0,
    IncomeAccountRef: { value: "111", name: "Discounts Given" },
    Description: "Negative line; posts to contra-revenue.",
  },
];

// ── Customers ───────────────────────────────────────────────────────────────

/** A handful of clients that already exist in the facility's books. The sync
 *  engine matches on email and auto-creates anyone missing (Table 4), so this
 *  list is deliberately shorter than Yipyy's client list — that mismatch is the
 *  realistic case, not an oversight. */
const CUSTOMERS: QuickBooksCustomer[] = [
  {
    Id: "301",
    DisplayName: "Johnson, Alice",
    GivenName: "Alice",
    FamilyName: "Johnson",
    PrimaryEmailAddr: { Address: "alice.johnson@email.com" },
    PrimaryPhone: { FreeFormNumber: "(514) 555-0143" },
    Active: true,
    Balance: 0,
    CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
  },
  {
    Id: "302",
    DisplayName: "Smith, Bob",
    GivenName: "Bob",
    FamilyName: "Smith",
    PrimaryEmailAddr: { Address: "bob.smith@email.com" },
    PrimaryPhone: { FreeFormNumber: "(514) 555-0188" },
    Active: true,
    Balance: 128.75,
    CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
  },
  {
    Id: "303",
    DisplayName: "Tremblay, Marie",
    GivenName: "Marie",
    FamilyName: "Tremblay",
    PrimaryEmailAddr: { Address: "marie.tremblay@email.com" },
    Active: true,
    Balance: 0,
    CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
  },
  {
    Id: "304",
    DisplayName: "Nguyen, David",
    GivenName: "David",
    FamilyName: "Nguyen",
    PrimaryEmailAddr: { Address: "david.nguyen@email.com" },
    Active: true,
    Balance: 55.0,
    CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
  },
  {
    Id: "305",
    DisplayName: "Walk-In Client",
    Active: true,
    Balance: 0,
    CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
  },
];

// ── Tax ─────────────────────────────────────────────────────────────────────

const TAX_RATES: QuickBooksTaxRate[] = [
  {
    Id: "401",
    Name: "GST 5%",
    RateValue: 5,
    Active: true,
    Description: "Federal Goods and Services Tax.",
  },
  {
    Id: "402",
    Name: "QST 9.975%",
    RateValue: 9.975,
    Active: true,
    Description: "Quebec Sales Tax.",
  },
  { Id: "403", Name: "HST ON 13%", RateValue: 13, Active: true },
  { Id: "404", Name: "HST NS 15%", RateValue: 15, Active: true },
  { Id: "405", Name: "Zero-rated 0%", RateValue: 0, Active: true },
];

const TAX_CODES: QuickBooksTaxCode[] = [
  {
    Id: "501",
    Name: "GST/QST QC",
    Description: "Quebec — GST 5% and QST 9.975%.",
    Active: true,
    Taxable: true,
    TaxGroup: true,
    SalesTaxRateList: {
      TaxRateDetail: [
        // Both at order 0: Quebec applies QST to the pre-tax amount, not on top
        // of GST. Compounding them would overcharge every taxable line.
        {
          TaxRateRef: { value: "401", name: "GST 5%" },
          TaxTypeApplicable: "Sales",
          TaxOrder: 0,
        },
        {
          TaxRateRef: { value: "402", name: "QST 9.975%" },
          TaxTypeApplicable: "Sales",
          TaxOrder: 0,
        },
      ],
    },
  },
  {
    Id: "502",
    Name: "GST only",
    Description: "GST 5% — provinces without a provincial sales tax.",
    Active: true,
    Taxable: true,
    TaxGroup: false,
    SalesTaxRateList: {
      TaxRateDetail: [
        {
          TaxRateRef: { value: "401", name: "GST 5%" },
          TaxTypeApplicable: "Sales",
          TaxOrder: 0,
        },
      ],
    },
  },
  {
    Id: "503",
    Name: "HST ON",
    Description: "Ontario — HST 13%.",
    Active: true,
    Taxable: true,
    TaxGroup: false,
    SalesTaxRateList: {
      TaxRateDetail: [
        {
          TaxRateRef: { value: "403", name: "HST ON 13%" },
          TaxTypeApplicable: "Sales",
          TaxOrder: 0,
        },
      ],
    },
  },
  {
    Id: "504",
    Name: "HST NS",
    Description: "Nova Scotia — HST 15%.",
    Active: true,
    Taxable: true,
    TaxGroup: false,
    SalesTaxRateList: {
      TaxRateDetail: [
        {
          TaxRateRef: { value: "404", name: "HST NS 15%" },
          TaxTypeApplicable: "Sales",
          TaxOrder: 0,
        },
      ],
    },
  },
  {
    Id: "505",
    Name: "Exempt",
    Description: "Non-taxable — gift card sales, deposits, tips.",
    Active: true,
    Taxable: false,
    TaxGroup: false,
    SalesTaxRateList: {
      TaxRateDetail: [
        {
          TaxRateRef: { value: "405", name: "Zero-rated 0%" },
          TaxTypeApplicable: "Sales",
          TaxOrder: 0,
        },
      ],
    },
  },
];

// ── Classes (location tracking, Phase 8) ────────────────────────────────────

/**
 * Classes as a multi-location facility would have set them up: one per branch.
 *
 * Named after the neighbourhoods rather than "Location 1/2/3" because that is
 * what a bookkeeper running a P&L by Class actually wants to read — and because
 * they then line up with the real Yipyy branches (Plateau, NDG, Laval), which
 * is what makes the name-match suggestion worth offering at all.
 *
 * The inactive one is deliberate: QuickBooks rejects a posting against an
 * inactive Class, so there has to be one to prove it is never offered.
 */
const CLASSES: QuickBooksClass[] = [
  {
    Id: "5000000000000001",
    Name: "Plateau",
    FullyQualifiedName: "Plateau",
    Active: true,
  },
  {
    Id: "5000000000000002",
    Name: "NDG",
    FullyQualifiedName: "NDG",
    Active: true,
  },
  {
    Id: "5000000000000003",
    Name: "Laval",
    FullyQualifiedName: "Laval",
    Active: true,
  },
  {
    Id: "5000000000000004",
    Name: "Retired Kiosk",
    FullyQualifiedName: "Retired Kiosk",
    Active: false,
  },
];

// ── Datasets ────────────────────────────────────────────────────────────────

/** A well-kept set of books — every account Table 1 wants is present. */
export const QUICKBOOKS_MOCK_COMPANY: QuickBooksCompanyData = {
  accounts: ACCOUNTS,
  items: ITEMS,
  customers: CUSTOMERS,
  taxCodes: TAX_CODES,
  taxRates: TAX_RATES,
  classes: CLASSES,
  // Plus: Class tracking is available, so "Track by location" can be switched on.
  plan: "plus",
};

/**
 * The Test-mode company (Phase 10).
 *
 * Intuit's sandbox is a genuinely separate QuickBooks company on a separate
 * stack — the whole point is that you can post throwaway transactions into it
 * without touching your real books. It ships with its own SAMPLE customers so
 * a facility can tell at a glance they're in the test company, not their own.
 *
 * The chart of accounts and item list are DELIBERATELY the same object
 * references as production here: the reason a facility uses sandbox is to
 * rehearse the mapping, and that rehearsal is only worth anything if the same
 * account and item ids exist when they go live. Get this wrong — give sandbox
 * its own ids — and every mapping made in Test mode breaks the moment they
 * switch, which is the opposite of the feature.
 */
const SANDBOX_CUSTOMERS: QuickBooksCustomer[] = [
  {
    Id: "1",
    DisplayName: "Sample, Amy (Test)",
    GivenName: "Amy",
    FamilyName: "Sample",
    PrimaryEmailAddr: { Address: "amy.sample@sandbox.example" },
    Active: true,
    Balance: 0,
  },
  {
    Id: "2",
    DisplayName: "Walk-in Customer",
    Active: true,
    Balance: 0,
  },
];

export const QUICKBOOKS_MOCK_COMPANY_SANDBOX: QuickBooksCompanyData = {
  // Same chart + items + tax as production, so a mapping rehearsed here is valid
  // the moment the facility goes live.
  accounts: ACCOUNTS,
  items: ITEMS,
  // Sandbox seeds its own sample customers, not the facility's real ones.
  customers: SANDBOX_CUSTOMERS,
  taxCodes: TAX_CODES,
  taxRates: TAX_RATES,
  classes: CLASSES,
  plan: "plus",
};

/** Accounts a plainer set of books simply wouldn't have: the three optional
 *  liabilities from Table 1, breakage, and the service lines this facility
 *  hasn't split out yet. */
const MINIMAL_OMITS_ACCOUNTS = new Set([
  "101", // Gift Card Liability
  "102", // Deposits Held
  "103", // Tips Payable
  "85", // Breakage Income
  "81", // Daycare Income
  "82", // Training Income
  "84", // Membership Income
]);

const MINIMAL_ACCOUNTS = ACCOUNTS.filter(
  (a) => !MINIMAL_OMITS_ACCOUNTS.has(a.Id),
);
const MINIMAL_ACCOUNT_IDS = new Set(MINIMAL_ACCOUNTS.map((a) => a.Id));
const MINIMAL_TAX_RATES = TAX_RATES.filter((r) =>
  ["401", "402", "405"].includes(r.Id),
);
const MINIMAL_RATE_IDS = new Set(MINIMAL_TAX_RATES.map((r) => r.Id));

/**
 * A plainer company: none of Table 1's optional accounts, and only the income
 * accounts a facility that hasn't split out its services would have.
 *
 * This exists so the account health check (3.3) can be seen doing its job. With
 * only the complete dataset every row would be green, and the "⚠ Not found"
 * path, the "Create this in QuickBooks" link and the fall-back-to-a-general-
 * liability rule would all be code nobody had ever run.
 *
 * Items and tax codes are DERIVED from what survives rather than listed by id:
 * an item pointing at an account this company doesn't have is not a plainer set
 * of books, it's a corrupt one, and the mapping UI would offer a choice that
 * could never post.
 */
export const QUICKBOOKS_MOCK_COMPANY_MINIMAL: QuickBooksCompanyData = {
  accounts: MINIMAL_ACCOUNTS,
  items: ITEMS.filter((i) => MINIMAL_ACCOUNT_IDS.has(i.IncomeAccountRef.value)),
  customers: CUSTOMERS.slice(0, 2),
  taxCodes: TAX_CODES.filter((t) =>
    t.SalesTaxRateList.TaxRateDetail.every((d) =>
      MINIMAL_RATE_IDS.has(d.TaxRateRef.value),
    ),
  ),
  taxRates: MINIMAL_TAX_RATES,
  // Simple Start has no Class entity at all — this is the dataset that proves
  // the "Track by location" option is correctly greyed out rather than failing
  // at post time.
  classes: [],
  plan: "simple_start",
};
