"use client";

import type { ReactNode, Ref } from "react";
import type { ZodError } from "zod";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ============================================================================
// The controls the application wizard is built from.
//
// ── ONE ERROR MODEL, SHARED WITH THE SERVER ───────────────────────────────
//
// Every step validates with the same Zod schema the route uses, and
// `fieldErrors` turns the failure into a map the inputs can read. So a message
// a facility sees under a field is the message the server would have sent, and
// there is no second list of copy to keep in step with the first.
//
// ── AND A SECRET IS NOT A FIELD ───────────────────────────────────────────
//
// `SecretField` is uncontrolled on purpose. A national identity number or a
// bank account number that lived in React state would be in the component tree,
// in devtools, and in whatever an error boundary dumps when something else
// breaks. It is read from the DOM once, at submit, and the input is cleared.
// Everything else on these screens is a normal controlled field.
// ============================================================================

export type FieldErrors = Record<string, string>;

/** First message per field, keyed by the top-level path segment. */
export function fieldErrors(error: ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export function Field({
  id,
  label,
  hint,
  error,
  optional,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {optional && (
          <span className="text-muted-foreground ml-1.5 text-xs font-normal">
            optional
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs/relaxed">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  optional,
  placeholder,
  type = "text",
  inputMode,
  maxLength,
  autoComplete,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email" | "url";
  maxLength?: number;
  autoComplete?: string;
  className?: string;
}) {
  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      className={className}
    >
      <Input
        id={id}
        type={type}
        value={value}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  hint,
  error,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  hint?: ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      className={className}
    >
      {/* `undefined`, never "" — a Radix SelectItem with an empty value throws,
          and an empty `value` prop is how the placeholder is asked for. */}
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={id} aria-invalid={error ? true : undefined}>
          <SelectValue placeholder={placeholder ?? "Choose one"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function TextAreaField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
  rows = 3,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: ReactNode;
  error?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      className={className}
    >
      <Textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

// ── Money ───────────────────────────────────────────────────────────────────

/** Dollars as typed, to cents. Anything unparseable is 0, never NaN. */
export function toCents(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, "");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

/** Cents, to what goes back in the box. Empty for nothing, not "0.00". */
export function fromCents(cents: number | undefined | null): string {
  if (cents === undefined || cents === null) return "";
  return (cents / 100).toFixed(2);
}

export function MoneyField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  className,
}: {
  id: string;
  label: string;
  /** The raw string being typed. Converted at save, not on every keystroke. */
  value: string;
  onChange: (next: string) => void;
  hint?: ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      className={className}
    >
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
          $
        </span>
        <Input
          id={id}
          value={value}
          inputMode="decimal"
          placeholder="0.00"
          aria-invalid={error ? true : undefined}
          className="pl-7 font-[tabular-nums]"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </Field>
  );
}

// ── The one that is deliberately uncontrolled ───────────────────────────────

export function SecretField({
  id,
  label,
  inputRef,
  hint,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  inputRef: Ref<HTMLInputElement>;
  hint?: ReactNode;
  error?: string;
  placeholder?: string;
}) {
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <Input
        id={id}
        // `password`, so it is not shoulder-read and not offered back by a
        // browser that thinks it recognises the field.
        type="password"
        ref={inputRef}
        defaultValue=""
        autoComplete="off"
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className="font-[tabular-nums]"
      />
    </Field>
  );
}

/** "•••• 4321", for a number that has already been stored. */
export function StoredLast4({ last4 }: { last4: string }) {
  return (
    <span className="font-[tabular-nums] text-sm">
      <span aria-hidden="true">•••• </span>
      <span className="sr-only">ending </span>
      {last4}
    </span>
  );
}
