"use client";

import { ArrowRight, Clock } from "lucide-react";
import { businessProfile } from "@/data/settings";
import { ROLE_META, type StaffProfile } from "@/types/facility-staff";
import type { OnboardingTemplate } from "@/data/staff-onboarding";
import { staffInviteCopy } from "@/lib/staff-invite-copy";

/**
 * Branded onboarding-invite email preview (mock — no real send). Renders the
 * facility name/logo, welcome message, role + start date, a "Complete your
 * onboarding →" link to /onboard/[token], and the expiry note. Shared by the
 * hire review screen and the resend dialog. Pass `token` to show the real link.
 */
export function OnboardingInviteEmail({
  staff,
  template,
  token,
}: {
  staff: StaffProfile;
  template?: OnboardingTemplate;
  token?: string;
}) {
  const facilityName = businessProfile.businessName;
  const firstName = staff.firstName || "there";
  const roleLabel = ROLE_META[staff.primaryRole]?.label ?? staff.primaryRole;
  const startDate = staff.employment.hireDate
    ? new Date(staff.employment.hireDate + "T00:00:00").toLocaleDateString(
        "en-US",
        { month: "long", day: "numeric", year: "numeric" },
      )
    : "—";
  // The words come from staff-invite-copy.ts, which the SENT email
  // (src/lib/staff-invite-email.ts) also imports — so this preview shows what
  // actually goes out rather than an approximation that drifts.
  const expiresInDays = template?.inviteExpiryDays ?? 7;
  const copy = staffInviteCopy({
    firstName,
    facilityName,
    roleLabel,
    startDate,
    welcomeMessage: template?.welcomeMessage,
    expiresInDays,
  });
  const welcome = copy.welcome;
  const link = token ? `/onboard/${token}` : "/onboard/…";

  return (
    <div className="overflow-hidden rounded-xl border bg-white text-slate-800 shadow-sm dark:bg-slate-950 dark:text-slate-200">
      {/* Branded header */}
      <div className="flex items-center gap-3 border-b bg-slate-50 px-5 py-3 dark:bg-slate-900">
        <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg bg-emerald-600 text-sm font-bold text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={businessProfile.logo}
            alt={facilityName}
            className="size-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement!.textContent = facilityName
                .charAt(0)
                .toUpperCase();
            }}
          />
        </div>
        <span className="font-semibold">{facilityName}</span>
      </div>

      {/* Body */}
      <div className="space-y-4 px-5 py-5 text-sm">
        <p className="text-lg font-semibold">{copy.heading}</p>
        <p className="text-slate-600 dark:text-slate-400">{welcome}</p>

        <dl className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 px-4 py-3 text-xs dark:bg-slate-900">
          <div>
            <dt className="text-slate-500">Role</dt>
            <dd className="font-medium">{roleLabel}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Start date</dt>
            <dd className="font-medium">{startDate}</dd>
          </div>
        </dl>

        <a
          href={link}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white no-underline hover:bg-emerald-700"
        >
          {copy.cta}
          <ArrowRight className="size-4" />
        </a>

        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="size-3.5" />
          {copy.expiry}
        </p>

        <p className="border-t pt-3 text-[11px] text-slate-400">
          {copy.footer}
        </p>
      </div>
    </div>
  );
}
