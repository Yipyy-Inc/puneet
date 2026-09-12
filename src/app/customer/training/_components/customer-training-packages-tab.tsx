"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, CircleCheck, Clock3, Package, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RouteState } from "@/components/ui/route-state";
import { Skeleton } from "@/components/ui/skeleton";
import { groomingQueries } from "@/lib/api/grooming";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatDateLong } from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";
import { NO_ITEMS } from "@/lib/no-items";
import {
  trainingPackageRows,
  type TrainingPackageRow,
} from "@/lib/training-owned-packages";
import { localToday } from "@/lib/vaccinations";

/** Where a customer buys a pack of sessions. */
const SHOP_HREF = "/customer/packages";

type CustomerText = ReturnType<typeof useCustomerText>;

/** The Packages tab on the customer's training page — each active package
 *  with training sessions on it, and how many are left.
 *
 *  ── WHAT CHANGED (2026-09-12) ────────────────────────────────────────────
 *
 *  It read `clientTrainingPackages`, a fixture that gave Alice two packages
 *  she never bought. It reads what the customer owns from
 *  /api/packages/owned now, keeping the training lines of active packages
 *  (`trainingPackageRows`, which the trainer's profile reads too). A package
 *  belongs to the household rather than to one dog, so it no longer names a
 *  dog. "Renew package" toasted that a renewal was coming and "your
 *  instructor was notified" — nobody was — and it is a link to the package
 *  shop now. "Your balance updates the moment a session is completed" is not
 *  said: completing a training session spends no pass. */
export function CustomerTrainingPackagesTab() {
  const text = useCustomerText("training");
  const { t } = text;
  const [todayISO] = useState(localToday);
  const { data, error, isPending } = useQuery(
    groomingQueries.customerPackages(),
  );

  if (error) {
    // §5d2's ladder: a panel that would not load takes `error`.
    return (
      <RouteState
        surface="card"
        className="min-h-0 p-0"
        pose="error"
        icon={CircleAlert}
        inkClassName="text-destructive"
        title={t("pkgLoadFailedTitle")}
        description={t("pkgLoadFailed")}
      />
    );
  }

  if (isPending) {
    return (
      <div className="space-y-3" aria-busy>
        <span className="sr-only">{t("pkgLoading")}</span>
        <Skeleton className="h-40 rounded-2xl motion-reduce:animate-none" />
      </div>
    );
  }

  const rows = trainingPackageRows(data ?? NO_ITEMS, todayISO);

  if (rows.length === 0) {
    // Never had data: training's pose is `idea` (§5d2), and an empty state's
    // one action is the screen's prominent control (§1).
    return (
      <RouteState
        surface="card"
        className="min-h-0 p-0"
        pose="idea"
        icon={Package}
        inkClassName="text-ink-secondary"
        title={t("pkgEmptyTitle")}
        description={t("pkgEmptyBody")}
        action={{ label: t("pkgBrowse"), icon: Package, href: SHOP_HREF }}
      />
    );
  }

  const remaining = rows.reduce((sum, row) => sum + row.remaining, 0);

  return (
    <div className="space-y-3">
      <p className="text-body-ink text-body">
        {rich(
          t(
            remaining === 1
              ? "trainingSessionsRemainingOne"
              : "trainingSessionsRemainingOther",
          ),
          {
            n: <span className="font-semibold tabular-nums">{remaining}</span>,
          },
        )}
      </p>
      <ul
        aria-label={t("pkgListLabel")}
        className="grid grid-cols-1 gap-3 lg:grid-cols-2"
      >
        {rows.map((row) => (
          <PackageItem key={row.id} row={row} text={text} />
        ))}
      </ul>
    </div>
  );
}

function PackageItem({
  row,
  text,
}: {
  row: TrainingPackageRow;
  text: CustomerText;
}) {
  const { t, fill, locale } = text;
  const purchased = fill("purchasedOn", {
    date: formatDateLong(row.purchasedAt, locale),
  });
  const dates = row.expiresAt
    ? `${purchased} · ${fill("expiresOn", { date: formatDateLong(row.expiresAt, locale) })}`
    : purchased;
  // The bar is the balance, so it empties as sessions are used.
  const leftPct = Math.round((row.remaining / Math.max(1, row.total)) * 100);
  const balance = fill("pkgRemaining", {
    remaining: row.remaining,
    total: row.total,
  });

  return (
    <li className="border-line bg-card shadow-card min-w-0 rounded-2xl border p-[22px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {/* The facility's own name for it, never translated (§5q). */}
          <h3 className="text-body-ink text-body-strong">{row.packageName}</h3>
          <p className="text-ink-tertiary text-meta mt-0.5">
            {t("pkgHousehold")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <BalanceChip row={row} t={t} />
          {row.expiringSoon && (
            <Badge variant="pending">
              <Clock3 aria-hidden />
              {t("expiringSoon")}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-body-ink text-section tabular-nums">
            {balance}
          </span>
          <span className="text-ink-tertiary text-meta">
            {t("sessionsLeft")}
          </span>
        </div>
        <Progress value={leftPct} aria-label={balance} />
        <p className="text-ink-tertiary text-meta">{dates}</p>
      </div>

      {(row.exhausted || row.lowBalance) && (
        <div className="border-line mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-body-ink text-body min-w-0">
            {t(row.exhausted ? "pkgOut" : "pkgLow")}
          </p>
          <Button asChild variant="outline">
            <Link href={SHOP_HREF}>
              <Plus aria-hidden />
              {t("pkgBuyMore")}
            </Link>
          </Button>
        </div>
      )}
    </li>
  );
}

/** §3: ink, glyph and word together. An empty package can book nothing
 *  (overdue ink); one session left needs attention (pending). */
function BalanceChip({
  row,
  t,
}: {
  row: TrainingPackageRow;
  t: CustomerText["t"];
}) {
  if (row.exhausted) {
    return (
      <Badge variant="overdue">
        <CircleAlert aria-hidden />
        {t("pkgOutChip")}
      </Badge>
    );
  }
  if (row.lowBalance) {
    return (
      <Badge variant="pending">
        <Clock3 aria-hidden />
        {t("pkgLowChip")}
      </Badge>
    );
  }
  return (
    <Badge variant="confirmed">
      <CircleCheck aria-hidden />
      {t("active")}
    </Badge>
  );
}
