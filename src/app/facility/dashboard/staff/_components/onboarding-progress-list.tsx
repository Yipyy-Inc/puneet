"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { ROLE_META, type StaffProfile } from "@/types/facility-staff";
import {
  useOnboardingInstance,
  onboardingProgress,
} from "@/data/staff-onboarding";
import { StaffAvatar, fullNameOf } from "./staff-shared";

/**
 * "Onboarding in progress" tab — every Invited / in-progress hire with a live
 * progress bar (derived from the onboarding instance sections), days-since-
 * invite, and a one-tap Remind. Reuses the same onRemind handler as the card.
 */
export function OnboardingProgressList({
  profiles,
  onRemind,
  onView,
}: {
  profiles: StaffProfile[];
  onRemind: (p: StaffProfile) => void;
  onView: (p: StaffProfile) => void;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  return (
    <div className="divide-y overflow-hidden rounded-xl border">
      {profiles.map((p) => (
        <OnboardingRow
          key={p.id}
          profile={p}
          now={now}
          onRemind={onRemind}
          onView={onView}
        />
      ))}
    </div>
  );
}

function OnboardingRow({
  profile,
  now,
  onRemind,
  onView,
}: {
  profile: StaffProfile;
  now: number | null;
  onRemind: (p: StaffProfile) => void;
  onView: (p: StaffProfile) => void;
}) {
  const instance = useOnboardingInstance(profile.id);
  const { done, total } = onboardingProgress(instance);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const pendingReview = Boolean(instance?.submittedAt) && !instance?.reviewedAt;
  const daysSince =
    now && instance?.invitedAt
      ? Math.max(
          0,
          Math.floor((now - new Date(instance.invitedAt).getTime()) / 86400000),
        )
      : null;

  return (
    <div className="hover:bg-muted/30 flex flex-wrap items-center gap-3 p-3">
      <StaffAvatar profile={profile} size="sm" />
      <button
        onClick={() => onView(profile)}
        className="min-w-0 flex-1 text-left"
      >
        <div className="truncate text-sm font-medium">
          {fullNameOf(profile)}
        </div>
        <div className="text-muted-foreground truncate text-xs">
          {ROLE_META[profile.primaryRole].label}
          {daysSince != null &&
            ` · invited ${daysSince === 0 ? "today" : `${daysSince}d ago`}`}
        </div>
      </button>

      <div className="w-40 shrink-0">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="font-medium">
            {pendingReview ? "Submitted" : `${done} of ${total} sections`}
          </span>
          <span className="text-muted-foreground">{pct}%</span>
        </div>
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => onRemind(profile)}
      >
        <Bell className="size-3.5" /> Remind
      </Button>
    </div>
  );
}
