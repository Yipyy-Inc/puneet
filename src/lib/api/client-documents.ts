"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { NO_ITEMS } from "@/lib/no-items";
import type {
  ClientDocumentFile,
  ClientDocumentType,
} from "@/lib/api/mappers/client-document";

// ============================================================================
// The files on a client's record, from `client_documents` + the private
// `client-documents` bucket.
//
// Each file carries a signed link that dies in a minute, so opening one asks
// for a FRESH list first (`openDocument`) rather than trusting a link the
// screen fetched when it loaded.
// ============================================================================

const key = (clientRef: number) => ["client-documents", clientRef] as const;

async function fetchDocuments(
  clientRef: number,
): Promise<ClientDocumentFile[]> {
  if (!(clientRef > 0)) return [];
  const response = await fetch(`/api/client-documents?clientRef=${clientRef}`);
  if (response.status === 401) return [];
  if (!response.ok) {
    throw new Error(`Failed to load documents (${response.status})`);
  }
  return (await response.json()) as ClientDocumentFile[];
}

export function useClientDocuments(clientRef: number) {
  const { data, isPending, isError } = useQuery({
    queryKey: key(clientRef),
    queryFn: () => fetchDocuments(clientRef),
    enabled: clientRef > 0,
  });
  return {
    documents: (data ?? NO_ITEMS) as ClientDocumentFile[],
    pending: clientRef > 0 && isPending,
    failed: isError,
  };
}

export interface UploadClientDocument {
  file: File;
  type: ClientDocumentType;
  petRef?: number;
  notes?: string;
  expiresOn?: string;
}

async function failure(response: Response, fallback: string): Promise<never> {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  throw new Error(body?.error ?? fallback);
}

export function useClientDocumentMutations(clientRef: number) {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: key(clientRef) });

  const upload = useMutation({
    mutationFn: async (input: UploadClientDocument) => {
      const form = new FormData();
      form.set("file", input.file);
      form.set("clientRef", String(clientRef));
      form.set("docType", input.type);
      if (input.petRef) form.set("petRef", String(input.petRef));
      if (input.notes) form.set("notes", input.notes);
      if (input.expiresOn) form.set("expiresOn", input.expiresOn);
      const response = await fetch("/api/client-documents", {
        method: "POST",
        body: form,
      });
      if (!response.ok) await failure(response, "The file was not filed.");
      return (await response.json()) as ClientDocumentFile;
    },
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/client-documents/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) await failure(response, "The file was not removed.");
    },
    onSuccess: refresh,
  });

  /** A fresh, minute-long link for one file — or null if it cannot be signed. */
  const openDocument = async (id: string): Promise<string | null> => {
    const fresh = await queryClient.fetchQuery({
      queryKey: key(clientRef),
      queryFn: () => fetchDocuments(clientRef),
      staleTime: 0,
    });
    return fresh.find((d) => d.id === id)?.fileUrl ?? null;
  };

  return { upload, remove, openDocument };
}
