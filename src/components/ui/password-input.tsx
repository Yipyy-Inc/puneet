"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ============================================================================
// A password field you can look at.
//
// ── WHY THIS IS A COMPONENT AND NOT A FLAG ON <Input> ─────────────────────
//
// There were four password fields across two forms — sign-in, the new password
// at the end of a reset, and sign-up — and the toggle had been implemented per
// field before, in the hand-rolled auth pages the Clerk cutover deleted
// (e46b9b3f). Each copy had its own icon offset and its own idea of the
// accessible name, which is how the customer login and the groomer login came
// to look subtly different at doing the same thing.
//
// ── THE BUTTON MUST NOT SUBMIT ────────────────────────────────────────────
//
// `type="button"`. Inside a <form>, a button with no type is `submit`, so
// revealing your password would post the form — on the sign-in screen that
// means an attempt with whatever is typed so far, and a wrong-credentials
// error for pressing an eye.
//
// It is also OUT of the tab order. Someone tabbing password -> submit should
// not land on a decoration in between; the toggle is for a pointer, and a
// keyboard user has the field itself.
//
// ── THE LABEL SAYS WHAT PRESSING IT WILL DO ───────────────────────────────
//
// "Show password" while hidden, "Hide password" while shown — the ACTION, not
// the state. A screen-reader user who hears "password, shown" has to work out
// what the button does; hearing "hide password" is the answer already.
//
// The type really does change between `password` and `text`, which is what
// password managers watch, so this stays compatible with them.
// ============================================================================

export function PasswordInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  const fallbackId = useId();
  const id = props.id ?? fallbackId;

  return (
    <div className="relative">
      <Input
        {...props}
        id={id}
        type={visible ? "text" : "password"}
        // Room for the button, so a long password does not run underneath it.
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((shown) => !shown)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-controls={id}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-3 -translate-y-1/2 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
