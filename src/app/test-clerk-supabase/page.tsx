import type { Metadata } from "next";

import { ClerkSupabaseCheck } from "./ClerkSupabaseCheck";

export const metadata: Metadata = { title: "Clerk → Supabase check" };

// Server Component shell; the probe needs Clerk hooks so it lives in the client
// child. Scaffolding for the auth migration — delete with the route.
export default function TestClerkSupabasePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-xl font-semibold">Clerk → Supabase</h1>
      <p className="text-muted-foreground mb-8 text-sm">
        Verifies Supabase accepts a Clerk session token. Zero rows is a pass;
        only an error is a failure.
      </p>
      <ClerkSupabaseCheck />
    </div>
  );
}
