// Time-limited admin-invitation token. Mirrors the impersonation token pattern
// ([[impersonation.ts]]) but with a 48-hour TTL and an admin-invite payload.
// Created in the /api/admin/invite route and decoded in the public /setup/[token]
// page — both run server-side (Node), so base64url is done with Buffer.

export const INVITE_TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

export interface InvitePayload {
  /** Matches the AdminUser.id created in the admin-team store. */
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

function toBase64Url(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

function fromBase64Url(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}

export function createInviteToken(input: {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
}): string {
  const now = Date.now();
  const payload: InvitePayload = {
    ...input,
    issuedAt: now,
    expiresAt: now + INVITE_TOKEN_TTL_MS,
    nonce: `${now.toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`,
  };
  return toBase64Url(JSON.stringify(payload));
}

/** Decode + validate an invite token; returns null if malformed or expired. */
export function decodeInviteToken(token: string): InvitePayload | null {
  try {
    const p = JSON.parse(fromBase64Url(token)) as InvitePayload;
    if (!p || typeof p.id !== "number" || !p.email || !p.name) return null;
    if (Date.now() > p.expiresAt) return null; // expired
    return p;
  } catch {
    return null;
  }
}
