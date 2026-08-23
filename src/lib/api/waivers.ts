"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  WaiverRow,
  WaiverSignatureRow,
  WaiverSignatureStatus,
} from "@/lib/api/mappers/waiver";
import type { SignWaiverResult } from "@/app/api/waivers/[id]/sign/route";
import type { RevokeSignatureResult } from "@/app/api/waivers/signatures/[id]/revoke/route";

// ============================================================================
// Waivers, from the browser.
//
// ── SEPARATE FROM `src/data/additional-features`, ON PURPOSE ──────────────
//
// That file holds the waiver fixtures alongside a dozen unrelated features.
// This one reads Postgres. Adding real queries beside mock ones in the same
// module is how a screen ends up importing one believing it got the other.
//
// ── THERE IS NO `updateSignature`, AND THERE CANNOT BE ────────────────────
//
// A signature records what a person agreed to. The only change one accepts is
// being revoked, once, with a reason — enforced by trigger, so any other
// mutation could only ever return an error. Correct a mistake by revoking and
// taking a new signature, which is what somebody reading the file expects.
// ============================================================================

export type { WaiverRow, WaiverSignatureRow, WaiverSignatureStatus };

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(detail?.error ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

async function send<T>(
  url: string,
  body: unknown,
  method: "POST" | "PATCH" = "POST",
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

export const waiverQueries = {
  /** The waivers currently in use. */
  active: () => ({
    queryKey: ["waivers", "list", "active"] as const,
    queryFn: async () =>
      (await get<{ waivers: WaiverRow[] }>("/api/waivers")).waivers,
  }),

  /**
   * Every waiver including retired ones.
   *
   * A caller without `view_waivers` still gets only the active ones — RLS
   * decides that, not this query, so the management screen and the check-in
   * desk can share it without branching on who is looking.
   */
  all: () => ({
    queryKey: ["waivers", "list", "all"] as const,
    queryFn: async () =>
      (await get<{ waivers: WaiverRow[] }>("/api/waivers?all=1")).waivers,
  }),

  detail: (id: string | undefined) => ({
    queryKey: ["waivers", "detail", id] as const,
    enabled: Boolean(id),
    queryFn: async () =>
      (
        await get<{ waiver: WaiverRow }>(
          `/api/waivers/${encodeURIComponent(id ?? "")}`,
        )
      ).waiver,
  }),

  /**
   * The facility's signature log.
   *
   * `status` on each row is computed on the SERVER — a signature that lapsed is
   * `expired` there rather than reading `valid` until somebody notices, which
   * is what the fixture did by storing it.
   */
  signatures: () => ({
    queryKey: ["waivers", "signatures", "facility"] as const,
    queryFn: async () =>
      (
        await get<{ signatures: WaiverSignatureRow[] }>(
          "/api/waivers/signatures",
        )
      ).signatures,
  }),

  signaturesForClient: (clientRef: number | undefined) => ({
    queryKey: ["waivers", "signatures", clientRef] as const,
    enabled: clientRef !== undefined,
    queryFn: async () =>
      (
        await get<{ signatures: WaiverSignatureRow[] }>(
          `/api/waivers/signatures?clientRef=${clientRef ?? ""}`,
        )
      ).signatures,
  }),

  /** A CUSTOMER's own signatures, wherever they were given. */
  mine: () => ({
    queryKey: ["waivers", "signatures", "mine"] as const,
    queryFn: async () =>
      (
        await get<{ signatures: WaiverSignatureRow[] }>(
          "/api/waivers/signatures?mine=1",
        )
      ).signatures,
  }),
};

function invalidateWaivers(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ["waivers"] });
}

export interface PublishWaiverInput {
  name: string;
  body: string;
  blocks?: unknown[];
  services?: string[];
  version?: string;
  category?: string;
  requiresSignature?: boolean;
  requiresDigitalSignature?: boolean;
  requiresWitness?: boolean;
  /** Null or omitted means it never expires. */
  expiryDays?: number | null;
}

export function usePublishWaiver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PublishWaiverInput) =>
      (await send<{ waiver: WaiverRow }>("/api/waivers", input)).waiver,
    onSuccess: () => invalidateWaivers(queryClient),
  });
}

/**
 * Edit or retire a waiver.
 *
 * Editing the text changes what the NEXT person signs and nothing about what
 * previous people agreed to — every signature carries its own copy. Retiring is
 * `active: false`; there is no delete, because removing the row would destroy
 * the only readable statement of what the business used to ask for.
 */
export function useUpdateWaiver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: Partial<PublishWaiverInput> & { id: string; active?: boolean }) =>
      (
        await send<{ waiver: WaiverRow }>(
          `/api/waivers/${encodeURIComponent(id)}`,
          patch,
          "PATCH",
        )
      ).waiver,
    onSuccess: () => invalidateWaivers(queryClient),
  });
}

/**
 * Take a signature.
 *
 * The TEXT is not sent from here and must never be: the route reads the waiver
 * out of Postgres and hashes it server-side, so a caller cannot show somebody
 * one thing and store another. What travels is who signed and how.
 */
export function useSignWaiver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      waiverId,
      ...input
    }: {
      waiverId: string;
      clientRef: number;
      petRef?: number;
      signatureName: string;
      signatureData?: string;
      witnessName?: string;
      witnessSignatureData?: string;
    }) =>
      (
        await send<SignWaiverResult>(
          `/api/waivers/${encodeURIComponent(waiverId)}/sign`,
          input,
        )
      ).signature,
    onSuccess: () => invalidateWaivers(queryClient),
  });
}

/**
 * Revoke a signature — the only change one ever accepts, and only once.
 *
 * A reason is required: revoking is the one act here with no document behind
 * it, so the sentence explaining it is the only audit there will be.
 */
export function useRevokeWaiverSignature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; reason: string }) =>
      (
        await send<RevokeSignatureResult>(
          `/api/waivers/signatures/${encodeURIComponent(input.id)}/revoke`,
          { reason: input.reason },
        )
      ).signature,
    onSuccess: () => invalidateWaivers(queryClient),
  });
}
