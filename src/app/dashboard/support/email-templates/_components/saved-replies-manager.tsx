"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Hash, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import {
  SAVED_REPLIES_KEY_ARR,
  communicationsQueries,
  createSavedReply,
  deleteSavedReply,
  updateSavedReply,
} from "@/lib/api/communications";
import {
  SUPPORT_REPLY_CATEGORY_COLORS,
  SUPPORT_REPLY_CATEGORY_LABELS,
  type SupportReplyCategory,
  type SupportSavedReply,
} from "@/types/support-saved-replies";

const CATEGORIES: SupportReplyCategory[] = [
  "technical",
  "billing",
  "onboarding",
  "general",
  "custom",
];

const MERGE_FIELDS = [
  { token: "facility_name", label: "Facility name" },
  { token: "contact_name", label: "Contact name" },
  { token: "contact_email", label: "Contact email" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type EditorState =
  | { mode: "new" }
  | { mode: "edit"; reply: SupportSavedReply }
  | null;

export function SavedRepliesManager() {
  const queryClient = useQueryClient();
  const { data: replies = [] } = useQuery(communicationsQueries.savedReplies());

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    SupportReplyCategory | "all"
  >("all");
  const [editor, setEditor] = useState<EditorState>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupportSavedReply | null>(
    null,
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return replies.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter)
        return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.shortcut.toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q)
      );
    });
  }, [replies, search, categoryFilter]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: SAVED_REPLIES_KEY_ARR });

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteSavedReply(deleteTarget.id);
    invalidate();
    toast.success(`Deleted “${deleteTarget.title}”`);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Saved Replies</h2>
          <p className="text-muted-foreground text-sm">
            Reusable manual responses agents insert in chat with{" "}
            <span className="font-mono">/</span>. Merge fields resolve to the
            live conversation.
          </p>
        </div>
        <Button onClick={() => setEditor({ mode: "new" })} className="gap-1.5">
          <Plus className="size-4" />
          New Reply
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search replies by name, slug or content…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterTab
          active={categoryFilter === "all"}
          onClick={() => setCategoryFilter("all")}
        >
          All
        </FilterTab>
        {CATEGORIES.map((cat) => (
          <FilterTab
            key={cat}
            active={categoryFilter === cat}
            onClick={() => setCategoryFilter(cat)}
          >
            {SUPPORT_REPLY_CATEGORY_LABELS[cat]}
          </FilterTab>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
          No saved replies match. Create one to help agents respond faster.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((reply) => (
            <div
              key={reply.id}
              className="hover:border-primary/40 flex flex-col rounded-xl border p-3 transition-colors"
            >
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase",
                    SUPPORT_REPLY_CATEGORY_COLORS[reply.category],
                  )}
                >
                  {SUPPORT_REPLY_CATEGORY_LABELS[reply.category]}
                </span>
                <span className="text-muted-foreground ml-auto flex items-center gap-0.5 text-[10px]">
                  <Hash className="size-2.5" />
                  {reply.shortcut}
                </span>
              </div>
              <p className="text-sm font-semibold">{reply.title}</p>
              <p className="text-muted-foreground mt-1 line-clamp-3 flex-1 text-xs">
                {reply.body}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-muted-foreground text-[10px]">
                  Used {reply.useCount}×
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Edit ${reply.title}`}
                    onClick={() => setEditor({ mode: "edit", reply })}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-rose-600 hover:text-rose-700"
                    aria-label={`Delete ${reply.title}`}
                    onClick={() => setDeleteTarget(reply)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editor && (
        <ReplyEditorDialog
          state={editor}
          onClose={() => setEditor(null)}
          onSaved={invalidate}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved reply?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.title}” will be removed and agents will no longer
              see it in the chat “/” panel. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70",
      )}
    >
      {children}
    </button>
  );
}

function ReplyEditorDialog({
  state,
  onClose,
  onSaved,
}: {
  state: Exclude<EditorState, null>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = state.mode === "edit" ? state.reply : null;
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const shortcutTouched = useRef(editing !== null);

  const [title, setTitle] = useState(editing?.title ?? "");
  const [category, setCategory] = useState<SupportReplyCategory>(
    editing?.category ?? "general",
  );
  const [shortcut, setShortcut] = useState(editing?.shortcut ?? "");
  const [body, setBody] = useState(editing?.body ?? "");

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (!shortcutTouched.current) setShortcut(slugify(value));
  };

  const insertMerge = (token: string) => {
    const snippet = `{{${token}}}`;
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + snippet);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + snippet + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const canSave = title.trim() && body.trim() && shortcut.trim();

  const handleSave = () => {
    if (!canSave) return;
    const payload = {
      title: title.trim(),
      category,
      body: body.trim(),
      shortcut: slugify(shortcut) || slugify(title),
    };
    if (editing) {
      updateSavedReply(editing.id, payload);
      toast.success(`Updated “${payload.title}”`);
    } else {
      createSavedReply({ id: `sr-${crypto.randomUUID()}`, ...payload });
      toast.success(`Created “${payload.title}”`);
    }
    onSaved();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit saved reply" : "New saved reply"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_170px] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reply-name">Name</Label>
              <Input
                id="reply-name"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="e.g. Password reset steps"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reply-category">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as SupportReplyCategory)}
              >
                <SelectTrigger id="reply-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {SUPPORT_REPLY_CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reply-shortcut">Hashtag slug</Label>
            <div className="relative">
              <Hash className="text-muted-foreground absolute top-2.5 left-3 size-3.5" />
              <Input
                id="reply-shortcut"
                value={shortcut}
                onChange={(e) => {
                  shortcutTouched.current = true;
                  setShortcut(e.target.value);
                }}
                placeholder="password-reset"
                className="pl-8 font-mono text-xs"
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Used for “/” search in the chat composer.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reply-body">Body</Label>
            <Textarea
              id="reply-body"
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the reply. Use merge fields like {{facility_name}}."
              className="min-h-32"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                Insert
              </span>
              {MERGE_FIELDS.map((f) => (
                <button
                  key={f.token}
                  type="button"
                  onClick={() => insertMerge(f.token)}
                  className="bg-muted/60 hover:bg-muted rounded-full border px-2 py-0.5 font-mono text-[11px] transition-colors"
                  title={f.label}
                >
                  {`{{${f.token}}}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canSave} onClick={handleSave}>
            {editing ? "Save changes" : "Create reply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
