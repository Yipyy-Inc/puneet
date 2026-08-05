"use client";

import { useSession, useUser } from "@clerk/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";

// ============================================================================
// Diagnostic for the Clerk → Supabase third-party auth chain.
//
// Two probes, run side by side, because the contrast between them IS the proof:
//
//   profiles          policed by auth.uid()          → 22P02
//   clerk_tpa_check   policed by auth.jwt()->>'sub'  → works
//
// Same token, same request path, same database. The only difference is which
// function the policy calls. That isolates the remaining work to the RLS layer
// and rules out the token, the provider config and the client wiring.
//
// KEY BEHAVIOUR, worth keeping: auth.uid() against a Clerk `sub` RAISES 22P02
// rather than yielding NULL. An unmigrated table therefore fails loudly instead
// of silently returning zero rows, which is what makes the real migration safe
// to stage table by table.
//
// Delete this route, and drop public.clerk_tpa_check, once the migration lands.
// ============================================================================

type Probe = {
  status: "running" | "done";
  error: string | null;
  errorCode: string | null;
  rowCount: number | null;
};

const PENDING: Probe = {
  status: "running",
  error: null,
  errorCode: null,
  rowCount: null,
};

/** The token's payload, decoded for display only — never for authorisation. */
function decodeClaims(jwt: string): Record<string, unknown> | null {
  try {
    const payload = jwt.split(".")[1];
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export function ClerkSupabaseCheck() {
  const { isLoaded, user } = useUser();
  const { session } = useSession();
  const supabase = useClerkSupabaseClient();

  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);
  const [legacy, setLegacy] = useState<Probe>(PENDING);
  const [migrated, setMigrated] = useState<Probe>(PENDING);

  useEffect(() => {
    if (!isLoaded || !session) return;

    let cancelled = false;

    async function run() {
      const token = await session?.getToken();
      if (cancelled) return;
      setClaims(token ? decodeClaims(token) : null);

      // Unmigrated table — policies still call auth.uid().
      const legacyResult = await supabase.from("profiles").select("id");
      if (cancelled) return;
      setLegacy({
        status: "done",
        error: legacyResult.error?.message ?? null,
        errorCode: legacyResult.error?.code ?? null,
        rowCount: legacyResult.data?.length ?? null,
      });

      // Migrated table. Cast to the schema-agnostic client type because
      // clerk_tpa_check is scaffolding and deliberately absent from
      // src/types/database.ts — regenerating those types would clobber the
      // unrelated in-flight changes sitting in that file.
      const scaffold = supabase as unknown as SupabaseClient;

      // Insert first: proves the `user_id` default (auth.jwt()->>'sub') and the
      // WITH CHECK policy both accept the Clerk identity.
      const insert = await scaffold
        .from("clerk_tpa_check")
        .insert({ label: `probe from ${user?.id ?? "unknown"}` });
      if (cancelled) return;

      // Then read back: proves the USING policy matches the same identity.
      const read = await scaffold.from("clerk_tpa_check").select("id");
      if (cancelled) return;

      const failure = insert.error ?? read.error;
      setMigrated({
        status: "done",
        error: failure?.message ?? null,
        errorCode: failure?.code ?? null,
        rowCount: read.data?.length ?? null,
      });
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, session, supabase, user?.id]);

  if (!isLoaded) return <p className="text-muted-foreground">Loading Clerk…</p>;

  if (!user) {
    return (
      <p>
        Not signed in.{" "}
        <Link className="text-primary underline" href="/sign-in">
          Sign in
        </Link>{" "}
        first — the chain cannot be tested without a session token.
      </p>
    );
  }

  const tokenAccepted =
    (legacy.status === "done" && !legacy.error) || legacy.errorCode === "22P02";
  const rlsWorks = migrated.status === "done" && !migrated.error;

  return (
    <div className="space-y-6 text-sm">
      <Row label="Clerk user (sub)" value={user.id} />
      <Row label="role claim" value={String(claims?.role ?? "— MISSING —")} />
      <Row label="token issuer" value={String(claims?.iss ?? "—")} />

      <ProbeCard
        title="profiles — policed by auth.uid() (not migrated)"
        expectation="Expected to fail with 22P02. That failure is what proves the token got past auth and into Postgres."
        probe={legacy}
      />

      <ProbeCard
        title="clerk_tpa_check — policed by auth.jwt()->>'sub' (migrated)"
        expectation="Expected to succeed: insert, then read back exactly the rows belonging to this Clerk user."
        probe={migrated}
      />

      {legacy.status === "done" && migrated.status === "done" && (
        <div className="space-y-2">
          <Verdict
            ok={tokenAccepted}
            okText="Supabase ACCEPTS the Clerk token — verified, role claim present, request reached Postgres."
            badText={`Supabase rejected the token before Postgres. Check the TPA provider domain and that Clerk's Supabase integration is Enabled. ${legacy.error ?? ""}`}
          />
          <Verdict
            ok={rlsWorks}
            okText="RLS with auth.jwt()->>'sub' WORKS — the Clerk pattern is proven against this database. The remaining work is applying it to the real tables."
            badText={`The migrated-pattern table failed: ${migrated.error ?? "unknown"}`}
          />
        </div>
      )}
    </div>
  );
}

function Verdict({
  ok,
  okText,
  badText,
}: {
  ok: boolean;
  okText: string;
  badText: string;
}) {
  return (
    <p
      data-ok={ok}
      className="rounded-md border p-4 font-medium data-[ok=false]:border-red-600 data-[ok=false]:text-red-700 data-[ok=true]:border-emerald-600 data-[ok=true]:text-emerald-700"
    >
      {ok ? `PASS — ${okText}` : `FAIL — ${badText}`}
    </p>
  );
}

function ProbeCard({
  title,
  expectation,
  probe,
}: {
  title: string;
  expectation: string;
  probe: Probe;
}) {
  return (
    <div className="rounded-md border p-4">
      <p className="font-semibold">{title}</p>
      <p className="text-muted-foreground mb-3 text-xs">{expectation}</p>
      {probe.status === "running" ? (
        <p>Running…</p>
      ) : (
        <>
          <Row label="error" value={probe.error ?? "none"} />
          <Row label="error code" value={probe.errorCode ?? "—"} />
          <Row label="rows returned" value={String(probe.rowCount ?? "—")} />
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-muted-foreground w-40 shrink-0">{label}</span>
      <code className="break-all">{value}</code>
    </div>
  );
}
