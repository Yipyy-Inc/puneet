"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { Store, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const { resolved, unlinked, facilitySlug } = useCurrentCustomer();
  const queryClient = useQueryClient();
  const clerk = useClerk();
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
        throw new Error(body?.error ?? "Could not register you here.");
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
          <CardHeader className="text-center">
            <div className="mb-2 flex justify-center">
              <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                <Store className="text-muted-foreground size-6" />
              </div>
            </div>
            <CardTitle>No bookings yet</CardTitle>
            <CardDescription>
              Your account is not linked to a pet care facility. Open the web
              address your facility gave you to register, or ask them to add you
              — either way your access follows this email address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => void clerk.signOut({ redirectUrl: "/sign-in" })}
            >
              <LogOut className="mr-2 size-4" />
              Sign in as someone else
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
              <Store className="text-muted-foreground size-6" />
            </div>
          </div>
          <CardTitle>You are not registered here yet</CardTitle>
          <CardDescription>
            You are signed in, but this facility does not have an account for
            you. Your pets and bookings at other facilities are unaffected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stranger-name">Your name</Label>
            <Input
              id="stranger-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            {register.isPending ? "Registering…" : "Register at this facility"}
          </Button>

          {/* The other real way forward: this is somebody else's facility and
              they meant to use a different account. */}
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => void clerk.signOut({ redirectUrl: "/sign-in" })}
          >
            <LogOut className="mr-2 size-4" />
            Sign in as someone else
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
