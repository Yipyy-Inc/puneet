"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  NotificationCategory,
  NotificationPreferences,
} from "@/lib/notifications/catalog";
import type {
  MyNotificationSettings,
  StaffNotificationFeed,
} from "@/lib/notifications/types";

// ============================================================================
// Staff notifications, from `public.staff_notifications`.
//
// The bell and the notification centre read the same query, so marking one
// read in either updates both. Polled once a minute while a tab is open —
// there is no push channel, and a bell that never changes until a reload is a
// bell nobody trusts.
// ============================================================================

export type FeedView = "active" | "archive";

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(detail?.error ?? fallback);
  }
  return (await response.json()) as T;
}

const EMPTY: StaffNotificationFeed = { items: [], unread: 0 };

export const staffNotificationQueries = {
  feed: (view: FeedView = "active", category?: NotificationCategory) => ({
    queryKey: ["staff-notifications", view, category ?? "all"] as const,
    queryFn: async (): Promise<StaffNotificationFeed> => {
      const search = new URLSearchParams({ view });
      if (category) search.set("category", category);
      const response = await fetch(`/api/notifications?${search}`);
      if (response.status === 401) return EMPTY;
      return readJson(response, "Could not load your notifications.");
    },
    // 60s was 1,440 polls a day per open tab. The bell can be three minutes
    // late; the egress quota could not (see lib/auth/viewer.ts).
    refetchInterval: 180_000,
    refetchIntervalInBackground: false,
  }),
  settings: () => ({
    queryKey: ["staff-notifications", "settings"] as const,
    queryFn: async (): Promise<MyNotificationSettings> =>
      readJson(
        await fetch("/api/notifications/preferences"),
        "Could not load your notification preferences.",
      ),
  }),
};

export function useStaffNotifications(
  view: FeedView = "active",
  category?: NotificationCategory,
) {
  const { data, isPending, error } = useQuery(
    staffNotificationQueries.feed(view, category),
  );
  return { feed: data ?? EMPTY, isPending, error };
}

export function useStaffNotificationMutations() {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["staff-notifications"] });

  const setState = useMutation({
    mutationFn: async (input: {
      id: string;
      read?: boolean;
      archived?: boolean;
    }) =>
      readJson(
        await fetch(`/api/notifications/${input.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: input.read, archived: input.archived }),
        }),
        "That notification was not changed.",
      ),
    onSuccess: refresh,
  });

  const markAllRead = useMutation({
    mutationFn: async () =>
      readJson<{ updated: number }>(
        await fetch("/api/notifications", { method: "POST" }),
        "Your notifications were not marked read.",
      ),
    onSuccess: refresh,
  });

  return { setState, markAllRead };
}

export function useMyNotificationSettings() {
  return useQuery(staffNotificationQueries.settings());
}

export function useSaveMyNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (preferences: NotificationPreferences) =>
      readJson<NotificationPreferences>(
        await fetch("/api/notifications/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preferences),
        }),
        "Your notification preferences were not saved.",
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["staff-notifications", "settings"],
      }),
  });
}
