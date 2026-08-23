"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  FileText,
  Lock,
  ShieldAlert,
  Trash2,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useReviewApplication,
  type ReviewDocument,
} from "@/lib/api/merchant-review";
import { DOCUMENT_TYPES } from "@/lib/merchant-application/application";
import {
  REVIEW_STATUS_LABEL,
  REVIEW_STATUS_STYLE,
} from "@/lib/merchant-application/review";
import { cn } from "@/lib/utils";
import { DecisionPanel } from "./decision-panel";

// ============================================================================
// One application, read by the person who decides it.
//
// ── EVERYTHING THE FACILITY SENT, IN THE ORDER THEY SENT IT ───────────────
//
// Business, owners, banking, documents. Same order as the wizard, so a reviewer
// asking "what did they put in step 2" is not hunting. Nothing is summarised
// away: an application is refused over details, and a screen that abbreviated
// them would have the reviewer opening the database instead.
//
// ── AND THE ONE THING IT CANNOT SHOW, SAID OUT LOUD ───────────────────────
//
// The identity numbers and the bank account number are in Vault, and
// `read_boarding_secret` is granted to `service_role` alone with no permission
// check inside it — the grant IS the boundary, which is correct for a definer
// function and means no platform admin can reach the values from here. Nothing
// in `src/` calls it.
//
// So this screen decides an application; it cannot yet hand an acquirer the
// numbers. The panel below says so rather than leaving a reviewer to discover
// it at the moment they need them. Building the way through is a deliberate
// change with an audit trail designed for it, not a line added here.
// ============================================================================

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ApplicationReview({ id }: { id: string }) {
  const { data, isPending, error } = useReviewApplication(id);

  if (isPending) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-muted-foreground p-6 text-sm">
            {error instanceof Error
              ? error.message
              : "That application could not be loaded."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const application = data;

  return (
    <div className="space-y-6 p-6">
      <Link
        href="/dashboard/commercial/merchant-applications"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft className="size-4" />
        Back to the queue
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">
              {application.legalName ?? application.facilityName ?? "Unnamed"}
            </h1>
            <Badge
              variant="outline"
              className={REVIEW_STATUS_STYLE[application.status]}
            >
              {REVIEW_STATUS_LABEL[application.status] ?? application.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {application.facilityName ?? "—"}
            {application.tradingName
              ? ` · trading as ${application.tradingName}`
              : ""}
            {" · submitted "}
            {formatDate(application.submittedAt)}
          </p>
        </div>
        {application.facilitySlug && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/facilities?q=${application.facilitySlug}`}>
              Open the facility
              <ExternalLink className="size-3.5 opacity-70" />
            </Link>
          </Button>
        )}
      </header>

      {application.purgedAt && (
        <Card className="border-muted">
          <CardContent className="flex items-start gap-2.5 p-4 text-sm">
            <Trash2 className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <p className="text-muted-foreground leading-relaxed">
              The identity documents and stored numbers for this application
              were deleted on {formatDate(application.purgedAt)}, which is what
              happens once a merchant account is open. The business details
              below are what remains.
            </p>
          </CardContent>
        </Card>
      )}

      <DecisionPanel application={application} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="The business">
          <Row label="Legal name" value={application.legalName} />
          <Row label="Trading as" value={application.tradingName} />
          <Row label="Structure" value={application.businessStructure} />
          <Row label="Tax number" value={application.taxId} mono />
          <Row label="Registered" value={application.incorporatedOn} />
          <Row
            label="Address"
            value={[
              application.addressLine1,
              application.addressLine2,
              application.city,
              application.region,
              application.postalCode,
              application.country,
            ]
              .filter(Boolean)
              .join(", ")}
          />
          <Row label="Phone" value={application.businessPhone} />
          <Row label="Email" value={application.businessEmail} />
          <Row label="Website" value={application.website} />
        </Section>

        <Section title="Banking and volume">
          <Row label="Account name" value={application.bankAccountName} />
          <Row
            label="Account number"
            value={
              application.bankLast4 ? `•••• ${application.bankLast4}` : null
            }
            mono
          />
          <Row
            label="Card takings a month"
            value={money(application.estimatedMonthlyVolumeCents)}
            mono
          />
          <Row
            label="Average sale"
            value={money(application.averageTicketCents)}
            mono
          />
          <Row
            label="Largest sale"
            value={money(application.highestTicketCents)}
            mono
          />
          <Row
            label="Card not present"
            value={
              application.cardNotPresentPercent === null
                ? null
                : `${application.cardNotPresentPercent}%`
            }
            mono
          />
          <Row label="Refund policy" value={application.refundPolicy} />
        </Section>
      </div>

      <Section title={`Owners (${application.principals.length})`}>
        {application.principals.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nobody listed.</p>
        ) : (
          <ul className="space-y-4">
            {application.principals.map((principal) => (
              <li
                key={principal.id}
                className="flex flex-wrap items-start gap-4 rounded-lg border p-4"
              >
                <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
                  <UserRound className="size-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{principal.fullName}</p>
                    {principal.isControlPerson && (
                      <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                        Controls the business
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {principal.title} · {principal.ownershipPercent}% · born{" "}
                    {principal.dateOfBirth || "—"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {principal.email} · {principal.phone}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {[
                      principal.addressLine1,
                      principal.addressLine2,
                      principal.city,
                      principal.region,
                      principal.postalCode,
                      principal.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {principal.nationalIdLast4 ? (
                    <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                      <BadgeCheck className="size-3.5" />
                      Identity number held, ending {principal.nationalIdLast4}
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <ShieldAlert className="size-3.5" />
                      No identity number was given
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Documents (${application.documents.length})`}>
        {application.documents.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing uploaded.</p>
        ) : (
          <ul className="space-y-2">
            {application.documents.map((document) => (
              <DocumentRow
                key={document.id}
                document={document}
                ownerName={
                  application.principals.find(
                    (p) => p.id === document.principalId,
                  )?.fullName ?? null
                }
              />
            ))}
          </ul>
        )}
      </Section>

      <Section title="What they signed">
        <Row label="Name" value={application.signedName} />
        <Row label="When" value={formatDate(application.signedAt)} />
        {application.signedTerms && (
          <div className="text-muted-foreground mt-2 space-y-2 rounded-lg border p-4 text-sm/relaxed">
            {application.signedTerms.split("\n\n").map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        )}
      </Section>

      <SecretsNotice />
    </div>
  );
}

function DocumentRow({
  document,
  ownerName,
}: {
  document: ReviewDocument;
  ownerName: string | null;
}) {
  const label =
    DOCUMENT_TYPES.find((t) => t.value === document.docType)?.label ??
    document.docType;

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <FileText className="text-muted-foreground size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {label}
          {ownerName && (
            <span className="text-muted-foreground font-normal">
              {" "}
              — {ownerName}
            </span>
          )}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {document.fileName} · {formatSize(document.sizeBytes)} ·{" "}
          {formatDate(document.uploadedAt)}
        </p>
      </div>
      {document.purgedAt ? (
        <span className="text-muted-foreground text-xs">Deleted</span>
      ) : document.url ? (
        // A new tab, and never an <Image>: the URL is a signed storage link,
        // which next/image refuses outright — a trap this repo has already paid
        // for once on report cards.
        <Button asChild variant="outline" size="sm">
          <a href={document.url} target="_blank" rel="noreferrer noopener">
            Open
            <ExternalLink className="size-3.5 opacity-70" />
          </a>
        </Button>
      ) : (
        <span className="text-muted-foreground text-xs">Unavailable</span>
      )}
    </li>
  );
}

/**
 * The gap, stated where somebody hits it.
 *
 * A reviewer who gets to the point of typing this into an acquirer's form needs
 * numbers this screen does not have. Saying nothing would have them assume the
 * screen is broken; saying it here tells them the truth and what it would take.
 */
function SecretsNotice() {
  return (
    <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20">
      <CardContent className="flex items-start gap-2.5 p-5 text-sm">
        <Lock className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1.5 leading-relaxed">
          <p className="font-semibold">
            The identity and account numbers cannot be read from here.
          </p>
          <p className="text-muted-foreground">
            They are encrypted in Vault, and the function that decrypts them is
            granted to the service role alone — nothing in the application calls
            it, and no Yipyy account can. Only the last four digits above come
            back. Handing an acquirer the full numbers needs a route built for
            it, with a record of who read what and when; that does not exist
            yet, and this note is here rather than a button that pretends
            otherwise.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <p className="font-semibold">{title}</p>
        {children}
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1 py-1 sm:grid-cols-[11rem_1fr]">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className={cn("text-sm", mono && "font-[tabular-nums]")}>
        {value || "—"}
      </span>
    </div>
  );
}
