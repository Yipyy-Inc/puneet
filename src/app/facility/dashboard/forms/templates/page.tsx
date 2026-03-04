"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, FileText, Sparkles } from "lucide-react";
import {
  getStarterTemplates,
  getTemplatesByFacility,
  createFormFromTemplate,
  type FormTemplate,
} from "@/data/forms";
import { toast } from "sonner";

const FACILITY_ID = 11;

export default function TemplatesPage() {
  const router = useRouter();
  const starters = getStarterTemplates();
  const facilityTemplates = getTemplatesByFacility(FACILITY_ID);

  const handleUseTemplate = (template: FormTemplate) => {
    const form = createFormFromTemplate(template.id, FACILITY_ID);
    if (form) {
      toast.success(`Created "${form.name}" from template. You can edit and publish.`);
      router.push(`/facility/dashboard/forms/builder?formId=${form.id}`);
    } else {
      toast.error("Could not create form from template.");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/facility/dashboard/forms">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Templates</h2>
            <p className="text-muted-foreground">
              Start from a prebuilt template, duplicate, and edit. No need to build from scratch.
            </p>
          </div>
        </div>

      {/* Starter templates (shipped with app) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Starter templates
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Prebuilt forms you can duplicate and customize. New client intake, pet profile, boarding, grooming consent, behavior evaluation.
          </p>
        </CardHeader>
        <CardContent>
          {starters.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No starter templates available.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {starters.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium">{t.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{t.formType}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t.questions.length} question{t.questions.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => handleUseTemplate(t)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Use template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Facility templates (saved by facility) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Your templates
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Templates saved by your facility. Duplicate and edit to create new forms.
          </p>
        </CardHeader>
        <CardContent>
          {facilityTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No facility templates yet. Use a starter template above or save a form as a template from the builder.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {facilityTemplates.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium">{t.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{t.formType}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t.questions.length} question{t.questions.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => handleUseTemplate(t)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Use template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
