import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import { writeFailure } from "@/lib/api/write-failure";
import {
  customServicesSchema,
  facilityResourcesSchema,
} from "@/lib/settings/custom-services";
import type { CustomServiceModule, FacilityResource } from "@/types/facility";
import type { Json } from "@/types/database";

// ============================================================================
// A platform admin gives a facility a custom service.
//
// Custom module creation is the platform's to do ("managed by your platform
// administrator", services/custom/create). The wizard that does it saved into
// the ADMIN's browser — localStorage, under `facilityId: NaN`, because the
// page read a uuid with Number(). It saves here now: into THAT facility's
// `custom_services` setting, the same row the facility's own screens read
// and edit (lib/settings/custom-services.ts).
//
//   GET    the facility's modules and resources, for the wizard to build on
//   POST   add one module (its slug must be new at that facility)
//
// Platform admins only: the facility is named in the URL, which is exactly
// what check:facility-from-session forbids for anybody else, and the
// facility_settings write policy admits a platform admin independently.
// ============================================================================

export const dynamic = "force-dynamic";

async function requirePlatformAdmin() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      {
        error:
          "Only a platform administrator may give a facility a custom service.",
      },
      { status: 403 },
    );
  }
  return null;
}

async function readLists(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  facilityId: string,
) {
  const { data, error } = await supabase
    .from("facility_settings")
    .select("domain, value")
    .eq("facility_id", facilityId)
    .in("domain", ["custom_services", "facility_resources"]);
  if (error) return { error };
  const byDomain = new Map(
    ((data ?? []) as { domain: string; value: unknown }[]).map((r) => [
      r.domain,
      r.value,
    ]),
  );
  const modules = customServicesSchema.safeParse(
    byDomain.get("custom_services"),
  );
  const resources = facilityResourcesSchema.safeParse(
    byDomain.get("facility_resources"),
  );
  return {
    modules: (modules.success
      ? modules.data.modules
      : []) as unknown as CustomServiceModule[],
    resources: (resources.success
      ? resources.data.resources
      : []) as unknown as FacilityResource[],
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const refused = await requirePlatformAdmin();
  if (refused) return refused;
  const { id } = await params;

  const supabase = await createServerClient();
  const lists = await readLists(supabase, id);
  if ("error" in lists) {
    return NextResponse.json({ error: lists.error?.message }, { status: 500 });
  }
  return NextResponse.json(lists);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const refused = await requirePlatformAdmin();
  if (refused) return refused;
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as {
    module?: CustomServiceModule;
  } | null;
  if (!body?.module) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }

  const supabase = await createServerClient();
  const { data: facility } = await supabase
    .from("facilities")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!facility) {
    return NextResponse.json({ error: "No such facility." }, { status: 404 });
  }

  const lists = await readLists(supabase, id);
  if ("error" in lists) {
    return NextResponse.json({ error: lists.error?.message }, { status: 500 });
  }
  if (lists.modules.some((m) => m.slug === body.module!.slug)) {
    return NextResponse.json(
      {
        error: `This facility already has a service at "${body.module.slug}".`,
      },
      { status: 409 },
    );
  }

  const next = customServicesSchema.safeParse({
    modules: [...lists.modules, body.module],
  });
  if (!next.success) {
    return NextResponse.json(
      { error: next.error.issues[0]?.message ?? "That service is not valid." },
      { status: 422 },
    );
  }

  const { error } = await supabase
    .from("facility_settings")
    // facility-from-request-ok: a platform admin, checked above, configuring
    // the facility named in the URL; RLS admits only a platform admin or that
    // facility's own admin.
    .upsert(
      {
        facility_id: id,
        domain: "custom_services",
        value: next.data as unknown as Json,
      },
      { onConflict: "facility_id,domain" },
    );
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to change this facility's services.",
      duplicate: "That service already exists.",
    });
  }

  return NextResponse.json({ module: body.module }, { status: 201 });
}
