"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  useOnboardingTemplatesQuery,
  useSaveOnboardingTemplate,
  useDeleteOnboardingTemplate,
} from "@/lib/api/staff-onboarding";
import type { OnboardingTemplate } from "@/data/staff-onboarding";
import { OnboardingTemplateEditor } from "./OnboardingTemplateEditor";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { useStaffRoleLabel } from "@/lib/settings/use-staff-role-label";

/** Onboarding Templates — list of template cards, opening a full editor
 *  (template settings + manager tasks + employee self-serve tasks). Persisted
 *  to the Phase 0 staff-onboarding store. */
export function OnboardingTemplatesSettings() {
  const t = useSettingsText().section("onboarding-templates");
  const { data: templates = [], isLoading } = useOnboardingTemplatesQuery();
  const { mutate: saveTemplate } = useSaveOnboardingTemplate();
  const { mutate: deleteTemplate } = useDeleteOnboardingTemplate();
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = editingId ? templates.find((t) => t.id === editingId) : null;

  if (editing) {
    return (
      <OnboardingTemplateEditor
        template={editing}
        onBack={() => setEditingId(null)}
      />
    );
  }

  // THE ID COMES BACK FROM THE DATABASE.
  //
  // The mock version generated `uid("tmpl")` locally and opened the editor on
  // it in the same tick. Against Postgres the id is assigned by the insert, so
  // the editor cannot open until the response arrives — opening it on a guessed
  // id would edit a template that does not exist, and the first save would
  // create a second one.
  const create = () => {
    saveTemplate(
      {
        name: t("newTemplateName"),
        status: "draft",
      } as OnboardingTemplate,
      {
        onSuccess: (created) => {
          setEditingId(created.id);
          toast.success(t("created"));
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        {/* The h1 names the section, so this row is the description and its
            one action — the description first, because an action above the
            sentence explaining it reads backwards. §1: there is no second
            action colour, so the emerald is gone with it. */}
        <div className="flex items-start justify-between gap-4">
          <p className="text-muted-foreground text-sm">{t("intro")}</p>
          <Button onClick={create} className="shrink-0 gap-1.5">
            <Plus className="size-4" />
            {t("newTemplate")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {templates.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {t("empty")}
          </p>
        ) : (
          templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={() => setEditingId(t.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function TemplateCard({
  template,
  onEdit,
}: {
  template: OnboardingTemplate;
  onEdit: () => void;
}) {
  const { locale, section } = useSettingsText();
  const t = section("onboarding-templates");
  const roleLabel = useStaffRoleLabel();
  // Its own mutations rather than two callbacks threaded down from the parent:
  // the switch and the delete button live here, so the calls belong here too.
  const { mutate: saveTemplate } = useSaveOnboardingTemplate();
  const { mutate: deleteTemplate } = useDeleteOnboardingTemplate();

  const taskCount =
    template.managerTasks.length + template.employeeTasks.length;

  // Intl picks the form, not `n === 1`: French counts 0 as singular
  // ("0 tâche") and English does not ("0 tasks").
  const plural = new Intl.PluralRules(locale === "fr" ? "fr-CA" : "en-CA");
  const taskCountLabel = t(
    plural.select(taskCount) === "one" ? "taskCountOne" : "taskCountOther",
  ).replace("{n}", String(taskCount));

  return (
    <div className="hover:border-primary/40 flex items-center gap-3 rounded-lg border p-3 transition-colors">
      <button
        onClick={onEdit}
        className="flex min-w-0 flex-1 flex-col text-left"
      >
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{template.name}</span>
          <Badge
            variant={template.status === "active" ? "default" : "secondary"}
            className="text-xs"
          >
            {t(template.status === "active" ? "statusActive" : "statusDraft")}
          </Badge>
        </div>
        <span className="text-muted-foreground truncate text-xs">
          {template.appliesToRoles.length === 0
            ? t("allRoles")
            : template.appliesToRoles.map(roleLabel).join(", ")}{" "}
          · {taskCountLabel}
        </span>
      </button>

      <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Switch
          checked={template.status === "active"}
          onCheckedChange={(v) =>
            saveTemplate(
              { ...template, status: v ? "active" : "draft" },
              {
                // The uniqueness trigger refuses a second ACTIVE template for a
                // role and says which role. Surfacing that beats a switch that
                // silently flips back.
                onError: (error: Error) => toast.error(error.message),
              },
            )
          }
        />
        {t("statusActive")}
      </label>

      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        title={t("deleteTemplate")}
        onClick={() =>
          deleteTemplate(template.id, {
            onSuccess: () => toast.success(t("deleted")),
            onError: (error: Error) => toast.error(error.message),
          })
        }
      >
        <Trash2 className="size-4" />
      </Button>

      <button onClick={onEdit} aria-label={t("editTemplate")}>
        <ChevronRight className="text-muted-foreground size-4" />
      </button>
    </div>
  );
}
