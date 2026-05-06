"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2 } from "lucide-react";
import type { WaiverCategory } from "@/data/additional-features";

interface CategoryManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Service categories — read-only, displayed for context. */
  serviceCategories: WaiverCategory[];
  /** Custom categories — facility-managed. */
  customCategories: WaiverCategory[];
  onCustomCategoriesChange: (next: WaiverCategory[]) => void;
}

export function CategoryManagerDialog({
  open,
  onOpenChange,
  serviceCategories,
  customCategories,
  onCustomCategoriesChange,
}: CategoryManagerDialogProps) {
  const [draft, setDraft] = useState("");

  const handleAdd = () => {
    const name = draft.trim();
    if (!name) return;
    const exists = customCategories.some(
      (c) => c.name.toLowerCase() === name.toLowerCase(),
    );
    if (exists) return;
    onCustomCategoriesChange([
      ...customCategories,
      {
        id: `cat-${Date.now()}`,
        name,
        kind: "custom",
        createdAt: new Date().toISOString(),
      },
    ]);
    setDraft("");
  };

  const handleDelete = (id: string) => {
    onCustomCategoriesChange(customCategories.filter((c) => c.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-5 px-6 py-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Service categories
              </p>
              <p className="text-muted-foreground text-xs">
                Built in for every service the facility offers — these can&apos;t
                be edited.
              </p>
              <div className="flex flex-wrap gap-2">
                {serviceCategories.map((cat) => (
                  <Badge
                    key={cat.id}
                    variant="outline"
                    className="border-slate-200 bg-slate-50 font-normal"
                  >
                    {cat.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Custom categories
              </p>
              <p className="text-muted-foreground text-xs">
                Create your own buckets to organise waivers beyond services
                (e.g. Senior Pets, Holiday Season).
              </p>

              <div className="flex gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="New category name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAdd();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleAdd}
                  disabled={!draft.trim()}
                >
                  <Plus className="mr-1 size-4" />
                  Add
                </Button>
              </div>

              {customCategories.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                  No custom categories yet.
                </div>
              ) : (
                <ul className="divide-y rounded-lg border bg-white">
                  {customCategories.map((cat) => (
                    <li
                      key={cat.id}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <span className="text-sm font-medium">{cat.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cat.id)}
                        className="size-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                        title="Delete category"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-muted-foreground text-[11px]">
                Deleting a custom category leaves its waivers in place — they
                fall back to the matching service category or Uncategorized.
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t px-6 py-3">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
