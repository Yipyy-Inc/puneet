"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AnnouncementInput } from "@/lib/announcements/mapper";
import type {
  AnnouncementOptions,
  EnhancedAnnouncement,
  FacilityAnnouncement,
} from "@/types/announcement";

// ============================================================================
// Platform announcements (20260918103842).
//
// They were a fixture in a browser store: facilities were shown a seeded
// "Scheduled maintenance" banner, and the composer "published" into the admin's
// own tab. The super-admin side writes rows now; the facility side reads only
// what is live for its facility.
// ============================================================================

export const announcementKeys = {
  admin: ["platform-announcements", "admin"] as const,
  active: ["platform-announcements", "active"] as const,
};

async function json<T>(
  url: string,
  init?: { method: string; body?: unknown; keepalive?: boolean },
): Promise<T> {
  const response = await fetch(url, {
    method: init?.method ?? "GET",
    keepalive: init?.keepalive,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (response.status === 204) return undefined as T;
  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

// ── super-admin ─────────────────────────────────────────────────────────────

export function useAdminAnnouncements() {
  return useQuery({
    queryKey: announcementKeys.admin,
    queryFn: () =>
      json<{
        announcements: EnhancedAnnouncement[];
        options: AnnouncementOptions;
      }>("/api/admin/announcements"),
  });
}

/** Create (no id) or replace (with its id) an announcement. */
export function useSaveAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; announcement: AnnouncementInput }) =>
      input.id
        ? json<EnhancedAnnouncement>(
            `/api/admin/announcements/${encodeURIComponent(input.id)}`,
            { method: "PATCH", body: input.announcement },
          )
        : json<EnhancedAnnouncement>("/api/admin/announcements", {
            method: "POST",
            body: input.announcement,
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["platform-announcements"],
      });
    },
  });
}

/** Publish now, or take it down everywhere at once. */
export function useSetAnnouncementLive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; action: "publish" | "archive" }) =>
      json<EnhancedAnnouncement>(
        `/api/admin/announcements/${encodeURIComponent(input.id)}`,
        { method: "PATCH", body: { action: input.action } },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["platform-announcements"],
      });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      json<void>(`/api/admin/announcements/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["platform-announcements"],
      });
    },
  });
}

// ── facility portal ─────────────────────────────────────────────────────────

/**
 * What is live for this facility now. Refetched every five minutes, so a
 * scheduled announcement appears — and an archived one disappears — without a
 * reload, at one small read per open tab.
 */
export function useActiveAnnouncements() {
  return useQuery({
    queryKey: announcementKeys.active,
    queryFn: () => json<FacilityAnnouncement[]>("/api/announcements"),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export function useMarkAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; action: "read" | "dismiss" }) =>
      json<void>(`/api/announcements/${encodeURIComponent(input.id)}/receipt`, {
        method: "POST",
        body: { action: input.action },
        // A dismissal is one click and then, often, a navigation: keepalive
        // lets the request finish after the page that sent it has gone.
        keepalive: true,
      }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: announcementKeys.active });
      queryClient.setQueryData<FacilityAnnouncement[]>(
        announcementKeys.active,
        (list) =>
          list?.map((a) =>
            a.id === input.id
              ? {
                  ...a,
                  read: true,
                  dismissed: a.dismissed || input.action === "dismiss",
                }
              : a,
          ),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: announcementKeys.active });
    },
  });
}
