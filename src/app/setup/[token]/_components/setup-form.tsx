"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Eye, EyeOff, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ============================================================================
// What this form used to do, in full: validate that two password fields
// matched, call completeAdminInvite(id) — which wrote a key into localStorage —
// and render "You're all set! Your admin account is ready." The password was
// never sent anywhere. Nobody could sign in afterwards.
//
// It now posts to /api/admin/setup, which creates the WorkOS identity, writes
// the profile RLS reads, and accepts the invitation into platform_memberships.
// The success screen sends them to /sign-in with the address prefilled rather
// than straight to /dashboard: creating an account is not the same act as
// having a session, and pretending otherwise is how the old version got to
// claim something that had not happened.
// ============================================================================

interface SetupFormProps {
  token: string;
  name: string;
  email: string;
  roleLabel: string;
  expiresAt: number;
}

export function SetupForm({
  token,
  name,
  email,
  roleLabel,
  expiresAt,
}: SetupFormProps) {
  const [firstName, setFirstName] = useState(name.split(" ")[0] ?? "");
  const [lastName, setLastName] = useState(
    name.split(" ").slice(1).join(" ") ?? "",
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ alreadyHadAccount: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, firstName, lastName, password }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        alreadyHadAccount?: boolean;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not complete setup.");
        return;
      }
      setDone({ alreadyHadAccount: Boolean(data.alreadyHadAccount) });
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="p-7 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15">
          <CheckCircle2 className="size-6" />
        </div>
        <h1 className="mt-4 text-lg font-semibold">You&apos;re on the team</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          {done.alreadyHadAccount
            ? // One credential serves everything (ADR 0004), so we did not make
              // a second account — and telling them to use a password they just
              // chose, which was not applied, would be the old bug in a new place.
              `${email} already had a Yipyy account, so we added the platform role to it. Sign in with your existing password.`
            : `Your account is ready. Sign in with the password you just chose.`}
        </p>
        <Button
          asChild
          className="mt-5 w-full bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Link href={`/sign-in?email=${encodeURIComponent(email)}`}>
            Go to sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-7">
      <div>
        <h1 className="text-lg font-semibold">Set up your account</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {name ? `Welcome, ${name}. ` : ""}Choose a password to activate your
          Yipyy platform account.
        </p>
      </div>

      <div className="bg-muted/40 space-y-2 rounded-xl border p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Email</span>
          <span className="font-medium">{email}</span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-muted-foreground shrink-0">Role</span>
          <Badge variant="secondary" className="text-right font-normal">
            {roleLabel}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Create password</Label>
        <div className="relative">
          <Input
            id="password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter password"
          autoComplete="new-password"
        />
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "Complete setup"
        )}
      </Button>

      <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
        <Clock className="size-3" />
        This invitation expires {new Date(expiresAt).toLocaleString()}
      </p>
    </form>
  );
}
