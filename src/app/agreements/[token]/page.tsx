import { createServerClient } from "@/lib/supabase/server";

import {
  AgreementsSigner,
  type AgreementLink,
} from "./_components/agreements-signer";

// ============================================================================
// The agreements a client signs from a link staff sent them (the booking
// wizard, 2026-10-02) — no account, no sign-in.
//
// A SERVER COMPONENT that asks `agreement_link_by_token` (20261002123123)
// once and hands the answer down: the facility, the client's first name and
// each agreement with whether it is signed. Null — unknown, expired, a typo —
// is one "this link is not valid" page, whatever the reason.
// ============================================================================

export const dynamic = "force-dynamic";

function linkOf(data: unknown): AgreementLink | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.facilityName !== "string" || !Array.isArray(d.agreements)) {
    return null;
  }
  return {
    facilityName: d.facilityName,
    clientFirstName:
      typeof d.clientFirstName === "string" ? d.clientFirstName : "",
    locale: typeof d.locale === "string" ? d.locale : "en",
    expiresAt: typeof d.expiresAt === "string" ? d.expiresAt : null,
    agreements: d.agreements.flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const a = raw as Record<string, unknown>;
      if (typeof a.id !== "string" || typeof a.name !== "string") return [];
      return [
        {
          id: a.id,
          name: a.name,
          body: typeof a.body === "string" ? a.body : "",
          blocks: Array.isArray(a.blocks) ? a.blocks : [],
          requiresDigitalSignature: a.requiresDigitalSignature === true,
          requiresWitness: a.requiresWitness === true,
          signed: a.signed === true,
        },
      ];
    }),
  };
}

export default async function AgreementsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createServerClient();
  const { data } = await supabase.rpc("agreement_link_by_token", {
    p_token: token,
  });
  return <AgreementsSigner token={token} link={linkOf(data)} />;
}
