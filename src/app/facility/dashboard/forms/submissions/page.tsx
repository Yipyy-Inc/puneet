"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { getFormById, getFormsByFacility } from "@/data/forms";
import { clients } from "@/data/clients";
import { FileText, Inbox, Search, ChevronRight } from "lucide-react";

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

export default function SubmissionsInboxPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">("all");
  const [formIdFilter, setFormIdFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filters: SubmissionListFilters = useMemo(
    () => ({
      status: statusFilter,
      formId: formIdFilter === "all" ? undefined : formIdFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [statusFilter, formIdFilter, dateFrom, dateTo]
  );

  const list = useMemo(
    () => getSubmissionsWithRecords(FACILITY_ID, filters),
    [filters]
  );

  const forms = useMemo(() => getFormsByFacility(FACILITY_ID), []);

  const unreadCount = getSubmissionsWithRecords(FACILITY_ID, { status: "unread" }).length;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Submissions Inbox</h2>
        <p className="text-muted-foreground">
          Process form submissions, match to customers and pets, or create new profiles.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SubmissionStatus | "all")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                    {o.value === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
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
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Submissions ({list.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Search className="h-10 w-10 mb-4 opacity-50" />
              <p>No submissions match your filters.</p>
              <p className="text-sm mt-1">Submissions appear when forms are filled via shareable links.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Submitted at</th>
                    <th className="text-left py-3 px-2 font-medium">Form</th>
                    <th className="text-left py-3 px-2 font-medium">Customer</th>
                    <th className="text-left py-3 px-2 font-medium">Pet(s)</th>
                    <th className="text-left py-3 px-2 font-medium">Status</th>
                    <th className="text-left py-3 px-2 font-medium">Flags</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ submission, record }) => {
                    const form = getFormById(submission.formId);
                    const hasFiles = submissionHasFiles(submission.id);
                    return (
                      <tr
                        key={submission.id}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="py-3 px-2 whitespace-nowrap">
                          {new Date(submission.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-2">{form?.name ?? submission.formId}</td>
                        <td className="py-3 px-2">
                          {getCustomerName(submission.customerId ?? record.relatedCustomerId)}
                        </td>
                        <td className="py-3 px-2">
                          {getPetNames(submission.petIds ?? (record.relatedPetId ? [record.relatedPetId] : undefined))}
                        </td>
                        <td className="py-3 px-2">
                          <Badge
                            variant={
                              record.status === "unread"
                                ? "default"
                                : record.status === "processed"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {record.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1">
                            {hasFiles && (
                              <span className="inline-flex items-center gap-0.5 text-muted-foreground" title="Has file upload">
                                <FileText className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/facility/dashboard/forms/submissions/${submission.id}`)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
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
