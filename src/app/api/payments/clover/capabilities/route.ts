import { NextResponse } from "next/server";

import { activeAdminFacility } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { checkCapabilities } from "@/lib/clover/capabilities";

// ============================================================================
// What can this facility's merchant account actually do?
//
// ── WHY IT IS A POST ──────────────────────────────────────────────────────
//
// It talks to Clover five times and writes `scopes` back onto the connection.
// A GET that a browser may prefetch, a crawler may follow and a proxy may cache
// is the wrong verb for that, however read-only the answer looks.
//
// ── THE SAME GATE AS CONNECTING ───────────────────────────────────────────
//
// `activeAdminFacility()`, exactly as `/api/payments/clover/connect` uses —
// not a permission key, because there is no `settings_payments` permission in
// this codebase and inventing one here would create a second, quieter answer to
// "who administers the merchant account".
//
// It is access LEVEL rather than job title, for the reason connect records: a
// facility can promote a receptionist to admin access without handing them an
// owner's permission set, and such a person reaches the Yipyy Pay screen — so
// they must not meet a 403 from a button that screen shows them.
//
// The report names which permissions the app is missing and where to fix them,
// which is a configuration answer for whoever administers the account.
// ============================================================================

export const dynamic = "force-dynamic";

// No `request` parameter, and that is the documentation: nothing about which
// connection is examined may depend on what the caller sent.
export async function POST() {
  // Signed out is 401, not 403. `activeAdminFacility()` answers `none` for both
  // "not signed in" and "signs in but administers nothing", and collapsing them
  // tells somebody whose session has simply expired that they lack permission —
  // which sends them looking for an administrator instead of the sign-in page.
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const active = await activeAdminFacility();

  if (active.kind === "none") {
    return NextResponse.json(
      {
        error:
          "Only an owner or administrator of a facility may check a payment account.",
      },
      { status: 403 },
    );
  }

  // Somebody who administers two facilities has not said which one they mean,
  // and this writes `scopes` onto a connection — so it must not pick. Same
  // answer connect gives, for the same reason.
  if (active.kind === "ambiguous") {
    return NextResponse.json(
      {
        error:
          "You administer more than one facility. Open the one you want to " +
          "check at its own address first: " +
          active.choices.map((f) => f.name).join(", ") +
          ".",
        choices: active.choices,
      },
      { status: 409 },
    );
  }

  const report = await checkCapabilities(active.facility.id);
  return NextResponse.json(report);
}
