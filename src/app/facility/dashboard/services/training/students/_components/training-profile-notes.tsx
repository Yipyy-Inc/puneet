"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Award,
  Edit,
  Eye,
  Filter,
  Heart,
  Lightbulb,
  Lock,
  PlayCircle,
  Plus,
  Search,
  ShieldAlert,
  StickyNote,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trainingQueries } from "@/lib/api/training";
import type { TrainerNote, TrainerNoteCategory } from "@/types/training";

const NOTE_META: Record<
  TrainerNoteCategory,
  { label: string; cls: string; Icon: typeof Heart; stripe: string }
> = {
  behavior: {
    label: "Behavior",
    cls: "bg-sky-100 text-sky-700 border-sky-200",
    Icon: Heart,
    stripe: "bg-sky-400",
  },
  progress: {
    label: "Progress",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Icon: PlayCircle,
    stripe: "bg-emerald-400",
  },
  concern: {
    label: "Concern",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    Icon: TriangleAlert,
    stripe: "bg-amber-400",
  },
  achievement: {
    label: "Achievement",
    cls: "bg-violet-100 text-violet-700 border-violet-200",
    Icon: Award,
    stripe: "bg-violet-400",
  },
  general: {
    label: "General",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
    Icon: Lightbulb,
    stripe: "bg-slate-400",
  },
};

const CATEGORY_ORDER: TrainerNoteCategory[] = [
  "behavior",
  "progress",
  "concern",
  "achievement",
  "general",
];

const ANY_CATEGORY = "__all__";

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeDays(iso: string, todayISO: string): string {
  const today = new Date(todayISO + "T00:00:00").getTime();
  const target = new Date(iso + "T00:00:00").getTime();
  const days = Math.round((today - target) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface FormState {
  note: string;
  category: TrainerNoteCategory;
  isPrivate: boolean;
}

const EMPTY_FORM: FormState = {
  note: "",
  category: "general",
  isPrivate: true,
};

interface Props {
  petId: number;
  petName: string;
}

export function TrainingProfileNotes({ petId, petName }: Props) {
  const queryClient = useQueryClient();
  const todayISO = useMemo(
    () => new Date().toISOString().split("T")[0],
    [],
  );

  const notesQuery = trainingQueries.trainerNotes();
  const { data: allNotes = [] } = useQuery(notesQuery);

  const petNotes = useMemo(
    () => allNotes.filter((n) => n.petId === petId),
    [allNotes, petId],
  );

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(ANY_CATEGORY);
  const [privacyFilter, setPrivacyFilter] = useState<
    "all" | "private" | "shared"
  >("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return petNotes
      .filter((n) => {
        if (
          categoryFilter !== ANY_CATEGORY &&
          n.category !== categoryFilter
        ) {
          return false;
        }
        if (privacyFilter === "private" && !n.isPrivate) return false;
        if (privacyFilter === "shared" && n.isPrivate) return false;
        if (!q) return true;
        return (
          n.note.toLowerCase().includes(q) ||
          n.trainerName.toLowerCase().includes(q) ||
          n.category.toLowerCase().includes(q) ||
          n.className.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.id < b.id ? 1 : -1;
      });
  }, [petNotes, search, categoryFilter, privacyFilter]);

  // Privacy summary for the top hero strip.
  const privateCount = petNotes.filter((n) => n.isPrivate).length;
  const sharedCount = petNotes.length - privateCount;

  const filtersActive =
    !!search || categoryFilter !== ANY_CATEGORY || privacyFilter !== "all";

  function clearFilters() {
    setSearch("");
    setCategoryFilter(ANY_CATEGORY);
    setPrivacyFilter("all");
  }

  // ── Dialog state ─────────────────────────────────────────────────────────
  const [editingNote, setEditingNote] = useState<TrainerNote | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deletingNote, setDeletingNote] = useState<TrainerNote | null>(null);

  function openComposer(target: TrainerNote | null) {
    setEditingNote(target);
    setForm(
      target
        ? {
            note: target.note,
            category: target.category,
            isPrivate: target.isPrivate,
          }
        : EMPTY_FORM,
    );
    setComposerOpen(true);
  }

  function persistNote(next: TrainerNote, isEdit: boolean) {
    queryClient.setQueryData<TrainerNote[]>(notesQuery.queryKey, (prev = []) => {
      if (isEdit) return prev.map((n) => (n.id === next.id ? next : n));
      return [next, ...prev];
    });
  }

  function handleSubmit() {
    const trimmed = form.note.trim();
    if (!trimmed) {
      toast.error("Note can't be empty.");
      return;
    }
    if (editingNote) {
      const next: TrainerNote = {
        ...editingNote,
        note: trimmed,
        category: form.category,
        isPrivate: form.isPrivate,
      };
      persistNote(next, true);
      toast.success("Note updated.");
    } else {
      const next: TrainerNote = {
        id: `note-${Date.now()}`,
        enrollmentId: "",
        petId,
        petName,
        classId: "",
        className: "",
        trainerId: "trainer-001",
        trainerName: "Staff",
        date: todayISO,
        note: trimmed,
        category: form.category,
        isPrivate: form.isPrivate,
      };
      persistNote(next, false);
      toast.success(
        form.isPrivate ? "Private note added." : "Note added and shared.",
      );
    }
    setComposerOpen(false);
    setEditingNote(null);
  }

  function confirmDelete() {
    if (!deletingNote) return;
    queryClient.setQueryData<TrainerNote[]>(notesQuery.queryKey, (prev = []) =>
      prev.filter((n) => n.id !== deletingNote.id),
    );
    toast.success("Note deleted.");
    setDeletingNote(null);
  }

  return (
    <div className="space-y-4">
      {/* Privacy framing strip ──────────────────────────────────────── */}
      <div className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm">
        <div className="flex items-center gap-2 text-slate-700">
          <ShieldAlert className="size-4 text-slate-400" />
          <span>
            <span className="font-semibold">Instructor-only by default.</span>{" "}
            Notes here are visible to staff only — toggle &quot;Share with
            client&quot; to surface a note in the portal.
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <Badge
            variant="outline"
            className="gap-1 border-slate-200 bg-slate-50 text-slate-600"
          >
            <Lock className="size-3" />
            {privateCount} private
          </Badge>
          {sharedCount > 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"
            >
              <Eye className="size-3" />
              {sharedCount} shared
            </Badge>
          )}
        </div>
      </div>

      {/* Toolbar: search + filters + add ──────────────────────────── */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes, trainer, category…"
            className="h-9 pl-9"
          />
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Category
          </Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 min-w-[150px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_CATEGORY}>All categories</SelectItem>
              {CATEGORY_ORDER.map((c) => (
                <SelectItem key={c} value={c}>
                  {NOTE_META[c].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Visibility
          </Label>
          <Select
            value={privacyFilter}
            onValueChange={(v) =>
              setPrivacyFilter(v as "all" | "private" | "shared")
            }
          >
            <SelectTrigger className="h-9 min-w-[140px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All notes</SelectItem>
              <SelectItem value="private">Private only</SelectItem>
              <SelectItem value="shared">Shared with client</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground h-9"
          >
            <X className="mr-1 size-3" />
            Clear
          </Button>
        )}
        <div className="ml-auto">
          <Button
            onClick={() => openComposer(null)}
            className="h-9 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Plus className="mr-1.5 size-4" />
            New note
          </Button>
        </div>
      </div>

      {/* Filter active indicator ─────────────────────────────────── */}
      {filtersActive && filtered.length !== petNotes.length && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
          <Filter className="size-3" />
          Showing {filtered.length} of {petNotes.length}
        </p>
      )}

      {/* Empty / list ────────────────────────────────────────────── */}
      {petNotes.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
          <StickyNote className="text-muted-foreground/30 mx-auto mb-2 size-8" />
          No notes yet — capture behavioral observations, strategy, and
          reminders here.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed py-12 text-center text-sm">
          No notes match the current filters.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((n) => {
            const meta = NOTE_META[n.category];
            const CatIcon = meta.Icon;
            return (
              <li
                key={n.id}
                className="bg-card group relative flex items-stretch overflow-hidden rounded-xl border shadow-sm"
              >
                {/* Category color stripe on the left edge */}
                <span
                  className={cn("w-1 shrink-0", meta.stripe)}
                  aria-hidden
                />
                <div className="min-w-0 flex-1 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                        {initials(n.trainerName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800">
                          {n.trainerName}
                          {n.className && (
                            <span className="text-muted-foreground font-normal">
                              {" · "}
                              {n.className}
                            </span>
                          )}
                        </p>
                        <p className="text-muted-foreground text-[10px] tabular-nums">
                          {formatDate(n.date)} · {relativeDays(n.date, todayISO)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn("gap-1 border text-[10px]", meta.cls)}
                      >
                        <CatIcon className="size-3" />
                        {meta.label}
                      </Badge>
                      {n.isPrivate ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-slate-200 bg-slate-50 text-[10px] text-slate-600"
                          title="Visible to staff only"
                        >
                          <Lock className="size-2.5" />
                          Private
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                          title="Visible to the client"
                        >
                          <Eye className="size-2.5" />
                          Shared
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-[13px]/relaxed text-slate-700">
                    {n.note}
                  </p>
                  <div className="mt-2 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openComposer(n)}
                      className="h-7 px-2 text-[11px]"
                    >
                      <Edit className="mr-1 size-3" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingNote(n)}
                      className="text-destructive h-7 px-2 text-[11px]"
                    >
                      <Trash2 className="mr-1 size-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Composer dialog ────────────────────────────────────────── */}
      <Dialog
        open={composerOpen}
        onOpenChange={(o) => {
          if (!o) {
            setComposerOpen(false);
            setEditingNote(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? "Edit note" : `New note for ${petName}`}
            </DialogTitle>
            <DialogDescription>
              Log a behavioral observation, training strategy note, or
              reminder. Private notes stay between staff.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Note</Label>
              <Textarea
                rows={5}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="What did you notice or plan? Be specific so future-you remembers context."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm({ ...form, category: v as TrainerNoteCategory })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map((c) => (
                    <SelectItem key={c} value={c}>
                      {NOTE_META[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  {form.isPrivate ? "Instructor-only" : "Share with client"}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {form.isPrivate
                    ? "Stays internal — clients won't see this note."
                    : "Visible to the owner in their customer portal."}
                </p>
              </div>
              <Switch
                checked={!form.isPrivate}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isPrivate: !checked })
                }
                aria-label="Toggle client visibility"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setComposerOpen(false);
                setEditingNote(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.note.trim()}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {editingNote ? "Save changes" : "Add note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation ────────────────────────────────────── */}
      <AlertDialog
        open={!!deletingNote}
        onOpenChange={(o) => !o && setDeletingNote(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This is permanent. The note will disappear for everyone with
              access. Consider editing instead if it&apos;s still useful.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
