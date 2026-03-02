"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getFormsByFacility, duplicateForm, type Form, type FormType } from "@/data/forms";
import { Plus, Lock, Pencil, Copy, ExternalLink } from "lucide-react";

const FORM_CATEGORIES: { value: FormType; label: string }[] = [
  { value: "intake", label: "Intake Forms" },
  { value: "pet", label: "Pet Profile Forms" },
  { value: "owner", label: "Customer Profile Forms" },
  { value: "service", label: "Service Forms" },
  { value: "internal", label: "Internal Forms" },
];

const FACILITY_ID = 11;

export default function IntakeFormsPage() {
  const [category, setCategory] = useState<FormType>("intake");
  const router = useRouter();
  const allForms = getFormsByFacility(FACILITY_ID);
  const formsInCategory = allForms.filter((f) => f.type === category);

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Intake Forms</h2>
          <p className="text-muted-foreground">
            View and manage forms by category. Create and edit in Form Builder.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/facility/dashboard/forms/builder?new=1">
              <Plus className="mr-2 h-4 w-4" />
              New form
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/facility/dashboard/forms/templates">From template</Link>
          </Button>
        </div>
      </div>

      <Tabs value={category} onValueChange={(v) => setCategory(v as FormType)}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {FORM_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.value === "internal" && (
                <Lock className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              )}
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={category} className="mt-4">
          {formsInCategory.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No {FORM_CATEGORIES.find((c) => c.value === category)?.label.toLowerCase()} yet.
                </p>
                <Button asChild>
                  <Link href="/facility/dashboard/forms/builder?new=1">
                    <Plus className="mr-2 h-4 w-4" />
                    Create form
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {formsInCategory.map((form) => (
                <FormCard key={form.id} form={form} facilityId={FACILITY_ID} router={router} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FormCard({
  form,
  facilityId,
  router,
}: {
  form: Form;
  facilityId: number;
  router: ReturnType<typeof useRouter>;
}) {
  // Use relative URL to avoid hydration mismatch (server has no window.location)
  const shareUrl = `/forms/${form.slug}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">{form.name}</CardTitle>
        {form.internal && (
          <Badge variant="secondary" className="text-xs">
            Staff only
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {form.questions.length} question{form.questions.length !== 1 ? "s" : ""}
          {form.serviceType && ` · ${form.serviceType}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/facility/dashboard/forms/builder?id=${form.id}`)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          {!form.internal && (
            <Button size="sm" variant="ghost" asChild>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Open link
              </a>
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const copy = duplicateForm(form.id, facilityId);
              if (copy) router.push(`/facility/dashboard/forms/builder?id=${copy.id}`);
            }}
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            Duplicate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
