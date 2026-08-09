import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import {
  cloverConfig,
  cloverWebhookUrl,
  defaultCloverEnvironment,
  type CloverEnvironment,
} from "@/lib/clover/config";

// ============================================================================
// What Clover configuration this deployment actually has — for the platform
// admin who is about to go live and needs to know what is missing.
//
// ── IT ANSWERS "IS IT SET", NEVER "WHAT IS IT" ─────────────────────────────
//
// Every credential here is a boolean. An App Secret is the credential that lets
// somebody charge cards, so it does not travel to a browser to be masked with
// bullets on arrival — masking is a decision made after the secret has already
// been sent. The screen that renders this cannot leak what it was never given.
//
// This replaces a form that took an App Secret and wrote it to localStorage in
// plaintext. Nothing server-side ever read it: the real credentials are
// environment variables, because they belong to the deployment rather than to
// whoever happened to be signed in.
//
// ── AND IT ONLY REPORTS ────────────────────────────────────────────────────
//
// There is no PATCH. Credentials are set where they are deployed, so a screen
// that appeared to edit them would be describing an operation that cannot
// happen — which is the defect this endpoint exists to remove, not one to
// reintroduce in the other direction.
// ============================================================================

export const dynamic = "force-dynamic";

const ESTATES: CloverEnvironment[] = ["sandbox", "production"];

export async function GET() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Only a platform administrator may read this." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();

  // Which facilities are live, per estate. `status` matters as much as the
  // count: a connection in `error` is a facility that cannot take a card right
  // now, and that is the number worth surfacing on a going-live screen.
  const { data: connections } = await supabase
    .from("payment_connections")
    .select("environment, status")
    .eq("processor", "clover");

  const rows = connections ?? [];

  return NextResponse.json({
    defaultEnvironment: defaultCloverEnvironment(),
    webhookUrl: cloverWebhookUrl(),
    // Clover does not sign its deliveries — it repeats a static header value —
    // so this is the shared secret /api/webhooks/clover compares against.
    // UNSET LEAVES THE VERIFICATION HANDSHAKE OPEN, deliberately and only until
    // it is set, which is why "not configured" is worth showing loudly.
    webhookAuthConfigured: Boolean(
      process.env.CLOVER_WEBHOOK_SIGNING_SECRET?.trim(),
    ),
    estates: ESTATES.map((environment) => {
      const config = cloverConfig(environment);
      const estateRows = rows.filter((r) => r.environment === environment);
      return {
        environment,
        // cloverConfig returns null unless BOTH an app id and a secret resolve
        // for this estate specifically — production never inherits a sandbox
        // secret, so "configured" here means genuinely usable.
        configured: config !== null,
        // Card-PRESENT payments are gated on this separately: every
        // /connect/v1/* call answers 401 without it, while online payments
        // carry on working. So a deployment can be configured and still have no
        // terminals, and that difference has to be visible.
        terminalsEnabled: Boolean(config?.remoteApplicationId),
        connectedFacilities: estateRows.length,
        facilitiesInError: estateRows.filter((r) => r.status === "error")
          .length,
      };
    }),
  });
}
