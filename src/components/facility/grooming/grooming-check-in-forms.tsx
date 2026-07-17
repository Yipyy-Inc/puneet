"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Pencil } from "lucide-react";
import { formQueries } from "@/lib/api/forms";
import type { Form } from "@/types/forms";

// Demo facility — mirrors the forms builder route (FACILITY_ID = 11).
const FACILITY_ID = 11;

const BUILDER_BASE = "/facility/dashboard/forms/builder";

/** How each form's "applies to" reads in the list. */
function appliesToLabel(form: Form): string {
  const specific = form.appliesTo?.serviceTypes;
  if (specific && specific.length > 0) {
    return `Specific: ${specific.join(", ")}`;
  }
  return "All Grooming Services";
}

/** Map the form's publish status to an Active/Inactive-style badge. */
function StatusBadge({ status }: { status: Form["status"] }) {
  if (status === "published") {
    return (
      <Badge className="border-0 bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300">
        Active
      </Badge>
    );
  }
  if (status === "draft") {
    return (
      <Badge className="border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        Draft
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      Inactive
    </Badge>
  );
}

export function GroomingCheckInForms() {
  const router = useRouter();
  const { data: forms = [], isLoading } = useQuery(
    formQueries.byFacility(FACILITY_ID),
  );

  // Forms bound to grooming — either by service type or an explicit apply-to.
  const groomingForms = forms.filter(
    (f) =>
      f.serviceType === "grooming" ||
      f.appliesTo?.serviceTypes?.includes("grooming"),
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Check-In Forms</CardTitle>
          <CardDescription>
            Digital pre-arrival forms clients complete before grooming
            appointments. Built with the shared form builder — question types,
            conditional logic, required fields, and price approval are all
            supported.
          </CardDescription>
        </div>
        <Button
          size="sm"
          className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() =>
            router.push(`${BUILDER_BASE}?new=1&serviceType=grooming`)
          }
        >
          <Plus className="mr-1.5 size-4" />
          Create Form
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Loading forms…
          </p>
        ) : groomingForms.length === 0 ? (
          <div className="bg-muted/30 rounded-lg border border-dashed py-8 text-center">
            <FileText className="text-muted-foreground mx-auto size-6" />
            <p className="mt-2 text-sm font-medium">No check-in forms yet</p>
            <p className="text-muted-foreground mx-auto mt-0.5 max-w-sm text-xs">
              Create a pre-arrival form to collect coat condition, matting,
              behavior notes, photos, and price approvals before check-in.
            </p>
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {groomingForms.map((form) => (
              <div
                key={form.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="text-muted-foreground size-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{form.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {appliesToLabel(form)} · {form.questions.length} question
                      {form.questions.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={form.status} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => router.push(`${BUILDER_BASE}?id=${form.id}`)}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
