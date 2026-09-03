"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  Camera,
  ClipboardList,
  PenLine,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  chorelistQueries,
  useCreateDefinition,
  useUpdateDefinition,
  type TaskDefinitionRow,
} from "@/lib/api/task-groups";

// ============================================================================
// The chore library, from Postgres.
//
// ── DELETE IS GONE, AND NOT BECAUSE IT WAS HARD ───────────────────────────
//
// Its button called `toast.error("Task removed from library")` and removed
// nothing. Wiring it would have been worse: a chore named by a group is
// `on delete restrict`, so a real Delete would succeed for the chores nobody
// uses and fail for exactly the ones people care about — a control that works
// right up until it matters.
//
// **Retire** is the operation. Each row carries `usedByGroups`, so the screen
// can say which chores are in use BEFORE anybody clicks, rather than
// discovering it from a 409.
//
// ── AND RETIRING IS NOT DESTRUCTIVE ───────────────────────────────────────
//
// A retired chore stays in its groups and stays attached to work already done;
// generation simply skips it. So the screen shows retired ones on request
// rather than hiding them, and offers to restore.
// ============================================================================

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const CATEGORY_COLORS: Record<string, string> = {
  opening: "bg-amber-100 text-amber-700",
  closing: "bg-indigo-100 text-indigo-700",
  operations: "bg-sky-100 text-sky-700",
  cleaning: "bg-emerald-100 text-emerald-700",
  "customer-service": "bg-pink-100 text-pink-700",
  admin: "bg-purple-100 text-purple-700",
  maintenance: "bg-orange-100 text-orange-700",
  safety: "bg-red-100 text-red-700",
  general: "bg-slate-100 text-slate-700",
};

const CATEGORY_OPTIONS = [
  { value: "opening", label: "Opening" },
  { value: "closing", label: "Closing" },
  { value: "operations", label: "Operations" },
  { value: "cleaning", label: "Cleaning" },
  { value: "customer-service", label: "Customer Service" },
  { value: "admin", label: "Admin" },
  { value: "maintenance", label: "Maintenance" },
  { value: "safety", label: "Safety" },
  { value: "general", label: "General" },
];

type Row = TaskDefinitionRow & Record<string, unknown>;

function ChoreFormDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: TaskDefinitionRow;
}) {
  const isEdit = Boolean(initial);
  const create = useCreateDefinition();
  const update = useUpdateDefinition();
  const pending = create.isPending || update.isPending;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "general");
  const [priority, setPriority] = useState<string>(
    initial?.priority ?? "medium",
  );
  const [minutes, setMinutes] = useState(
    String(initial?.estimatedMinutes ?? 15),
  );
  const [photo, setPhoto] = useState(initial?.requiresPhoto ?? false);
  const [signoff, setSignoff] = useState(initial?.requiresSignoff ?? false);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("A chore needs a name.");
      return;
    }
    setError(null);

    const parsed = Number(minutes);
    const input = {
      title: trimmed,
      description: description.trim() || null,
      category,
      priority: priority as TaskDefinitionRow["priority"],
      estimatedMinutes: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
      requiresPhoto: photo,
      requiresSignoff: signoff,
    };

    const handlers = {
      onSuccess: () => {
        toast.success(isEdit ? "Chore updated" : "Chore added to the library");
        onClose();
      },
      // The dialog STAYS OPEN on failure, holding what was typed.
      onError: (err: unknown) =>
        setError(err instanceof Error ? err.message : "Could not save that."),
    };

    if (initial) {
      update.mutate({ id: initial.id, ...input }, handlers);
    } else {
      create.mutate(input, handlers);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit chore" : "New chore"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Changing this leaves work already generated from it exactly as it was asked."
              : "A reusable piece of work. Add it to a shift or position group to have it generated."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chore-title">Chore</Label>
            <Input
              id="chore-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Hose down run 3"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chore-description">Details (optional)</Label>
            <Textarea
              id="chore-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chore-minutes">Estimated minutes</Label>
              <Input
                id="chore-minutes"
                type="number"
                min={1}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-md border px-3 py-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="chore-photo" className="font-normal">
                Needs a photo
              </Label>
              <Switch
                id="chore-photo"
                checked={photo}
                onCheckedChange={setPhoto}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="chore-signoff" className="font-normal">
                Needs a sign-off
              </Label>
              <Switch
                id="chore-signoff"
                checked={signoff}
                onCheckedChange={setSignoff}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              {/* Said plainly rather than implied: the task board records these
                  as requirements and shows them, but nothing captures a photo
                  or a second signature yet. */}
              Both are recorded on the task and shown to whoever picks it up.
              Neither is captured in the app yet.
            </p>
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={pending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {pending ? "Saving…" : isEdit ? "Save chore" : "Add chore"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TaskLibraryTab() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskDefinitionRow | undefined>();
  const [showRetired, setShowRetired] = useState(false);

  const { data, isPending, isError, error } = useQuery(
    chorelistQueries.definitions({ includeRetired: showRetired }),
  );
  const update = useUpdateDefinition();

  const definitions = useMemo<TaskDefinitionRow[]>(() => data ?? [], [data]);

  const activeCount = definitions.filter((d) => d.isActive).length;
  const photoCount = definitions.filter((d) => d.requiresPhoto).length;
  const signoffCount = definitions.filter((d) => d.requiresSignoff).length;

  const setActive = (chore: TaskDefinitionRow, isActive: boolean) =>
    update.mutate(
      { id: chore.id, isActive },
      {
        onSuccess: () =>
          toast.success(isActive ? "Chore restored" : "Chore retired"),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not save that.",
          ),
      },
    );

  const columns: ColumnDef<Row>[] = [
    {
      key: "title",
      label: "Chore",
      defaultVisible: true,
      render: (d) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-medium",
                !d.isActive && "text-muted-foreground line-through",
              )}
            >
              {d.title}
            </span>
            {d.requiresPhoto && (
              <Camera className="text-muted-foreground size-3" />
            )}
            {d.requiresSignoff && (
              <PenLine className="text-muted-foreground size-3" />
            )}
          </div>
          {d.description && (
            <p className="text-muted-foreground line-clamp-1 text-xs">
              {d.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      defaultVisible: true,
      render: (d) => (
        <Badge
          className={cn(
            "px-1.5 py-0 text-[10px]",
            CATEGORY_COLORS[d.category] ?? CATEGORY_COLORS.general,
          )}
          variant="secondary"
        >
          {d.category.replace("-", " ")}
        </Badge>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      defaultVisible: true,
      render: (d) => (
        <Badge
          className={cn("px-1.5 py-0 text-[10px]", PRIORITY_COLORS[d.priority])}
          variant="secondary"
        >
          {d.priority}
        </Badge>
      ),
    },
    {
      key: "estimatedMinutes",
      label: "Est.",
      defaultVisible: true,
      render: (d) => (d.estimatedMinutes ? `${d.estimatedMinutes}m` : "—"),
    },
    {
      key: "usedByGroups",
      label: "In groups",
      defaultVisible: true,
      render: (d) =>
        (d.usedByGroups ?? 0) > 0 ? (
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            {d.usedByGroups}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "category",
      label: "Category",
      options: [{ value: "all", label: "All Categories" }, ...CATEGORY_OPTIONS],
    },
    {
      key: "priority",
      label: "Priority",
      options: [
        { value: "all", label: "All Priorities" },
        { value: "urgent", label: "Urgent" },
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Reusable chores. Put them in a shift or position group and they become
          tasks somebody is asked to do.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowRetired((s) => !s)}>
            {showRetired ? "Active only" : "Show retired"}
          </Button>
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="size-4" />
            New Chore
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card flex flex-col gap-1 rounded-xl border px-4 py-3">
          <span className="text-muted-foreground text-[11px]">Chores</span>
          <span className="text-2xl font-bold">{definitions.length}</span>
          <span className="text-muted-foreground text-[11px]">
            {activeCount} active
          </span>
        </div>
        <div className="bg-card flex flex-col gap-1 rounded-xl border px-4 py-3">
          <span className="text-muted-foreground text-[11px]">
            Require photo
          </span>
          <span className="text-2xl font-bold">{photoCount}</span>
          <span className="text-muted-foreground text-[11px]">
            {definitions.length > 0
              ? `${Math.round((photoCount / definitions.length) * 100)}% of library`
              : "—"}
          </span>
        </div>
        <div className="bg-card flex flex-col gap-1 rounded-xl border px-4 py-3">
          <span className="text-muted-foreground text-[11px]">
            Need sign-off
          </span>
          <span className="text-2xl font-bold">{signoffCount}</span>
          <span className="text-muted-foreground text-[11px]">
            Manager approval
          </span>
        </div>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-muted-foreground flex flex-col items-center justify-center rounded-md border py-12 text-center">
          <AlertTriangle className="mb-4 size-10 text-red-500 opacity-70" />
          <p>Could not load the chore library.</p>
          <p className="mt-1 text-sm">
            {error instanceof Error ? error.message : "Please try again."}
          </p>
        </div>
      ) : (
        <DataTable
          data={definitions as Row[]}
          columns={columns}
          filters={filters}
          searchKey="title"
          searchPlaceholder="Search the library…"
          itemsPerPage={10}
          emptyState={{
            pose: "celebration",
            icon: ClipboardList,
            title: showRetired ? "No chores" : "No active chores",
            description:
              "Add one, then put it in a shift or position group to have it generated.",
          }}
          actions={(row) => {
            const chore = row as TaskDefinitionRow;
            return (
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  title="Edit"
                  onClick={() => {
                    setEditing(chore);
                    setFormOpen(true);
                  }}
                >
                  <PenLine className="size-4" />
                </Button>
                {chore.isActive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={update.isPending}
                    title={
                      (chore.usedByGroups ?? 0) > 0
                        ? `In ${chore.usedByGroups} group(s) — retiring stops it being generated and leaves the groups intact`
                        : "Retire this chore"
                    }
                    onClick={() => setActive(chore, false)}
                  >
                    <Archive className="size-4" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={update.isPending}
                    title="Restore this chore"
                    onClick={() => setActive(chore, true)}
                  >
                    <RotateCcw className="size-4 text-emerald-600" />
                  </Button>
                )}
              </div>
            );
          }}
        />
      )}

      {formOpen && (
        <ChoreFormDialog
          // Remounted per chore so the form starts from the right values —
          // without the key an edit dialog opened twice keeps the first
          // chore's text.
          key={editing?.id ?? "new"}
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditing(undefined);
          }}
          initial={editing}
        />
      )}
    </div>
  );
}
