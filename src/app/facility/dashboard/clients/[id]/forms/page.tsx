"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { clients } from "@/data/clients";
import { getFormsByFacility } from "@/data/forms";
import { getSubmissionsByFacility } from "@/data/form-submissions";
import type { Form, FormType } from "@/types/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, Clock, ExternalLink } from "lucide-react";

const FACILITY_ID = 11;

const CATEGORY_LABELS: Record<FormType, string> = {
  intake: "Intake Forms",
  owner: "Customer Profile Forms",
  customer: "Customer Forms",
  pet: "Pet Profile Forms",
  service: "Service Forms",
  internal: "Internal Forms",
};

const CATEGORY_ORDER: FormType[] = [
  "intake",
  "owner",
  "customer",
  "pet",
  "service",
];

export default function ClientFormsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const clientId = parseInt(id, 10);
  const client = clients.find((c) => c.id === clientId);

  const forms = useMemo(
    () =>
      getFormsByFacility(FACILITY_ID).filter(
        (f) => !f.internal && f.status !== "archived",
      ),
    [],
  );

  const submissions = useMemo(
    () =>
      getSubmissionsByFacility(FACILITY_ID).filter(
        (s) => s.customerId === clientId,
      ),
    [clientId],
  );

  if (!client) return null;

  const petIds = new Set(client.pets.map((p) => p.id));
  const completedByForm = new Map<
    string,
    { submittedAt: string; petId?: number }
  >();
  submissions.forEach((s) => {
    const petId = s.petIds?.find((pid) => petIds.has(pid));
    completedByForm.set(s.formId, { submittedAt: s.createdAt, petId });
  });

  const grouped = new Map<FormType, Form[]>();
  forms.forEach((f) => {
    const key = f.type ?? "intake";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(f);
  });

  const pendingCount = forms.filter((f) => !completedByForm.has(f.id)).length;
  const completedCount = forms.filter((f) => completedByForm.has(f.id)).length;

  return (
    <div className="space-y-4 p-4 pt-5 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Forms & Intake</h2>
          <p className="text-muted-foreground text-sm">
            Forms set up for this facility. Submissions from {client.name} are
            shown below.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="size-3 text-emerald-500" />
            {completedCount} completed
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Clock className="size-3 text-amber-500" />
            {pendingCount} pending
          </Badge>
        </div>
      </div>

      {forms.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <FileText className="text-muted-foreground mx-auto mb-2 size-10" />
            <p className="font-semibold">No forms configured yet</p>
            <p className="text-muted-foreground text-sm">
              Create forms from the{" "}
              <Link
                href="/facility/dashboard/forms"
                className="text-primary underline"
              >
                Forms
              </Link>{" "}
              section — they&apos;ll automatically appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {CATEGORY_ORDER.map((type) => {
        const list = grouped.get(type);
        if (!list?.length) return null;
        return (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                {CATEGORY_LABELS[type]} ({list.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {list.map((form) => {
                const sub = completedByForm.get(form.id);
                const pet = sub?.petId
                  ? client.pets.find((p) => p.id === sub.petId)
                  : null;
                return (
                  <div
                    key={form.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="text-muted-foreground size-4" />
                      <div>
                        <div className="text-sm font-medium">{form.name}</div>
                        <div className="text-muted-foreground text-xs">
                          {form.questions.length} question
                          {form.questions.length !== 1 ? "s" : ""}
                          {pet && <> · For {pet.name}</>}
                          {sub &&
                            ` · Submitted ${new Date(
                              sub.submittedAt,
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sub ? (
                        <Badge
                          variant="outline"
                          className="gap-1 text-[10px] text-emerald-600"
                        >
                          <CheckCircle className="size-3" />
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Pending
                        </Badge>
                      )}
                      <Button size="sm" variant="outline" asChild>
                        <Link
                          href={`/forms/${form.slug}?customerId=${clientId}`}
                        >
                          <ExternalLink className="mr-1 size-3.5" />
                          Open
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
