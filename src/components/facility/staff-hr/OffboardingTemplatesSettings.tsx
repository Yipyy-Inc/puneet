"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  useOffboardingTemplatesQuery,
  useSaveOffboardingTemplate,
  useDeleteOffboardingTemplate,
} from "@/lib/api/staff-onboarding";
import type { OffboardingTemplate } from "@/data/staff-onboarding";
import { OffboardingTemplateEditor } from "./OffboardingTemplateEditor";
import { useSettingsText } from "@/lib/settings/use-settings-text";

/** Offboarding Templates — list of template cards opening a manager-tasks-only
 *  editor (same structure as Onboarding). Persisted to the Phase 0 store. */
export function OffboardingTemplatesSettings() {
  const tx = useSettingsText().section("offboarding-templates");
  const { data: templates = [] } = useOffboardingTemplatesQuery();
  const { mutate: saveTemplate } = useSaveOffboardingTemplate();
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
    // The id is assigned by the insert — see the note in
    // OnboardingTemplatesSettings. The editor opens on the RETURNED row.
    saveTemplate({ name: tx("newTemplateName") } as OffboardingTemplate, {
      onSuccess: (created) => {
        setEditingId(created.id);
        toast.success(tx("templateCreated"));
      },
      onError: (error: Error) => toast.error(error.message),
    });
  };
  return (
    <Card>
      <CardHeader>
        {/* Description first, then its one action — see the note in
            OnboardingTemplatesSettings. §1: no second action colour. */}
        <div className="flex items-start justify-between gap-4">
          <p className="text-muted-foreground text-sm">{tx("intro")}</p>
          <Button onClick={create} className="shrink-0 gap-1.5">
            <Plus className="size-4" />
            {tx("newTemplate")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {templates.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {tx("noTemplates")}
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
  const tx = useSettingsText().section("offboarding-templates");
  // Its own mutation, where the delete button is.
  const { mutate: deleteTemplate } = useDeleteOffboardingTemplate();

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
            ? tx("universalAllReasons")
            : template.appliesToReasons.join(", ")}{" "}
          ·{" "}
          {count === 1
            ? tx("taskCountOne")
            : tx("taskCountMany").replace("{count}", String(count))}
        </span>
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        title={tx("deleteTemplate")}
        onClick={() => {
          deleteTemplate(template.id);
          toast.success(tx("templateDeleted"));
        }}
      >
        <Trash2 className="size-4" />
      </Button>

      <button onClick={onEdit} aria-label={tx("editTemplate")}>
        <ChevronRight className="text-muted-foreground size-4" />
      </button>
    </div>
  );
}
