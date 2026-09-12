import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  NO_TRAINING_PATHWAYS,
  SHIPPED_TRAINING_DISCIPLINES,
  SHIPPED_TRAINING_MODULE_SETTINGS,
  trainingDisciplinesSchema,
  trainingModuleSettingsSchema,
  trainingPathwaysSchema,
} from "@/lib/settings/training-catalog";
import type { TrainingModuleSettings } from "@/lib/training-module-settings";
import type { TrainingPathway } from "@/data/training-pathways";
import type { TrainingDiscipline } from "@/types/training";

// ============================================================================
// The training a CUSTOMER is offered: the module's rules, the program
// journeys on their catalogue, and the disciplines those are filed under.
//
// ── WHY THIS IS NOT /api/facility/settings ────────────────────────────────
//
// That route resolves the facility from a staff MEMBERSHIP, which a customer
// does not have — so the customer portal was shown the shipped defaults
// whatever their facility had saved (see /api/customer/yipyy-go for the same
// seam). The facility comes through the CLIENT ROW here: RLS scopes `clients`
// to the caller's own record, and 20260912163211 put these three domains on
// the customer allowlist. There is no id in the request to get wrong.
//
// A row that fails its schema reads as the shipped value, as it does for
// staff: an unreadable pathway list is no pathways, not a broken catalogue.
// ============================================================================

export const dynamic = "force-dynamic";

const DOMAINS = [
  "training_module_settings",
  "training_pathways",
  "training_disciplines",
] as const;

export interface CustomerTrainingSettings {
  moduleSettings: TrainingModuleSettings;
  /** Active pathways only — a hidden one is kept for history, not shown. */
  pathways: TrainingPathway[];
  disciplines: TrainingDiscipline[];
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();

  const { data: client } = await supabase
    .from("clients")
    .select("facility_id")
    .limit(1)
    .maybeSingle();

  if (!client?.facility_id) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const { data: rows, error } = await supabase
    .from("facility_settings")
    .select("domain, value")
    .eq("facility_id", client.facility_id)
    .in("domain", [...DOMAINS]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const saved = new Map(
    ((rows ?? []) as { domain: string; value: unknown }[]).map((r) => [
      r.domain,
      r.value,
    ]),
  );

  const moduleSettings = trainingModuleSettingsSchema.safeParse(
    saved.get("training_module_settings"),
  );
  const pathways = trainingPathwaysSchema.safeParse(
    saved.get("training_pathways"),
  );
  const disciplines = trainingDisciplinesSchema.safeParse(
    saved.get("training_disciplines"),
  );

  const body: CustomerTrainingSettings = {
    // Over the shipped defaults, so a field added later has a value.
    moduleSettings: {
      ...SHIPPED_TRAINING_MODULE_SETTINGS,
      ...(moduleSettings.success
        ? (moduleSettings.data as unknown as Partial<TrainingModuleSettings>)
        : {}),
    },
    pathways: (pathways.success
      ? (pathways.data.pathways as TrainingPathway[])
      : NO_TRAINING_PATHWAYS.pathways
    ).filter((p) => p.isActive),
    disciplines: disciplines.success
      ? (disciplines.data.disciplines as TrainingDiscipline[])
      : SHIPPED_TRAINING_DISCIPLINES.disciplines,
  };

  return NextResponse.json(body);
}
