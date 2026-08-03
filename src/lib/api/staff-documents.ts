"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// Staff documents and signatures.
//
// SIGNED URLS ARE SHORT-LIVED AND NOT CACHED ACROSS A RELOAD. The list query
// carries `fileUrl`s that expire in 60 seconds, so `staleTime: 0` and a refetch
// on mount are correct rather than wasteful: a cached list is a list of dead
// links, and a dead link looks like a broken app rather than an expired token.
// ============================================================================

export interface StaffDocumentRow {
  id: string;
  staffId: string;
  name: string;
  type: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  visibleToEmployee: boolean;
  taskKey: string | null;
  /** Null when the URL could not be signed — render a disabled control, not a
   *  link that 404s. */
  fileUrl: string | null;
  expiresInSeconds: number;
}

export interface StaffSignatureRow {
  id: string;
  staff_id: string;
  task_key: string | null;
  agreement_key: string;
  agreement_title: string;
  agreement_text: string;
  agreement_hash: string;
  signature_name: string;
  signed_at: string;
}

async function json<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

export const staffDocumentKeys = {
  all: ["staff-documents"] as const,
  forStaff: (staffId: string) => ["staff-documents", staffId] as const,
  signatures: (staffId: string) => ["staff-signatures", staffId] as const,
};

export const staffDocumentQueries = {
  forStaff: (staffId: string | null | undefined) => ({
    queryKey: staffDocumentKeys.forStaff(staffId ?? ""),
    queryFn: () =>
      json<StaffDocumentRow[]>(
        `/api/staff-documents?staffId=${encodeURIComponent(staffId ?? "")}`,
      ),
    enabled: Boolean(staffId),
    // The URLs in this response expire in a minute. Holding them is worse than
    // fetching again.
    staleTime: 0,
    gcTime: 60_000,
  }),
  signatures: (staffId: string | null | undefined) => ({
    queryKey: staffDocumentKeys.signatures(staffId ?? ""),
    queryFn: () =>
      json<StaffSignatureRow[]>(
        `/api/staff-signatures?staffId=${encodeURIComponent(staffId ?? "")}`,
      ),
    enabled: Boolean(staffId),
  }),
};

export function useStaffDocuments(staffId: string | null | undefined) {
  return useQuery(staffDocumentQueries.forStaff(staffId));
}

export function useStaffSignatures(staffId: string | null | undefined) {
  return useQuery(staffDocumentQueries.signatures(staffId));
}

/** Multipart, because the file is the payload. The declared MIME type is sent
 *  and ignored — the server sniffs the bytes. */
export function useUploadStaffDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      staffId: string;
      file: File;
      taskKey?: string;
      docType?: string;
    }) => {
      const form = new FormData();
      form.set("staffId", input.staffId);
      form.set("file", input.file);
      if (input.taskKey) form.set("taskKey", input.taskKey);
      if (input.docType) form.set("docType", input.docType);

      const response = await fetch("/api/staff-documents", {
        method: "POST",
        body: form,
      });
      const parsed = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(parsed?.error ?? "Could not upload that file.");
      }
      return parsed;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffDocumentKeys.all });
    },
  });
}

export function useSignAgreement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      staffId: string;
      taskKey: string;
      signatureName: string;
      signatureData?: string;
    }) => {
      const response = await fetch("/api/staff-signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const parsed = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(parsed?.error ?? "Could not record that signature.");
      }
      return parsed;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: staffDocumentKeys.signatures(variables.staffId),
      });
    },
  });
}
