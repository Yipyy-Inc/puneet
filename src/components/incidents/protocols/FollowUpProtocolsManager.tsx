"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  Plus,
  Pencil,
  Trash2,
  ClipboardList,
  Phone,
  Mail,
  MessageSquare,
  Users,
  Video,
  ArrowUpRight,
  Search,
  Star,
  Clock,
} from "lucide-react";
import {
  followUpProtocols as seedProtocols,
  type FollowUpProtocol,
} from "@/data/follow-up-protocols";
import { ProtocolEditorDialog } from "./ProtocolEditorDialog";

const SEVERITY_VARIANTS: Record<string, string> = {
  low: "bg-green-100 text-green-700 border-green-300",
  medium: "bg-amber-100 text-amber-700 border-amber-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  critical: "bg-red-100 text-red-700 border-red-300",
};

const CONTACT_ICONS = {
  phone: Phone,
  email: Mail,
  sms: MessageSquare,
  in_person: Users,
  video_call: Video,
  other: ArrowUpRight,
} as const;

export function FollowUpProtocolsManager() {
  const [protocols, setProtocols] =
    useState<FollowUpProtocol[]>(seedProtocols);
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUpProtocol | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FollowUpProtocol | null>(
    null,
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return protocols;
    return protocols.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [protocols, search]);

  const handleCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const handleEdit = (protocol: FollowUpProtocol) => {
    setEditing(protocol);
    setEditorOpen(true);
  };

  const handleSave = (next: FollowUpProtocol) => {
    setProtocols((prev) => {
      const exists = prev.find((p) => p.id === next.id);
      if (exists) return prev.map((p) => (p.id === next.id ? next : p));
      return [...prev, next];
    });
    setEditorOpen(false);
    setEditing(null);
  };

  const handleToggleActive = (protocol: FollowUpProtocol) => {
    setProtocols((prev) =>
      prev.map((p) =>
        p.id === protocol.id
          ? {
              ...p,
              isActive: !p.isActive,
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    );
  };

  const handleDelete = (protocol: FollowUpProtocol) => {
    setProtocols((prev) => prev.filter((p) => p.id !== protocol.id));
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Follow-Up Protocols</h3>
          <p className="text-muted-foreground text-sm">
            Define reusable procedures so every incident triggers consistent
            follow-up actions across staff.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 size-4" />
          New Protocol
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search protocols..."
          className="pl-9"
        />
      </div>

      {/* Protocol cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            <ClipboardList className="mx-auto mb-3 size-10 opacity-30" />
            <p className="font-medium">No protocols match your search</p>
            <p className="text-sm">
              Try a different keyword or create a new protocol.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((protocol) => (
            <Card
              key={protocol.id}
              className={
                protocol.isActive ? "" : "opacity-60"
              }
            >
              <CardContent className="space-y-3 p-5">
                {/* Title row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{protocol.name}</h4>
                      {protocol.isDefault && (
                        <Badge
                          variant="secondary"
                          className="gap-1 text-[10px]"
                        >
                          <Star className="size-3" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {protocol.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Switch
                      checked={protocol.isActive}
                      onCheckedChange={() => handleToggleActive(protocol)}
                      aria-label="Toggle active"
                    />
                  </div>
                </div>

                {/* Scope tags */}
                <div className="flex flex-wrap gap-1.5">
                  {protocol.severityScopes.map((sev) => (
                    <Badge
                      key={sev}
                      variant="outline"
                      className={`text-[10px] capitalize ${SEVERITY_VARIANTS[sev] ?? ""}`}
                    >
                      {sev}
                    </Badge>
                  ))}
                  {protocol.typeScopes.map((t) => (
                    <Badge
                      key={t}
                      variant="outline"
                      className="text-[10px] capitalize"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>

                {/* Steps preview */}
                <div className="bg-muted/40 space-y-1.5 rounded-lg p-3">
                  <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
                    {protocol.steps.length} step
                    {protocol.steps.length === 1 ? "" : "s"}
                  </p>
                  <ol className="space-y-1.5">
                    {protocol.steps.slice(0, 4).map((step) => {
                      const Icon =
                        CONTACT_ICONS[step.contactMethod] ?? ArrowUpRight;
                      return (
                        <li
                          key={step.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span className="bg-background flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold">
                            {step.order}
                          </span>
                          <Icon className="text-muted-foreground size-3 shrink-0" />
                          <span className="truncate font-medium">
                            {step.title}
                          </span>
                          <span className="text-muted-foreground ml-auto flex shrink-0 items-center gap-1 text-[10px]">
                            <Clock className="size-3" />
                            {formatOffset(
                              step.daysAfterIncident,
                              step.hoursAfterIncident,
                            )}
                          </span>
                        </li>
                      );
                    })}
                    {protocol.steps.length > 4 && (
                      <li className="text-muted-foreground pl-7 text-[10px]">
                        +{protocol.steps.length - 4} more step
                        {protocol.steps.length - 4 === 1 ? "" : "s"}
                      </li>
                    )}
                  </ol>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(protocol)}
                  >
                    <Pencil className="mr-1.5 size-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(protocol)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] min-w-4xl overflow-y-auto">
          <ProtocolEditorDialog
            protocol={editing}
            onSave={handleSave}
            onCancel={() => {
              setEditorOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete protocol?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{confirmDelete?.name}&rdquo; will be removed. Existing
              follow-up tasks already created from this protocol will not be
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatOffset(days: number, hours: number): string {
  if (days === 0 && hours === 0) return "Immediate";
  if (days === 0) return `+${hours}h`;
  if (hours === 0) return `+${days}d`;
  return `+${days}d ${hours}h`;
}
