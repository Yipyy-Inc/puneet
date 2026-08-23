"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApplicationStatus } from "@/lib/merchant-application/application";
import type { ReviewDecision } from "@/lib/merchant-application/review";

// ============================================================================
// The review queue's data layer.
//
// Separate from `src/lib/api/merchant-application.ts`, which is the facility's
// side of the same tables. They read the same rows through different policies
// and answer different questions — one asks "what do I still owe", the other
// "what is waiting for me" — and merging them would give both screens a cache
// key whose contents depend on who is signed in.
// ============================================================================

export interface ReviewListItem {
  id: string;
  facilityId: string;
  facilityName: string | null;
  facilitySlug: string | null;
  status: ApplicationStatus;
  statusDetail: string | null;
  externalReference: string | null;
  legalName: string | null;
  tradingName: string | null;
  country: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  signedName: string | null;
  estimatedMonthlyVolumeCents: number | null;
  purgedAt: string | null;
}

export interface ReviewPrincipal {
  id: string;
  fullName: string;
  title: string;
  ownershipPercent: number;
  dateOfBirth: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  isControlPerson: boolean;
  nationalIdLast4: string | null;
}

export interface ReviewDocument {
  id: string;
  docType: string;
  principalId: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  purgedAt: string | null;
  /** Signed for five minutes, and null once the object has been purged. */
  url: string | null;
}

export interface ReviewApplication extends Omit<ReviewListItem, "updatedAt"> {
  businessStructure: string | null;
  taxId: string | null;
  incorporatedOn: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  website: string | null;
  averageTicketCents: number | null;
  highestTicketCents: number | null;
  cardNotPresentPercent: number | null;
  refundPolicy: string | null;
  bankAccountName: string | null;
  bankLast4: string | null;
  signedTerms: string | null;
  signedAt: string | null;
  principals: ReviewPrincipal[];
  documents: ReviewDocument[];
}

const KEY = ["merchant-review"] as const;

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) throw new Error(body?.error ?? fallback);
  return body as T;
}

export const merchantReviewQueries = {
  list: (scope: "open" | "all") => ({
    queryKey: [...KEY, "list", scope] as const,
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/merchant-applications?scope=${scope}`,
      );
      return readJson<{
        scope: string;
        counts: { open: number; closed: number };
        applications: ReviewListItem[];
      }>(response, "The review queue could not be loaded.");
    },
  }),
  detail: (id: string) => ({
    queryKey: [...KEY, "detail", id] as const,
    queryFn: async () => {
      const response = await fetch(`/api/admin/merchant-applications/${id}`);
      const body = await readJson<{ application: ReviewApplication }>(
        response,
        "That application could not be loaded.",
      );
      return body.application;
    },
  }),
};

export function useReviewQueue(scope: "open" | "all") {
  return useQuery(merchantReviewQueries.list(scope));
}

export function useReviewApplication(id: string) {
  return useQuery({
    ...merchantReviewQueries.detail(id),
    // Document URLs are signed for five minutes. Refetching when the tab comes
    // back means a reviewer who left one open over lunch gets working links
    // rather than a page of 400s from expired signatures.
    refetchOnWindowFocus: true,
  });
}

export function useRecordDecision(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (decision: ReviewDecision) => {
      const response = await fetch(`/api/admin/merchant-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(decision),
      });
      return readJson<{ status: ApplicationStatus }>(
        response,
        "That decision was not recorded.",
      );
    },
    onSuccess: () => {
      // Both, always: the decision changes which list the row belongs in as
      // well as what the detail says, and a queue still showing a row somebody
      // just approved is how two reviewers do the same work twice.
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
