"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Auth server actions — email + password.
//
// Server Actions rather than client-side supabase.auth calls, so the session
// cookie is set by the server on a real response. A browser-side sign-in cannot
// write an httpOnly cookie, which is what every Server Component read depends
// on.
//
// Every action returns a plain `{ error }` shape rather than throwing, because
// these are consumed by form state on pages that must re-render with a message
// rather than hit an error boundary.
// ============================================================================

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

// Sign-up is stricter than sign-in: on the way in we only need enough to look
// up an account, but on the way out we are choosing what a password may be.
const signUpSchema = credentialsSchema.extend({
  password: z
    .string()
    .min(12, "Use at least 12 characters.")
    .max(72, "Passwords are limited to 72 characters."),
  fullName: z.string().trim().min(1, "Enter your name.").max(120),
});

export type AuthResult = { error: string | null };

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the details and try again.";
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  // Deliberately not distinguishing "no such account" from "wrong password" —
  // that difference is an account-enumeration oracle.
  if (error) return { error: "Those details don't match an account." };

  return { error: null };
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    // Display fields only. Never authorisation data: user_metadata is
    // user-editable and surfaces in auth.jwt(). Facility membership is granted
    // server-side, and reaches the token via the custom access token hook.
    options: { data: { full_name: parsed.data.fullName } },
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function signOut(): Promise<never> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(
  formData: FormData,
): Promise<AuthResult> {
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email() })
    .safeParse({ email: formData.get("email") });

  // Always report success, whether or not the address exists — the response
  // must not reveal which emails have accounts.
  if (!parsed.success) return { error: null };

  const supabase = await createServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/customer/auth/reset-password`,
  });

  return { error: null };
}
