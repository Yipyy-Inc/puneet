"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ClipboardList, Plus, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  useOnboardingTemplatesQuery,
  useSaveOnboardingTemplate,
  useDeleteOnboardingTemplate,
} from "@/lib/api/staff-onboarding";
import type { OnboardingTemplate } from "@/data/staff-onboarding";
import { OnboardingTemplateEditor } from "./OnboardingTemplateEditor";

const humanizeRole = (r: string) =>
  r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Onboarding Templates — list of template cards, opening a full editor
 *  (template settings + manager tasks + employee self-serve tasks). Persisted
 *  to the Phase 0 staff-onboarding store. */
export function OnboardingTemplatesSettings() {
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
        name: "New onboarding template",
        status: "draft",
      } as OnboardingTemplate,
      {
        onSuccess: (created) => {
          setEditingId(created.id);
          toast.success("Template created");
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="text-muted-foreground size-5" />
            <CardTitle>Onboarding Templates</CardTitle>
          </div>
          <Button
            onClick={create}
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Plus className="size-4" />
            New template
          </Button>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Role-appropriate onboarding flows. The active template matching a new
          hire’s role drives their self-serve checklist.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {templates.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No templates yet. Create one to get started.
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
  // Its own mutations rather than two callbacks threaded down from the parent:
  // the switch and the delete button live here, so the calls belong here too.
  const { mutate: saveTemplate } = useSaveOnboardingTemplate();
  const { mutate: deleteTemplate } = useDeleteOnboardingTemplate();

  const taskCount =
    template.managerTasks.length + template.employeeTasks.length;

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
            className="text-xs capitalize"
          >
            {template.status}
          </Badge>
        </div>
        <span className="text-muted-foreground truncate text-xs">
          {template.appliesToRoles.length === 0
            ? "All roles"
            : template.appliesToRoles.map(humanizeRole).join(", ")}{" "}
          · {taskCount} task{taskCount === 1 ? "" : "s"}
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
        Active
      </label>

      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        title="Delete template"
        onClick={() =>
          deleteTemplate(template.id, {
            onSuccess: () => toast.success("Template deleted"),
            onError: (error: Error) => toast.error(error.message),
          })
        }
      >
        <Trash2 className="size-4" />
      </Button>

      <button onClick={onEdit} aria-label="Edit template">
        <ChevronRight className="text-muted-foreground size-4" />
      </button>
    </div>
  );
}
