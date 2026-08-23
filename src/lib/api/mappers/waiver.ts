import type { Tables } from "@/types/database";

// ============================================================================
// Waiver rows -> what the screens read.
//
// ── THE SIGNATURE'S STATUS IS DERIVED, NOT STORED ─────────────────────────
//
// The fixture kept `status: "valid" | "expired" | "revoked"` on the row, and
// nothing ever swept it. So a signature that lapsed last year still read
// `valid`, and a check-in desk would wave somebody through on it.
//
// `expired` is the calendar's answer and is computed here against a `now` the
// caller passes — on the SERVER, so whether a waiver is still good is not a
// question about the tablet's clock. `revoked` is a decision somebody made and
// IS stored, because nothing but a person can produce it.
//
// Same shape as gift cards' `effectiveStatus` and loyalty vouchers before it.
// Third time, so it is worth naming as the rule: a status that a clock can
// change must never be a column.
// ============================================================================

export type WaiverSignatureStatus = "valid" | "expired" | "revoked";

export interface WaiverRow {
  id: string;
  name: string;
  services: string[];
  body: string;
  blocks: unknown[];
  version: string;
  category: string | null;
  active: boolean;
  requiresSignature: boolean;
  requiresDigitalSignature: boolean;
  requiresWitness: boolean;
  /** Null means it never expires. */
  expiryDays: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WaiverSignatureRow {
  id: string;
  /** Which document this was. Descriptive — it may since have been edited. */
  waiverId: string | null;
  clientId: string;
  clientRef: number | null;
  clientName: string | null;
  petId: string | null;

  /** The name at signing time. May differ from the waiver's name now. */
  waiverName: string;
  waiverVersion: string;
  /** A COPY of exactly what the person was shown. This is the record. */
  waiverText: string;
  waiverHash: string;

  signatureName: string;
  signatureData: string | null;
  witnessName: string | null;

  ipAddress: string | null;
  signedAt: string;
  signedBy: string | null;
  expiresAt: string | null;

  revokedAt: string | null;
  revokedReason: string | null;

  /** What a check-in desk should act on. See the header. */
  status: WaiverSignatureStatus;
}

export const WAIVER_SELECT =
  "id, name, services, body, blocks, version, category, active, requires_signature, requires_digital_signature, requires_witness, expiry_days, created_at, updated_at";

interface ClientEmbed {
  ref: number;
  name: string;
}

export type SignatureRecord = Tables<"waiver_signatures"> & {
  // A to-one relation (a non-null FK), so PostgREST returns an object, not an
  // array. Reading a to-one as an array is what emptied the boarding board
  // once, so `clientOf` tolerates both rather than trusting which arrives.
  clients?: ClientEmbed | ClientEmbed[] | null;
};

export const SIGNATURE_SELECT =
  "id, waiver_id, client_id, pet_id, waiver_name, waiver_version, waiver_text, waiver_hash, signature_name, signature_data, witness_name, ip_address, signed_at, signed_by, expires_at, revoked_at, revoked_reason, clients:client_id(ref, name)";

function clientOf(row: SignatureRecord): ClientEmbed | null {
  const embedded = row.clients;
  if (!embedded) return null;
  return Array.isArray(embedded) ? (embedded[0] ?? null) : embedded;
}

export function toWaiverRow(row: Tables<"waivers">): WaiverRow {
  return {
    id: row.id,
    name: row.name,
    services: row.services ?? [],
    body: row.body,
    blocks: Array.isArray(row.blocks) ? (row.blocks as unknown[]) : [],
    version: row.version,
    category: row.category,
    active: row.active,
    requiresSignature: row.requires_signature,
    requiresDigitalSignature: row.requires_digital_signature,
    requiresWitness: row.requires_witness,
    expiryDays: row.expiry_days,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * `revoked` outranks `expired`: somebody decided that, and it should not be
 * relabelled as though the calendar did it.
 */
export function toSignatureRow(
  row: SignatureRecord,
  now: number,
): WaiverSignatureRow {
  const client = clientOf(row);
  const status: WaiverSignatureStatus = row.revoked_at
    ? "revoked"
    : row.expires_at !== null && new Date(row.expires_at).getTime() <= now
      ? "expired"
      : "valid";

  return {
    id: row.id,
    waiverId: row.waiver_id,
    clientId: row.client_id,
    clientRef: client?.ref ?? null,
    clientName: client?.name ?? null,
    petId: row.pet_id,
    waiverName: row.waiver_name,
    waiverVersion: row.waiver_version,
    waiverText: row.waiver_text,
    waiverHash: row.waiver_hash,
    signatureName: row.signature_name,
    signatureData: row.signature_data,
    witnessName: row.witness_name,
    ipAddress: row.ip_address,
    signedAt: row.signed_at,
    signedBy: row.signed_by,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    revokedReason: row.revoked_reason,
    status,
  };
}
