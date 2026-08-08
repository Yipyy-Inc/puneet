import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { getFacilityContext } from "@/lib/api/facility-context";
import { facilityTerminals } from "@/lib/clover/devices";

// ============================================================================
// The terminals this facility can charge on, for the checkout dialog.
//
// A read, and a cheap one: it lists the merchant's devices and joins the
// facility's own names onto them. It deliberately does NOT ask each device
// whether it is awake — that costs a round trip to the hardware and up to
// fifteen seconds when Cloud Pay Display is closed, which would make the
// picker unusable during exactly the rush it exists to help.
//
// Whether a terminal is free is answered when somebody charges on it, because
// that is both faster and more truthful: a device that was idle when the list
// was drawn may be mid-payment by the time it is chosen.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility for this session." },
      { status: 403 },
    );
  }

  const readiness = await facilityTerminals(context.facilityId);

  if (readiness.kind !== "terminals") {
    return NextResponse.json({ kind: readiness.kind, terminals: [] });
  }

  return NextResponse.json({
    kind: "terminals",
    // Retired ones are omitted rather than shown greyed: a picker in a rush
    // should offer only what can be pressed.
    terminals: readiness.terminals
      .filter((t) => t.isActive && t.serial)
      .map((t) => ({
        serial: t.serial,
        label: t.label,
        model: t.name ?? t.model,
        isDefault: t.isDefault,
        supported: t.support !== "unsupported",
      })),
  });
}
