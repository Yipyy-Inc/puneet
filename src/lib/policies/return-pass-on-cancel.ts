import "server-only";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

// ============================================================================
// What happens to the pass when the booking is cancelled.
//
// ── THE POLICY DECIDES, SO THE SERVER DOES IT ─────────────────────────────
//
// `charge: "forfeit_pass"` is the facility saying the pass IS the cancellation
// fee — so it is kept. Every other outcome means the visit is not happening
// and the customer keeps what they paid for, which is the pass back.
//
// Neither is the canceller's choice, so neither is done from a screen. It also
// could not be: `reverse_package_pass` runs as its caller and the ledger's
// insert policy wants `financial_take_payment`, which a customer never has and
// a receptionist with `edit_bookings` may not. Asking the user's own session to
// perform a consequence of the facility's policy would make the outcome depend
// on who happened to press cancel.
//
// ── IT NEVER FAILS THE CANCELLATION ───────────────────────────────────────
//
// The booking is already cancelled by the time this runs, and it must stay
// cancelled. A pass that could not be returned is reported, not thrown: the
// alternative is a customer whose booking is gone AND whose pass is gone
// because a later step failed.
//
// `reverse_package_pass` answers null for "that booking spent no pass" and for
// "one was already given back", and it counts redeemed against reversed, so
// calling it twice returns one pass, not two.
// ============================================================================

export interface PassOutcome {
  /** True when a pass was actually put back. */
  returned: boolean;
  /** Passes left in that pool afterwards, when one was returned. */
  passesLeft?: number;
  /** Why nothing was returned, for a log — never for a customer to read. */
  reason?: string;
}

type UntypedRpc = (
  fn: "reverse_package_pass",
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

/**
 * Give back the pass a cancelled booking spent, unless the facility's policy
 * forfeits it.
 *
 * `charge` is the winning tier's charge kind as the database computed it —
 * from `cancel_my_booking`'s own return, or from `booking_cancel_terms`. It is
 * never read off a form.
 */
export async function returnPassUnlessForfeited(
  bookingRef: number,
  charge: string | null | undefined,
): Promise<PassOutcome> {
  if (charge === "forfeit_pass") {
    return { returned: false, reason: "the policy keeps the pass as the fee" };
  }
  if (!hasServiceRoleKey()) {
    return { returned: false, reason: "no service-role key" };
  }

  const db = createAdminClient();
  const rpc = db.rpc.bind(db) as unknown as UntypedRpc;
  const { data, error } = await rpc("reverse_package_pass", {
    p_ref: bookingRef,
    p_note: "returned on cancellation",
  });

  if (error) return { returned: false, reason: error.message };
  if (data === null || data === undefined) {
    return { returned: false, reason: "no pass was spent on this booking" };
  }
  return { returned: true, passesLeft: Number(data) };
}
