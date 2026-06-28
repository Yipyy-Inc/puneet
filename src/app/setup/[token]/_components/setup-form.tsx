"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Eye, EyeOff, Loader2 } from "lucide-react";

import { completeAdminInvite } from "@/lib/admin-team-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SetupFormProps {
  id: number;
  name: string;
  email: string;
  roleLabel: string;
  department: string;
  expiresAt: number;
}

export function SetupForm({
  id,
  name,
  email,
  roleLabel,
  department,
  expiresAt,
}: SetupFormProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
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
    completeAdminInvite(id);
    setSubmitting(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="p-7 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15">
          <CheckCircle2 className="size-6" />
        </div>
        <h1 className="mt-4 text-lg font-semibold">You&apos;re all set!</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Your admin account is ready, {name.split(" ")[0]}. You can now sign in
          to the Yipyy console.
        </p>
        <Button
          asChild
          className="mt-5 w-full bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Link href="/dashboard">Go to the console</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-7">
      <div>
        <h1 className="text-lg font-semibold">Set up your account</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Welcome, {name}. Choose a password to activate your admin account.
        </p>
      </div>

      <div className="bg-muted/40 space-y-2 rounded-xl border p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Email</span>
          <span className="font-medium">{email}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Role</span>
          <Badge variant="secondary" className="font-normal">
            {roleLabel}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Department</span>
          <span className="font-medium">{department}</span>
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

      {error && <p className="text-destructive text-sm">{error}</p>}

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
