"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Plus,
  Bold,
  Italic,
  List,
  Paperclip,
  Link2,
  Archive,
  ArchiveRestore,
  ShieldAlert,
  CircleAlert,
  CheckCircle2,
  FileText,
} from "lucide-react";
import type { StaffProfile } from "@/types/facility-staff";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import { fullNameOf } from "./staff-shared";
import {
  useWriteUps,
  addWriteUp,
  archiveWriteUp,
  canReadWriteUps,
  isAdminRole,
  WRITEUP_CATEGORIES,
  WRITEUP_CATEGORY_LABEL,
  type WriteUpCategory,
  type StaffWriteUp,
} from "@/data/staff-writeups";

const STAFF_NOTIFY_MSG =
  "A new HR record has been added to your file. Please log in to review and acknowledge.";

function categoryClass(category: WriteUpCategory): string {
  switch (category) {
    case "termination_notice":
    case "final_warning":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300";
    case "written_warning":
    case "pip":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300";
    case "positive_recognition":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300";
  }
}

export function WriteUpsTab({ profile }: { profile: StaffProfile }) {
  const { viewer } = useFacilityRbac();
  const records = useWriteUps(profile.id);
  const [addOpen, setAddOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const viewerRole = viewer.primaryRole;
  const admin = isAdminRole(viewerRole);

  const { active, archived } = useMemo(() => {
    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
    return {
      active: sorted.filter((w) => !w.archived),
      archived: sorted.filter((w) => w.archived),
    };
  }, [records]);

  const unacknowledged = active.filter(
    (w) => !w.acknowledgedAt && w.category !== "positive_recognition",
  ).length;

  // SECURITY: only the staff member, their managers, and admins may read these.
  if (!canReadWriteUps({ id: viewer.id, role: viewerRole }, profile.id)) {
    return (
      <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 text-sm">
        <ShieldAlert className="size-8" />
        These records are confidential.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Write-ups &amp; HR records</h2>
          <p className="text-muted-foreground text-xs">
            Confidential. Permanent — records can be archived by an admin but
            never deleted.
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-3.5" /> Add Write-Up
        </Button>
      </div>

      {unacknowledged > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          <CircleAlert className="size-4 shrink-0" />
          {unacknowledged} record{unacknowledged === 1 ? "" : "s"} awaiting the
          staff member&apos;s acknowledgement.
        </div>
      )}

      {active.length === 0 ? (
        <div className="border-border/60 text-muted-foreground flex flex-col items-center gap-1.5 rounded-xl border border-dashed py-10 text-center">
          <FileText className="size-7 opacity-40" />
          <p className="text-sm">No records on file.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((w) => (
            <WriteUpCard
              key={w.id}
              record={w}
              staffId={profile.id}
              canArchive={admin}
              archiverRole={viewerRole}
            />
          ))}
        </div>
      )}

      {/* Admin-only archived section */}
      {admin && archived.length > 0 && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground -ml-2"
            onClick={() => setShowArchived((v) => !v)}
          >
            <Archive className="size-3.5" /> Archived ({archived.length})
          </Button>
          {showArchived &&
            archived.map((w) => (
              <WriteUpCard
                key={w.id}
                record={w}
                staffId={profile.id}
                canArchive={admin}
                archiverRole={viewerRole}
              />
            ))}
        </div>
      )}

      <AddWriteUpDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        staffId={profile.id}
        staffFirstName={profile.firstName}
        issuedBy={fullNameOf(viewer)}
      />
    </div>
  );
}

function WriteUpCard({
  record,
  staffId,
  canArchive,
  archiverRole,
}: {
  record: StaffWriteUp;
  staffId: string;
  canArchive: boolean;
  archiverRole: StaffProfile["primaryRole"];
}) {
  const acknowledged = !!record.acknowledgedAt;
  const needsAck = !acknowledged && record.category !== "positive_recognition";

  return (
    <div
      className={cn(
        "border-border/60 rounded-xl border p-3.5",
        record.archived && "opacity-70",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={categoryClass(record.category)}>
            {WRITEUP_CATEGORY_LABEL[record.category]}
          </Badge>
          <span className="text-muted-foreground text-xs">
            {record.date} · by {record.issuedBy}
          </span>
          {record.archived && (
            <Badge variant="secondary" className="text-[10px]">
              Archived
            </Badge>
          )}
        </div>
        {canArchive && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-7"
            onClick={() =>
              archiveWriteUp(staffId, record.id, archiverRole, !record.archived)
            }
          >
            {record.archived ? (
              <>
                <ArchiveRestore className="size-3.5" /> Restore
              </>
            ) : (
              <>
                <Archive className="size-3.5" /> Archive
              </>
            )}
          </Button>
        )}
      </div>

      {/* Manager-authored rich text. */}
      <div
        className="text-foreground mt-2 text-sm [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: record.description }}
      />

      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        {record.incidentRef && (
          <span className="inline-flex items-center gap-1">
            <Link2 className="size-3" /> Incident {record.incidentRef}
          </span>
        )}
        {record.attachmentUrl && (
          <a
            href={record.attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary inline-flex items-center gap-1 hover:underline"
          >
            <Paperclip className="size-3" /> Attachment
          </a>
        )}
        {acknowledged ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3" /> Acknowledged{" "}
            {record.acknowledgedAt?.split("T")[0]}
          </span>
        ) : needsAck ? (
          <span className="inline-flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400">
            <span className="size-1.5 rounded-full bg-rose-500" /> Awaiting
            acknowledgement
          </span>
        ) : null}
      </div>
    </div>
  );
}

function AddWriteUpDialog({
  open,
  onOpenChange,
  staffId,
  staffFirstName,
  issuedBy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  staffId: string;
  staffFirstName: string;
  issuedBy: string;
}) {
  const [today] = useState(() => new Date().toISOString().split("T")[0]);
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState<WriteUpCategory>("verbal_warning");
  const [description, setDescription] = useState("");
  const [incidentRef, setIncidentRef] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | undefined>();
  const [attachmentName, setAttachmentName] = useState("");
  // Bumped after save to remount the (uncontrolled) rich-text editor empty.
  const [editorKey, setEditorKey] = useState(0);

  const reset = () => {
    setDate(today);
    setCategory("verbal_warning");
    setDescription("");
    setIncidentRef("");
    setAttachmentUrl(undefined);
    setAttachmentName("");
    setEditorKey((k) => k + 1);
  };

  const plainLength = description.replace(/<[^>]*>/g, "").trim().length;
  const valid = plainLength > 0;

  const onPdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentUrl(URL.createObjectURL(file));
    setAttachmentName(file.name);
  };

  const save = () => {
    if (!valid) {
      toast.error("Add a description before saving.");
      return;
    }
    addWriteUp({
      staffId,
      issuedBy,
      date,
      category,
      description,
      incidentRef: incidentRef.trim() || undefined,
      attachmentUrl,
    });
    // Notify the staff member (spec 8.1). TODO: deliver via the notification
    // center; for now the record surfaces on their Write-Ups view (G3).
    toast.success(`${staffFirstName} notified`, {
      description: STAFF_NOTIFY_MSG,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add write-up</DialogTitle>
          <DialogDescription>
            This creates a permanent HR record and notifies the staff member to
            acknowledge it.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="wu-date">Date</Label>
              <Input
                id="wu-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wu-cat">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as WriteUpCategory)}
              >
                <SelectTrigger id="wu-cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WRITEUP_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {WRITEUP_CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <RichTextField key={editorKey} onChange={setDescription} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wu-incident">Incident reference (optional)</Label>
            <Input
              id="wu-incident"
              value={incidentRef}
              onChange={(e) => setIncidentRef(e.target.value)}
              placeholder="e.g. INC-2043 or a link"
            />
          </div>

          <div className="space-y-1.5">
            <Label>PDF attachment (optional)</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  <Paperclip className="size-3.5" /> Attach PDF
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={onPdf}
                  />
                </label>
              </Button>
              {attachmentName && (
                <span className="text-muted-foreground truncate text-xs">
                  {attachmentName}
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={save}>
            Save and notify staff
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Lightweight rich-text field — uncontrolled contentEditable + a small toolbar.
// The parent reads HTML via onChange; remount (key) to clear.
function RichTextField({ onChange }: { onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const sync = () => onChange(ref.current?.innerHTML ?? "");
  const exec = (cmd: string) => {
    document.execCommand(cmd, false);
    ref.current?.focus();
    sync();
  };

  return (
    <div className="border-input overflow-hidden rounded-md border">
      <div className="bg-muted/40 flex items-center gap-1 border-b px-1.5 py-1">
        <ToolbarButton onClick={() => exec("bold")} label="Bold">
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("italic")} label="Italic">
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => exec("insertUnorderedList")}
          label="Bullet list"
        >
          <List className="size-3.5" />
        </ToolbarButton>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        data-placeholder="Describe the incident or recognition…"
        className="empty:before:text-muted-foreground/60 min-h-24 px-3 py-2 text-sm empty:before:content-[attr(data-placeholder)] focus:outline-none"
      />
    </div>
  );
}

function ToolbarButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      // Keep the editor selection while clicking the toolbar.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="hover:bg-background text-muted-foreground hover:text-foreground rounded-sm p-1.5 transition-colors"
    >
      {children}
    </button>
  );
}
