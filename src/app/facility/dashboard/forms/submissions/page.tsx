"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import {
  getSubmissionsWithRecords,
  submissionHasFiles,
  type SubmissionStatus,
  type SubmissionListFilters,
} from "@/data/form-submissions";
import {
  getFormById,
  getFormsByFacility,
  evaluateLogicRules,
} from "@/data/forms";
import { facilities } from "@/data/facilities";
import { clients } from "@/data/clients";
import {
  FileText,
  Inbox,
  Search,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";

const FACILITY_ID = 11;

const STATUS_OPTIONS: { value: SubmissionStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "processed", label: "Processed" },
  { value: "archived", label: "Archived" },
];

function getCustomerName(customerId?: number): string {
  if (customerId == null) return "—";
  const c = clients.find((x) => x.id === customerId);
  return c?.name ?? "—";
}

function getPetNames(petIds?: number[]): string {
  if (!petIds?.length) return "—";
  const names = petIds.map((id) => {
    const pet = clients.flatMap((c) => c.pets ?? []).find((p) => p.id === id);
    return pet?.name ?? `Pet #${id}`;
  });
  return names.join(", ");
}

/** Format date for display without locale so server and client match (avoids hydration error) */
function formatSubmissionDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

/** Get status badge styles (flat/pastel, no gradients) */
function statusBadgeProps(status: string): {
  className?: string;
  variant?: "outline" | "default" | "secondary" | "destructive";
} {
  switch (status) {
    case "unread":
      return { className: "bg-blue-100 text-blue-800 border-0" };
    case "read":
      return { variant: "outline" };
    case "processed":
      return { className: "bg-green-100 text-green-800 border-0" };
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
  const [locationFilter, setLocationFilter] = useState<string>("all");

  const facility = facilities.find((f) => f.id === FACILITY_ID);
  const locations = facility?.locationsList ?? [];

  const filters: SubmissionListFilters = useMemo(
    () => ({
      status: statusFilter,
      formId: formIdFilter === "all" ? undefined : formIdFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      locationId: locationFilter === "all" ? undefined : locationFilter,
    }),
    [statusFilter, formIdFilter, dateFrom, dateTo, locationFilter],
  );

  const list = useMemo(
    () => getSubmissionsWithRecords(FACILITY_ID, filters),
    [filters],
  );

  const forms = useMemo(() => getFormsByFacility(FACILITY_ID), []);

  // Pre-compute flags for each submission
  const submissionFlags = useMemo(() => {
    const flagMap = new Map<
      string,
      { alertFlag: boolean; missingCount: number }
    >();
    for (const { submission } of list) {
      const form = getFormById(submission.formId);
      let alertFlag = false;
      let missingCount = 0;

      // Red-alert flag detection via logic rules
      if (form?.logicRules?.length) {
        const effects = evaluateLogicRules(form.logicRules, submission.answers);
        alertFlag = effects.alertFlag;
      }

      // Missing required fields detection
      if (form?.questions) {
        const answers = submission.answers ?? {};
        const missingRequired = form.questions.filter(
          (q) =>
            q.required && (answers[q.id] === undefined || answers[q.id] === ""),
        );
        missingCount = missingRequired.length;
      }

      flagMap.set(submission.id, { alertFlag, missingCount });
    }
    return flagMap;
  }, [list]);

  // Summary stats
  const totalCount = list.length;
  const unreadCount = list.filter(
    ({ record }) => record.status === "unread",
  ).length;
  const processedCount = list.filter(
    ({ record }) => record.status === "processed",
  ).length;
  const alertCount = Array.from(submissionFlags.values()).filter(
    (f) => f.alertFlag,
  ).length;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Submissions Inbox</h2>
        <p className="text-muted-foreground">
          Process form submissions, match to customers and pets, or create new
          profiles.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <span className="text-muted-foreground">Total</span>
          <Badge variant="secondary">{totalCount}</Badge>
        </div>
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <span className="size-2 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Unread</span>
          <Badge className="border-0 bg-blue-100 text-blue-800">
            {unreadCount}
          </Badge>
        </div>
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <span className="text-muted-foreground">Processed</span>
          <Badge className="border-0 bg-green-100 text-green-800">
            {processedCount}
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

      {/* Filters */}
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
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                    {o.value === "unread" && unreadCount > 0
                      ? ` (${unreadCount})`
                      : ""}
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
                {forms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>From date</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[140px]"
            />
          </div>
          <div className="space-y-2">
            <Label>To date</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[140px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.name} value={loc.name}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="size-4" />
            Submissions ({list.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
              <Search className="mb-4 size-10 opacity-50" />
              <p>No submissions match your filters.</p>
              <p className="mt-1 text-sm">
                Submissions appear when forms are filled via shareable links.
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
                    <th className="px-2 py-3 text-left font-medium">Pet(s)</th>
                    <th className="px-2 py-3 text-left font-medium">Status</th>
                    <th className="px-2 py-3 text-left font-medium">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ submission, record }) => {
                    const form = getFormById(submission.formId);
                    const hasFiles = submissionHasFiles(submission.id);
                    const flags = submissionFlags.get(submission.id);
                    const isUnread = record.status === "unread";
                    const badgeProps = statusBadgeProps(record.status);
                    return (
                      <tr
                        key={submission.id}
                        className={`hover:bg-muted/50 cursor-pointer border-b ${isUnread ? `border-l-primary border-l-2 font-medium` : ""} `}
                        onClick={() =>
                          router.push(
                            `/facility/dashboard/forms/submissions/${submission.id}`,
                          )
                        }
                      >
                        <td className="px-2 py-3 whitespace-nowrap">
                          {formatSubmissionDate(submission.createdAt)}
                        </td>
                        <td className="px-2 py-3">
                          {form?.name ?? submission.formId}
                        </td>
                        <td className="px-2 py-3">
                          {getCustomerName(
                            submission.customerId ?? record.relatedCustomerId,
                          )}
                        </td>
                        <td className="px-2 py-3">
                          {getPetNames(
                            submission.petIds ??
                              (record.relatedPetId
                                ? [record.relatedPetId]
                                : undefined),
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <Badge
                            variant={badgeProps.variant}
                            className={badgeProps.className}
                          >
                            {record.status}
                          </Badge>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-1.5">
                            {hasFiles && (
                              <span
                                className="text-muted-foreground inline-flex items-center gap-0.5"
                                title="Has file upload"
                              >
                                <FileText className="size-3.5" />
                              </span>
                            )}
                            {flags?.alertFlag && (
                              <span
                                className="inline-flex items-center text-red-600"
                                title="Red alert"
                              >
                                <AlertTriangle className="size-3.5" />
                              </span>
                            )}
                            {(flags?.missingCount ?? 0) > 0 && (
                              <span
                                className="inline-flex items-center text-amber-600"
                                title={`${flags!.missingCount} required field(s) missing`}
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
