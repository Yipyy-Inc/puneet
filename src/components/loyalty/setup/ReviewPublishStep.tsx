"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Coins,
  Crown,
  Medal,
  Target,
  Users,
  ExternalLink,
  Save,
  PartyPopper,
} from "lucide-react";
import { LoyaltyPortalHeaderPreview } from "@/components/loyalty/LoyaltyPortalHeaderPreview";
import { summarizeEarnRule } from "@/lib/loyalty/earn-rule-summary";
import { badgeConditionText } from "@/lib/loyalty/badge-summary";
import { getFacilityCustomers } from "@/lib/loyalty/publish";
import type {
  EarnRule,
  Tier,
  Badge as BadgeModel,
  ReferralProgramConfig,
} from "@/types/loyalty";

function thresholdText(t: Tier): string {
  const v = t.thresholdValue.toLocaleString();
  if (t.thresholdType === "points") return `${v}+ pts`;
  if (t.thresholdType === "spend") return `$${v}+ spend`;
  return `${v}+ visits`;
}

function Section({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: typeof Coins;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-2 pt-5">
        <div className="flex items-center gap-2">
          <Icon className="text-primary size-4" />
          <span className="font-semibold">{title}</span>
          {count !== undefined && (
            <Badge variant="secondary" className="ml-auto">
              {count}
            </Badge>
          )}
        </div>
        <div className="text-sm">{children}</div>
      </CardContent>
    </Card>
  );
}

export function ReviewPublishStep({
  programName,
  tagline,
  primaryColor,
  programIcon,
  earnRules,
  tiers,
  tiersEnabled,
  badges,
  referralProgram,
  facilityId,
  onSaveDraft,
  onPublish,
  editMode,
  onSaveChanges,
}: {
  programName: string;
  tagline: string;
  primaryColor: string;
  programIcon: string;
  earnRules: EarnRule[];
  tiers: Tier[];
  tiersEnabled: boolean;
  badges: BadgeModel[];
  referralProgram?: ReferralProgramConfig;
  facilityId: number;
  onSaveDraft: () => void;
  onPublish: () => number;
  /** True when editing an already-live program (Manage Settings) — replaces the
   *  publish/notify flow with a plain "Save changes". */
  editMode?: boolean;
  onSaveChanges?: () => void;
}) {
  const [notifiedCount, setNotifiedCount] = useState<number | null>(null);
  const recipientCount = useMemo(
    () => getFacilityCustomers(facilityId).length,
    [facilityId],
  );

  const sortedTiers = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);
  const enabledBadges = badges.filter((b) => b.enabled !== false);
  const referralOn = referralProgram?.enabled === true;

  // --- Success screen ---
  if (notifiedCount !== null) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
            <PartyPopper className="size-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Your program is live! 🎉</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {programName || "Your rewards program"} is now visible on the
              customer portal.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm">
            <Users className="size-4 text-emerald-500" />
            <span className="font-semibold tabular-nums">{notifiedCount}</span>
            <span className="text-muted-foreground">
              customer{notifiedCount === 1 ? "" : "s"} notified
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Link href="/customer/rewards" target="_blank">
                Preview customer portal
                <ExternalLink className="ml-1.5 size-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/facility/dashboard/loyalty">
                Go to loyalty dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- Review screen ---
  return (
    <div className="space-y-5">
      <p className="text-muted-foreground text-sm">
        {editMode
          ? "Review your program below. Each step also saves independently from its own tab — Save changes persists everything at once."
          : "Review your program below. Save it as a draft to keep tweaking, or publish to make it live for customers right away."}
      </p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {/* Earning */}
          <Section icon={Coins} title="Earning" count={earnRules.length}>
            {earnRules.length === 0 ? (
              <p className="text-muted-foreground">No earn rules configured.</p>
            ) : (
              <ul className="space-y-1.5">
                {earnRules.map((r) => (
                  <li
                    key={r.id}
                    className={
                      r.enabled ? "" : "text-muted-foreground line-through"
                    }
                  >
                    • {summarizeEarnRule(r)}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Tiers */}
          <Section
            icon={Crown}
            title="Tiers"
            count={tiersEnabled ? sortedTiers.length : undefined}
          >
            {!tiersEnabled ? (
              <p className="text-muted-foreground">
                Tiers are off — all customers earn equally.
              </p>
            ) : sortedTiers.length === 0 ? (
              <p className="text-muted-foreground">No tiers configured.</p>
            ) : (
              <ul className="space-y-1">
                {sortedTiers.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <span aria-hidden="true">{t.icon || "⭐"}</span>
                    <span className="font-medium">{t.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {thresholdText(t)} · {t.benefits.length} benefit
                      {t.benefits.length === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Badges */}
          <Section icon={Medal} title="Badges" count={enabledBadges.length}>
            {enabledBadges.length === 0 ? (
              <p className="text-muted-foreground">No active badges.</p>
            ) : (
              <ul className="space-y-1">
                {enabledBadges.map((b) => (
                  <li key={b.id} className="flex items-center gap-2">
                    <span aria-hidden="true">{b.icon || "⭐"}</span>
                    <span className="font-medium">{b.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {badgeConditionText(
                        b,
                        b.criteria.tierId
                          ? tiers.find((t) => t.id === b.criteria.tierId)?.name
                          : undefined,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Referral */}
          <Section icon={Target} title="Referral program">
            {referralOn ? (
              <div className="space-y-0.5">
                <Badge className="border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Active
                </Badge>
                <p className="mt-1">
                  Referrer:{" "}
                  {referralProgram?.referrerReward.description ||
                    `${referralProgram?.referrerReward.value}`}
                </p>
                <p>
                  Referee:{" "}
                  {referralProgram?.refereeReward.description ||
                    `${referralProgram?.refereeReward.value}`}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Off — configure it any time from the Referrals tab.
              </p>
            )}
          </Section>
        </div>

        {/* Portal preview + notify info */}
        <div className="space-y-3">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Customer view
          </p>
          <LoyaltyPortalHeaderPreview
            programName={programName}
            tagline={tagline}
            primaryColor={primaryColor || "#6366F1"}
            programIcon={programIcon}
          />
          <div className="text-muted-foreground flex items-start gap-2 rounded-lg border p-3 text-xs">
            <Users className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="text-foreground font-semibold">
                {recipientCount}
              </span>{" "}
              existing customer{recipientCount === 1 ? "" : "s"} will get an
              in-app launch notification. New loyalty accounts are created when
              each customer next books.
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky bottom-0 -mx-6 flex flex-wrap items-center justify-end gap-2 border-t px-6 py-3 backdrop-blur-sm">
        {editMode ? (
          <>
            <Button variant="outline" asChild>
              <Link href="/facility/dashboard/loyalty">Done</Link>
            </Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={onSaveChanges}
            >
              <Save className="mr-1.5 size-4" /> Save changes
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onSaveDraft}>
              <Save className="mr-1.5 size-4" /> Save as draft
            </Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => {
                if (notifiedCount === null) setNotifiedCount(onPublish());
              }}
            >
              <CheckCircle2 className="mr-1.5 size-4" /> Publish program
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
