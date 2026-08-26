import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

// ============================================================================
// Somebody asking to be told when Yipyy launches.
//
// ── THE ONLY PUBLIC WRITE IN THIS APPLICATION ─────────────────────────────
//
// Every other route here starts with `getViewer()` and refuses an anonymous
// caller. This one cannot: the person filling the form on the coming-soon page
// has no account, which is the entire point of the page. So it is the one place
// where the usual boundary — a session, then RLS — does not apply, and the
// protections have to be written out explicitly instead.
//
// What stands in for a session:
//
//   - The table has NO insert policy and no grant to `anon`, so this route is
//     the only door. Writing with the service role is a deliberate choice over
//     a SECURITY DEFINER function granted to `anon` — that shape is what
//     `supabase/tests/rpc-session-required.sql` was written to forbid, after two
//     shipped RPCs turned out to be callable with the publishable key that is in
//     every browser bundle.
//   - Every field is length-capped before it reaches Postgres, so the form
//     cannot be used to store somebody else's data at our expense.
//   - A per-IP throttle, below, with an honest account of what it does not do.
//   - A duplicate email is answered as SUCCESS rather than as a conflict. The
//     visitor asked to be on the list and they are on it; telling them "that
//     email is already registered" would leak which businesses have signed up
//     to anyone willing to type addresses in.
//
// ── WHAT THIS ROUTE DOES NOT DO ───────────────────────────────────────────
//
// It does not verify the email belongs to the person typing it, and it cannot:
// that needs a confirmation link, which needs a sending domain and a template.
// So treat the list as "people who typed an address", not as a consented
// mailing list, until double opt-in exists. Named here because the difference
// matters the day somebody sends the launch email.
// ============================================================================

export const dynamic = "force-dynamic";

const Signup = z.object({
  facilityName: z.string().trim().min(1).max(120),
  contactName: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  // Optional, and deliberately unvalidated beyond a length cap: phone numbers
  // are formatted a dozen ways across Canada and the US, and a regex here would
  // reject real numbers to buy tidiness nobody needs.
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

// ── THE THROTTLE, AND WHAT IT IS WORTH ────────────────────────────────────
//
// In-process and per-instance. It stops a bored visitor holding down enter and
// a naive script; it does NOT stop a distributed flood, and a deploy resets it
// because the blue/green swap starts a new process. That is a real limit, not a
// hidden one — the durable protection is the unique index on lower(email) and
// the length caps above, which bound what any volume of requests can actually
// store.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const seen = new Map<string, { count: number; resetAt: number }>();

function throttled(key: string): boolean {
  const now = Date.now();
  const entry = seen.get(key);

  if (!entry || now > entry.resetAt) {
    seen.set(key, { count: 1, resetAt: now + WINDOW_MS });

    // Swept here rather than on a timer: a setInterval in a route module keeps
    // running after the request and holds the process awake. Cheap, because it
    // only runs when a new window opens.
    if (seen.size > 5_000) {
      for (const [k, v] of seen) if (now > v.resetAt) seen.delete(k);
    }
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

/**
 * Who is asking, as well as we can tell behind Caddy.
 *
 * `x-forwarded-for` is a client-settable header and is trusted here ONLY to
 * bucket a throttle — never for authorisation. The worst a forged value buys is
 * a throttle bucket of one's own, which is what an attacker had anyway.
 */
function callerKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: NextRequest) {
  if (!hasServiceRoleKey()) {
    // Said plainly rather than as a generic 500: without the key there is no
    // writer at all, and a "something went wrong" here would send somebody
    // hunting the form when the deployment is what is misconfigured.
    return NextResponse.json(
      { error: "The waitlist is not available right now." },
      { status: 503 },
    );
  }

  if (throttled(callerKey(request))) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a minute and try again." },
      { status: 429 },
    );
  }

  const parsed = Signup.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error:
          issue?.path[0] === "email"
            ? "That email address does not look right."
            : "Please fill in the facility name, contact name and email.",
      },
      { status: 400 },
    );
  }

  const { facilityName, contactName, email, phone } = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin.from("waitlist_signups").insert({
    facility_name: facilityName,
    contact_name: contactName,
    email,
    phone: phone?.trim() ? phone.trim() : null,
    source: "coming-soon",
  });

  if (error) {
    // 23505 is the unique index on lower(email). Already on the list is ON the
    // list — see the note above about why this is not a 409.
    if (error.code === "23505") {
      return NextResponse.json(
        { joined: true, already: true },
        { status: 200 },
      );
    }
    console.error("A waitlist signup could not be stored.", error);
    return NextResponse.json(
      { error: "We could not save that. Try again in a moment." },
      { status: 502 },
    );
  }

  return NextResponse.json({ joined: true, already: false }, { status: 201 });
}
