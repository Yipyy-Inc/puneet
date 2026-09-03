import { House, Lock } from "lucide-react";

import { RouteState } from "@/components/ui/route-state";

// Rendered (with HTTP 403) whenever a server component calls forbidden().
//
// §5d2 status-ink map, Violet #4C3BB8 → pose `secure`, and the copy the system
// writes for it verbatim: "This area needs an owner's approval".
//
// ── WHY THE ACTION IS NOT "REQUEST ACCESS" ────────────────────────────────
//
// §5d2 names "Request access" as this pose's call to action, and there is no
// request-access flow in the product — nothing to route it to, nobody to
// notify. A pill that performs nothing is the failure rule 9 and
// `check:success-claims` both exist to catch, so the action is the real
// destination instead. It points at `/`, the route handler that resolves the
// visitor's own portal (src/app/route.ts), rather than at a facility path they
// have already been refused.
export default function Forbidden() {
  return (
    <RouteState
      pose="secure"
      icon={Lock}
      inkClassName="text-violet"
      title="This area needs an owner's approval"
      description="Ask the facility owner to add this section to your role."
      action={{ label: "Go to your dashboard", icon: House, href: "/" }}
    />
  );
}
