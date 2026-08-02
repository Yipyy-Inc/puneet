"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createServerClient } from "@/lib/supabase/server";
import { landingPathForClaims, type ViewerMembership } from "@/lib/auth/viewer";
import type { AuthResult } from "@/lib/auth/form-state";

// ============================================================================
// Auth server actions — email + password.
//
// Server Actions rather than client-side supabase.auth calls, so the session
// cookie and any navigation land in the same response. A client-side sign-in
// followed by router.push can paint the destination before the cookie is
// readable, which looks exactly like "signed in, but everything is empty".
//
// Every action is shaped for `useActionState` — (prevState, formData) — which
// is also what lets the forms work before React hydrates: the browser posts to
// the action natively, so buttons are live on first paint.
//
// Results are a plain object rather than a throw, because these render back
// into the form rather than an error boundary.
// ============================================================================

// Sign-in only needs enough to look up an account. Anything that chooses a NEW
// password is held to the real policy — hence two schemas, not one.
const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

const newPasswordField = z
  .string()
  .min(12, "Use at least 12 characters.")
  // Supabase/bcrypt truncates past 72 bytes; rejecting is honest, silently
  // ignoring the tail is not.
  .max(72, "Passwords are limited to 72 characters.");

const credentialsSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password."),
});

const signUpSchema = z.object({
  email: emailField,
  password: newPasswordField,
  fullName: z.string().trim().min(1, "Enter your name.").max(120),
});

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the details and try again.";
}

function fail(message: string): AuthResult {
  return { error: message, success: null };
}

function succeed(message: string): AuthResult {
  return { error: null, success: message };
}

/**
 * Where to land after an action. Validated on the server rather than trusted
 * from the client: the page computes a suggestion, this decides. Anything that
 * could leave the origin — an absolute URL, a protocol-relative `//evil.com`,
 * a backslash that browsers normalise to a slash — falls back.
 */
function safeInternalPath(value: FormDataEntryValue | null, fallback: string) {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

/**
 * Absolute origin for links inside emails.
 *
 * Derived from the request rather than read from an env var alone, because a
 * missing NEXT_PUBLIC_APP_URL would otherwise produce a relative redirect that
 * Supabase silently rejects — and the failure surfaces as "the reset email
 * never works", days later, with nothing in the logs.
 *
 * Whatever this resolves to must also be listed under Authentication > URL
 * Configuration > Redirect URLs in the Supabase dashboard.
 */
async function appOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (configured) return configured;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// ── Sign in ────────────────────────────────────────────────────────────────

export async function signIn(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  // Deliberately not distinguishing "no such account" from "wrong password" —
  // that difference is an account-enumeration oracle. The one exception worth
  // making is an unconfirmed address, because the user cannot act on the
  // generic message and it reveals nothing they don't already know.
  if (error) {
    if (error.code === "email_not_confirmed") {
      return fail("Confirm your email address first — check your inbox.");
    }
    return fail("Those details don't match an account.");
  }

  // An explicit destination wins — it is how "you were sent here from X" works.
  const explicit = formData.get("redirectTo");
  if (typeof explicit === "string" && explicit.length > 0) {
    redirect(safeInternalPath(explicit, await landingForSession(supabase)));
  }

  redirect(await landingForSession(supabase));
}

/**
 * Which portal this session belongs in.
 *
 * Read from the freshly minted token rather than from `user.app_metadata` —
 * those are different things. The access token hook injects memberships into
 * the TOKEN; the stored user record only ever holds provider details, so
 * reading it here would send every staff member to the customer dashboard.
 */
async function landingForSession(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
): Promise<string> {
  const { data } = await supabase.auth.getClaims();
  const appMetadata = (data?.claims as { app_metadata?: unknown } | null)
    ?.app_metadata as
    | { is_platform_admin?: boolean; memberships?: unknown }
    | undefined;

  const memberships = Array.isArray(appMetadata?.memberships)
    ? (appMetadata.memberships as Array<Record<string, unknown>>).flatMap(
        (m): ViewerMembership[] =>
          typeof m?.facility_id === "string" && typeof m?.role === "string"
            ? [
                {
                  membershipId: String(m.membership_id ?? ""),
                  facilityId: m.facility_id,
                  role: m.role as ViewerMembership["role"],
                },
              ]
            : [],
      )
    : [];

  return landingPathForClaims(
    appMetadata?.is_platform_admin === true,
    memberships,
  );
}

// ── Sign up ────────────────────────────────────────────────────────────────

export async function signUp(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createServerClient();
  const next = safeInternalPath(
    formData.get("redirectTo"),
    "/customer/dashboard",
  );

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Display fields only. NEVER authorisation data: user_metadata is
      // user-editable and surfaces in auth.jwt(), so a role written here would
      // be a role the user can grant themselves. Facility membership is
      // granted server-side and reaches the token via the access token hook.
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${await appOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) return fail(error.message);

  // With email confirmation off, Supabase returns a live session and the user
  // is already signed in. With it on, session is null and a mail is sent.
  if (data.session) redirect(next);

  // Supabase deliberately returns a normal-looking response when the address
  // is already registered (it mails the existing account instead of erroring),
  // so this same message covers both cases. Do not "helpfully" detect the
  // difference — that rebuilds the enumeration oracle sign-in avoids.
  return succeed(
    "Check your email for a confirmation link to finish setting up your account.",
  );
}

export async function resendConfirmation(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = z.object({ email: emailField }).safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createServerClient();
  await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${await appOrigin()}/auth/callback`,
    },
  });

  // Unconditional success, same reasoning as password reset below.
  return succeed("If that address needs confirming, a new link is on its way.");
}

// ── Sign out ───────────────────────────────────────────────────────────────

/**
 * Ends the session AND clears the legacy identity cookies.
 *
 * Both halves matter. `user_role`, `facility_role` and `employee_staff_id`
 * still steer parts of the app, and while AUTH_ENFORCED is off `user_role`
 * alone is enough to get into a portal. Dropping the Supabase session but
 * leaving those behind would produce the worst possible outcome on a shared
 * machine: a logout that reports success and leaves the next person holding
 * the previous person's access.
 */
export async function signOut(): Promise<never> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  for (const name of ["user_role", "facility_role", "employee_staff_id"]) {
    cookieStore.delete(name);
  }

  redirect("/login");
}

// ── Password reset (forgotten — no session) ────────────────────────────────

export async function requestPasswordReset(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = z.object({ email: emailField }).safeParse({
    email: formData.get("email"),
  });

  // Report success whether or not the address parses or exists. The response
  // must not reveal which emails have accounts — including by failing faster
  // for ones that don't.
  if (!parsed.success) {
    return succeed(
      "If that address has an account, a reset link is on its way.",
    );
  }

  const supabase = await createServerClient();
  const next = safeInternalPath(
    formData.get("redirectTo"),
    "/customer/auth/reset-password",
  );

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    // Recovery links must land on the callback, not on the reset page. The
    // link carries a code that has to be exchanged for a session first;
    // pointing it straight at the form gives you a page with no session and a
    // "reset" button that cannot work.
    redirectTo: `${await appOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
  });

  return succeed("If that address has an account, a reset link is on its way.");
}

/**
 * Sets a new password using the recovery session established by the callback
 * route. There is no "current password" here by design — possession of the
 * emailed link IS the proof.
 */
export async function updatePassword(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = z
    .object({ password: newPasswordField, confirmPassword: z.string() })
    .refine((v) => v.password === v.confirmPassword, {
      message: "Both passwords must match.",
      path: ["confirmPassword"],
    })
    .safeParse({
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createServerClient();

  // Without a session the link was never exchanged, or it expired. Say so
  // plainly — this is the single most confusing failure in a reset flow.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail(
      "This reset link has expired or was already used. Request a new one.",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return fail(error.message);

  redirect(safeInternalPath(formData.get("redirectTo"), "/login?reset=1"));
}

// ── Password change (signed in — current password required) ────────────────

export async function changePassword(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = z
    .object({
      currentPassword: z.string().min(1, "Enter your current password."),
      password: newPasswordField,
      confirmPassword: z.string(),
    })
    .refine((v) => v.password === v.confirmPassword, {
      message: "Both new passwords must match.",
      path: ["confirmPassword"],
    })
    .refine((v) => v.password !== v.currentPassword, {
      message: "Choose a password different from your current one.",
      path: ["password"],
    })
    .safeParse({
      currentPassword: formData.get("currentPassword"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return fail("Sign in again to change your password.");

  // Supabase has no "verify this password" call, so re-authenticate with the
  // current one. Without this, anyone with a borrowed session — an unlocked
  // laptop, a stolen cookie — could set a new password and take the account
  // over permanently.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (reauthError) return fail("Your current password is incorrect.");

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return fail(error.message);

  return succeed("Your password has been changed.");
}
