"use client";

import dynamic from "next/dynamic";

const QuickBooksSettingsEntry = dynamic(
  () =>
    import("@/components/integrations/quickbooks/QuickBooksSettingsEntry").then(
      (mod) => mod.QuickBooksSettingsEntry,
    ),
  { ssr: false },
);

import Link from "next/link";
import { YipyyPayStatusTile } from "@/components/integrations/YipyyPayStatusTile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { DollarSign, Phone } from "lucide-react";

export function IntegrationsSection() {
  return (
    <div className="space-y-6">
      {/* Payments, as a signpost rather than a screen. The whole
              connect flow used to live here — a processor-branded card with
              numbered steps, a merchant id and a disconnect dialog, sitting
              among the other carrier-named cards. Deciding where a
              business's revenue lands is not an integration in the sense
              the rest of this page means, so it moved to Financial →
              Payments & Billing → Yipyy Pay. The telephony and email cards
              it used to sit beside left for the same reason on 2026-09-01;
              what remains below is the connector a facility genuinely owns
              the other side of. */}
      <YipyyPayStatusTile />

      {/* ── PHONE AND MESSAGING ARE NOT INTEGRATIONS ─────────────
              Until 2026-09-01 this section showed facilities cards named
              after the carrier and the email provider, with a placeholder
              number and toggles that read as if they could sever a live
              phone line. Two of those toggles wrote to localStorage and one
              had no handler at all, so none of them disconnected anything —
              which is worse than either honest answer.

              A facility owns a phone number, a ring order and a voicemail
              greeting. It does not own a carrier account, and showing it one
              invites a support call, an accidental outage, and the reading
              that Yipyy is a thin wrapper. What stays on this page is the
              connector a facility genuinely owns the other side of —
              QuickBooks.

              This signpost is for one release; delete it after that. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="size-5" />
            Phone and messaging have moved
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Your number, call routing, voicemail and missed-call replies now
            live under Communication → Calling.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/facility/dashboard/calling?tab=settings">
              Open calling settings
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Accounting Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="size-5" />
            Accounting Integration
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Post every sale, payment and refund to your books.
          </p>
        </CardHeader>
        <CardContent>
          {/* Connecting happens on the integration's own page, which
                  owns the consent flow, the setup wizard and the sync
                  dashboard. The old toggle here flipped a flag and alerted
                  "connected successfully" without connecting anything. */}
          <QuickBooksSettingsEntry />
        </CardContent>
      </Card>

      {/* ── AI TOOLS WAS THE LAST OF THE FAKE CONNECTORS ────────────
              Removed 2026-09-05, for the same reason and by the same rule as
              the carrier and payment-gateway cards above.

              It rendered ONE fixture row from src/data/settings: a vendor
              called "OpenAI", an api key of `sk-*********************`, a
              model of `gpt-4`, and three feature switches — aiReceptionist,
              smartSuggestions, sentimentAnalysis. Nothing in the product read
              any of it, and the product's real AI is Anthropic, in
              src/app/api/ai. The toggle had no onCheckedChange, so it could not
              even lie consistently: it snapped back on the next render.

              Wiring it would have been worse than leaving it. A switch that
              saves and still decides nothing is a switch people trust. The
              honest answers are to build the thing or to stop showing it, and
              there is nothing here to build — it names a vendor this product
              does not call. */}
    </div>
  );
}
