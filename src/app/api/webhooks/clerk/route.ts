import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

// ============================================================================
// Clerk → Postgres user sync.
//
// The third-party auth integration decides what a caller may READ; it does not
// copy anything. Clerk's own docs say so outright: "This integration restricts
// what data authenticated users can access in the database, but does not
// synchronize user records." So a Clerk user with no `profiles` row is a real
// person that RLS treats as a stranger — `profiles_read` matches nothing,
// `member_facility_ids()` returns empty, and every portal gate refuses them.
// This route is what stops that being permanent.
//
// WHY THE SERVICE ROLE. There is no session on a webhook — Clerk's server calls
// us, not the user's browser — so an RLS-bound client would be `anon` and every
// write would be refused. This is the second legitimate use of that key in the
// codebase, and it is confined to this file for the same reason as the first.
//
// WHAT IT DELIBERATELY DOES NOT DO: create facility_memberships. Membership is
// a grant an admin makes, not a property of having signed up. A webhook that
// handed out tenancy would let anyone with a sign-up form join a facility.
//
// IDEMPOTENCY comes from the operations themselves — upsert on the primary key,
// delete by id — rather than from tracking `svix-id`. Svix retries on a fixed
// schedule and may deliver twice; replaying either statement lands the same row
// in the same state, so there is nothing to deduplicate.
// ============================================================================

/** Clerk sends every address; only the primary one belongs on the profile. */
function primaryEmail(data: {
  email_addresses?: { id: string; email_address: string }[];
  primary_email_address_id?: string | null;
}): string | null {
  const addresses = data.email_addresses ?? [];
  const primary =
    addresses.find((a) => a.id === data.primary_email_address_id) ??
    addresses[0];
  return primary?.email_address ?? null;
}

function fullName(data: {
  first_name?: string | null;
  last_name?: string | null;
}): string | null {
  const name = `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim();
  return name === "" ? null : name;
}

export async function POST(request: NextRequest) {
  // Verify FIRST, always. Without this the endpoint is an unauthenticated
  // write into `profiles` — anyone who learns the URL could mint an identity
  // that RLS then trusts, because RLS trusts whatever `profiles` says.
  let event;
  try {
    event = await verifyWebhook(request);
  } catch (error) {
    console.error("[clerk-webhook] signature verification failed:", error);
    return new Response("Verification failed", { status: 400 });
  }

  if (!hasServiceRoleKey()) {
    // 500, not 200: a 2xx tells Svix the event was handled and it will never be
    // retried, so a misconfigured environment would silently drop every user
    // that signed up during it. Failing loudly gets them replayed instead.
    console.error(
      "[clerk-webhook] SUPABASE_SERVICE_ROLE_KEY is not configured; " +
        "refusing to acknowledge an event that was not applied.",
    );
    return new Response("Not configured", { status: 500 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const email = primaryEmail(event.data);
        if (!email) {
          // profiles.email is NOT NULL. A Clerk account can exist without a
          // verified address (phone-only sign-up), and that is not an error —
          // it just cannot become a profile yet. Acknowledge so Svix stops
          // retrying something that will never succeed on its own.
          console.warn(
            `[clerk-webhook] ${event.type} for ${event.data.id} has no email; skipped.`,
          );
          return new Response("OK (no email)", { status: 200 });
        }

        // ── One address, one identity ──────────────────────────────────────
        // Two Clerk instances (Development and Production) share this Supabase
        // project, and each keeps its own user namespace. The same person
        // signing up in both yields two Clerk ids for one address — and grants
        // hang off profiles.id, so "what may this person do" would depend on
        // which instance minted their token. It has happened once already; see
        // migration 20260806160000.
        //
        // Checked here AND enforced by profiles_email_lower_key, because the
        // two catch different things: this branch can name both ids in the log,
        // while the index catches what a check cannot — two deliveries racing,
        // and addresses that differ only in case.
        const { data: claimed, error: lookupError } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .limit(1);
        if (lookupError) throw lookupError;

        const owner = claimed?.[0]?.id;
        if (owner && owner !== event.data.id) {
          // 200, not 500. A retry cannot resolve this — the address is claimed
          // and will still be claimed on the next delivery — so a non-2xx would
          // put Svix into a redelivery loop that never ends. Acknowledging stops
          // the loop; the log is the part a human acts on.
          console.error(
            `[clerk-webhook] ${event.type}: ${email} already belongs to ` +
              `${owner}; refusing a second identity for ${event.data.id}. ` +
              `Delete one of these accounts in Clerk — keep the one the live ` +
              `instance knows.`,
          );
          return new Response("OK (address already claimed)", { status: 200 });
        }

        const { error } = await supabase.from("profiles").upsert(
          {
            id: event.data.id,
            email,
            full_name: fullName(event.data),
            avatar_url: event.data.image_url ?? null,
          },
          { onConflict: "id" },
        );
        if (error) {
          // 23505 is unique_violation — profiles_email_lower_key. Same reasoning
          // as above: unreachable by retrying, so acknowledge rather than loop.
          // Without this branch the index would turn a duplicate signup into a
          // person with a Clerk account, no profile, and no way to be told why.
          if (error.code === "23505") {
            console.error(
              `[clerk-webhook] ${event.type}: ${email} is already claimed by ` +
                `another identity; ${event.data.id} was not written.`,
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
        // `id` is optional on a deletion payload.
        if (!event.data.id) break;

        // facility_memberships cascades from profiles; clients.profile_id is
        // ON DELETE SET NULL, so a customer's booking history survives losing
        // its login rather than vanishing with it.
        const { error } = await supabase
          .from("profiles")
          .delete()
          .eq("id", event.data.id);
        if (error) throw error;
        break;
      }

      default:
        // Every other event type is acknowledged and ignored. Returning non-2xx
        // would make Svix retry events this route has no opinion about.
        break;
    }
  } catch (error) {
    console.error(`[clerk-webhook] ${event.type} failed:`, error);
    return new Response("Sync failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
