"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  YipyyGoArrival,
  YipyyGoCharge,
  YipyyGoReviewBody,
  YipyyGoDeskCheckBody,
  YipyyGoSubmission,
} from "@/lib/api/mappers/yipyy-go";

// ============================================================================
// The pre-arrival form, as the FACILITY reads and acts on it: a booking's
// forms, today's arrivals, review, the desk check and reading a check-in code.
//
// The owner's side is src/lib/api/customer-yipyy-go.ts. This replaces
// src/lib/api/yipyygo.ts, which wrapped the fixture store.
// ============================================================================

async function readError(response: Response, fallback: string): Promise<Error> {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
    code?: string;
  } | null;
  const error = new Error(body?.error ?? fallback) as Error & {
    code?: string;
    status?: number;
  };
  error.status = response.status;
  if (body?.code) error.code = body.code;
  return error;
}

export interface StaffYipyyGoBooking {
  booking: {
    ref: number;
    service: string;
    status: string;
    startAt: string;
    endAt: string;
    tipAmount: number | null;
  };
  requirement: "mandatory" | "optional" | null;
  deadline: string | null;
  pets: {
    ref: number;
    name: string;
    editable: boolean;
    submission: YipyyGoSubmission | null;
  }[];
  charges: YipyyGoCharge[];
  deskChecks: {
    petRef: number | null;
    source: "code" | "search";
    medicationsConfirmed: boolean;
    belongingsConfirmed: boolean;
    formStatus: string;
    formMissing: boolean;
    overrideReason: string | null;
    recordedByName: string | null;
    createdAt: string;
  }[];
}

export const yipyyGoQueries = {
  booking: (ref: number) => ({
    queryKey: ["yipyy-go", "booking", ref] as const,
    queryFn: async (): Promise<StaffYipyyGoBooking> => {
      const response = await fetch(`/api/yipyy-go/bookings/${ref}`);
      if (!response.ok)
        throw await readError(response, "Could not load the form.");
      return (await response.json()) as StaffYipyyGoBooking;
    },
  }),
  arrivals: (q: string) => ({
    queryKey: ["yipyy-go", "arrivals", q] as const,
    queryFn: async (): Promise<YipyyGoArrival[]> => {
      const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      const response = await fetch(`/api/yipyy-go/arrivals${query}`);
      if (!response.ok)
        throw await readError(response, "Could not load today's arrivals.");
      return (await response.json()) as YipyyGoArrival[];
    },
  }),
};

function useInvalidateYipyyGo() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["yipyy-go"] });
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
  };
}

export function useReviewYipyyGo(bookingRef: number) {
  const invalidate = useInvalidateYipyyGo();
  return useMutation({
    mutationFn: async (body: YipyyGoReviewBody): Promise<YipyyGoSubmission> => {
      const response = await fetch(
        `/api/yipyy-go/bookings/${bookingRef}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok)
        throw await readError(response, "Could not update that form.");
      return (await response.json()) as YipyyGoSubmission;
    },
    onSuccess: invalidate,
  });
}

export function useResolveCheckInPass() {
  return useMutation({
    mutationFn: async (code: string): Promise<{ bookingRef: number }> => {
      const response = await fetch("/api/yipyy-go/check-in-pass/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!response.ok)
        throw await readError(
          response,
          "That check-in code is not valid here.",
        );
      return (await response.json()) as { bookingRef: number };
    },
  });
}

export function useRecordDeskCheck(bookingRef: number) {
  const invalidate = useInvalidateYipyyGo();
  return useMutation({
    mutationFn: async (body: YipyyGoDeskCheckBody) => {
      const response = await fetch(
        `/api/yipyy-go/bookings/${bookingRef}/desk-check`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok)
        throw await readError(response, "Could not record the check-in.");
      return (await response.json()) as {
        petRef: number | null;
        formStatus: string;
        formMissing: boolean;
        overrideReason: string | null;
      }[];
    },
    onSuccess: invalidate,
  });
}
