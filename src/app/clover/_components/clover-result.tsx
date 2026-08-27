import Link from "next/link";
import { AlertTriangle, CheckCircle2, CreditCard, Plug } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PoweredByClover } from "@/components/facility/yipyy-pay/YipyyPayBrand";

// ============================================================================
// What the facility sees when they come back from the consent screen.
//
// Eight outcomes, and they are deliberately not collapsed into "worked" and
// "didn't". Each one has a different next action, and a page that says "an
// error occurred" for every failure makes the person guess which.
//
// Three of them exist only because the same URL is also where Clover drops a
// merchant who LAUNCHED Yipyy from their dashboard. That arrival carries a
// merchant id and no code, and all three used to render as "Sign in to manage
// payments" — including to somebody already signed in.
//
// ── IT SAYS YIPYY PAY, BECAUSE THAT IS WHAT THEY BOUGHT ───────────────────
//
// This is the last screen of step 1 of the Yipyy Pay setup wizard — the
// facility pressed a Yipyy button, was handed to a processor for ninety
// seconds, and lands back here. Greeting them with the processor's name would
// leave them wondering which product they just finished setting up. The
// attribution stays; the headline is ours.
//
// ── AND EVERY WAY OUT GOES BACK TO THE WIZARD ─────────────────────────────
//
// The failure branch used to offer /facility/dashboard/billing/payment-settings
// — a fixture screen that reads mock Tap-to-Pay config and can do nothing about
// any of this. Somebody whose connection just failed was sent to a page with no
// way to retry.
//
// A server component: there is nothing interactive here, and the connection has
// already happened by the time this renders.
// ============================================================================

/** Back into the wizard, on the step that follows a successful connection. */
const SETUP_HREF = "/facility/dashboard/settings?section=yipyy-pay&step=2";
/** Back to step 1, for somebody who has to try again. */
const RETRY_HREF = "/facility/dashboard/settings?section=yipyy-pay&step=1";

export type CloverOutcome =
  | { kind: "connected"; merchantId: string; environment: string }
  | { kind: "not-connected"; lastError: string | null }
  | { kind: "failed"; title: string; detail: string }
  | { kind: "signed-out" }
  | { kind: "unconfigured" }
  // ── The three below only happen on a LAUNCH from Clover's own dashboard ──
  //
  // Clover sends a merchant to the registered Site URL with their merchant id
  // and no authorisation code. Until now that arrival was indistinguishable
  // from somebody typing the URL, so all three of these rendered as "Sign in to
  // manage payments" — including to people who were already signed in.
  | { kind: "launch-no-facility"; merchantId: string; signedIn: boolean }
  | {
      kind: "choose-facility";
      merchantId: string;
      choices: { id: string; name: string; href: string | null }[];
    }
  | {
      kind: "connected-elsewhere";
      connectedMerchantId: string;
      launchedMerchantId: string;
    };

function Shell({
  icon,
  tone,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center p-6">
      <Card className="w-full border-0 shadow-lg">
        <CardHeader>
          <div
            className={`mb-2 flex size-11 items-center justify-center rounded-xl ${tone}`}
          >
            {icon}
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children && (
          <CardContent className="space-y-3">{children}</CardContent>
        )}
      </Card>
    </div>
  );
}

export function CloverResult({ outcome }: { outcome: CloverOutcome }) {
  if (outcome.kind === "connected") {
    return (
      <Shell
        icon={<CheckCircle2 className="size-5 text-white" />}
        tone="bg-emerald-600"
        title="Yipyy Pay is connected"
        description="Card payments for this facility will go through your merchant account."
      >
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Merchant</span>
            <span className="font-mono">{outcome.merchantId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Environment</span>
            <Badge
              variant="outline"
              className={
                outcome.environment === "production"
                  ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : "border-amber-500/30 text-amber-700 dark:text-amber-300"
              }
            >
              {outcome.environment}
            </Badge>
          </div>
        </div>
        {outcome.environment === "sandbox" && (
          <p className="text-muted-foreground text-xs">
            This is a test account. Cards are simulated and no money moves.
          </p>
        )}
        {/* The attribution belongs at the redirect boundary, which is what this
            page is — they were on the processor's own site a moment ago, and
            the merchant id above is theirs. */}
        <PoweredByClover />
        <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
          <Link href={SETUP_HREF}>Continue setting up Yipyy Pay</Link>
        </Button>

        {/* ── A CONNECTED FACILITY COULD NOT CHANGE ITS MERCHANT ────────────
            The connect link only existed in the not-connected branch, so the
            first account a facility chose was the only one it could ever have.
            That is not an edge case: picking the wrong merchant from Clover's
            list, moving to a new merchant account, or replacing a revoked one
            are all ordinary, and every one of them ended here with no way
            forward and nothing explaining why. */}
        <div className="space-y-2 border-t pt-4">
          <Button asChild variant="outline" className="w-full">
            <Link href="/api/payments/clover/connect">
              Connect a different merchant account
            </Link>
          </Button>
          <p className="text-muted-foreground text-xs/relaxed">
            This replaces the account above, so new payments go to the new one.
            Payments already taken stay where they were taken and are not moved.
          </p>
        </div>
      </Shell>
    );
  }

  if (outcome.kind === "not-connected") {
    return (
      <Shell
        icon={<Plug className="size-5 text-white" />}
        tone="bg-slate-600"
        title="Yipyy Pay is not set up yet"
        description="Connect a merchant account to start taking card payments through Yipyy."
      >
        {outcome.lastError && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-300">
            The last attempt reported: {outcome.lastError}
          </p>
        )}
        <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
          <Link href={RETRY_HREF}>Set up Yipyy Pay</Link>
        </Button>
      </Shell>
    );
  }

  if (outcome.kind === "launch-no-facility") {
    // ── SIGNED IN IS A DIFFERENT ANSWER FROM SIGNED OUT ─────────────────
    //
    // `activeAdminFacility()` says `none` for both, and collapsing them is
    // exactly the defect this whole change is about: telling somebody who is
    // already signed in to sign in. A groomer who clicks Yipyy in a merchant
    // dashboard is signed in and simply administers nothing.
    return (
      <Shell
        icon={<CreditCard className="size-5 text-white" />}
        tone="bg-slate-600"
        title={
          outcome.signedIn
            ? "This account cannot connect a merchant"
            : "Sign in to finish connecting"
        }
        description="You have arrived from your Clover dashboard. Connecting a merchant account decides where a business's money lands, so it is limited to a facility's owner or administrator."
      >
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Merchant</span>
          <span className="font-mono">{outcome.merchantId}</span>
        </div>
        {outcome.signedIn ? (
          <p className="text-muted-foreground text-xs/relaxed">
            You are signed in, but you do not administer a facility here. Ask
            whoever owns the business to connect the merchant above.
          </p>
        ) : (
          <>
            {/* Signing in does not come back here — the sign-in lands people in
                whichever portal their token names, and adding a return path
                would mean changing the auth callback. So say where to go
                rather than promise a return that will not happen. */}
            <p className="text-muted-foreground text-xs/relaxed">
              After signing in, open <strong>Settings → Yipyy Pay</strong>.
              Check the merchant above is the one you link.
            </p>
            <Button
              asChild
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </>
        )}
      </Shell>
    );
  }

  if (outcome.kind === "choose-facility") {
    return (
      <Shell
        icon={<Plug className="size-5 text-white" />}
        tone="bg-slate-600"
        title="Which business is this account for?"
        description="You administer more than one, and a merchant account can only belong to one of them. Open the one you mean at its own address."
      >
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Merchant</span>
          <span className="font-mono">{outcome.merchantId}</span>
        </div>
        {/* Each facility's OWN host, because that is what `/connect` reads to
            decide which one it seals into the signed state. A link back to this
            page would land on the same ambiguous hostname and ask again. */}
        <div className="space-y-2">
          {outcome.choices.map((choice) =>
            choice.href ? (
              <Button
                key={choice.id}
                asChild
                variant="outline"
                className="w-full justify-start"
              >
                <a href={choice.href}>{choice.name}</a>
              </Button>
            ) : (
              <p key={choice.id} className="text-muted-foreground text-sm">
                {choice.name}
              </p>
            ),
          )}
        </div>
      </Shell>
    );
  }

  if (outcome.kind === "connected-elsewhere") {
    return (
      <Shell
        icon={<AlertTriangle className="size-5 text-white" />}
        tone="bg-amber-600"
        title="This is not the account that is connected"
        description="You arrived from one Clover merchant, and this business is taking payments through a different one."
      >
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Connected now</span>
            <span className="font-mono">{outcome.connectedMerchantId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">You came from</span>
            <span className="font-mono">{outcome.launchedMerchantId}</span>
          </div>
        </div>
        {/* The state worth naming. Before this, the page showed a connected
            card carrying a merchant id that was not the account they had just
            launched from, and nothing explained the mismatch. */}
        <p className="text-muted-foreground text-xs/relaxed">
          Nothing has changed. If the account you came from is the one you want
          paying out, connect it — that replaces the account above for new
          payments. Payments already taken stay where they were taken.
        </p>
        <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
          <Link href="/api/payments/clover/connect">
            Connect the account I came from
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href={SETUP_HREF}>Leave it as it is</Link>
        </Button>
      </Shell>
    );
  }

  if (outcome.kind === "signed-out") {
    return (
      <Shell
        icon={<CreditCard className="size-5 text-white" />}
        tone="bg-slate-600"
        title="Sign in to manage payments"
        description="Connecting a merchant account decides where your money lands, so it is limited to a facility's owner or administrator."
      >
        <Button asChild variant="outline" className="w-full">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </Shell>
    );
  }

  if (outcome.kind === "unconfigured") {
    return (
      <Shell
        icon={<AlertTriangle className="size-5 text-white" />}
        tone="bg-slate-600"
        title="Yipyy Pay is not available here"
        description="Card payments have not been switched on for this Yipyy installation, so no facility can connect an account. Nothing is wrong with your business — contact Yipyy support."
      />
    );
  }

  return (
    <Shell
      icon={<AlertTriangle className="size-5 text-white" />}
      tone="bg-amber-600"
      title={outcome.title}
      description={outcome.detail}
    >
      {/* Back to step 1, where the button that failed lives — not to a
          settings page with no way to retry. */}
      <Button asChild variant="outline" className="w-full">
        <Link href={RETRY_HREF}>Try again</Link>
      </Button>
    </Shell>
  );
}
