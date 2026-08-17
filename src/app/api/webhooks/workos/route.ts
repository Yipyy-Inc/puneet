import { WorkOS } from "@workos-inc/node";
import type { NextRequest } from "next/server";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

// ============================================================================
// WorkOS → Postgres user sync. (Was api/webhooks/clerk; ADR 0004.)
//
// The third-party auth integration decides what a caller may READ; it does not
// copy anything. So a WorkOS user with no `profiles` row is a real person that
// RLS treats as a stranger — `profiles_read` matches nothing,
// `member_facility_ids()` returns empty, and every portal gate refuses them.
// This route is what stops that being permanent.
//
// WHY THE SERVICE ROLE. There is no session on a webhook — WorkOS's server calls
// us, not the user's browser — so an RLS-bound client would be `anon` and every
// write refused. This is the second legitimate use of that key in the codebase,
// and it is confined to this file for the same reason as the first.
//
// WHAT IT DELIBERATELY DOES NOT DO: create facility_memberships. Membership is a
// grant an admin makes, not a property of having signed up. A webhook that
// handed out tenancy would let anyone with a sign-up form join a facility.
//
// IDEMPOTENCY comes from the operations themselves — upsert on the primary key,
// delete by id — rather than from tracking the event id. WorkOS retries, and
// replaying either statement lands the same row in the same state, so there is
// nothing to deduplicate.
//
// THE RAW BODY IS VERIFIED, NOT THE PARSED ONE. `constructEvent` accepts either,
// but handing it an object means the SDK re-serialises to check the signature —
// and a key order or whitespace difference from what WorkOS signed makes a valid
// delivery look forged. Reading `request.text()` first removes that class of bug
// entirely. It also means nothing is parsed before it is trusted.
// ============================================================================

/** Clerk sent every address and named the primary; WorkOS sends one. */
function fullName(data: {
  firstName?: string | null;
  lastName?: string | null;
}): string | null {
  const name = `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim();
  return name === "" ? null : name;
}

export async function POST(request: NextRequest) {
  const secret = process.env.WORKOS_WEBHOOK_SECRET;
  const apiKey = process.env.WORKOS_API_KEY;

  if (!secret || !apiKey) {
    // 500, not 200: a 2xx tells WorkOS the event was handled and it will never
    // be retried, so a misconfigured environment would silently drop every user
    // that signed up during it. Failing loudly gets them replayed instead.
    console.error(
      "[workos-webhook] WORKOS_WEBHOOK_SECRET or WORKOS_API_KEY is not " +
        "configured; refusing to acknowledge an event that was not applied.",
    );
    return new Response("Not configured", { status: 500 });
  }

  // Verify FIRST, always. Without this the endpoint is an unauthenticated write
  // into `profiles` — anyone who learns the URL could mint an identity that RLS
  // then trusts, because RLS trusts whatever `profiles` says.
  let event;
  try {
    const payload = await request.text();
    const sigHeader = request.headers.get("workos-signature");
    if (!sigHeader) throw new Error("missing workos-signature header");

    event = await new WorkOS(apiKey).webhooks.constructEvent({
      payload,
      sigHeader,
      secret,
    });
  } catch (error) {
    console.error("[workos-webhook] signature verification failed:", error);
    return new Response("Verification failed", { status: 400 });
  }

  if (!hasServiceRoleKey()) {
    console.error(
      "[workos-webhook] SUPABASE_SERVICE_ROLE_KEY is not configured; " +
        "refusing to acknowledge an event that was not applied.",
    );
    return new Response("Not configured", { status: 500 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.event) {
      case "user.created":
      case "user.updated": {
        const data = event.data;
        const email = data.email;

        if (!email) {
          // profiles.email is NOT NULL. Acknowledge so WorkOS stops retrying
          // something that will never succeed on its own.
          console.warn(
            `[workos-webhook] ${event.event} for ${data.id} has no email; skipped.`,
          );
          return new Response("OK (no email)", { status: 200 });
        }

        // ── One address, one identity ──────────────────────────────────────
        // Two WorkOS environments (Staging and Production) share this Supabase
        // project, and each keeps its own user namespace. The same person
        // signing up in both yields two ids for one address — and grants hang
        // off profiles.id, so "what may this person do" would depend on which
        // environment minted their token. It happened once under Clerk; see
        // migration 20260806160000.
        //
        // Checked here AND enforced by profiles_email_lower_key, because the two
        // catch different things: this branch can name both ids in the log,
        // while the index catches what a check cannot — two deliveries racing,
        // and addresses that differ only in case.
        const { data: claimed, error: lookupError } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .limit(1);
        if (lookupError) throw lookupError;

        const owner = claimed?.[0]?.id;
        if (owner && owner !== data.id) {
          // 200, not 500. A retry cannot resolve this — the address is claimed
          // and will still be claimed next time — so a non-2xx would put WorkOS
          // into a redelivery loop that never ends. Acknowledging stops the
          // loop; the log is the part a human acts on.
          console.error(
            `[workos-webhook] ${event.event}: ${email} already belongs to ` +
              `${owner}; refusing a second identity for ${data.id}. ` +
              `Delete one of these users in WorkOS — keep the one the live ` +
              `environment knows.`,
          );
          return new Response("OK (address already claimed)", { status: 200 });
        }

        const { error } = await supabase.from("profiles").upsert(
          {
            id: data.id,
            email,
            full_name: fullName(data),
            avatar_url: data.profilePictureUrl ?? null,
          },
          { onConflict: "id" },
        );
        if (error) {
          // 23505 is unique_violation — profiles_email_lower_key. Same reasoning
          // as above: unreachable by retrying, so acknowledge rather than loop.
          if (error.code === "23505") {
            console.error(
              `[workos-webhook] ${event.event}: ${email} is already claimed by ` +
                `another identity; ${data.id} was not written.`,
            );
            return new Response("OK (address already claimed)", {
              status: 200,
            });
          }
          throw error;
        }
        break;
      }

      case "user.deleted": {
        if (!event.data.id) break;

        // facility_memberships cascades from profiles; clients.profile_id is
        // ON DELETE SET NULL, so a customer's booking history survives losing
        // its login rather than vanishing with it.
        //
        // rls-write-ok: this is the service-role client (see WHY THE SERVICE
        // ROLE above), so there is no policy that could refuse the delete and no
        // silent zero-row case to distinguish. The check that matters here is
        // the signature verification at the top, not RLS.
        const { error } = await supabase
          .from("profiles")
          .delete()
          .eq("id", event.data.id);
        if (error) throw error;
        break;
      }

      default:
        // Every other event type is acknowledged and ignored. Returning non-2xx
        // would make WorkOS retry events this route has no opinion about.
        break;
    }
  } catch (error) {
    console.error(`[workos-webhook] ${event.event} failed:`, error);
    return new Response("Sync failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
