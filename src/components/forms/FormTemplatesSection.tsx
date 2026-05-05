"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  Copy,
  FileText,
  Sparkles,
  ClipboardList,
  PawPrint,
  Scissors,
  Hotel,
  ShieldCheck,
} from "lucide-react";
import {
  getStarterTemplates,
  getTemplatesByFacility,
  createFormFromTemplate,
  type FormTemplate,
} from "@/data/forms";
import { toast } from "sonner";

const TEMPLATE_META: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string; description: string }
> = {
  "tpl-starter-new-client": {
    icon: <ClipboardList className="size-5" />,
    color: "text-blue-600",
    bg: "bg-blue-50",
    description:
      "Collect customer contact details, referral source, and notes for new clients.",
  },
  "tpl-starter-pet-profile": {
    icon: <PawPrint className="size-5" />,
    color: "text-amber-600",
    bg: "bg-amber-50",
    description:
      "Capture pet basics — name, breed, birthday, allergies, and special needs.",
  },
  "tpl-starter-boarding": {
    icon: <Hotel className="size-5" />,
    color: "text-violet-600",
    bg: "bg-violet-50",
    description:
      "Emergency contacts, feeding/medication instructions, and behavior notes for boarding.",
  },
  "tpl-starter-grooming": {
    icon: <Scissors className="size-5" />,
    color: "text-rose-600",
    bg: "bg-rose-50",
    description:
      "Grooming consent, sensitivities, and photo release authorization.",
  },
  "tpl-starter-behavior": {
    icon: <ShieldCheck className="size-5" />,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    description:
      "Evaluate aggression history, triggers, and temperament for safe group play.",
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
    text: "Text",
    textarea: "Long text",
    email: "Email",
    phone: "Phone",
    yes_no: "Yes/No",
    radio: "Choice",
    select: "Dropdown",
    multiselect: "Multi-select",
    checkbox: "Checkbox",
    date: "Date",
    number: "Number",
    file: "Upload",
    signature: "Signature",
    address: "Address",
  };
  return map[t] ?? t;
}

export function FormTemplatesSection({
  facilityId,
  defaultOpen = true,
}: {
  facilityId: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const router = useRouter();
  const starters = getStarterTemplates();
  const facilityTemplates = getTemplatesByFacility(facilityId);

  const handleUseTemplate = (template: FormTemplate) => {
    const form = createFormFromTemplate(template.id, facilityId);
    if (form) {
      toast.success(
        `Created "${form.name}" from template. You can edit and publish.`,
      );
      router.push(`/facility/dashboard/forms/builder?formId=${form.id}`);
    } else {
      toast.error("Could not create form from template.");
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-4">
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="hover:bg-muted/30 cursor-pointer transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="text-primary size-5" />
                <div>
                  <CardTitle className="text-lg">Templates</CardTitle>
                  <p className="text-muted-foreground text-sm">
                    Start from a prebuilt template, duplicate, and edit. No need
                    to build from scratch.
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`text-muted-foreground size-5 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold">Starter templates</h3>
              {starters.length === 0 ? (
                <p className="text-muted-foreground py-4 text-sm">
                  No starter templates available.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {starters.map((t) => {
                    const meta = TEMPLATE_META[t.id];
                    return (
                      <div
                        key={t.id}
                        className="bg-card flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-md"
                      >
                        <div
                          className={`flex items-center gap-3 px-4 py-3 ${meta?.bg ?? `bg-muted/30`} `}
                        >
                          <div
                            className={meta?.color ?? "text-muted-foreground"}
                          >
                            {meta?.icon ?? <FileText className="size-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-semibold">{t.name}</h4>
                            <Badge
                              variant="secondary"
                              className="mt-0.5 text-[10px]"
                            >
                              {TYPE_BADGES[t.formType] ?? t.formType}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex-1 px-4 py-3">
                          <p className="text-muted-foreground text-xs/relaxed">
                            {meta?.description ??
                              `${t.questions.length} questions ready to customize.`}
                          </p>
                          <div className="mt-3 space-y-1">
                            {t.questions.slice(0, 4).map((q) => (
                              <div
                                key={q.id}
                                className="flex items-center gap-2 text-[11px]"
                              >
                                <span className="text-muted-foreground shrink-0">
                                  {questionTypeLabel(q.type)}
                                </span>
                                <span className="text-foreground truncate">
                                  {q.label}
                                </span>
                                {q.required && (
                                  <span className="shrink-0 text-rose-400">
                                    *
                                  </span>
                                )}
                              </div>
                            ))}
                            {t.questions.length > 4 && (
                              <p className="text-muted-foreground text-[11px]">
                                + {t.questions.length - 4} more
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="bg-muted/20 flex items-center justify-between border-t px-4 py-3">
                          <span className="text-muted-foreground text-xs">
                            {t.questions.length} questions
                          </span>
                          <Button size="sm" onClick={() => handleUseTemplate(t)}>
                            <Copy className="mr-2 size-3.5" />
                            Use template
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {facilityTemplates.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <FileText className="text-muted-foreground size-4" />
                  Your templates
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {facilityTemplates.map((t) => (
                    <div
                      key={t.id}
                      className="bg-card flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-md"
                    >
                      <div className="bg-muted/30 flex items-center gap-3 px-4 py-3">
                        <FileText className="text-muted-foreground size-5" />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold">{t.name}</h4>
                          <Badge
                            variant="secondary"
                            className="mt-0.5 text-[10px]"
                          >
                            {TYPE_BADGES[t.formType] ?? t.formType}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex-1 px-4 py-3">
                        <div className="space-y-1">
                          {t.questions.slice(0, 4).map((q) => (
                            <div
                              key={q.id}
                              className="flex items-center gap-2 text-[11px]"
                            >
                              <span className="text-muted-foreground shrink-0">
                                {questionTypeLabel(q.type)}
                              </span>
                              <span className="text-foreground truncate">
                                {q.label}
                              </span>
                              {q.required && (
                                <span className="shrink-0 text-rose-400">
                                  *
                                </span>
                              )}
                            </div>
                          ))}
                          {t.questions.length > 4 && (
                            <p className="text-muted-foreground text-[11px]">
                              + {t.questions.length - 4} more
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="bg-muted/20 flex items-center justify-between border-t px-4 py-3">
                        <span className="text-muted-foreground text-xs">
                          {t.questions.length} questions
                        </span>
                        <Button size="sm" onClick={() => handleUseTemplate(t)}>
                          <Copy className="mr-2 size-3.5" />
                          Use template
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
