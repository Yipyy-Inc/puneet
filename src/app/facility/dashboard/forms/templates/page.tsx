"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, FileText, Sparkles, ClipboardList, PawPrint, Scissors, Hotel, ShieldCheck } from "lucide-react";
import {
  getStarterTemplates,
  getTemplatesByFacility,
  createFormFromTemplate,
  type FormTemplate,
} from "@/data/forms";
import { toast } from "sonner";

const FACILITY_ID = 11;

const TEMPLATE_META: Record<string, { icon: React.ReactNode; color: string; bg: string; description: string }> = {
  "tpl-starter-new-client": {
    icon: <ClipboardList className="h-5 w-5" />,
    color: "text-blue-600",
    bg: "bg-blue-50",
    description: "Collect customer contact details, referral source, and notes for new clients.",
  },
  "tpl-starter-pet-profile": {
    icon: <PawPrint className="h-5 w-5" />,
    color: "text-amber-600",
    bg: "bg-amber-50",
    description: "Capture pet basics — name, breed, birthday, allergies, and special needs.",
  },
  "tpl-starter-boarding": {
    icon: <Hotel className="h-5 w-5" />,
    color: "text-violet-600",
    bg: "bg-violet-50",
    description: "Emergency contacts, feeding/medication instructions, and behavior notes for boarding.",
  },
  "tpl-starter-grooming": {
    icon: <Scissors className="h-5 w-5" />,
    color: "text-rose-600",
    bg: "bg-rose-50",
    description: "Grooming consent, sensitivities, and photo release authorization.",
  },
  "tpl-starter-behavior": {
    icon: <ShieldCheck className="h-5 w-5" />,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    description: "Evaluate aggression history, triggers, and temperament for safe group play.",
  },
};

const TYPE_BADGES: Record<string, string> = {
  intake: "Intake",
  pet: "Pet Profile",
  service: "Service",
  owner: "Customer",
  internal: "Internal",
  customer: "Customer",
};

function questionTypeLabel(t: string): string {
  const map: Record<string, string> = {
    text: "Text", textarea: "Long text", email: "Email", phone: "Phone",
    yes_no: "Yes/No", radio: "Choice", select: "Dropdown", multiselect: "Multi-select",
    checkbox: "Checkbox", date: "Date", number: "Number", file: "Upload",
    signature: "Signature", address: "Address",
  };
  return map[t] ?? t;
}

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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {starters.map((t) => {
                const meta = TEMPLATE_META[t.id];
                return (
                  <div
                    key={t.id}
                    className="flex flex-col rounded-xl border bg-card overflow-hidden transition-shadow hover:shadow-md"
                  >
                    {/* Colored header bar */}
                    <div className={`flex items-center gap-3 px-4 py-3 ${meta?.bg ?? "bg-muted/30"}`}>
                      <div className={meta?.color ?? "text-muted-foreground"}>{meta?.icon ?? <FileText className="h-5 w-5" />}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm">{t.name}</h3>
                        <Badge variant="secondary" className="text-[10px] mt-0.5">{TYPE_BADGES[t.formType] ?? t.formType}</Badge>
                      </div>
                    </div>
                    {/* Description */}
                    <div className="px-4 py-3 flex-1">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {meta?.description ?? `${t.questions.length} questions ready to customize.`}
                      </p>
                      {/* Question preview list */}
                      <div className="mt-3 space-y-1">
                        {t.questions.slice(0, 4).map((q) => (
                          <div key={q.id} className="flex items-center gap-2 text-[11px]">
                            <span className="text-muted-foreground shrink-0">{questionTypeLabel(q.type)}</span>
                            <span className="text-foreground truncate">{q.label}</span>
                            {q.required && <span className="text-rose-400 shrink-0">*</span>}
                          </div>
                        ))}
                        {t.questions.length > 4 && (
                          <p className="text-[11px] text-muted-foreground">+ {t.questions.length - 4} more</p>
                        )}
                      </div>
                    </div>
                    {/* Footer */}
                    <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t.questions.length} questions</span>
                      <Button size="sm" onClick={() => handleUseTemplate(t)}>
                        <Copy className="mr-2 h-3.5 w-3.5" />
                        Use template
                      </Button>
                    </div>
                  </div>
                );
              })}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {facilityTemplates.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col rounded-xl border bg-card overflow-hidden transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{t.name}</h3>
                      <Badge variant="secondary" className="text-[10px] mt-0.5">{TYPE_BADGES[t.formType] ?? t.formType}</Badge>
                    </div>
                  </div>
                  <div className="px-4 py-3 flex-1">
                    <div className="space-y-1">
                      {t.questions.slice(0, 4).map((q) => (
                        <div key={q.id} className="flex items-center gap-2 text-[11px]">
                          <span className="text-muted-foreground shrink-0">{questionTypeLabel(q.type)}</span>
                          <span className="text-foreground truncate">{q.label}</span>
                          {q.required && <span className="text-rose-400 shrink-0">*</span>}
                        </div>
                      ))}
                      {t.questions.length > 4 && (
                        <p className="text-[11px] text-muted-foreground">+ {t.questions.length - 4} more</p>
                      )}
                    </div>
                  </div>
                  <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t.questions.length} questions</span>
                    <Button size="sm" onClick={() => handleUseTemplate(t)}>
                      <Copy className="mr-2 h-3.5 w-3.5" />
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
