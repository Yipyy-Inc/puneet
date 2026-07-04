// Platform-side Agreements & Waivers factory (Support Operations). This is the
// authoring/dispatch side — where Yipyy BUILDS reusable document templates and
// SENDS them to facilities — and is deliberately separate from
// `agreements-report.ts` (the per-facility compliance report) and from the
// facility-level Agreements tab.
//
// There is no backend yet. Templates + version history live in in-memory stores
// for the SPA session; sent agreements are additionally persisted to localStorage
// so the one-time signing link survives a reload. Query keys and shapes are stable
// so swapping to a real API later means changing only the queryFn / mutation bodies.

import { CLAUSE_LIBRARY } from "@/data/agreement-clauses";
import { facilities, planPrices } from "@/data/facilities";

export type AgreementTemplateStatus = "draft" | "published" | "archived";

export type AgreementDocumentType =
  | "Agreement"
  | "Waiver"
  | "Addendum"
  | "Amendment"
  | "Terms";

export interface AgreementTemplate {
  id: string;
  name: string;
  type: AgreementDocumentType;
  status: AgreementTemplateStatus;
  /** Current (highest) version number. Bumped on every save. */
  version: number;
  /** Rich-text body as HTML produced by the TipTap editor. */
  content: string;
  /** Internal-only description (not shown to facilities). */
  description: string;
  /** Optional default expiry (ISO date) that later drives renewal reminders. */
  expiresAt: string | null;
  updatedAt: string;
  author: string;
}

/** An immutable snapshot captured every time a template is saved. */
export interface AgreementTemplateVersion {
  version: number;
  name: string;
  type: AgreementDocumentType;
  content: string;
  description: string;
  expiresAt: string | null;
  author: string;
  savedAt: string;
}

/** Payload the editor supplies on save. `savedAt` is passed in (from an event
 *  handler) so this module stays free of impure calls the React Compiler flags. */
export interface SaveTemplateInput {
  id: string;
  name: string;
  type: AgreementDocumentType;
  status: AgreementTemplateStatus;
  content: string;
  description: string;
  expiresAt: string | null;
  author: string;
  savedAt: string;
}

export type SentAgreementSignatureStatus =
  | "Pending"
  | "Viewed"
  | "Signed"
  | "Declined"
  | "Expired"
  | "Voided";

export interface SentAgreement {
  id: string;
  templateId: string;
  templateVersion: number;
  templateName: string;
  documentType: AgreementDocumentType;
  facilityId: number;
  facilityName: string;
  ownerName: string;
  ownerEmail: string;
  /** Yipyy admin who sent the agreement. */
  sentBy: string;
  /** Snapshot of the template HTML at send time (merge tokens still embedded). */
  content: string;
  /** Admin-customized merge values applied to this specific send. */
  mergeValues: Record<string, string>;
  sentAt: string;
  /** Optional response deadline; the signing link expires after this date. */
  responseExpiresAt: string | null;
  signatureStatus: SentAgreementSignatureStatus;
  /** Reason captured when an unsigned request is voided (admin cancellation). */
  voidReason?: string;
  voidedAt?: string;
  /** ISO date the facility signed, or null while unsigned. */
  signedAt: string | null;
  /** Secure one-time signing token embedded in the emailed link. */
  signingToken: string;
  /** Set once the token has been consumed at signing (Task 6). */
  tokenUsed: boolean;
  /** Captured signatures, one per signature block (set at signing). */
  signatures?: CapturedSignature[];
  /** Signing audit trail (email, IP, device, timestamp, document hash). */
  audit?: SignatureAudit;
  /** Full standalone signed document HTML (body + certificate page). */
  signedDocumentHtml?: string;
}

/** One captured signature, keyed to a signature block in the document. */
export interface CapturedSignature {
  blockId: string;
  signerRole: string;
  method: "drawn" | "typed";
  /** Signature rendered as a PNG data URL (drawn strokes or typed name). */
  image: string;
  typedName?: string;
}

/** Tamper-evident audit trail captured at signing time. */
export interface SignatureAudit {
  signerEmail: string;
  ipAddress: string;
  userAgent: string;
  /** Friendly browser/OS label derived from the user agent. */
  device: string;
  /** UTC ISO timestamp. */
  signedAtUtc: string;
  /** SHA-256 hex of the document content, for later integrity verification. */
  documentHash: string;
}

export type SigningTokenStatus = "valid" | "not-found" | "used" | "expired";

export interface RecordSignatureInput {
  token: string;
  signatures: CapturedSignature[];
  audit: SignatureAudit;
  signedDocumentHtml: string;
}

/** Payload the Send-to-Facility flow supplies. Timestamps/ids/token are passed
 *  in (from an event handler) so this module stays free of impure calls. */
export interface CreateSentAgreementInput {
  id: string;
  templateId: string;
  templateVersion: number;
  templateName: string;
  documentType: AgreementDocumentType;
  facilityId: number;
  facilityName: string;
  ownerName: string;
  ownerEmail: string;
  sentBy: string;
  content: string;
  mergeValues: Record<string, string>;
  sentAt: string;
  responseExpiresAt: string | null;
  signingToken: string;
}

/** Lightweight facility record for the Send-to-Facility recipient picker. */
export interface AgreementFacilityRecipient {
  id: number;
  name: string;
  ownerName: string;
  ownerEmail: string;
  plan: string;
  subscriptionStart: string;
  /** Standard plan price formatted for the `monthly_amount` merge default. */
  monthlyAmount: string;
}

// ---- Clause library (Phase 1) ----

export interface AgreementClause {
  id: string;
  title: string;
  /** HTML inserted at the cursor; remains fully editable after insertion. */
  content: string;
}

export interface AgreementClauseCategory {
  id: string;
  label: string;
  clauses: AgreementClause[];
}

// ---- In-memory stores (mock persistence) ----

const templateStore = new Map<string, AgreementTemplate>();
const versionStore = new Map<string, AgreementTemplateVersion[]>();
const sentStore = new Map<string, SentAgreement>();

// Sent agreements are persisted to localStorage so the one-time /sign/[token]
// link resolves even on a fresh page load (the templates themselves stay
// in-memory — a sent record snapshots everything the signing portal needs).
const SENT_STORAGE_KEY = "yipyy.agreements.sent";
let sentHydrated = false;

function loadSent(): void {
  if (typeof window === "undefined" || sentHydrated) return;
  sentHydrated = true;
  try {
    const raw = window.localStorage.getItem(SENT_STORAGE_KEY);
    if (!raw) return;
    const rows = JSON.parse(raw) as SentAgreement[];
    for (const row of rows) sentStore.set(row.id, row);
  } catch {
    // Ignore malformed/unavailable storage — falls back to in-memory only.
  }
}

function persistSent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SENT_STORAGE_KEY,
      JSON.stringify([...sentStore.values()]),
    );
  } catch {
    // Storage full/unavailable — in-memory store still works this session.
  }
}

/** Classify a signing token: valid, not-found, already-used, or expired. */
export function evaluateSigningToken(
  record: SentAgreement | null,
  todayDate: string,
): SigningTokenStatus {
  if (!record) return "not-found";
  if (record.tokenUsed || record.signatureStatus === "Signed") return "used";
  if (record.responseExpiresAt && record.responseExpiresAt < todayDate) {
    return "expired";
  }
  return "valid";
}

/** Snapshot copy so callers/React never mutate the stored objects directly. */
function snapshot(template: AgreementTemplate): AgreementTemplate {
  return { ...template };
}

/**
 * Insert or update a template AND append a new immutable version to its history.
 * Every save is a distinct version, so the history is append-only.
 */
export function saveAgreementTemplate(
  input: SaveTemplateInput,
): AgreementTemplate {
  const existing = templateStore.get(input.id);
  const version = (existing?.version ?? 0) + 1;

  const template: AgreementTemplate = {
    id: input.id,
    name: input.name,
    type: input.type,
    status: input.status,
    version,
    content: input.content,
    description: input.description,
    expiresAt: input.expiresAt,
    updatedAt: input.savedAt,
    author: input.author,
  };
  templateStore.set(template.id, snapshot(template));

  const history = versionStore.get(template.id) ?? [];
  history.push({
    version,
    name: template.name,
    type: template.type,
    content: template.content,
    description: template.description,
    expiresAt: template.expiresAt,
    author: template.author,
    savedAt: template.updatedAt,
  });
  versionStore.set(template.id, history);

  return snapshot(template);
}

export function deleteAgreementTemplate(id: string): void {
  templateStore.delete(id);
  versionStore.delete(id);
}

/**
 * Persist an outgoing agreement as a "Sent Agreement" record (status = Pending).
 * The signing + status transitions (Viewed/Signed/Declined) land in Task 6.
 */
export function createSentAgreement(
  input: CreateSentAgreementInput,
): SentAgreement {
  loadSent();
  const record: SentAgreement = {
    ...input,
    signatureStatus: "Pending",
    signedAt: null,
    tokenUsed: false,
  };
  sentStore.set(record.id, { ...record });
  persistSent();
  return { ...record };
}

/**
 * Record a signature against a one-time token: stores the captured signatures +
 * audit trail, marks the token used, and flips the record to Signed. Returns the
 * updated record, or null if the token is missing / already consumed.
 */
export function recordSignature(
  input: RecordSignatureInput,
): SentAgreement | null {
  loadSent();
  const record = [...sentStore.values()].find(
    (s) => s.signingToken === input.token,
  );
  if (!record || record.tokenUsed) return null;

  const updated: SentAgreement = {
    ...record,
    signatureStatus: "Signed",
    signedAt: input.audit.signedAtUtc,
    tokenUsed: true,
    signatures: input.signatures,
    audit: input.audit,
    signedDocumentHtml: input.signedDocumentHtml,
  };
  sentStore.set(updated.id, { ...updated });
  persistSent();
  return { ...updated };
}

/**
 * Re-issue the one-time signing link for a still-Pending request. Rotates the
 * token (invalidating any older link) and bumps sentAt. No-op for any other
 * status. Note: there is intentionally NO delete for sent agreements — a signed
 * record is permanently locked, and every send stays in the log for audit.
 */
export function resendAgreement(input: {
  id: string;
  signingToken: string;
  sentAt: string;
}): SentAgreement | null {
  loadSent();
  const record = sentStore.get(input.id);
  if (!record || record.signatureStatus !== "Pending") return null;
  const updated: SentAgreement = {
    ...record,
    signingToken: input.signingToken,
    tokenUsed: false,
    sentAt: input.sentAt,
  };
  sentStore.set(updated.id, { ...updated });
  persistSent();
  return { ...updated };
}

/**
 * Void (cancel) an unsigned request with a reason. A Signed record is locked and
 * can never be voided/edited/deleted — by anyone, super admin included. The
 * record is retained; only its status changes.
 */
export function voidAgreement(input: {
  id: string;
  reason: string;
  voidedAt: string;
}): SentAgreement | null {
  loadSent();
  const record = sentStore.get(input.id);
  if (!record) return null;
  if (
    record.signatureStatus === "Signed" ||
    record.signatureStatus === "Voided"
  ) {
    return null;
  }
  const updated: SentAgreement = {
    ...record,
    signatureStatus: "Voided",
    voidReason: input.reason,
    voidedAt: input.voidedAt,
    tokenUsed: true,
  };
  sentStore.set(updated.id, { ...updated });
  persistSent();
  return { ...updated };
}

// ---- Query factories ----

export const agreementQueries = {
  templates: () => ({
    queryKey: ["support", "agreements", "templates"] as const,
    queryFn: async (): Promise<AgreementTemplate[]> =>
      [...templateStore.values()]
        .map(snapshot)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  }),
  template: (id: string) => ({
    queryKey: ["support", "agreements", "templates", id] as const,
    queryFn: async (): Promise<AgreementTemplate | null> => {
      const found = templateStore.get(id);
      return found ? snapshot(found) : null;
    },
  }),
  versions: (id: string) => ({
    queryKey: ["support", "agreements", "templates", id, "versions"] as const,
    queryFn: async (): Promise<AgreementTemplateVersion[]> =>
      // Newest first.
      [...(versionStore.get(id) ?? [])].reverse().map((v) => ({ ...v })),
  }),
  sent: () => ({
    queryKey: ["support", "agreements", "sent"] as const,
    queryFn: async (): Promise<SentAgreement[]> => {
      loadSent();
      return [...sentStore.values()]
        .map((s) => ({ ...s }))
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    },
  }),
  sentByToken: (token: string) => ({
    queryKey: ["support", "agreements", "sent", "token", token] as const,
    queryFn: async (): Promise<{
      record: SentAgreement | null;
      status: SigningTokenStatus;
    }> => {
      loadSent();
      const found =
        [...sentStore.values()].find((s) => s.signingToken === token) ?? null;
      const today = new Date().toISOString().slice(0, 10);
      return {
        record: found ? { ...found } : null,
        status: evaluateSigningToken(found, today),
      };
    },
  }),
  sentForFacility: (facilityId: number) => ({
    queryKey: [
      "support",
      "agreements",
      "sent",
      "facility",
      facilityId,
    ] as const,
    queryFn: async (): Promise<SentAgreement[]> => {
      loadSent();
      return [...sentStore.values()]
        .filter(
          (s) => s.facilityId === facilityId && s.signatureStatus === "Signed",
        )
        .map((s) => ({ ...s }))
        .sort((a, b) => (b.signedAt ?? "").localeCompare(a.signedAt ?? ""));
    },
  }),
  clauses: () => ({
    queryKey: ["support", "agreements", "clauses"] as const,
    queryFn: async (): Promise<AgreementClauseCategory[]> => CLAUSE_LIBRARY,
  }),
  recipients: () => ({
    queryKey: ["support", "agreements", "recipients"] as const,
    queryFn: async (): Promise<AgreementFacilityRecipient[]> =>
      facilities.map((f) => {
        const price = planPrices[f.plan];
        return {
          id: f.id,
          name: f.name,
          ownerName: f.owner?.name ?? "",
          ownerEmail: f.owner?.email ?? "",
          plan: f.plan ?? "",
          subscriptionStart: f.dayJoined ?? "",
          monthlyAmount: price != null ? `$${price.toFixed(2)}` : "",
        };
      }),
  }),
};
