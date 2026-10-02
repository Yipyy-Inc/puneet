"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { liveWrite } from "@/lib/api/live-fetch";

// ============================================================================
// A lesson pack's sessions still to book, as passes the client owns — see
// /api/training/lesson-packs. The first session was booked at the pack's
// price; these are the rest.
// ============================================================================

export interface GrantLessonPackInput {
  /** The client's ref. */
  clientId: number;
  programId: string;
  /** The pack's sessions: 3 for a 3-session pack. */
  sessions: number;
  /** The dogs who bought it, each a pack of their own. */
  pets: number;
  packageName: string;
}

export function useGrantLessonPack() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: GrantLessonPackInput) =>
      liveWrite<{ id: string; passes: number }>(
        "/api/training/lesson-packs",
        "POST",
        input,
      ),
    // Confirm's "Package passes" and the booking page read these.
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["grooming", "customer-packages"] }),
  });
}
