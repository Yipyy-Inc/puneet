import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import {
  activeAdminFacility,
  getFacilityContext,
} from "@/lib/api/facility-context";
import { createServerClient } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { facilityTerminals } from "@/lib/clover/devices";

// ============================================================================
// The terminals this facility can charge on.
//
// ── GET: a read, and a cheap one ──────────────────────────────────────────
//
// It lists the merchant's devices and joins the facility's own names onto them.
// It deliberately does NOT ask each device whether it is awake — that costs a
// round trip to the hardware and up to forty seconds when Cloud Pay Display is
// closed, which would make the picker unusable during exactly the rush it
// exists to help.
//
// Whether a terminal is free is answered when somebody charges on it, because
// that is both faster and more truthful: a device that was idle when the list
// was drawn may be mid-payment by the time it is chosen.
//
// ── PATCH: naming a terminal, which had a table and no writer ─────────────
//
// `public.facility_terminals` and `public.set_default_terminal` shipped in
// 20260808160000 and nothing in the application ever wrote either. So a
// facility with three identical "Flex 4"s could be told to distinguish them by
// a fourteen-character serial, and the default-terminal feature — the one that
// makes the ordinary checkout a single press — could not be turned on at all.
//
// The Yipyy Pay devices tab is the writer.
//
// ── AN UPSERT, BECAUSE CLOVER OWNS WHAT EXISTS ────────────────────────────
//
// A serial with no row is a perfectly usable terminal that simply has not been
// named yet, and that is the common case — every device starts that way. So
// naming one INSERTS or UPDATES on (facility_id, serial) rather than requiring
// the row to have been created by some earlier ceremony that does not exist.
// ============================================================================

export const dynamic = "force-dynamic";

/** Clover's own cap on the label column: `between 1 and 60`. */
const LABEL_MAX = 60;

export async function GET(request: NextRequest) {
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

  // The checkout picker wants only what can be pressed. The Yipyy Pay devices
  // tab wants everything, including what the facility retired, because that is
  // the only screen from which a retired terminal can be brought back — hiding
  // it there would make retiring one irreversible.
  const includeRetired =
    request.nextUrl.searchParams.get("includeRetired") === "1";

  const readiness = await facilityTerminals(context.facilityId);

  if (readiness.kind !== "terminals") {
    return NextResponse.json({ kind: readiness.kind, terminals: [] });
  }

  return NextResponse.json({
    kind: "terminals",
    terminals: readiness.terminals
      .filter((t) => t.serial && (includeRetired || t.isActive))
      .map((t) => ({
        serial: t.serial,
        label: t.label,
        model: t.name ?? t.model,
        isDefault: t.isDefault,
        isActive: t.isActive,
        supported: t.support !== "unsupported",
        support: t.support,
        locationId: t.locationId,
      })),
  });
}

interface PatchBody {
  /** Which device. The SERIAL, which is what addresses one at Clover. */
  serial?: unknown;
  /** Rename it. Absent leaves the name alone. */
  label?: unknown;
  /** Make it the one the counter reaches for without choosing. */
  isDefault?: unknown;
  /** Retire it, or bring it back. */
  isActive?: unknown;
  /** Which branch it's in. Absent leaves it alone; `null` clears it. */
  locationId?: string | null;
}

export async function PATCH(request: NextRequest) {
  // Admin ACCESS, from the session — never a facility named in the body. A
  // caller who could name the facility could rename another business's
  // terminals, and "Front desk" pointing at the wrong serial sends real card
  // requests to the wrong room. `check:facility-from-session` fails the build
  // on the other shape.
  const active = await activeAdminFacility();
  if (active.kind !== "resolved") {
    return NextResponse.json(
      {
        error:
          active.kind === "ambiguous"
            ? "You administer more than one facility. Open the one you mean at its own address."
            : "Only an owner or administrator can change a terminal.",
      },
      { status: 403 },
    );
  }
  const facilityId = active.facility.id;

  const body = (await request.json().catch(() => null)) as PatchBody | null;
  const serial = typeof body?.serial === "string" ? body.serial.trim() : "";
  if (!serial) {
    return NextResponse.json(
      { error: "Which terminal? A serial is required." },
      { status: 422 },
    );
  }

  // ── The label is always required, and that is not an oversight ─────────
  //
  // `facility_terminals.label` is NOT NULL with a CHECK of 1..60 characters, so
  // a row cannot be created without one — and most devices have no row yet,
  // because Clover owns the list and this table only decorates it. A caller who
  // merely wants to retire an unnamed terminal would therefore fail on a
  // constraint it never asked about.
  //
  // So the screen always sends the name it is currently displaying, which for
  // an unnamed device is its model. Nothing is invented: that string was
  // already on screen, and the facility can change it in the same dialog.
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  if (label.length === 0 || label.length > LABEL_MAX) {
    return NextResponse.json(
      { error: `A terminal name must be 1 to ${LABEL_MAX} characters.` },
      { status: 422 },
    );
  }

  const wantsDefault = body?.isDefault === true;
  const isActive = typeof body?.isActive === "boolean" ? body.isActive : true;

  // Absent means "leave it alone" (Retire, Make default and Bring back never
  // send this); `null` means "clear it". Distinguished from the key's own
  // presence, not its value, since both are valid states of `locationId`.
  const hasLocationId =
    body !== null && Object.prototype.hasOwnProperty.call(body, "locationId");
  const rawLocationId = body?.locationId;
  if (
    hasLocationId &&
    rawLocationId !== null &&
    typeof rawLocationId !== "string"
  ) {
    return NextResponse.json(
      { error: "That is not a location." },
      { status: 422 },
    );
  }
  const locationId = hasLocationId ? (rawLocationId ?? null) : undefined;

  const supabase = await createServerClient();

  // The FK alone would not stop a location belonging to another facility from
  // being written here — this is the check `check:facility-from-session`
  // exists to catch, done explicitly since there is no RLS on `locations`
  // that could refuse the value at the point it is merely used as an id.
  if (typeof locationId === "string") {
    const { data: location } = await supabase
      .from("locations")
      .select("facility_id")
      .eq("id", locationId)
      .maybeSingle();
    if (!location || location.facility_id !== facilityId) {
      return NextResponse.json(
        { error: "That location doesn't belong to this business." },
        { status: 422 },
      );
    }
  }

  // ── The row, created if this terminal has never been named ─────────────
  //
  // An upsert rather than update-then-insert: the pair races with itself when
  // two staff name the same device at once, and the unique index on
  // (facility_id, serial) would turn that into a 409 for whoever lost.
  //
  // `is_default` is NOT set here. The partial unique index refuses a second
  // default, so writing it inline would fail against whichever terminal
  // currently holds it — the RPC below clears the old one first, in one
  // transaction, which is the whole reason that function exists.
  //
  // `location_id` is only in this object when the caller actually sent it —
  // Supabase's upsert only touches columns present in the payload on
  // conflict, so an unrelated action (Retire, Make default) that never sends
  // it leaves whatever location was already set untouched.
  const upsertPayload: {
    facility_id: string;
    serial: string;
    label: string;
    is_active: boolean;
    location_id?: string | null;
  } = {
    facility_id: facilityId,
    serial,
    label,
    is_active: isActive,
  };
  if (locationId !== undefined) upsertPayload.location_id = locationId;

  const { data: written, error } = await supabase
    .from("facility_terminals")
    .upsert(upsertPayload, { onConflict: "facility_id,serial" })
    .select("id, serial, label, is_default, is_active, location_id");

  if (error) {
    return writeFailure(error, {
      duplicate: "That terminal is already named.",
      denied: "You do not have permission to change this facility's terminals.",
    });
  }

  // An upsert that RLS refused affects zero rows and answers success — the
  // exact shape `deniedIfUntouched` exists for. Without this the screen would
  // report "Renamed" over a terminal that still has its old name.
  const denied = deniedIfUntouched(
    written,
    "You do not have permission to change this facility's terminals.",
  );
  if (denied) return denied;

  const row = written![0]!;

  // ── And which one the counter defaults to ──────────────────────────────
  //
  // A function rather than two statements, because "clear the old default, set
  // the new one" is the pair that leaves a facility with none if the second
  // half fails — and the partial unique index refuses the naive order anyway.
  // SECURITY INVOKER, so `manage_settings` still decides.
  if (wantsDefault) {
    const { error: defaultError } = await supabase.rpc("set_default_terminal", {
      p_terminal_id: row.id,
    });
    if (defaultError) {
      return writeFailure(defaultError, {
        duplicate: "That terminal is already the default.",
        denied: "You do not have permission to set the default terminal.",
      });
    }
  }

  return NextResponse.json({
    serial: row.serial,
    label: row.label,
    isDefault: wantsDefault ? true : row.is_default,
    isActive: row.is_active,
    locationId: row.location_id,
  });
}
