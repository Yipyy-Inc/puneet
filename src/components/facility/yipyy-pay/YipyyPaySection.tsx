"use client";

import dynamic from "next/dynamic";
import { ExternalLink, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useYipyyPayOverview,
  type YipyyPayOverview,
} from "@/lib/api/yipyy-pay";
import { SectionSkeleton } from "./SectionSkeleton";
import { YipyyPayPreConnection } from "./PreConnection";
import { useYipyyPayNav } from "./use-yipyy-pay-nav";
import { facilityParentHost } from "@/lib/app-host";

// The connect wizard and the dashboard are never on screen together, and a
// facility sees one of them for five minutes and the other for years. Split so
// the visitor pays for the one they are looking at.
const YipyyPaySetupWizard = dynamic(
  () =>
    import("./setup/YipyyPaySetupWizard").then((m) => m.YipyyPaySetupWizard),
  { loading: () => <SectionSkeleton /> },
);
const YipyyPayDashboard = dynamic(
  () =>
    import("./dashboard/YipyyPayDashboard").then((m) => m.YipyyPayDashboard),
  { loading: () => <SectionSkeleton /> },
);

// ============================================================================
// Which Yipyy Pay screen a facility is looking at.
//
// ── THE STATE IS DERIVED, NEVER ASSERTED ──────────────────────────────────
//
//   setup finished                -> the dashboard, forever
//   &step= in the address         -> the connect-an-existing-account wizard
//   anything else                 -> PreConnection, which picks from the
//                                    merchant application's own status
//
// "Finished" comes from `setupCompletedAt`; everything before it comes from
// rows that describe reality — a connection Clover still honours, an
// application status a human actually set. That matters: a facility can
// uninstall Yipyy from their own Clover dashboard at any time, and Clover
// publishes no way for us to be told. If this trusted a stored step, that
// facility would come back to green ticks and a dashboard reporting an account
// that no longer exists.
//
// ── AND THE URL IS A VIEW, NOT THE STATE ──────────────────────────────────
//
// `&apply=`, `&step=` and `&tab=` are honoured so a facility can bookmark or
// refresh, but they promote nobody: each wizard clamps what it is asked for
// against what is genuinely finished. See `use-yipyy-pay-nav`.
// ============================================================================

export function YipyyPaySection() {
  const nav = useYipyyPayNav();
  const { data, isPending, error } = useYipyyPayOverview();

  if (isPending) return <SectionSkeleton />;

  // The route answers 403 for anyone who is not an owner or administrator. Said
  // plainly rather than rendered as an empty dashboard, which is what a screen
  // that swallows the error would show.
  if (error || !data) {
    return (
      <Card>
        <CardContent className="text-muted-foreground p-6 text-sm">
          {error instanceof Error
            ? error.message
            : "Yipyy Pay could not be loaded."}
        </CardContent>
      </Card>
    );
  }

  // The DEPLOYMENT has no payment application. Said plainly, because otherwise
  // a facility presses Get Started, gets a 503, and reasonably concludes their
  // own business details are at fault.
  if (!data.configured) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 p-6">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-semibold">Yipyy Pay is not available yet</p>
            <p className="text-muted-foreground text-sm/relaxed">
              Card payments have not been switched on for this Yipyy
              installation. Nothing is wrong with your business — contact Yipyy
              support and we will enable it.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // One person can administer two facilities and the address names neither. A
  // payment account belongs to one business, so this asks rather than guessing.
  if (data.ambiguous) {
    return <FacilityChooser choices={data.choices} />;
  }

  const overview: YipyyPayOverview = data;
  const finished = Boolean(overview.config.setupCompletedAt);

  // Setup finished: no marketing page and no application screen is shown to
  // this facility again.
  //
  // Keyed on `setupCompletedAt` alone, NOT on the connection. A facility that
  // finished and later had the app removed at Clover still gets the dashboard —
  // which is where the "card payments are not working" banner and the reconnect
  // link live. Sending them back to a landing page for a product they already
  // have would hide the one control that fixes it.
  if (finished && !nav.inWizard) {
    return <YipyyPayDashboard overview={overview} />;
  }

  // Only `&step=` opens the connect wizard.
  //
  // This used to also trigger on `connection.connected`, so a facility that
  // connected and then left mid-setup came back straight into step 2 — and the
  // wizard's own "Back to Yipyy Pay" link then rendered the wizard again,
  // because leaving it did not change the condition that put them there. A
  // control that visibly does nothing.
  if (nav.inWizard) {
    return <YipyyPaySetupWizard overview={overview} />;
  }

  return <YipyyPayPreConnection overview={overview} />;
}

/**
 * Which business is this about?
 *
 * A merchant account belongs to a business, not to a person, and one admin can
 * hold two. The apex address names neither, so the honest move is to send them
 * to the one they mean at its own address rather than pick the first row
 * Postgres returned.
 */
function FacilityChooser({
  choices,
}: {
  choices: { id: string; name: string; slug: string }[];
}) {
  // `<slug>.app.yipyy.com` — the address a facility actually opens.
  const domain = facilityParentHost(process.env.NEXT_PUBLIC_APP_DOMAIN);

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-semibold">Which business is this for?</p>
            <p className="text-muted-foreground text-sm/relaxed">
              You administer more than one facility and this address does not
              say which. Open the one you want at its own address — a payment
              account belongs to a business, not to an account.
            </p>
          </div>
        </div>
        <ul className="space-y-2">
          {choices.map((choice) => {
            // Null in local development, where there are no subdomains. The
            // name is then stated without a link, which is honest rather than a
            // link that goes nowhere.
            const href = domain
              ? `https://${choice.slug}.${domain}/facility/dashboard/settings?section=yipyy-pay`
              : null;
            return (
              <li key={choice.id}>
                {href ? (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <a href={href}>
                      {choice.name}
                      <ExternalLink className="size-3.5 opacity-70" />
                    </a>
                  </Button>
                ) : (
                  <div className="rounded-md border px-3 py-2 text-sm">
                    {choice.name}
                    <span className="text-muted-foreground ml-2 font-[tabular-nums] text-xs">
                      {choice.slug}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
