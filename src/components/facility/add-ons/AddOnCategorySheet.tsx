"use client";

import { useState } from "react";
import type { AddOnCategory } from "@/types/facility";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, FolderOpen } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RateColorPicker } from "@/components/facility/RateColorPicker";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: AddOnCategory[];
  onSave: (categories: AddOnCategory[]) => void;
}

function blankCategory(): Omit<
  AddOnCategory,
  "id" | "createdAt" | "updatedAt"
> {
  return { name: "", description: "", colorCode: "#3b82f6", sortOrder: 0 };
}

export function AddOnCategorySheet({
  open,
  onOpenChange,
  categories,
  onSave,
}: Props) {
  const [editing, setEditing] = useState<AddOnCategory | null>(null);
  const [form, setForm] = useState(blankCategory());

  function startCreate() {
    setEditing(null);
    setForm(blankCategory());
  }

  function startEdit(cat: AddOnCategory) {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description ?? "",
      colorCode: cat.colorCode ?? "#3b82f6",
      sortOrder: cat.sortOrder,
    });
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    const now = new Date().toISOString();
    if (editing) {
      const next = categories.map((c) =>
        c.id === editing.id ? { ...c, ...form, updatedAt: now } : c,
      );
      onSave(next);
      toast.success(`"${form.name}" updated`);
    } else {
      const newCat: AddOnCategory = {
        id: `cat-${Date.now()}`,
        ...form,
        sortOrder: categories.length + 1,
        createdAt: now,
        updatedAt: now,
      };
      onSave([...categories, newCat]);
      toast.success(`"${form.name}" category created`);
    }
    setEditing(null);
    setForm(blankCategory());
  }

  function handleDelete(cat: AddOnCategory) {
    onSave(categories.filter((c) => c.id !== cat.id));
    toast.success(`"${cat.name}" deleted`);
    if (editing?.id === cat.id) {
      setEditing(null);
      setForm(blankCategory());
    }
  }

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[420px] flex-col gap-0 p-0">
        <SheetHeader className="border-b px-6 pt-6 pb-4">
          <SheetTitle className="flex items-center gap-2.5 text-lg">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50 ring-1 ring-violet-200">
              <FolderOpen className="size-4 text-violet-600" />
            </div>
            Add-On Categories
          </SheetTitle>
          <SheetDescription>
            Organize your add-ons into categories that appear in the booking
            flow.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="text-muted-foreground/30 mb-3 size-10" />
              <p className="text-muted-foreground text-sm">
                No categories yet.
              </p>
            </div>
          ) : (
            sorted.map((cat) => (
              <div
                key={cat.id}
                className={cn(
                  "group bg-card flex items-center gap-3 rounded-xl border p-3 transition-all hover:shadow-sm",
                  editing?.id === cat.id &&
                    "border-primary ring-primary/20 ring-2",
                )}
              >
                <GripVertical className="text-muted-foreground/40 size-4 shrink-0" />
                <div
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: cat.colorCode ?? "#64748b" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{cat.name}</p>
                  {cat.description && (
                    <p className="text-muted-foreground truncate text-xs">
                      {cat.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="size-7 p-0"
                    onClick={() => startEdit(cat)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive/60 hover:text-destructive size-7 p-0"
                    onClick={() => handleDelete(cat)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <Separator />

        {/* Inline form */}
        <div className="bg-muted/20 space-y-3 px-6 py-4">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {editing ? "Edit Category" : "New Category"}
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Spa & Wellness"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={form.description ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Short description…"
              rows={2}
              className="resize-none text-sm"
            />
          </div>
          <RateColorPicker
            value={form.colorCode ?? "#3b82f6"}
            onChange={(hex) => setForm((p) => ({ ...p, colorCode: hex }))}
          />
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!form.name.trim()}
              className="flex-1"
            >
              {editing ? (
                "Save Changes"
              ) : (
                <>
                  <Plus className="mr-1 size-3.5" />
                  Add Category
                </>
              )}
            </Button>
            {editing && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setForm(blankCategory());
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
