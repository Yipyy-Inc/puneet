"use client";

import { useState, Fragment } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  PawPrint,
  Users,
  CalendarCheck,
  Zap,
  StickyNote,
} from "lucide-react";
import { TagBadge } from "@/components/shared/TagBadge";
import { TagIconPicker } from "@/components/shared/TagIconPicker";
import { resolveIcon } from "@/lib/service-registry";
import { getContrastTextColor } from "@/lib/color-utils";
import {
  tags as allTags,
  defaultTagNoteSettings,
  type Tag,
  type TagType,
  type TagPriority,
  type TagVisibility,
  type TagScope,
  type NoteCategory,
  type NoteRolePermissions,
  type TagNoteSettings,
} from "@/data/tags-notes";
import {
  ALL_FACILITY_ROLES,
  FACILITY_ROLE_LABELS,
  type FacilityRole,
} from "@/lib/role-utils";
import {
  logTagCreated,
  logTagUpdated,
  logTagDeleted,
} from "@/lib/tag-note-audit";
import { cn } from "@/lib/utils";

// ========================================
// TAG BUILDER SECTION
// ========================================

interface TagFormState {
  name: string;
  description: string;
  icon: string;
  color: string;
  priority: TagPriority;
  visibility: TagVisibility;
  scope: TagScope;
  locationIds: string[];
}

const EMPTY_TAG_FORM: TagFormState = {
  name: "",
  description: "",
  icon: "PawPrint",
  color: "#3b82f6",
  priority: "informational",
  visibility: "internal",
  scope: "global",
  locationIds: [],
};

const TAG_TYPE_CONFIG: Record<
  TagType,
  { label: string; icon: React.ReactNode }
> = {
  pet: { label: "Pet Tags", icon: <PawPrint className="size-4" /> },
  customer: { label: "Customer Tags", icon: <Users className="size-4" /> },
  booking: {
    label: "Booking Tags",
    icon: <CalendarCheck className="size-4" />,
  },
};

const PRIORITY_BADGE_VARIANTS: Record<
  TagPriority,
  "destructive" | "warning" | "secondary"
> = {
  critical: "destructive",
  warning: "warning",
  informational: "secondary",
};

function TagBuilder() {
  const [tagList, setTagList] = useState<Tag[]>([...allTags]);
  const [activeType, setActiveType] = useState<TagType>("pet");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [form, setForm] = useState<TagFormState>(EMPTY_TAG_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<Tag | null>(null);

  const filteredTags = tagList.filter(
    (t) => t.type === activeType && t.isActive,
  );

  function openCreate() {
    setEditingTag(null);
    setForm(EMPTY_TAG_FORM);
    setFormOpen(true);
  }

  function openEdit(tag: Tag) {
    setEditingTag(tag);
    setForm({
      name: tag.name,
      description: tag.description ?? "",
      icon: tag.icon,
      color: tag.color,
      priority: tag.priority,
      visibility: tag.visibility,
      scope: tag.scope,
      locationIds: tag.locationIds ?? [],
    });
    setFormOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;

    // Check for duplicate tag names within same type
    const duplicate = tagList.find(
      (t) =>
        t.type === activeType &&
        t.isActive &&
        t.name.toLowerCase() === form.name.trim().toLowerCase() &&
        t.id !== editingTag?.id,
    );
    if (duplicate) {
      toast.error(
        `A ${activeType} tag named "${duplicate.name}" already exists`,
      );
      return;
    }

    if (editingTag) {
      // Update
      setTagList((prev) =>
        prev.map((t) =>
          t.id === editingTag.id
            ? {
                ...t,
                name: form.name.trim(),
                description: form.description.trim() || undefined,
                icon: form.icon,
                color: form.color,
                priority: form.priority,
                visibility: form.visibility,
                scope: form.scope,
                locationIds:
                  form.scope === "location_specific"
                    ? form.locationIds
                    : undefined,
                updatedAt: new Date().toISOString(),
              }
            : t,
        ),
      );
      logTagUpdated({
        facilityId: 1,
        tagId: editingTag.id,
        actorId: 1,
        actorName: "Current User",
        changes: [
          { field: "name", oldValue: editingTag.name, newValue: form.name },
        ],
      });
    } else {
      // Create
      const newTag: Tag = {
        id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: activeType,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        icon: form.icon,
        color: form.color,
        priority: form.priority,
        visibility: form.visibility,
        scope: form.scope,
        locationIds:
          form.scope === "location_specific" ? form.locationIds : undefined,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: "Current User",
        createdById: 1,
      };
      setTagList((prev) => [...prev, newTag]);
      allTags.push(newTag);
      logTagCreated({
        facilityId: 1,
        tagId: newTag.id,
        tagName: newTag.name,
        tagType: activeType,
        actorId: 1,
        actorName: "Current User",
      });
    }
    toast.success(editingTag ? "Tag updated" : "Tag created");
    setFormOpen(false);
  }

  function handleDelete(tag: Tag) {
    setTagList((prev) =>
      prev.map((t) => (t.id === tag.id ? { ...t, isActive: false } : t)),
    );
    logTagDeleted({
      facilityId: 1,
      tagId: tag.id,
      tagName: tag.name,
      actorId: 1,
      actorName: "Current User",
    });
    toast.success(`Tag "${tag.name}" deleted`);
    setDeleteConfirm(null);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Tag Builder</CardTitle>
          <Button size="sm" className="gap-1" onClick={openCreate}>
            <Plus className="size-3.5" />
            Create Tag
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Type sub-tabs */}
        <Tabs
          value={activeType}
          onValueChange={(v) => setActiveType(v as TagType)}
        >
          <TabsList className="mb-4">
            {(Object.keys(TAG_TYPE_CONFIG) as TagType[]).map((type) => (
              <TabsTrigger key={type} value={type} className="gap-1.5">
                {TAG_TYPE_CONFIG[type].icon}
                {TAG_TYPE_CONFIG[type].label}
              </TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(TAG_TYPE_CONFIG) as TagType[]).map((type) => (
            <TabsContent key={type} value={type}>
              {filteredTags.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  <p className="text-sm">
                    No {TAG_TYPE_CONFIG[type].label.toLowerCase()} created yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={openCreate}
                  >
                    Create your first tag
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTags.map((tag) => {
                    const Icon = resolveIcon(tag.icon);
                    return (
                      <div
                        key={tag.id}
                        className="hover:bg-accent/50 flex items-center gap-3 rounded-lg border p-3 transition-colors"
                      >
                        {/* Preview */}
                        <div
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: tag.color,
                            color: getContrastTextColor(tag.color),
                          }}
                        >
                          <Icon className="size-4" />
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {tag.name}
                            </span>
                            <Badge
                              variant={PRIORITY_BADGE_VARIANTS[tag.priority]}
                              className="text-[10px]"
                            >
                              {tag.priority}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {tag.visibility === "internal"
                                ? "Internal"
                                : "Visible"}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {tag.scope === "global"
                                ? "Global"
                                : "Location-specific"}
                            </Badge>
                          </div>
                          {tag.description && (
                            <p className="text-muted-foreground truncate text-xs">
                              {tag.description}
                            </p>
                          )}
                        </div>

                        {/* Rendered badge preview */}
                        <TagBadge tag={tag} size="sm" />

                        {/* Actions */}
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0"
                            onClick={() => openEdit(tag)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive size-8 p-0"
                            onClick={() => setDeleteConfirm(tag)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Phase 2 placeholder */}
        <div className="mt-6 rounded-lg border border-dashed p-4 opacity-60">
          <div className="mb-1 flex items-center gap-2">
            <Zap className="size-4" />
            <span className="text-sm font-medium">Tag Automations</span>
            <Badge variant="secondary" className="text-[10px]">
              Coming Soon
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            Automatically trigger actions when tags are assigned — add tasks,
            send notifications, and more.
          </p>
        </div>
      </CardContent>

      {/* Create/Edit Tag Modal */}
      <Modal
        open={formOpen}
        onOpenChange={setFormOpen}
        type="form"
        title={editingTag ? "Edit Tag" : "Create Tag"}
        size="md"
        actions={{
          primary: {
            label: editingTag ? "Save Changes" : "Create Tag",
            onClick: handleSave,
            disabled: !form.name.trim(),
          },
          secondary: {
            label: "Cancel",
            onClick: () => setFormOpen(false),
          },
        }}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tag-name">Name *</Label>
            <Input
              id="tag-name"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value.slice(0, 50) }))
              }
              placeholder="Enter tag name"
              maxLength={50}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tag-description">Description</Label>
            <Textarea
              id="tag-description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Optional description"
              rows={2}
              className="resize-none"
            />
          </div>

          <TagIconPicker
            selectedIcon={form.icon}
            selectedColor={form.color}
            onIconChange={(icon) => setForm((f) => ({ ...f, icon }))}
            onColorChange={(color) => setForm((f) => ({ ...f, color }))}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, priority: v as TagPriority }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="informational">Informational</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Scope</Label>
              <Select
                value={form.scope}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, scope: v as TagScope }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (all locations)</SelectItem>
                  <SelectItem value="location_specific">
                    Location-specific
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">
                Visible to Customers
              </Label>
              <p className="text-muted-foreground text-xs">
                {form.visibility === "internal"
                  ? "Only staff can see this tag"
                  : "Customers can see this tag on their portal"}
              </p>
            </div>
            <Switch
              checked={form.visibility === "client_visible"}
              onCheckedChange={(checked) =>
                setForm((f) => ({
                  ...f,
                  visibility: checked ? "client_visible" : "internal",
                }))
              }
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        type="warning"
        title="Delete Tag"
        description={`Are you sure you want to delete "${deleteConfirm?.name}"? This will remove the tag from all assigned entities.`}
        actions={{
          primary: {
            label: "Delete",
            variant: "destructive",
            onClick: () => deleteConfirm && handleDelete(deleteConfirm),
          },
          secondary: {
            label: "Cancel",
            onClick: () => setDeleteConfirm(null),
          },
        }}
      >
        {null}
      </Modal>
    </Card>
  );
}

// ========================================
// NOTES CONFIG SECTION
// ========================================

const NOTE_CATEGORY_LABELS: Record<NoteCategory, string> = {
  pet: "Pet Notes",
  customer: "Customer Notes",
  booking: "Booking Notes",
  incident: "Incident Notes",
  internal_staff: "Internal Staff Notes",
};

const PERMISSION_ACTIONS = ["view", "create", "edit", "delete"] as const;

function NotesConfig() {
  const [settings, setSettings] = useState<TagNoteSettings>(
    defaultTagNoteSettings,
  );

  function toggleRolePermission(
    category: NoteCategory,
    action: keyof NoteRolePermissions,
    role: FacilityRole,
  ) {
    setSettings((prev) => {
      const current = prev.noteSettings.rolePermissions[category][action];
      const hasRole = current.includes(role);
      return {
        ...prev,
        noteSettings: {
          ...prev.noteSettings,
          rolePermissions: {
            ...prev.noteSettings.rolePermissions,
            [category]: {
              ...prev.noteSettings.rolePermissions[category],
              [action]: hasRole
                ? current.filter((r) => r !== role)
                : [...current, role],
            },
          },
        },
      };
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <StickyNote className="size-5" />
          Notes Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Default visibility */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm font-medium">
              Default Note Visibility
            </Label>
            <p className="text-muted-foreground text-xs">
              {settings.noteSettings.defaultVisibility === "internal"
                ? "New notes are internal by default"
                : "New notes are shared with customers by default"}
            </p>
          </div>
          <Switch
            checked={
              settings.noteSettings.defaultVisibility === "shared_with_customer"
            }
            onCheckedChange={(checked) =>
              setSettings((s) => ({
                ...s,
                noteSettings: {
                  ...s.noteSettings,
                  defaultVisibility: checked
                    ? "shared_with_customer"
                    : "internal",
                },
              }))
            }
          />
        </div>

        {/* Role permissions matrix */}
        <div>
          <Label className="mb-3 block text-sm font-medium">
            Role Permissions by Note Category
          </Label>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th
                    scope="col"
                    className="text-muted-foreground py-2 pr-4 text-left font-medium"
                  >
                    Category / Action
                  </th>
                  {ALL_FACILITY_ROLES.map((role) => (
                    <th
                      scope="col"
                      key={role}
                      className="text-muted-foreground px-2 py-2 text-center text-xs font-medium"
                    >
                      {FACILITY_ROLE_LABELS[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(NOTE_CATEGORY_LABELS) as NoteCategory[]).map(
                  (category) => (
                    <Fragment key={category}>
                      {PERMISSION_ACTIONS.map((action, actionIdx) => (
                        <tr
                          key={`${category}-${action}`}
                          className={cn(
                            "border-border/50 border-b",
                            actionIdx === 0 && "border-t",
                          )}
                        >
                          <td className="py-1.5 pr-4">
                            {actionIdx === 0 ? (
                              <span className="text-xs font-medium">
                                {NOTE_CATEGORY_LABELS[category]}
                              </span>
                            ) : null}
                            <span className="text-muted-foreground block pl-2 text-xs capitalize">
                              {action}
                            </span>
                          </td>
                          {ALL_FACILITY_ROLES.map((role) => {
                            const hasPermission =
                              settings.noteSettings.rolePermissions[category][
                                action
                              ].includes(role);
                            return (
                              <td
                                key={role}
                                className="px-2 py-1.5 text-center"
                              >
                                <Checkbox
                                  checked={hasPermission}
                                  aria-label={`${FACILITY_ROLE_LABELS[role]} can ${action} ${NOTE_CATEGORY_LABELS[category]}`}
                                  onCheckedChange={() =>
                                    toggleRolePermission(category, action, role)
                                  }
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// MAIN EXPORT
// ========================================

export function TagNotesSettings() {
  return (
    <div className="space-y-6">
      <TagBuilder />
      <NotesConfig />
    </div>
  );
}
