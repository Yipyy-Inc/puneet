import type {
  AbandonmentStep,
  UnfinishedBookingStatus,
} from "@/types/unfinished-booking";

// The labels the unfinished-booking screens share. The invented rows at
// facility 11 and their getters are gone: unfinished bookings are rows since
// 20260914133049 (lib/api/unfinished-bookings.ts).

export const ABANDONMENT_STEP_LABELS: Record<
  AbandonmentStep,
  { label: string; progress: number }
> = {
  service_selection: { label: "Service Selection", progress: 10 },
  pet_selection: { label: "Pet Selection", progress: 25 },
  date_and_details: { label: "Date & Details", progress: 45 },
  add_ons: { label: "Add-ons", progress: 60 },
  forms: { label: "Forms", progress: 75 },
  review: { label: "Review", progress: 90 },
  payment: { label: "Payment", progress: 98 },
};

export const UNFINISHED_STATUS_LABELS: Record<
  UnfinishedBookingStatus,
  { label: string; color: string }
> = {
  abandoned: {
    label: "Abandoned",
    color:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
  contacted: {
    label: "Contacted",
    color:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  },
  recovered: {
    label: "Recovered",
    color:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
};
