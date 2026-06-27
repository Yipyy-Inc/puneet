"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  addKbCategory,
  removeKbCategory,
  renameKbCategory,
  useKbState,
} from "@/lib/kb-articles-store";

export function CategoryManagerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { categories, articles } = useKbState();
  const [newCategory, setNewCategory] = useState("");

  function counts(name: string) {
    return articles.filter((a) => a.category === name).length;
  }

  function add() {
    const n = newCategory.trim();
    if (!n) return;
    if (categories.includes(n)) {
      toast.error("That category already exists.");
      return;
    }
    addKbCategory(n);
    setNewCategory("");
    toast.success(`Added “${n}”`);
  }

  function rename(name: string) {
    const next = window.prompt("Rename category", name)?.trim();
    if (!next || next === name) return;
    renameKbCategory(name, next);
    toast.success("Category renamed");
  }

  function remove(name: string) {
    const used = counts(name);
    if (
      used > 0 &&
      !window.confirm(
        `${used} article${used === 1 ? "" : "s"} will move to "Uncategorized". Delete "${name}"?`,
      )
    ) {
      return;
    }
    removeKbCategory(name);
    toast.success("Category deleted");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription>
            Categories group articles in the admin and the facility Help Center.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat}
              className="flex items-center gap-2 rounded-lg border p-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{cat}</p>
                <p className="text-muted-foreground text-xs">
                  {counts(cat)} article{counts(cat) === 1 ? "" : "s"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Rename ${cat}`}
                className="size-8"
                onClick={() => rename(cat)}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${cat}`}
                className="text-muted-foreground size-8 hover:text-rose-600"
                onClick={() => remove(cat)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t pt-3">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
            placeholder="New category name"
          />
          <Button onClick={add} className="shrink-0 gap-1.5">
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
