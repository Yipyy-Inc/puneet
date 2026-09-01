"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallTags } from "@/hooks/use-call-tags";
import {
  MAX_CALL_TAGS,
  TAG_COLORS,
  tagColorClasses,
  type TagColor,
} from "@/lib/calling/call-tags";

interface Draft {
  name: string;
  color: TagColor;
  description: string;
}

const EMPTY_DRAFT: Draft = { name: "", color: "blue", description: "" };

export function CallTagsSettings() {
  const { tags, canAddMore, isPending, addTag, updateTag, removeTag } =
    useCallTags();
  // null = list view; "new" = adding; otherwise the tag id being edited.
  const [mode, setMode] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const startAdd = () => {
    setDraft(EMPTY_DRAFT);
    setMode("new");
  };
  const startEdit = (id: string) => {
    const t = tags.find((x) => x.id === id);
    if (!t) return;
    setDraft({
      name: t.name,
      color: (t.color as TagColor) ?? "blue",
      description: t.description ?? "",
    });
    setMode(id);
  };
  const cancel = () => setMode(null);

  // Every write is awaited and its failure surfaced. RLS refuses this row for
  // anyone without `settings_general`, and the previous version could not have
  // told anyone: the mutators returned void, so a refusal removed the tag from
  // the screen and left it in the database.
  const save = async () => {
    const name = draft.name.trim();
    if (!name) return;
    const payload = {
      name,
      color: draft.color,
      description: draft.description.trim() || undefined,
    };
    const editing = mode;
    setMode(null);
    try {
      if (editing === "new") await addTag(payload);
      else if (editing) await updateTag(editing, payload);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The tag could not be saved",
      );
    }
  };

  const remove = async (id: string) => {
    try {
      await removeTag(id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The tag could not be deleted",
      );
    }
  };

  // Showing the eight shipped tags while the facility's own list is in flight,
  // and allowing a write, would save the defaults over whatever they have. Same
  // trap as the settings panel, same answer.
  if (isPending) {
    return (
      <Card>
        <CardContent className="py-10">
          <div
            data-slot="skeleton"
            className="bg-muted h-4 w-40 animate-pulse rounded-sm"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="size-4 text-pink-600" />
              Call Tags
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Define the categories staff apply to calls. Trends per tag appear
              in Analytics.
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 tabular-nums",
              !canAddMore && "border-amber-300 text-amber-600",
            )}
          >
            {tags.length} / {MAX_CALL_TAGS}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Tag list */}
        <div className="divide-y rounded-xl border">
          {tags.length === 0 && (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              No tags yet. Add your first category below.
            </p>
          )}
          {tags.map((t) => {
            const c = tagColorClasses(t.color);
            const isEditing = mode === t.id;
            return (
              <div key={t.id}>
                <div className="flex items-center gap-3 px-3 py-2">
                  <span
                    className={cn("size-3 shrink-0 rounded-full", c.solid)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    {t.description && (
                      <p className="text-muted-foreground truncate text-xs">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground/60 size-7"
                    onClick={() => (isEditing ? cancel() : startEdit(t.id))}
                    aria-label="Edit tag"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground/50 hover:text-destructive size-7"
                    onClick={() => void remove(t.id)}
                    aria-label="Delete tag"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                {isEditing && (
                  <TagEditor
                    draft={draft}
                    setDraft={setDraft}
                    onSave={() => void save()}
                    onCancel={cancel}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Add form / button */}
        {mode === "new" ? (
          <div className="border-primary/40 bg-primary/5 rounded-xl border">
            <TagEditor
              draft={draft}
              setDraft={setDraft}
              onSave={() => void save()}
              onCancel={cancel}
            />
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={startAdd}
            disabled={!canAddMore}
          >
            <Plus className="size-4" />
            Add tag
          </Button>
        )}
        {!canAddMore && mode !== "new" && (
          <p className="text-xs text-amber-600">
            You&apos;ve reached the {MAX_CALL_TAGS}-tag limit. Delete one to add
            another.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TagEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3 px-3 py-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-1 block text-xs">Name</Label>
          <Input
            className="h-8 text-sm"
            placeholder="e.g. Billing question"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            autoFocus
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Description (optional)</Label>
          <Input
            className="h-8 text-sm"
            placeholder="When to use this tag"
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
          />
        </div>
      </div>
      <div>
        <Label className="mb-1 block text-xs">Color</Label>
        <div className="flex flex-wrap gap-1.5">
          {TAG_COLORS.map((color) => {
            const c = tagColorClasses(color);
            const active = draft.color === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => setDraft({ ...draft, color })}
                className={cn(
                  "ring-offset-background flex size-6 items-center justify-center rounded-full ring-offset-2 transition-all",
                  c.solid,
                  active && "ring-foreground ring-2",
                )}
                aria-label={color}
              >
                {active && <Check className="size-3.5 text-white" />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={onCancel}
        >
          <X className="size-3.5" />
          Cancel
        </Button>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={onSave}
          disabled={!draft.name.trim()}
        >
          <Check className="size-3.5" />
          Save
        </Button>
      </div>
    </div>
  );
}
