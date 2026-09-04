"use client";

import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  Eye,
  Headphones,
  Info,
  Lock,
  Shield,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { platformTeamQueries } from "@/lib/api/platform-team";
import {
  PLATFORM_ROLE_BLURB,
  PLATFORM_ROLE_LABEL,
  type PlatformRole,
} from "@/lib/auth/platform-role";
import { PageHeader } from "@/components/ui/page-header";

// ============================================================================
// The platform roles, as Postgres defines them.
//
// ── WHAT THIS REPLACED, AND WHY IT HAD TO GO ──────────────────────────────
//
// Five role cards over `src/data/admin-users.ts` — Sales Team, Technical
// Support, Account Manager, Financial Auditor, System Administrator — each with
// an editable permission matrix, a Create Role button and a Duplicate button,
// all writing to localStorage.
//
// Every part of that was wrong, and in a way that compounded:
//
//   1. Those five roles do not exist. `public.platform_role` has FOUR values
//      and none of them share a name. The invite form's labels were mapped onto
//      the real four server-side, so picking "Sales Team" quietly produced a
//      `readonly` membership and this screen then showed permissions nobody
//      held.
//   2. The permissions were not editable, here or anywhere. There is no
//      platform permission table. What a platform role may do is written into
//      RLS policies and SQL function guards, and changing it means a migration.
//      A checkbox that clears and changes nothing is worse than no checkbox:
//      the facility-side role editor had exactly this bug, and it took a
//      dedicated e2e spec to stop it coming back (role-editor-writes.spec.ts).
//
// So this screen no longer offers to edit anything. It is a reference for a
// model that lives in the database, plus the one number it can honestly report
// — how many people hold each role — read from `platform_memberships`.
//
// ── THE UNCOMFORTABLE PART, STATED ON THE SCREEN ──────────────────────────
//
// Only `superadmin` is checked narrowly today. Every OTHER platform surface
// asks `private.is_platform_admin()`, which is satisfied by any membership at
// all — so support, billing and readonly currently differ from one another
// nowhere. That is a real gap, and the screen says so rather than implying a
// separation of duties the database does not enforce.
//
// The seven surfaces below are the complete set of superadmin-only checks in
// the schema (`grep has_platform_role supabase/migrations`). If one is added,
// add it here — a list that silently falls behind is how this screen started
// lying the first time.
// ============================================================================

const ROLE_ORDER: PlatformRole[] = [
  "superadmin",
  "support",
  "billing",
  "readonly",
];

const ROLE_ICON: Record<PlatformRole, React.ElementType> = {
  superadmin: Shield,
  support: Headphones,
  billing: DollarSign,
  readonly: Eye,
};

/** The complete set of superadmin-only checks in the schema. */
const SUPERADMIN_ONLY = [
  { action: "Delete a facility", where: "policy facilities_delete" },
  { action: "Delete an organisation", where: "policy orgs_delete" },
  {
    action: "Change a subscription status, including suspending a business",
    where: "set_subscription_status()",
  },
  { action: "Grant somebody a platform role", where: "grant_platform_role()" },
  {
    action: "Revoke somebody's platform role",
    where: "revoke_platform_role()",
  },
  {
    action: "Invite a new platform admin",
    where: "invite_platform_admin()",
  },
  {
    action: "Revoke a pending platform invitation",
    where: "revoke_platform_invitation()",
  },
];

export default function PlatformRolesPage() {
  const { data: team, isPending } = useQuery(platformTeamQueries.all());

  const holders = (role: PlatformRole) =>
    (team ?? []).filter((row) => row.role === role && row.status === "active")
      .length;

  const invited = (role: PlatformRole) =>
    (team ?? []).filter((row) => row.role === role && row.status === "invited")
      .length;

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      {/* The description keeps its <code> — it names a Postgres enum, and
          §5r's "some strings are not translatable" covers exactly this: an
          identifier is not prose. PageHeader takes a ReactNode for it. */}
      <PageHeader
        title="Platform roles"
        description={
          <>
            The four roles of{" "}
            <code className="bg-surface-inset rounded-sm px-1.5 py-0.5 text-xs">
              public.platform_role
            </code>
            , and who holds them
          </>
        }
      />

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
        <Lock className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-amber-800 dark:text-amber-300">
          <span className="font-medium">Read-only.</span> Platform roles are
          enum values in Postgres, and what each may do is written into
          row-level-security policies — there is nothing here to edit, and
          changing the model means a migration. Who holds a role is changed by
          inviting or revoking a member on the{" "}
          <span className="font-medium">Platform team</span> screen.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {ROLE_ORDER.map((role) => {
          const Icon = ROLE_ICON[role];
          const active = holders(role);
          const pending = invited(role);
          return (
            <Card key={role}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <Icon className="text-primary size-5" />
                  </div>
                  {role === "superadmin" && (
                    <Badge
                      variant="outline"
                      className="border-amber-600/40 text-[10px] text-amber-700 dark:text-amber-400"
                    >
                      Enforced
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-2 text-lg">
                  {PLATFORM_ROLE_LABEL[role]}
                </CardTitle>
                <CardDescription>{PLATFORM_ROLE_BLURB[role]}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  {isPending ? (
                    <Skeleton className="h-8 w-10" />
                  ) : (
                    <span className="text-2xl font-bold">{active}</span>
                  )}
                  <span className="text-muted-foreground text-xs">
                    {active === 1 ? "member" : "members"}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {pending > 0
                    ? `${pending} invitation${pending === 1 ? "" : "s"} pending`
                    : "No invitations pending"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="size-5" />
              What only a superadmin may do
            </CardTitle>
            <CardDescription>
              The complete set of checks in the schema that ask for a specific
              role rather than for membership
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {SUPERADMIN_ONLY.map((item) => (
                <li
                  key={item.where}
                  className="flex items-start justify-between gap-4 py-2.5"
                >
                  <span className="text-sm">{item.action}</span>
                  <code className="text-muted-foreground bg-muted shrink-0 rounded-sm px-1.5 py-0.5 text-[11px]">
                    {item.where}
                  </code>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="size-5" />
              What every platform member may do
            </CardTitle>
            <CardDescription>
              Everything else the console reaches
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Every other platform policy asks{" "}
              <code className="bg-muted rounded-sm px-1.5 py-0.5 text-xs">
                private.is_platform_admin()
              </code>{" "}
              — &ldquo;is this caller on the platform team&rdquo; — which any of
              the four roles satisfies.
            </p>
            <div className="flex items-start gap-2 rounded-lg border p-3">
              <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <p className="text-muted-foreground">
                So <span className="font-medium">support</span>,{" "}
                <span className="font-medium">billing</span> and{" "}
                <span className="font-medium">readonly</span> differ from one
                another nowhere today: all three reach the same surfaces. The
                distinction is recorded on the membership and ready to be
                enforced, but narrowing eighty-odd policies is a deliberate
                change made one policy at a time, not a side effect of a screen.
              </p>
            </div>
            <p className="text-muted-foreground">
              Until that happens, treat every invitation as granting broad
              access to customer data, and reserve{" "}
              <span className="font-medium">superadmin</span> for the people who
              should be able to suspend a business or delete one.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
