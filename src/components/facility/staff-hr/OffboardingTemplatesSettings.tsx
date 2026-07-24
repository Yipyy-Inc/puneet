"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  useOffboardingTemplates,
  createOffboardingTemplate,
  deleteOffboardingTemplate,
  type OffboardingTemplate,
} from "@/data/staff-onboarding";
import { OffboardingTemplateEditor } from "./OffboardingTemplateEditor";

/** Offboarding Templates — list of template cards opening a manager-tasks-only
 *  editor (same structure as Onboarding). Persisted to the Phase 0 store. */
export function OffboardingTemplatesSettings() {
  const templates = useOffboardingTemplates();
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = editingId ? templates.find((t) => t.id === editingId) : null;

  if (editing) {
    return (
      <OffboardingTemplateEditor
        template={editing}
        onBack={() => setEditingId(null)}
      />
    );
  }

  const create = () => {
    const t = createOffboardingTemplate({ name: "New offboarding template" });
    setEditingId(t.id);
    toast.success("Template created");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogOut className="text-muted-foreground size-5" />
            <CardTitle>Offboarding Templates</CardTitle>
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
          Task checklists run when a staff member leaves. The template matching
          the departure reason is applied; a universal template covers all
          reasons.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {templates.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No templates yet. Create one to get started.
          </p>
        ) : (
          templates.map((t) => (
            <OffboardingCard
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

function OffboardingCard({
  template,
  onEdit,
}: {
  template: OffboardingTemplate;
  onEdit: () => void;
}) {
  const count = template.managerTasks.length;
  return (
    <div className="hover:border-primary/40 flex items-center gap-3 rounded-lg border p-3 transition-colors">
      <button
        onClick={onEdit}
        className="flex min-w-0 flex-1 flex-col text-left"
      >
        <span className="truncate font-medium">{template.name}</span>
        <span className="text-muted-foreground truncate text-xs">
          {template.appliesToReasons.length === 0
            ? "Universal · all reasons"
            : template.appliesToReasons.join(", ")}{" "}
          · {count} task{count === 1 ? "" : "s"}
        </span>
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        title="Delete template"
        onClick={() => {
          deleteOffboardingTemplate(template.id);
          toast.success("Template deleted");
        }}
      >
        <Trash2 className="size-4" />
      </Button>

      <button onClick={onEdit} aria-label="Edit template">
        <ChevronRight className="text-muted-foreground size-4" />
      </button>
    </div>
  );
}
