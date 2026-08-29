import type { ReputationPublicPlatform } from "@/types/reputation";

// ============================================================================
// The review platforms, and how each one is shown.
//
// Lifted out of `review-link.ts` because the SURVEY a customer actually opens
// needs it and nothing else in that file — which is 485 lines of the
// localStorage trigger engine the real system replaced. A live screen should
// not have to import the fixture layer to find out what to call Google.
//
// `solicitable` is the load-bearing field, not a display detail. Yelp is false
// and stays false: their terms prohibit asking customers for reviews, so it can
// be connected for display and never used as a destination. The database says
// the same thing in `review_channels_yelp_is_never_solicitable`, and the two
// are meant to agree.
// ============================================================================

export const PLATFORM_META: Record<
  ReputationPublicPlatform,
  {
    label: string;
    badge: string;
    badgeCls: string;
    placeholder: string;
    solicitable: boolean;
    monitorOnlyReason?: string;
  }
> = {
  google: {
    label: "Google Business",
    badge: "G",
    badgeCls: "bg-blue-50 text-blue-600",
    placeholder: "Paste your Google Maps link or g.page/r/…/review",
    solicitable: true,
  },
  facebook: {
    label: "Facebook Pages",
    badge: "f",
    badgeCls: "bg-indigo-50 text-indigo-600",
    placeholder: "https://facebook.com/yourpage/reviews",
    solicitable: true,
  },
  yelp: {
    label: "Yelp",
    badge: "Y",
    badgeCls: "bg-red-50 text-red-600",
    placeholder: "https://yelp.com/biz/your-business",
    solicitable: false,
    monitorOnlyReason:
      "Yelp prohibits asking customers for reviews, so it can be connected for display but never used as a destination.",
  },
  nextdoor: {
    label: "Nextdoor",
    badge: "N",
    badgeCls: "bg-green-50 text-green-700",
    placeholder: "https://nextdoor.com/pages/your-business",
    solicitable: true,
  },
  tripadvisor: {
    label: "TripAdvisor",
    badge: "T",
    badgeCls: "bg-emerald-50 text-emerald-700",
    placeholder: "https://tripadvisor.com/your-business",
    solicitable: true,
  },
};
