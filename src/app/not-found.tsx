import { CircleHelp, House } from "lucide-react";

import { RouteState } from "@/components/ui/route-state";

// §5d2 state ladder, "Not found · 404": pose `confused`, and the copy the
// system writes for it. Neutral ink rather than error — §5d2 gives neutral
// "nothing wrong, nothing happening", and a page that moved is not a fault.
//
// The action points at `/`, which is a route handler that resolves the
// visitor's own portal and answers 307 (see src/app/route.ts) — so one link
// serves the customer, facility, employee and platform portals correctly.
export default function NotFound() {
  return (
    <RouteState
      pose="confused"
      icon={CircleHelp}
      inkClassName="text-ink-secondary"
      title="That page has moved"
      description="The link may be out of date, or the page now lives somewhere else."
      action={{ label: "Go to your dashboard", icon: House, href: "/" }}
      className="min-h-screen"
    />
  );
}
