"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FormBuilderEditor } from "@/components/forms/FormBuilderEditor";
import { ArrowLeft } from "lucide-react";
import type { Form, ServiceType } from "@/data/forms";
import { PageHeader } from "@/components/ui/page-header";
import { liveFormQueries } from "@/lib/api/forms-live";
import { useStaffText } from "@/lib/staff/use-staff-text";

// A Postgres form id. Anything else (an old fixture id, a stray `?formId=`)
// is treated as "no form", which opens the builder on a new one.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function FormBuilderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t: builderT } = useStaffText("formBuilder");
  const requested = searchParams.get("id") ?? searchParams.get("formId");
  const isNew = searchParams.get("new") === "1";
  const formId = !isNew && requested && UUID.test(requested) ? requested : null;
  const templateId = searchParams.get("templateId");
  const serviceType = (searchParams.get("serviceType") ?? undefined) as
    | ServiceType
    | undefined;

  // The form, from Postgres. The editor mounts only once it has arrived, so
  // it seeds from the real row rather than from the fixture it used to read.
  const {
    data: liveForm,
    isPending,
    isError,
  } = useQuery({
    ...liveFormQueries.detail(formId ?? undefined),
    enabled: Boolean(formId),
  });

  const handleSave = (form: Form) => {
    router.push(`/facility/dashboard/forms?highlight=${form.id}`);
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/facility/dashboard/forms">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <PageHeader
          title="Form Builder"
          description="Create and edit forms. Add questions, set conditions, and map fields to profiles."
        />
      </div>

      {formId && isPending ? (
        <div className="bg-muted h-96 animate-pulse rounded-3xl" />
      ) : formId && (isError || !liveForm) ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          {builderT("couldNotOpen")}
        </p>
      ) : (
        <FormBuilderEditor
          key={liveForm?.id ?? `new-${templateId ?? ""}`}
          liveForm={liveForm ?? null}
          templateId={templateId}
          defaultServiceType={serviceType}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
