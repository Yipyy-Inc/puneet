"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bookmark } from "lucide-react";
import {
  SAVED_REPLY_CATEGORY_LABELS,
  type SavedReply,
  type SavedReplyCategory,
} from "@/types/saved-replies";

const CATEGORIES: SavedReplyCategory[] = [
  "boarding",
  "grooming",
  "daycare",
  "pricing",
  "general",
];

export function SaveAsReplyDialog({
  open,
  initialBody,
  onClose,
  onSave,
}: {
  open: boolean;
  initialBody: string;
  onClose: () => void;
  onSave: (reply: SavedReply) => void;
}) {
  const [title, setTitle] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [category, setCategory] = useState<SavedReplyCategory>("general");
  const [body, setBody] = useState(initialBody);

  const submit = () => {
    if (!title.trim() || !body.trim()) return;
    onSave({
      id: `sr-${Date.now()}`,
      title: title.trim(),
      shortcut:
        shortcut.trim() || title.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 24),
      body: body.trim(),
      category,
      createdAt: new Date().toISOString(),
      useCount: 0,
    });
    setTitle("");
    setShortcut("");
    setCategory("general");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bookmark className="size-4 text-emerald-600" />
            Save as Reply
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Boarding rates"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Shortcut</Label>
              <Input
                value={shortcut}
                onChange={(e) =>
                  setShortcut(e.target.value.replace(/\s+/g, "-").toLowerCase())
                }
                placeholder="boarding-rates"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as SavedReplyCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {SAVED_REPLY_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Reply body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="resize-none text-sm"
            />
            <p className="text-[10px] text-slate-400">
              Use <code className="rounded bg-slate-100 px-1">{`{ClientName}`}</code>{" "}
              and <code className="rounded bg-slate-100 px-1">{`{PetName}`}</code>{" "}
              to personalize on the fly.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={!title.trim() || !body.trim()}>
              Save Reply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
