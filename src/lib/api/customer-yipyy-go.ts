"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { yipyyGoOff } from "@/lib/settings/yipyy-go";
import type { YipyyGoSettings } from "@/lib/settings/yipyy-go";
import type {
  FormTemplateConfig,
  MedicationFeeConfig,
  TipPopupConfig,
} from "@/types/yipyygo";
import type {
  YipyyGoAddOnRequest,
  YipyyGoAnswers,
  YipyyGoCharge,
  YipyyGoOfferedAddOn,
  YipyyGoPhoto,
  YipyyGoSubmission,
  YipyyGoTipChoice,
} from "@/lib/api/mappers/yipyy-go";

// ============================================================================
// The Yipyy Go setup, read as a CUSTOMER.
//
// A separate hook from `useYipyyGoConfig()` on purpose, and the separation is
// the point rather than an inconvenience. That one goes to
// /api/facility/settings, which resolves the facility from the caller's
// MEMBERSHIP — and `getFacilityContext()` falls back to the DEMO facility for a
// caller who has none. A customer calling it would be shown a different
// business's form, its deadline and its fees, with no error anywhere.
//
// This one goes through the client row. See the banner on
// src/app/api/customer/yipyy-go/route.ts.
// ============================================================================

interface CustomerYipyyGo {
  config: YipyyGoSettings;
  configured: boolean;
}

export const customerYipyyGoQueries = {
  detail: () => ({
    queryKey: ["customer", "yipyy-go"] as const,
    queryFn: async (): Promise<CustomerYipyyGo> => {
      const response = await fetch("/api/customer/yipyy-go");
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(detail?.error ?? `Failed (${response.status})`);
      }
      return (await response.json()) as CustomerYipyyGo;
    },
  }),
};

/**
 * What this customer's facility asks of them before an arrival.
 *
 * `isPending` matters more here than on most reads. Every caller uses this to
 * decide whether to ASK the customer for something, and "nothing is asked" and
 * "not loaded yet" both come back as a switched-off config — so a screen that
 * renders through the pending state tells somebody they are done when nobody
 * has looked yet. Wait for it before concluding no form is needed.
 */
export function useCustomerYipyyGo(): {
  config: YipyyGoSettings;
  /** False means the facility has no usable row: they have not set Yipyy Go up. */
  configured: boolean;
  isPending: boolean;
} {
  const { data, isPending } = useQuery(customerYipyyGoQueries.detail());
  return {
    // A fresh clone rather than the shared constant: a caller that edits what
    // it is given would otherwise edit the fallback for every other caller in
    // the tab.
    config: data?.config ?? yipyyGoOff(),
    configured: data?.configured ?? false,
    isPending,
  };
}

// ── One booking's form, as its owner fills it in ──────────────────────────
//
// The page used to look the booking up in src/data/bookings. These read and
// write /api/customer/yipyy-go/bookings/[ref], which resolves the booking
// through the owner's own client row.

async function readYipyyGoError(
  response: Response,
  fallback: string,
): Promise<Error> {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
    missing?: string[];
  } | null;
  const error = new Error(body?.error ?? fallback) as Error & {
    missing?: string[];
  };
  if (body?.missing) error.missing = body.missing;
  return error;
}

export interface CustomerYipyyGoPet {
  ref: number;
  name: string;
  editable: boolean;
  submission: YipyyGoSubmission | null;
  lastAnswers: YipyyGoAnswers | null;
}

export interface CustomerYipyyGoBooking {
  booking: {
    ref: number;
    service: string;
    status: string;
    startAt: string;
    endAt: string;
    totalCost: number;
    tipAmount: number | null;
  };
  requirement: "mandatory" | "optional" | null;
  deadline: string | null;
  template: FormTemplateConfig;
  addOnsApproval: "auto" | "staff_approval";
  medicationFee: MedicationFeeConfig | null;
  tipPopup: TipPopupConfig | null;
  pets: CustomerYipyyGoPet[];
  offeredAddOns: YipyyGoOfferedAddOn[];
  charges: YipyyGoCharge[];
}

export interface YipyyGoSubmitResult {
  submission: YipyyGoSubmission;
  charges: YipyyGoCharge[];
  tipAmount: number | null;
  confirmationSent: boolean;
}

const bookingKey = (ref: number) =>
  ["customer", "yipyy-go", "booking", ref] as const;

export const customerYipyyGoBookingQueries = {
  booking: (ref: number) => ({
    queryKey: bookingKey(ref),
    queryFn: async (): Promise<CustomerYipyyGoBooking> => {
      const response = await fetch(`/api/customer/yipyy-go/bookings/${ref}`);
      if (!response.ok)
        throw await readYipyyGoError(response, "Could not load the form.");
      return (await response.json()) as CustomerYipyyGoBooking;
    },
  }),
};

function useInvalidateYipyyGoBooking(ref: number) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: bookingKey(ref) });
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
  };
}

export function useSaveYipyyGoDraft(bookingRef: number) {
  const invalidate = useInvalidateYipyyGoBooking(bookingRef);
  return useMutation({
    mutationFn: async (input: {
      petRef: number;
      answers: YipyyGoAnswers;
      addOnRequests: YipyyGoAddOnRequest[];
    }): Promise<YipyyGoSubmission> => {
      const response = await fetch(
        `/api/customer/yipyy-go/bookings/${bookingRef}/pets/${input.petRef}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: input.answers,
            addOnRequests: input.addOnRequests,
          }),
        },
      );
      if (!response.ok)
        throw await readYipyyGoError(response, "Could not save the form.");
      return (await response.json()) as YipyyGoSubmission;
    },
    onSuccess: invalidate,
  });
}

export function useSubmitYipyyGoForm(bookingRef: number) {
  const invalidate = useInvalidateYipyyGoBooking(bookingRef);
  return useMutation({
    mutationFn: async (input: {
      petRef: number;
      answers: YipyyGoAnswers;
      addOnRequests: YipyyGoAddOnRequest[];
      tip?: YipyyGoTipChoice;
    }): Promise<YipyyGoSubmitResult> => {
      const response = await fetch(
        `/api/customer/yipyy-go/bookings/${bookingRef}/pets/${input.petRef}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: input.answers,
            addOnRequests: input.addOnRequests,
            ...(input.tip ? { tip: input.tip } : {}),
          }),
        },
      );
      if (!response.ok)
        throw await readYipyyGoError(response, "Could not send the form.");
      return (await response.json()) as YipyyGoSubmitResult;
    },
    onSuccess: invalidate,
  });
}

export function useIssueCheckInPass(bookingRef: number) {
  return useMutation({
    mutationFn: async (): Promise<{ url: string; expiresAt: string }> => {
      const response = await fetch(
        `/api/customer/yipyy-go/bookings/${bookingRef}/check-in-pass`,
        { method: "POST" },
      );
      if (!response.ok)
        throw await readYipyyGoError(
          response,
          "Could not show a check-in code.",
        );
      return (await response.json()) as { url: string; expiresAt: string };
    },
  });
}

export function useUploadYipyyGoPhoto(bookingRef: number) {
  const invalidate = useInvalidateYipyyGoBooking(bookingRef);
  return useMutation({
    mutationFn: async (input: {
      petRef: number;
      file: File;
      kind: YipyyGoPhoto["kind"];
      itemRef?: string;
    }): Promise<YipyyGoPhoto> => {
      const form = new FormData();
      form.set("file", input.file);
      form.set("bookingRef", String(bookingRef));
      form.set("petRef", String(input.petRef));
      form.set("kind", input.kind);
      if (input.itemRef) form.set("itemRef", input.itemRef);
      const response = await fetch("/api/customer/yipyy-go/photos", {
        method: "POST",
        body: form,
      });
      if (!response.ok)
        throw await readYipyyGoError(response, "Could not add the photo.");
      return (await response.json()) as YipyyGoPhoto;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteYipyyGoPhoto(bookingRef: number) {
  const invalidate = useInvalidateYipyyGoBooking(bookingRef);
  return useMutation({
    mutationFn: async (photoId: string): Promise<void> => {
      const response = await fetch(
        `/api/customer/yipyy-go/photos?id=${encodeURIComponent(photoId)}`,
        { method: "DELETE" },
      );
      if (!response.ok)
        throw await readYipyyGoError(response, "Could not remove the photo.");
    },
    onSuccess: invalidate,
  });
}
