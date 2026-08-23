"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, UserCheck } from "lucide-react";
import { clientQueries } from "@/lib/api/client";
import { useReviewSubmission } from "@/lib/api/forms-live";
import type { SubmissionRow } from "@/lib/api/mappers/form";

// ============================================================================
// Filing an unattached submission under a customer.
//
// ── ONE WAY, AND THE DATABASE IS WHAT SAYS SO ─────────────────────────────
//
// Staff capture a form at the counter before the person has a record, so a
// submission can arrive with no customer at all. Those answers have to be
// fileable or they are landfill — but a submission that already names somebody
// must not be moved onto somebody else, or "mark as reviewed" becomes a way to
// quietly reassign what a person said.
//
// So this panel offers the picker only when there is nobody to displace. That
// is not politeness: `private.submitted_answers_are_final` refuses the second
// write (20260823500000), and the trigger also asks for `edit_clients` — the
// front desk marks a form read with `view_client_documents`, but deciding whose
// file the answers belong in is a change to a client record.
//
// The suggestion list is a convenience, not a decision. It matches on the email
// and phone that appear in the answers; a member of staff still picks.
// ============================================================================

function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

/** The first answer that looks like an email, and the first that looks like a phone. */
function contactFromAnswers(answers: Record<string, unknown>): {
  email: string;
  phone: string;
} {
  let email = "";
  let phone = "";
  for (const value of Object.values(answers)) {
    if (typeof value !== "string") continue;
    if (!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      email = value.trim().toLowerCase();
    }
    if (!phone && digitsOf(value).length >= 10) phone = digitsOf(value);
  }
  return { email, phone };
}

export function FileUnderCustomer({
  submission,
}: {
  submission: SubmissionRow;
}) {
  const [search, setSearch] = useState("");
  const file = useReviewSubmission();

  const attached = submission.clientId !== null;
  const { data: clients } = useQuery({
    ...clientQueries.all(),
    enabled: !attached,
  });

  const { email, phone } = useMemo(
    () => contactFromAnswers(submission.answers),
    [submission.answers],
  );

  const matches = useMemo(() => {
    const all = clients ?? [];
    const query = search.trim().toLowerCase();

    if (query) {
      return all
        .filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            c.email.toLowerCase().includes(query) ||
            digitsOf(c.phone ?? "").includes(digitsOf(query)),
        )
        .slice(0, 6);
    }

    // No search yet: whoever the answers point at, if anyone.
    return all
      .filter(
        (c) =>
          (email && c.email.toLowerCase() === email) ||
          (phone && digitsOf(c.phone ?? "") === phone),
      )
      .slice(0, 6);
  }, [clients, search, email, phone]);

  if (attached) {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            <UserCheck className="size-4 text-green-700" />
            {submission.clientName ?? "Filed"}
          </p>
          {submission.petName && (
            <p className="text-muted-foreground text-sm">
              Pet: {submission.petName}
            </p>
          )}
        </div>
        {submission.clientRef !== null && (
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/facility/dashboard/clients/${submission.clientRef}`}>
              Open customer file
            </Link>
          </Button>
        )}
        <p className="text-muted-foreground flex items-start gap-2 text-xs">
          <Lock className="mt-0.5 size-3 shrink-0" />
          Filed answers stay where they are. Moving them to another customer is
          refused, so nobody can reassign what a person said.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        These answers are not filed under anybody yet.
      </p>

      <div className="space-y-2">
        <Label htmlFor="customer-search">Find a customer</Label>
        <Input
          id="customer-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            email || phone ? "Search by name, email or phone" : "Search by name"
          }
        />
      </div>

      {matches.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {search.trim()
            ? "No customer matches that."
            : "Search for the customer these answers belong to."}
        </p>
      ) : (
        <ul className="space-y-2">
          {matches.map((client) => (
            <li
              key={client.id}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{client.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {client.email}
                </p>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={file.isPending}
                onClick={() =>
                  file.mutate(
                    { id: submission.id, clientRef: client.id },
                    {
                      onSuccess: () =>
                        toast.success(`Filed under ${client.name}`),
                      onError: (err) =>
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "Could not file these answers.",
                        ),
                    },
                  )
                }
              >
                File
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-muted-foreground flex items-start gap-2 text-xs">
        <Lock className="mt-0.5 size-3 shrink-0" />
        This can only be done once. Once filed, the answers cannot be moved to a
        different customer.
      </p>
    </div>
  );
}
