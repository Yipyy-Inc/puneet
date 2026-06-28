import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ShieldAlert } from "lucide-react";

import { roleDisplayNames, type AdminRole } from "@/data/admin-users";
import { decodeInviteToken } from "@/lib/invitation-token";

import { SetupForm } from "./_components/setup-form";

export const metadata: Metadata = {
  title: "Set up your account — Yipyy",
};

export default async function AdminSetupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = decodeInviteToken(token);

  return (
    <div className="from-muted/40 flex min-h-screen items-center justify-center bg-linear-to-br to-transparent p-4">
      <div className="bg-card w-full max-w-md overflow-hidden rounded-2xl border shadow-sm">
        <div className="bg-linear-to-br from-violet-600 to-fuchsia-500 px-7 py-6 text-white">
          <p className="text-lg font-bold tracking-tight">Yipyy</p>
          <p className="text-xs text-violet-100">Admin Console</p>
        </div>

        {payload ? (
          <SetupForm
            id={payload.id}
            name={payload.name}
            email={payload.email}
            roleLabel={
              roleDisplayNames[payload.role as AdminRole] ?? payload.role
            }
            department={payload.department}
            expiresAt={payload.expiresAt}
          />
        ) : (
          <div className="p-7 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/15">
              <ShieldAlert className="size-6" />
            </div>
            <h1 className="mt-4 text-lg font-semibold">
              This invitation link is invalid or has expired
            </h1>
            <p className="text-muted-foreground mt-1.5 flex items-center justify-center gap-1.5 text-sm">
              <Clock className="size-3.5" />
              Setup links are valid for 48 hours.
            </p>
            <p className="text-muted-foreground mt-3 text-sm">
              Ask an administrator to send you a new invitation from the Admin
              Users page.
            </p>
            <Link
              href="/dashboard/user-management"
              className="text-primary mt-5 inline-block text-sm font-medium hover:underline"
            >
              Go to Yipyy
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
