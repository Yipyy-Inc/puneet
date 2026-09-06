"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSignOutEverywhere } from "@/lib/auth/sign-out-client";
import { LogOut } from "lucide-react";

import { YipyyPose } from "@/components/ui/yipyy-pose";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useShellText } from "@/lib/shell/use-shell-text";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useCurrentCustomer,
  currentCustomerKeys,
} from "@/lib/api/current-customer";

// ============================================================================
// "You are signed in, but you are not a customer here."
//
// Spec 002 D1. The Clerk session cookie is set on the apex, so it is shared
// across every facility subdomain and no configuration of a single Clerk
// instance changes that. A customer of Pawradise who opens Happy Paws is
// ALREADY SIGNED IN there.
//
// The credential is shared. The ACCOUNT is not — their pets, bookings, balance
// and history live in a `clients` row at one facility, and Happy Paws has none
// for them. RLS already returns nothing, which is correct and, on its own,
// indistinguishable from "your data failed to load".
//
// So this screen exists to say the true thing out loud. Without it the portal
// renders an empty dashboard and a person reasonably concludes the platform
// lost their pets.
//
// ── IT OFFERS THE TWO REAL WAYS FORWARD ───────────────────────────────────
//
// Register here, or sign in as somebody else. It does NOT quietly create a
// record: joining a business is a decision, and a facility that has not opened
// registration is refused by the database regardless of what this renders.
// ============================================================================

export function StrangerGate({ children }: { children: React.ReactNode }) {
  const t = useShellText("customer");
  const { resolved, unlinked, facilitySlug } = useCurrentCustomer();
  const queryClient = useQueryClient();
  // The canonical sign-out, not a raw provider call: it also clears the legacy
  // localStorage identity that the staff surfaces read, which a bare signOut
  // leaves behind for the next person to sign in on this machine.
  const signOutEverywhere = useSignOutEverywhere();
  const [name, setName] = useState("");

  const register = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/clients/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(body?.error ?? t("registerFailed"));
      }
      return body;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: currentCustomerKeys.me }),
  });

  // Not resolved yet, or they ARE a customer here — render the portal. The
  // `resolved` check matters: showing this during the first paint is the
  // customer-portal version of briefly telling somebody they do not exist.
  if (!resolved || !unlinked) return <>{children}</>;

  // On the apex there is no facility to register AT, so offering the button
  // would be offering something that can only fail — /api/clients/register
  // refuses without a facility hostname, and correctly. This person has no
  // record anywhere, which is a different sentence and a different next step.
  if (!facilitySlug) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          {/* ── §5d2, "First run — no account data" → `welcome` ─────────────

              The ladder assigns this rung by name and gives the surface as
              "sign-in panel · the front door", which is exactly what this is:
              somebody signed in with no record anywhere yet. The pose is
              looked up, never picked at the call site (§5d2).

              It replaced a 48px muted disc holding a lucide `Store`. That
              glyph is the correct answer on a row or a toast — §5d1 puts the
              floor at "96px of clear vertical room" — but this is a whole
              centred view with room to spare, which is the case the
              empty-state family exists for. 320 is that family's size.

              He is beside the words, not instead of them: delete the image and
              the title, the sentence and the action still say everything. */}
          <CardHeader className="text-center">
            <div className="mb-2 flex justify-center">
              <YipyyPose name="welcome" size={320} float priority />
            </div>
            <CardTitle>{t("noBookings")}</CardTitle>
            <CardDescription>{t("notLinkedBody")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => void signOutEverywhere()}
            >
              <LogOut className="mr-2 size-4" />
              {t("signInAsSomeoneElse")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        {/* Same rung, same pose — this is the other half of the front door:
            signed in, but a stranger to THIS facility. The form below is the
            "exactly one primary action" the empty-state family asks for. */}
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <YipyyPose name="welcome" size={320} float priority />
          </div>
          <CardTitle>{t("notRegistered")}</CardTitle>
          <CardDescription>{t("notRegisteredBody")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stranger-name">{t("yourName")}</Label>
            <Input
              id="stranger-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              // french-ok: an example name, not copy
              placeholder="Sam Rivera"
            />
          </div>

          {register.isError && (
            <p className="text-destructive text-sm" role="alert">
              {register.error.message}
            </p>
          )}

          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={!name.trim() || register.isPending}
            onClick={() => register.mutate()}
          >
            {register.isPending ? t("registering") : t("registerHere")}
          </Button>

          {/* The other real way forward: this is somebody else's facility and
              they meant to use a different account. */}
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => void signOutEverywhere()}
          >
            <LogOut className="mr-2 size-4" />
            {t("signInAsSomeoneElse")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
