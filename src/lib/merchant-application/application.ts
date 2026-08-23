import { z } from "zod";

// ============================================================================
// A merchant application: what Yipyy asks for, and what it must never keep.
//
// ── ONE SCHEMA PER STEP, AND A STRICTER ONE FOR SUBMISSION ────────────────
//
// A five-step wizard that validated the whole application on every save would
// refuse to store step 1 because step 4 is empty, which is the same as having
// no save at all. So each step validates only itself, and `submittableSchema`
// is the one that runs once, at the end, when the facility says they are done.
//
// The distinction is not cosmetic. Nobody completes a merchant application in
// one sitting — it asks for a tax number, two owners' identity documents and a
// bank account — and a form that loses the first half while somebody goes to
// find the second is a form nobody finishes.
//
// ── THE SECRETS ARE NOT IN THESE TYPES, DELIBERATELY ──────────────────────
//
// A national id number and a bank account number never appear on the
// application object. They travel once, in a dedicated request, straight into
// Vault through `store_boarding_secret`, and what comes back to any screen is a
// last-four.
//
// If they were fields here they would be in the draft that autosaves, in the
// query cache, in the React devtools tree and in whatever a browser extension
// can read. `SecretInput` below is their entire type, and it is deliberately
// not part of `MerchantApplication`.
//
// ── AND THE CLIENT IS NOT WHERE VALIDATION LIVES ──────────────────────────
//
// These schemas run in both places. The browser uses them to tell somebody
// their tax number is too short before they wait for a round trip; the route
// uses them because a browser can send anything. Same file, so the two answers
// cannot drift.
// ============================================================================

export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "more_info_needed",
  "approved",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Statuses in which the facility may still change what they submitted. */
export const EDITABLE_STATUSES: ApplicationStatus[] = [
  "draft",
  "more_info_needed",
];

export function isEditable(status: ApplicationStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

/** Statuses where nothing is expected of the facility but waiting. */
export function isAwaitingDecision(status: ApplicationStatus): boolean {
  return status === "submitted" || status === "under_review";
}

// ── Step 1: the business ────────────────────────────────────────────────────

export const BUSINESS_STRUCTURES = [
  { value: "sole_proprietor", label: "Sole proprietor" },
  { value: "partnership", label: "Partnership" },
  { value: "corporation", label: "Corporation" },
  { value: "llc", label: "LLC" },
  { value: "non_profit", label: "Non-profit" },
  { value: "other", label: "Other" },
] as const;

export const businessStepSchema = z.object({
  /**
   * The one that has to match the tax authority's records character for
   * character, including punctuation and any Inc./Ltd./LLC. Every acquirer's
   * guidance names a mismatch here as the commonest cause of a stalled
   * application, which is why the screen warns before anybody types.
   */
  legalName: z.string().trim().min(2, "Enter your legal business name."),
  tradingName: z.string().trim().max(120).optional().or(z.literal("")),
  businessStructure: z.enum([
    "sole_proprietor",
    "partnership",
    "corporation",
    "llc",
    "non_profit",
    "other",
  ]),
  /**
   * EIN in the US, BN in Canada. Digits and separators only — not normalised
   * away, because an acquirer's form asks for the format the document shows and
   * silently reformatting it is how a match becomes a mismatch.
   */
  taxId: z
    .string()
    .trim()
    .min(9, "A tax number is at least nine digits.")
    .regex(/^[0-9\- ]+$/, "Digits, spaces and dashes only."),
  incorporatedOn: z.string().trim().optional().or(z.literal("")),

  addressLine1: z.string().trim().min(2, "Enter the street address."),
  addressLine2: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().min(1, "Enter the city."),
  region: z.string().trim().min(1, "Enter the province or state."),
  postalCode: z.string().trim().min(3, "Enter the postal or ZIP code."),
  country: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}$/, "Two-letter country code."),

  businessPhone: z.string().trim().min(7, "Enter a phone number."),
  businessEmail: z.string().trim().email("Enter a valid email address."),
  website: z.string().trim().optional().or(z.literal("")),
});

export type BusinessStep = z.infer<typeof businessStepSchema>;

// ── Step 2: the people who own it ───────────────────────────────────────────

export const principalSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().trim().min(2, "Enter their full legal name."),
  title: z.string().trim().min(1, "Enter their role in the business."),
  /**
   * Acquirers require every beneficial owner at or above 25%. Kept as given so
   * the total can be questioned rather than silently normalised — two owners
   * who each believe they hold 60% is a conversation, not a rounding error.
   */
  ownershipPercent: z
    .number()
    .min(0, "Ownership cannot be negative.")
    .max(100, "Ownership cannot exceed 100%."),
  dateOfBirth: z.string().trim().min(10, "Enter their date of birth."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().min(7, "Enter a phone number."),

  addressLine1: z.string().trim().min(2, "Enter their home address."),
  addressLine2: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().min(1, "Enter the city."),
  region: z.string().trim().min(1, "Enter the province or state."),
  postalCode: z.string().trim().min(3, "Enter the postal or ZIP code."),
  country: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}$/, "Two-letter country code."),

  /**
   * The one person who controls the business day to day. Acquirers require
   * exactly one, and it is a separate question from ownership — a 20% partner
   * can be the control person and a 90% investor can fail to be.
   */
  isControlPerson: z.boolean(),

  /** Present only when a number has already been stored. Never the number. */
  nationalIdLast4: z
    .string()
    .regex(/^[0-9]{4}$/)
    .nullable()
    .optional(),
});

export type Principal = z.infer<typeof principalSchema>;

/** The threshold above which an owner must be declared. */
export const BENEFICIAL_OWNER_THRESHOLD = 25;

/**
 * What is wrong with a set of principals, in the words a person needs.
 *
 * Returned as a list rather than thrown, because the step should show every
 * problem at once — a form that reveals its objections one at a time is a form
 * somebody submits four times.
 */
export function principalProblems(principals: Principal[]): string[] {
  const problems: string[] = [];
  if (principals.length === 0) {
    problems.push("Add at least one owner.");
    return problems;
  }

  const total = principals.reduce((sum, p) => sum + p.ownershipPercent, 0);
  if (total > 100) {
    problems.push(
      `Ownership adds up to ${total}%. It cannot be more than 100%.`,
    );
  }

  const controllers = principals.filter((p) => p.isControlPerson);
  if (controllers.length === 0) {
    problems.push("Mark one person as the one who controls the business.");
  } else if (controllers.length > 1) {
    problems.push("Only one person can be the control person.");
  }

  const undeclared = principals.some(
    (p) =>
      p.ownershipPercent > 0 && p.ownershipPercent < BENEFICIAL_OWNER_THRESHOLD,
  );
  if (undeclared) {
    // Not an error. Somebody below the threshold is allowed to be listed; they
    // are simply not required, and saying so stops a facility deleting a row
    // they were right to add.
    problems.push(
      `Owners below ${BENEFICIAL_OWNER_THRESHOLD}% do not have to be listed, but listing them is fine.`,
    );
  }

  return problems;
}

/** True when the list has a real blocker, as opposed to a note. */
export function principalsAreComplete(principals: Principal[]): boolean {
  if (principals.length === 0) return false;
  const total = principals.reduce((sum, p) => sum + p.ownershipPercent, 0);
  const controllers = principals.filter((p) => p.isControlPerson).length;
  return total <= 100 && controllers === 1;
}

// ── Step 3: how the money arrives ───────────────────────────────────────────

export const bankingStepSchema = z.object({
  bankAccountName: z.string().trim().min(2, "Enter the name on the account."),
  /**
   * The processing profile. Underwriting decides on these, so they are asked
   * for rather than estimated on the facility's behalf. Cents, like every other
   * amount in this codebase.
   */
  estimatedMonthlyVolumeCents: z
    .number()
    .int()
    .min(0, "Enter an estimated monthly card volume."),
  averageTicketCents: z.number().int().min(0, "Enter an average sale."),
  highestTicketCents: z
    .number()
    .int()
    .min(0, "Enter your largest likely sale."),
  cardNotPresentPercent: z
    .number()
    .int()
    .min(0)
    .max(100, "A percentage between 0 and 100."),
  refundPolicy: z.string().trim().min(10, "Describe your refund policy."),
});

export type BankingStep = z.infer<typeof bankingStepSchema>;

/**
 * Above this, most acquirers attach a card-not-present questionnaire. The
 * screen says so rather than letting it arrive as a surprise request three days
 * into underwriting.
 */
export const CNP_QUESTIONNAIRE_THRESHOLD = 30;

// ── Step 5: the attestation ─────────────────────────────────────────────────

export const attestationSchema = z.object({
  signedName: z.string().trim().min(2, "Type your full name to sign."),
  signedTitle: z.string().trim().min(1, "Enter your role in the business."),
  agreed: z.literal(true, {
    message: "You have to accept this to submit.",
  }),
});

// ── The secrets, which are their own type and go nowhere near the rest ──────

/**
 * A value that travels once and is never held.
 *
 * There is no `MerchantApplication.nationalId`, and there must not be: the
 * application object is autosaved, cached and rendered, and a field on it is a
 * field in all three. This shape is built at the moment of entry, POSTed, and
 * dropped.
 */
export interface SecretInput {
  kind: "principal" | "bank";
  /** Required when kind is "principal". */
  principalId?: string;
  /** The number itself. Never logged, never stored outside Vault. */
  value: string;
}

export const secretInputSchema = z.object({
  kind: z.enum(["principal", "bank"]),
  principalId: z.string().uuid().optional(),
  value: z.string().trim().min(4, "That is too short to be valid."),
});

/** The last four, which is all a screen may show. */
export function lastFour(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.slice(-4).padStart(4, "0");
}

// ── Documents ───────────────────────────────────────────────────────────────

export const DOCUMENT_TYPES = [
  {
    value: "government_id",
    label: "Photo ID",
    hint: "Passport, driving licence or national ID card, for each owner listed.",
    perPrincipal: true,
  },
  {
    value: "incorporation",
    label: "Proof the business exists",
    hint: "Incorporation certificate, business registration or partnership agreement.",
    perPrincipal: false,
  },
  {
    value: "tax_document",
    label: "Tax number document",
    hint: "The letter or certificate showing your EIN or business number.",
    perPrincipal: false,
  },
  {
    value: "voided_cheque",
    label: "Proof of bank account",
    hint: "A void cheque or a bank letter showing the account name and number.",
    perPrincipal: false,
  },
  {
    value: "proof_of_address",
    label: "Proof of address",
    hint: "Only if asked for. A utility bill or bank statement under 3 months old.",
    perPrincipal: false,
  },
  {
    value: "bank_statement",
    label: "Bank statement",
    hint: "",
    perPrincipal: false,
  },
  { value: "other", label: "Something else", hint: "", perPrincipal: false },
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number]["value"];

/** What must be present before an application can be submitted. */
export const REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
  "government_id",
  "incorporation",
  "voided_cheque",
];

export const ACCEPTED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/heic",
] as const;

/** Mirrored on the table's CHECK and on the bucket. Three places, one number. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

// ── The whole thing, as a screen sees it ────────────────────────────────────

export interface MerchantApplicationDocument {
  id: string;
  docType: DocumentType;
  principalId: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  purgedAt: string | null;
}

export interface MerchantApplication {
  id: string;
  status: ApplicationStatus;
  statusDetail: string | null;
  externalReference: string | null;

  business: Partial<BusinessStep>;
  banking: Partial<BankingStep> & { bankLast4: string | null };
  principals: Principal[];
  documents: MerchantApplicationDocument[];

  signedName: string | null;
  signedAt: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  purgedAt: string | null;
}

/**
 * Which steps are finished, for the stepper and for the submit button.
 *
 * Derived from the application every render rather than stored. A stored
 * "completedSteps" would be a second answer to a question the data already
 * answers, and the two disagree the first time somebody edits a finished step.
 */
export function stepCompletion(app: MerchantApplication) {
  const business = businessStepSchema.safeParse(app.business).success;
  const principals =
    principalsAreComplete(app.principals) &&
    app.principals.every((p) => Boolean(p.nationalIdLast4));
  const banking =
    bankingStepSchema.safeParse(app.banking).success &&
    Boolean(app.banking.bankLast4);

  const supplied = new Set(
    app.documents.filter((d) => !d.purgedAt).map((d) => d.docType),
  );
  const documents = REQUIRED_DOCUMENT_TYPES.every((t) => supplied.has(t));

  return {
    business,
    principals,
    banking,
    documents,
    /** Everything above, which is what the review step needs. */
    readyToSubmit: business && principals && banking && documents,
  };
}
