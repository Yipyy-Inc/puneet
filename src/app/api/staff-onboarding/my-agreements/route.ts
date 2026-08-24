import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";

// ============================================================================
// The agreements THIS person has been asked to sign, and which they have.
//
// ── WHY A ROUTE AND NOT A CLIENT QUERY ────────────────────────────────────
//
// Answering it needs three reads chained on each other — the caller's own staff
// row, the onboarding instance that names their template, then that template's
// document tasks — and the first one resolves from the SESSION's email. Doing
// that in the browser means shipping a staff id from the client and trusting
// it, which is the shape `check:facility-from-session` exists to stop.
//
// RLS still decides. `own_staff_ids()` admits the caller's own staff row and
// `staff_signatures_read` admits their own signatures, so this route adds no
// authority — it walks the chain, it does not widen it. Measured before
// writing: a groomer reads their own signature and their own template's task,
// and needed no policy change to do so.
//
// ── AN AGREEMENT WITH NO TEXT IS NOT OFFERED ──────────────────────────────
//
// `/api/staff-signatures` refuses to record a signature against a task whose
// `config.agreementText` is empty — correctly, because that row would look like
// proof and be none. So this route does not list those tasks either. Offering a
// Sign button whose only possible outcome is a 422 is a control that cannot
// work, which is worse than an absent one.
// ============================================================================

export const dynamic = "force-dynamic";

export interface MyAgreement {
  /** `onboarding_employee_tasks.id` — what POST /api/staff-signatures wants. */
  taskKey: string;
  name: string;
  description: string | null;
  required: boolean;
  /** The words, as the facility wrote them. */
  agreementText: string;
  /** Null until signed. */
  signedAt: string | null;
  signatureName: string | null;
}

export interface MyAgreementsPayload {
  /** The caller's own staff id, for the signing call. */
  staffId: string | null;
  agreements: MyAgreement[];
}

const EMPTY: MyAgreementsPayload = { staffId: null, agreements: [] };

export async function GET() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session" || !viewer.email) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();

  // Their own staff row. RLS admits it through private.own_staff_ids(), so no
  // facility filter is needed and none can return somebody else's.
  const { data: staff } = await supabase
    .from("staff")
    .select("id, legacy_id")
    .ilike("email", viewer.email)
    .maybeSingle();

  // Signed in without a staff record — a customer following a stale link. Not
  // an error: they simply have no agreements.
  if (!staff) return NextResponse.json(EMPTY);

  const staffRow = staff as { id: string; legacy_id: string | null };

  const { data: instance } = await supabase
    .from("onboarding_instances")
    .select("template_id")
    .eq("staff_id", staffRow.id)
    .maybeSingle();

  const templateId = (instance as { template_id: string | null } | null)
    ?.template_id;

  // Hired before onboarding templates existed, or never assigned one. Nothing
  // to sign is a real answer.
  if (!templateId) {
    return NextResponse.json({
      staffId: staffRow.legacy_id ?? staffRow.id,
      agreements: [],
    } satisfies MyAgreementsPayload);
  }

  const [{ data: tasks }, { data: signatures }] = await Promise.all([
    supabase
      .from("onboarding_employee_tasks")
      .select("id, name, description, required, config, position")
      .eq("template_id", templateId)
      .eq("task_type", "document_sign")
      .order("position"),
    supabase
      .from("staff_signatures")
      .select("task_key, signed_at, signature_name")
      .eq("staff_id", staffRow.id),
  ]);

  const signedByTask = new Map(
    (
      (signatures ?? []) as {
        task_key: string | null;
        signed_at: string;
        signature_name: string;
      }[]
    ).map((row) => [row.task_key ?? "", row]),
  );

  const agreements: MyAgreement[] = (
    (tasks ?? []) as {
      id: string;
      name: string;
      description: string | null;
      required: boolean;
      config: unknown;
    }[]
  )
    .map((task) => {
      const config = (task.config ?? {}) as { agreementText?: string };
      const agreementText = config.agreementText?.trim() ?? "";
      const signature = signedByTask.get(task.id);
      return {
        taskKey: task.id,
        name: task.name,
        description: task.description,
        required: task.required,
        agreementText,
        signedAt: signature?.signed_at ?? null,
        signatureName: signature?.signature_name ?? null,
      };
    })
    // See the header: a task with no words cannot be signed, so it is not
    // offered as though it could be.
    .filter((agreement) => agreement.agreementText.length > 0);

  return NextResponse.json({
    staffId: staffRow.legacy_id ?? staffRow.id,
    agreements,
  } satisfies MyAgreementsPayload);
}
