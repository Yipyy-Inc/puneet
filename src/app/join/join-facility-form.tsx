"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ============================================================================
// The one act that makes somebody a customer of a facility.
//
// ── IT POSTS THE SAME THING IN BOTH STATES ────────────────────────────────
//
// `open` changes the WORDS, not the request. `register_client` tries to claim
// a record the facility already created BEFORE it looks at
// allow_customer_signup, so a person the front desk entered last week can walk
// in through a closed door — being entered by staff is an invitation.
//
// That is why the closed state still has a button. Hiding it would strand
// exactly the people a facility has already agreed to serve, and they are the
// ones most likely to be told "just make an account on our website".
//
// ── WHAT IS NOT SENT ──────────────────────────────────────────────────────
//
// The email address, and the facility. The address comes off the caller's
// verified profile inside the function; the facility comes from the Host
// header via `x-facility-slug`. Either as a form field would let somebody
// register themselves into any facility, or against somebody else's address
// and inherit whatever that facility had waiting for it.
// ============================================================================

export function JoinFacilityForm({
  facilityName,
  open,
  suggestedName,
}: {
  facilityName: string;
  open: boolean;
  suggestedName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(suggestedName);
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/clients/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || suggestedName,
          phone: phone.trim() || undefined,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setMessage(body?.error ?? "That didn't work. Please try again.");
        setPending(false);
        return;
      }

      // `refresh()` first: the customer portal's gate asks the database whether
      // this person is a client here, and the answer just changed. Pushing
      // without it can land on a cached negative and bounce straight back.
      router.refresh();
      router.push("/customer/dashboard");
    } catch {
      setMessage("Could not reach Yipyy just now. Please try again.");
      setPending(false);
    }
  }

  if (!open) {
    return (
      <form onSubmit={submit} className="space-y-4">
        <p className="text-muted-foreground text-sm">
          {facilityName} does not take online registrations. If they have
          already added you, we can find your record — otherwise ask them to add
          you and come back.
        </p>
        <Button
          type="submit"
          className="h-11 w-full"
          variant="outline"
          disabled={pending}
        >
          {pending ? "Looking…" : "Find my record"}
        </Button>
        {message && (
          <p
            role="alert"
            className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          >
            {message}
          </p>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="join-name">Your name</Label>
        <Input
          id="join-name"
          autoComplete="name"
          required
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="How the team should greet you"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="join-phone">Phone (optional)</Label>
        <Input
          id="join-phone"
          type="tel"
          autoComplete="tel"
          maxLength={40}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="So they can reach you about a booking"
        />
      </div>

      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Joining…" : `Join ${facilityName}`}
      </Button>

      <p className="text-muted-foreground text-xs">
        You are joining {facilityName} only. Your Yipyy sign-in stays yours —
        other businesses on Yipyy see nothing of this.
      </p>

      {message && (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {message}
        </p>
      )}
    </form>
  );
}
