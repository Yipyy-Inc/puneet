"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthResult } from "@/lib/auth/form-state";

// ============================================================================
// The interactive parts of an auth form.
//
// Split from AuthCard so the shell stays server-rendered and only these pay
// for hydration.
// ============================================================================

/**
 * Renders whichever of error/success is set.
 *
 * `role="alert"` matters beyond accessibility here: a sign-in failure replaces
 * no visible content, so without it a screen reader announces nothing at all
 * and the user is left wondering whether the button worked.
 */
export function AuthMessage({ state }: { state: AuthResult }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
      >
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p
        role="status"
        className="rounded-md border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
      >
        {state.success}
      </p>
    );
  }
  return null;
}

/**
 * Password input with a reveal toggle.
 *
 * `useFormStatus` rather than a prop for the disabled state — the button lives
 * inside the form, so it can read the pending status itself instead of every
 * page threading it down.
 */
export function PasswordField({
  id,
  name = id,
  label,
  autoComplete,
  placeholder = "••••••••",
  invalid,
}: {
  id: string;
  name?: string;
  label: React.ReactNode;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  invalid?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      {typeof label === "string" ? <Label htmlFor={id}>{label}</Label> : label}
      <div className="relative">
        <Lock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          placeholder={placeholder}
          className="px-9"
          aria-invalid={invalid ? "true" : "false"}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  className = "w-full",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className={className} disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
