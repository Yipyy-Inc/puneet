"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { liveFormQueries } from "@/lib/api/forms-live";
import type { SubmissionRow, SubmissionStatus } from "@/lib/api/mappers/form";
import { submissionFlags } from "@/components/forms/submission-shape";
import {
  AlertCircle,
  AlertTriangle,
  FileText,
  Inbox,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

// ============================================================================
// The submissions inbox, from Postgres.
//
// ── THE STATUSES ARE THE DATABASE'S, NOT THE FIXTURE'S ────────────────────
//
// The fixture tracked unread/read/processed in a second "record" object beside
// the submission that only this screen knew about — so a form was "read" here
// and untouched everywhere else, and none of it survived a refresh.
// `form_submissions.status` is one column: submitted, reviewed, flagged,
// archived. Nothing marks a submission read merely by opening it, because
// nothing records who opened it.
//
// ── AND THE FLAGS COME FROM THE FROZEN VERSION ────────────────────────────
//
// `submissionFlags` reads the schema each row carries. The fixture computed the
// same flags against the form's CURRENT questions, so making a question
// required today retroactively marked every past submission incomplete.
// ============================================================================

const STATUS_OPTIONS: { value: SubmissionStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Awaiting review" },
  { value: "reviewed", label: "Reviewed" },
  { value: "flagged", label: "Flagged" },
  { value: "archived", label: "Archived" },
];

/** Format without a locale so server and client agree (avoids a hydration error). */
function formatSubmissionDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

function statusBadgeProps(status: SubmissionStatus): {
  className?: string;
  variant?: "outline" | "default" | "secondary" | "destructive";
} {
  switch (status) {
    case "submitted":
      return { className: "border-0 bg-blue-100 text-blue-800" };
    case "reviewed":
      return { className: "border-0 bg-green-100 text-green-800" };
    case "flagged":
      return { className: "border-0 bg-red-100 text-red-800" };
    case "archived":
      return { className: "bg-muted text-muted-foreground" };
    default:
      return { variant: "outline" };
  }
}

export default function SubmissionsInboxPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">(
    "all",
  );
  const [formIdFilter, setFormIdFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: forms } = useQuery(liveFormQueries.all());

  const { data, isPending, isError, error } = useQuery(
    liveFormQueries.submissions({
      status: statusFilter === "all" ? undefined : statusFilter,
      formId: formIdFilter === "all" ? undefined : formIdFilter,
      since: dateFrom || undefined,
      // A date with no time means the whole of that day.
      until: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
    }),
  );

  const list = useMemo<SubmissionRow[]>(
    () => data?.submissions ?? [],
    [data?.submissions],
  );

  const flags = useMemo(
    () => new Map(list.map((row) => [row.id, submissionFlags(row)])),
    [list],
  );

  const awaitingCount = list.filter((r) => r.status === "submitted").length;
  const reviewedCount = list.filter((r) => r.status === "reviewed").length;
  const alertCount = Array.from(flags.values()).filter(
    (f) => f.alertFlag,
  ).length;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <PageHeader
        title="Submissions inbox"
        description="Read what people answered, and file it under the right customer."
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <span className="text-muted-foreground">Total</span>
          <Badge variant="secondary">{list.length}</Badge>
        </div>
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <span className="size-2 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Awaiting review</span>
          <Badge className="border-0 bg-blue-100 text-blue-800">
            {awaitingCount}
          </Badge>
        </div>
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <span className="text-muted-foreground">Reviewed</span>
          <Badge className="border-0 bg-green-100 text-green-800">
            {reviewedCount}
          </Badge>
        </div>
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <span className="size-2 rounded-full bg-red-500" />
          <span className="text-muted-foreground">Alerts</span>
          <Badge className="border-0 bg-red-100 text-red-800">
            {alertCount}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as SubmissionStatus | "all")
              }
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Form</Label>
            <Select value={formIdFilter} onValueChange={setFormIdFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All forms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All forms</SelectItem>
                {(forms ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="submitted-from">From date</Label>
            <Input
              id="submitted-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[150px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="submitted-to">To date</Label>
            <Input
              id="submitted-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[150px]"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="size-4" />
            Submissions ({list.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.truncated && (
            <p className="mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertCircle className="size-4 shrink-0" />
              {/* Said out loud rather than left to be inferred: a list cut at an
                  arbitrary row invites the reader to conclude the rest do not
                  exist. */}
              Showing the most recent {list.length}. Narrow the date range to
              see earlier submissions.
            </p>
          )}

          {isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="mb-4 size-10 text-red-500 opacity-70" />
              <p>Could not load submissions.</p>
              <p className="mt-1 text-sm">
                {error instanceof Error ? error.message : "Please try again."}
              </p>
            </div>
          ) : list.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
              <Search className="mb-4 size-10 opacity-50" />
              <p>No submissions match your filters.</p>
              <p className="mt-1 text-sm">
                Submissions appear when a published form is filled in.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-3 text-left font-medium">
                      Submitted at
                    </th>
                    <th className="px-2 py-3 text-left font-medium">Form</th>
                    <th className="px-2 py-3 text-left font-medium">
                      Customer
                    </th>
                    <th className="px-2 py-3 text-left font-medium">Pet</th>
                    <th className="px-2 py-3 text-left font-medium">Status</th>
                    <th className="px-2 py-3 text-left font-medium">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => {
                    const flag = flags.get(row.id);
                    const awaiting = row.status === "submitted";
                    const badgeProps = statusBadgeProps(row.status);
                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-muted/50 cursor-pointer border-b ${awaiting ? "text-primary font-bold" : ""}`}
                        onClick={() =>
                          router.push(
                            `/facility/dashboard/forms/submissions/${row.id}`,
                          )
                        }
                      >
                        <td className="px-2 py-3 whitespace-nowrap">
                          {formatSubmissionDate(row.submittedAt)}
                        </td>
                        <td className="px-2 py-3">
                          {row.formName ?? "—"}
                          {row.versionNumber !== null && (
                            <span className="text-muted-foreground ml-1.5 text-xs">
                              v{row.versionNumber}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          {row.clientName ?? (
                            <span className="text-muted-foreground italic">
                              Not filed
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-3">{row.petName ?? "—"}</td>
                        <td className="px-2 py-3">
                          <Badge
                            variant={badgeProps.variant}
                            className={badgeProps.className}
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-1.5">
                            {flag?.hasFiles && (
                              <span
                                className="text-muted-foreground inline-flex items-center gap-0.5"
                                title="Has a file upload"
                              >
                                <FileText className="size-3.5" />
                              </span>
                            )}
                            {flag?.alertFlag && (
                              <span
                                className="inline-flex items-center text-red-600"
                                title="A logic rule flagged these answers"
                              >
                                <AlertTriangle className="size-3.5" />
                              </span>
                            )}
                            {(flag?.missingCount ?? 0) > 0 && (
                              <span
                                className="inline-flex items-center text-amber-600"
                                title={`${flag!.missingCount} required question(s) unanswered`}
                              >
                                <AlertCircle className="size-3.5" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
