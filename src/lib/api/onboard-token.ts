"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { EmployeeOnboardingTask } from "@/data/staff-onboarding";

// ============================================================================
// The hire's side of onboarding, from the database.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `/onboard/[token]` resolved its instance with
// `getOnboardingInstanceByToken()`, which searches `hrStore` — an in-memory
// client store that never fetches anything. So the page could only ever find an
// invite created in THE SAME BROWSER. A real hire, opening a real link from
// their email on their own phone, hit an empty store and was told:
//
//     "This onboarding link is invalid"
//
// The API route and its RPCs have existed the whole time and nothing called
// them. The facility name on that page came from `src/data/settings.ts`, which
// was the smaller half of the problem.
//
// ── ONE 404 FOR EVERY REFUSAL ─────────────────────────────────────────────
//
// Expired, spent, already submitted, never existed — the route answers all of
// them identically, on purpose, so a caller guessing tokens learns nothing. The
// page therefore CANNOT say "expired" specifically any more, and must not
// pretend to: it says the link is not valid and to ask for a fresh one, which
// covers every case truthfully.
// ============================================================================

export interface OnboardTokenPayload {
  instanceId: string;
  staffId: string | null;
  staffFirstName: string | null;
  staffLastName: string | null;
  staffEmail: string | null;
  /** The facility the hire is joining. Null when it has not been filled in. */
  facilityName: string | null;
  facilityLogo: string | null;
  templateId: string | null;
  welcomeMessage: string | null;
  tokenExpiresAt: string;
  invitedAt: string | null;
  accountPasswordSetAt: string | null;
  tasks: EmployeeOnboardingTask[];
  sections: {
    taskId: string;
    type: string;
    status: "not_started" | "in_progress" | "complete";
    data: Record<string, unknown>;
    completedAt: string | null;
  }[];
  changeRequests: {
    taskId: string;
    sectionType: string;
    note: string;
    resolvedAt: string | null;
  }[];
}

export const onboardTokenQueries = {
  detail: (token: string) => ({
    queryKey: ["onboard", token] as const,
    enabled: token.length > 0,
    queryFn: async (): Promise<OnboardTokenPayload | null> => {
      const response = await fetch(`/api/onboard/${encodeURIComponent(token)}`);
      // 404 is the ANSWER, not a failure: it is what an expired, spent or
      // invented token returns. Throwing would turn "your link has been used"
      // into an error screen with a retry button.
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`Could not load your onboarding (${response.status})`);
      }
      return (await response.json()) as OnboardTokenPayload;
    },
    // The token is single-use on submit and time-limited; a stale cached copy
    // would show a hire a form that no longer accepts writes.
    staleTime: 0,
  }),
};

export function useOnboardToken(token: string) {
  return useQuery(onboardTokenQueries.detail(token));
}

type Action =
  | {
      action: "save-section";
      taskId: string;
      sectionType: string;
      data: Record<string, unknown>;
      status: "not_started" | "in_progress" | "complete";
    }
  | { action: "account-complete" }
  | { action: "submit" };

/**
 * Every write goes through the token, never through a staff id.
 *
 * The RPCs take the token and resolve the instance themselves, so a hire cannot
 * name somebody else's record — which is the reason the old store-based calls
 * (`saveOnboardingSectionByTask(staff.id, …)`) could not have been kept even if
 * they had reached the server.
 */
export function useOnboardWrite(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Action) => {
      const response = await fetch(
        `/api/onboard/${encodeURIComponent(token)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const parsed = (await response.json().catch(() => null)) as
        | (Partial<OnboardTokenPayload> & {
            error?: string;
            submitted?: boolean;
          })
        | null;

      if (!response.ok) {
        throw new Error(
          parsed?.error ?? "This onboarding link is no longer valid.",
        );
      }
      return parsed;
    },
    onSuccess: (result, input) => {
      // Submit SPENDS the token, so the next read returns null by design.
      // Re-reading would 404 and look like the submission failed.
      if (input.action === "submit") return;
      if (result && "instanceId" in result) {
        queryClient.setQueryData(["onboard", token], result);
      }
    },
  });
}
