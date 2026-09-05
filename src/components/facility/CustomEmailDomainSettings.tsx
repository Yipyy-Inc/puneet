"use client";

import { Mail } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ============================================================================
// CUSTOM EMAIL DOMAIN — NOT BUILT, AND NO LONGER PRETENDING TO BE.
//
// ── WHAT WAS HERE ─────────────────────────────────────────────────────────
//
// 373 lines of `useState` and two `setTimeout`s. No fetch, no storage, nothing
// on a server. `handleVerifyEmail` toasted "Verification Email Sent" and sent
// none; `handleVerifyDomain` waited two seconds and then announced:
//
//     "Domain Verified! Your custom email domain is now active."
//
// It was not verified and it was not active. A facility could complete the
// whole flow, be told in green that their mail now goes out under their own
// domain, and be wrong — with no way to find out until a customer said they
// never received anything.
//
// ── AND THE DNS RECORDS NAMED A COMPETITOR ────────────────────────────────
//
// The three records it told a facility to paste into their own DNS zone were
// `moego._domainkey.…`, `v=spf1 include:spf.moego.pet ~all` and a CNAME to
// `mail.moego.pet`. MoeGo is a competing pet-services product. Anybody who
// followed those instructions would have pointed their SPF and DKIM at another
// company's mail infrastructure.
//
// ── WHY THIS IS THE RIGHT ANSWER AND NOT A REGRESSION ────────────────────
//
// The same call this file's neighbours already record, twice: the carrier cards
// and the payment-gateway cards were removed on 2026-09-01 because "toggles
// that read as if they could sever a live phone line… none of them disconnected
// anything — which is worse than either honest answer." Nothing is being taken
// away here that a facility ever had.
//
// ── WHAT BUILDING IT ACTUALLY NEEDS ───────────────────────────────────────
//
// Resend is already a dependency and already sends for five modules, so the
// pieces are: its domains API (create, read back the real DKIM/SPF/DMARC
// records, poll for verification), a `facility_settings` domain holding the
// sender identity — a registry entry in src/lib/settings/domains.ts, not a
// migration — and the records rendered from the API response rather than from a
// template. It is also an OUTBOUND sender, so it has to consult
// `outboundSendsSuppressed()`; `bun run check:staging-sends` enforces that, and
// staging shares the production database.
// ============================================================================

export function CustomEmailDomainSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-5" />
          Custom email domain
        </CardTitle>
        <CardDescription>
          Send booking confirmations, reminders and receipts from your own
          domain instead of ours.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertTitle>Not available yet</AlertTitle>
          <AlertDescription>
            Your email still goes out from Yipyy, and it is delivering normally.
            Nothing here needs your attention — we will get in touch when you
            can move it to your own domain.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
