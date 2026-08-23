"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  BankingStep,
  BusinessStep,
  MerchantApplication,
  Principal,
} from "@/lib/merchant-application/application";

// ============================================================================
// The wizard's data layer.
//
// ── ONE QUERY, NOT FIVE ───────────────────────────────────────────────────
//
// A facility has at most one live application, and every step of the wizard
// reads some of it. Five queries would give the form five loading states and
// five chances to disagree about the same row.
//
// ── AND THE SECRET MUTATION RETURNS A LAST FOUR ───────────────────────────
//
// `useStoreSecret` takes a number and gives back four digits. That asymmetry is
// the whole design: the value goes up once and never comes back, so there is
// nothing in the cache, nothing in a devtools tree, and nothing for a retry to
// resend. A mutation whose variables were kept would defeat it, which is why
// the value is passed and dropped rather than held in component state.
// ============================================================================

const KEY = ["boarding", "application"] as const;

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(body?.error ?? fallback);
  }
  return body as T;
}

export const boardingQueries = {
  application: () => ({
    queryKey: KEY,
    queryFn: async (): Promise<MerchantApplication | null> => {
      const response = await fetch("/api/merchant-application/application");
      const body = await readJson<{ application: MerchantApplication | null }>(
        response,
        "Your application could not be loaded.",
      );
      return body.application;
    },
  }),
};

export function useBoardingApplication() {
  return useQuery(boardingQueries.application());
}

/** Start one. Safe to call twice — the route hands back the existing one. */
export function useStartApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/merchant-application/application", {
        method: "POST",
      });
      return readJson<{ id?: string }>(
        response,
        "The application could not be started.",
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSaveStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input:
        | { step: "business"; values: BusinessStep }
        | { step: "banking"; values: BankingStep },
    ) => {
      const response = await fetch("/api/merchant-application/application", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return readJson<{ ok: true }>(response, "That could not be saved.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSavePrincipal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (principal: Principal) => {
      const editing = Boolean(principal.id);
      const response = await fetch("/api/merchant-application/principals", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(principal),
      });
      return readJson<{ id?: string }>(
        response,
        "That person could not be saved.",
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRemovePrincipal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `/api/merchant-application/principals?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      return readJson<{ ok: true }>(
        response,
        "That person could not be removed.",
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

/**
 * Send a number to Vault and get four digits back.
 *
 * The value is a parameter and never becomes state. TanStack Form keeps
 * `variables` on a settled mutation, so the input is deliberately read from an
 * uncontrolled field at submit time and dropped — see the banner above.
 */
export function useStoreSecret() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      kind: "principal" | "bank";
      principalId?: string;
      value: string;
    }) => {
      const response = await fetch("/api/merchant-application/secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return readJson<{ last4: string }>(response, "That could not be saved.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      file: File;
      docType: string;
      principalId?: string;
    }) => {
      const form = new FormData();
      form.append("file", input.file);
      form.append("docType", input.docType);
      if (input.principalId) form.append("principalId", input.principalId);

      const response = await fetch("/api/merchant-application/documents", {
        method: "POST",
        body: form,
      });
      return readJson<{ id: string }>(
        response,
        "That document could not be uploaded.",
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSubmitApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      signedName: string;
      signedTitle: string;
      agreed: true;
    }) => {
      const response = await fetch("/api/merchant-application/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return readJson<{
        status: string;
        detail: string | null;
        destination: string;
        missing?: string[];
      }>(response, "Your application could not be submitted.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      // The Yipyy Pay section decides which of its three faces to show from the
      // connection and the config, and submitting changes what it should be.
      void queryClient.invalidateQueries({ queryKey: ["yipyy-pay"] });
    },
  });
}
