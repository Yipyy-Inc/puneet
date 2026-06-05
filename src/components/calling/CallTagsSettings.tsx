"use client";

import { useState } from "react";
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
  const { tags, canAddMore, addTag, updateTag, removeTag } = useCallTags();
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

  const save = () => {
    const name = draft.name.trim();
    if (!name) return;
    const payload = {
      name,
      color: draft.color,
      description: draft.description.trim() || undefined,
    };
    if (mode === "new") addTag(payload);
    else if (mode) updateTag(mode, payload);
    setMode(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="size-4 text-pink-600" />
              Call Tags
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Define the categories staff apply to calls. Trends per tag appear
              in Analytics.
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0 tabular-nums", !canAddMore && "border-amber-300 text-amber-600")}
          >
            {tags.length} / {MAX_CALL_TAGS}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Tag list */}
        <div className="divide-y rounded-xl border">
          {tags.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No tags yet. Add your first category below.
            </p>
          )}
          {tags.map((t) => {
            const c = tagColorClasses(t.color);
            const isEditing = mode === t.id;
            return (
              <div key={t.id}>
                <div className="flex items-center gap-3 px-3 py-2">
                  <span className={cn("size-3 shrink-0 rounded-full", c.solid)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    {t.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground/60"
                    onClick={() => (isEditing ? cancel() : startEdit(t.id))}
                    aria-label="Edit tag"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground/50 hover:text-destructive"
                    onClick={() => removeTag(t.id)}
                    aria-label="Delete tag"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                {isEditing && (
                  <TagEditor
                    draft={draft}
                    setDraft={setDraft}
                    onSave={save}
                    onCancel={cancel}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Add form / button */}
        {mode === "new" ? (
          <div className="rounded-xl border border-primary/40 bg-primary/5">
            <TagEditor
              draft={draft}
              setDraft={setDraft}
              onSave={save}
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
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
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
                  "flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-all",
                  c.solid,
                  active && "ring-2 ring-foreground",
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
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onCancel}>
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
