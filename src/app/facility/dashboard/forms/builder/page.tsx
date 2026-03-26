"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormBuilderEditor } from "@/components/forms/FormBuilderEditor";
import { ArrowLeft } from "lucide-react";
import type { Form } from "@/data/forms";

const FACILITY_ID = 11;

export default function FormBuilderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const formId = searchParams.get("id");
  const isNew = searchParams.get("new") === "1";
  const templateId = searchParams.get("templateId");

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
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Form Builder</h2>
          <p className="text-muted-foreground">
            Create and edit forms. Add questions, set conditions, and map fields
            to profiles.
          </p>
        </div>
      </div>

      <FormBuilderEditor
        facilityId={FACILITY_ID}
        initialFormId={isNew ? null : formId}
        templateId={templateId}
        onSave={handleSave}
      />
    </div>
  );
}
