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
import { Skeleton } from "@/components/ui/skeleton";
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
  Save,
} from "lucide-react";
import {
  useSaveFacilitySetting,
  useTagNotePolicy,
} from "@/lib/api/facility-settings";
import type { TagNotePolicy } from "@/lib/settings/tag-notes";
import { TagBadge } from "@/components/shared/TagBadge";
import { TagIconPicker } from "@/components/shared/TagIconPicker";
import { resolveIcon } from "@/lib/service-registry";
import { getContrastTextColor } from "@/lib/color-utils";
import type {
  Tag,
  TagType,
  TagPriority,
  TagVisibility,
  TagScope,
  NoteCategory,
  NoteRolePermissions,
} from "@/types/tags";
import {
  useCreateTag,
  useRetireTag,
  useTagCatalogue,
  useUpdateTag,
} from "@/lib/api/tags";
import { DEFAULT_TAG_COLOR } from "@/lib/tag-colors";
import { ALL_FACILITY_ROLES, type FacilityRole } from "@/lib/role-utils";
// The three `logTag*` calls that sat here are gone with the fixture. They
// appended to a module-level array in src/lib/tag-note-audit.ts that NOTHING
// reads — `getTagNoteAuditLog` has no caller — so keeping them beside a real
// write would have been a compliance log that records nothing, next to a change
// that is genuinely durable. `public.audit_log` is the real one, and no trigger
// on `facility_tags` writes to it yet. Recorded in the debt map.
import { cn } from "@/lib/utils";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { useFacilityRoleLabel } from "@/lib/settings/use-staff-role-label";

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
  color: DEFAULT_TAG_COLOR,
  priority: "informational",
  visibility: "internal",
  scope: "global",
  locationIds: [],
};

// A module constant cannot know a locale, so it carries the catalogue keys
// for its label, its empty sentence and its duplicate-name message. Each of
// the three is a WHOLE sentence per type rather than a frame with the type
// dropped in: "No {type} tags yet" works in English by accident and in French
// not at all, because the article changes with the noun.
const TAG_TYPE_CONFIG: Record<
  TagType,
  {
    labelKey: string;
    emptyKey: string;
    duplicateKey: string;
    icon: React.ReactNode;
  }
> = {
  pet: {
    labelKey: "typePet",
    emptyKey: "emptyPet",
    duplicateKey: "duplicatePet",
    icon: <PawPrint className="size-4" />,
  },
  customer: {
    labelKey: "typeCustomer",
    emptyKey: "emptyCustomer",
    duplicateKey: "duplicateCustomer",
    icon: <Users className="size-4" />,
  },
  booking: {
    labelKey: "typeBooking",
    emptyKey: "emptyBooking",
    duplicateKey: "duplicateBooking",
    icon: <CalendarCheck className="size-4" />,
  },
};

const PRIORITY_KEYS: Record<TagPriority, string> = {
  informational: "priorityInformational",
  warning: "priorityWarning",
  critical: "priorityCritical",
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
  const t = useSettingsText().section("tags-notes");
  // ── THE CATALOGUE IS A TABLE NOW, NOT A useState ────────────────────────
  //
  // This held `useState<Tag[]>([...allTags])` — a copy of a 76-row fixture —
  // and its own toast admitted the truth: "the tag list is not stored yet, so
  // it resets when this page reloads." Every tag a facility created, renamed or
  // retired here died with the tab.
  //
  // `public.facility_tags` had existed since 20260828134018 with RLS and a
  // uniqueness index, carrying zero rows, because nothing was ever pointed at
  // it. It is pointed at it now.
  const { tags: tagList, pending, failed } = useTagCatalogue();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const retireTag = useRetireTag();

  const [activeType, setActiveType] = useState<TagType>("pet");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [form, setForm] = useState<TagFormState>(EMPTY_TAG_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<Tag | null>(null);

  const filteredTags = tagList.filter(
    (t) => t.type === activeType && t.isActive,
  );
  const saving =
    createTag.isPending || updateTag.isPending || retireTag.isPending;

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
    const name = form.name.trim();
    if (!name) return;

    // A local check so the common mistake gets a sentence rather than a 409.
    // It is NOT the guarantee: `facility_tags_name_unique` is, and the route
    // turns its 23505 into the same message for the case two people type the
    // same tag at once.
    const duplicate = tagList.find(
      (t) =>
        t.type === activeType &&
        t.isActive &&
        t.name.toLowerCase() === name.toLowerCase() &&
        t.id !== editingTag?.id,
    );
    if (duplicate) {
      toast.error(
        t(TAG_TYPE_CONFIG[activeType].duplicateKey).replace(
          "{name}",
          duplicate.name,
        ),
      );
      return;
    }

    const fields = {
      name,
      description: form.description.trim() || undefined,
      icon: form.icon,
      color: form.color,
      priority: form.priority,
      visibility: form.visibility,
      scope: form.scope,
      locationIds: form.scope === "location_specific" ? form.locationIds : [],
    };

    const onError = (error: Error) => toast.error(error.message);

    if (editingTag) {
      updateTag.mutate(
        { id: editingTag.id, patch: fields },
        {
          onSuccess: () => {
            toast.success(t("tagSaved").replace("{name}", name));
            setFormOpen(false);
          },
          onError,
        },
      );
      return;
    }

    createTag.mutate(
      { type: activeType, ...fields },
      {
        onSuccess: () => {
          toast.success(t("tagAdded").replace("{name}", name));
          setFormOpen(false);
        },
        onError,
      },
    );
  }

  function handleDelete(tag: Tag) {
    retireTag.mutate(tag.id, {
      onSuccess: () => {
        toast.success(t("tagRetired").replace("{name}", tag.name));
        setDeleteConfirm(null);
      },
      onError: (error: Error) => toast.error(error.message),
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t("builderTitle")}</CardTitle>
          <Button size="sm" className="gap-1" onClick={openCreate}>
            <Plus className="size-3.5" />
            {t("createTag")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Type sub-tabs */}
        <Tabs
          value={activeType}
          onValueChange={(v) => setActiveType(v as TagType)}
        >
          {/* §5g at 599px: "Étiquettes de réservation" is half again the
              width of "Booking tags", and the third tab was cut off with no
              way to reach it. Tabs holding translated labels scroll. */}
          <TabsList className="mb-4 max-w-full justify-start overflow-x-auto">
            {(Object.keys(TAG_TYPE_CONFIG) as TagType[]).map((type) => (
              <TabsTrigger key={type} value={type} className="gap-1.5">
                {TAG_TYPE_CONFIG[type].icon}
                {t(TAG_TYPE_CONFIG[type].labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(TAG_TYPE_CONFIG) as TagType[]).map((type) => (
            <TabsContent key={type} value={type}>
              {/* §5s: loading, failed and empty are three different answers,
                  and a list that shows "none yet" while it is still asking
                  invites somebody to create a duplicate of a tag they have. */}
              {pending ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((row) => (
                    <Skeleton
                      key={row}
                      className="h-[62px] w-full rounded-lg"
                    />
                  ))}
                </div>
              ) : failed ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  {t("loadFailed")}
                </p>
              ) : filteredTags.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  <p className="text-sm">{t(TAG_TYPE_CONFIG[type].emptyKey)}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={openCreate}
                  >
                    {t("createFirstTag")}
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
                              {t(PRIORITY_KEYS[tag.priority])}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {t(
                                tag.visibility === "internal"
                                  ? "visibilityInternal"
                                  : "visibilityVisible",
                              )}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {t(
                                tag.scope === "global"
                                  ? "scopeGlobalShort"
                                  : "scopeLocationShort",
                              )}
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
            <span className="text-sm font-medium">{t("automationsTitle")}</span>
            <Badge variant="secondary" className="text-[10px]">
              {t("comingSoon")}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            {t("automationsHelp")}
          </p>
        </div>
      </CardContent>

      {/* Create/Edit Tag Modal */}
      <Modal
        open={formOpen}
        onOpenChange={setFormOpen}
        type="form"
        title={t(editingTag ? "editTag" : "createTag")}
        size="md"
        actions={{
          primary: {
            label: t(editingTag ? "saveChanges" : "createTag"),
            onClick: handleSave,
            // §5s: a button with no loading state double-submits, and this one
            // now writes a row with a uniqueness index behind it — the second
            // press would come back as a 409 on the tag the first press just
            // created.
            loading: saving,
            disabled: !form.name.trim(),
          },
          secondary: {
            label: t("cancel"),
            onClick: () => setFormOpen(false),
          },
        }}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tag-name">{t("nameLabel")}</Label>
            <Input
              id="tag-name"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value.slice(0, 50) }))
              }
              placeholder={t("namePlaceholder")}
              maxLength={50}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tag-description">{t("descriptionLabel")}</Label>
            <Textarea
              id="tag-description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder={t("descriptionPlaceholder")}
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
              <Label>{t("priority")}</Label>
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
                  {(Object.keys(PRIORITY_KEYS) as TagPriority[]).map(
                    (value) => (
                      <SelectItem key={value} value={value}>
                        {t(PRIORITY_KEYS[value])}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("scope")}</Label>
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
                  <SelectItem value="global">{t("scopeGlobal")}</SelectItem>
                  <SelectItem value="location_specific">
                    {t("scopeLocation")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">
                {t("visibleToCustomers")}
              </Label>
              <p className="text-muted-foreground text-xs">
                {t(
                  form.visibility === "internal"
                    ? "visibleInternalHelp"
                    : "visibleCustomerHelp",
                )}
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
        title={t("retireTitle")}
        // The old copy said "this will remove the tag from all assigned
        // entities", which was never what the handler did and is now
        // measurably false: the route clears `is_active` precisely so the
        // assignments survive. A confirmation dialog that misdescribes its own
        // action is worse than none — this is the sentence somebody reads
        // before deciding.
        description={
          deleteConfirm
            ? t("retireBody").replace("{name}", deleteConfirm.name)
            : ""
        }
        actions={{
          primary: {
            label: deleteConfirm
              ? t("retireNamed").replace("{name}", deleteConfirm.name)
              : t("retire"),
            variant: "destructive",
            loading: saving,
            onClick: () => deleteConfirm && handleDelete(deleteConfirm),
          },
          secondary: {
            label: t("cancel"),
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

const NOTE_CATEGORY_KEYS: Record<NoteCategory, string> = {
  pet: "catPet",
  customer: "catCustomer",
  booking: "catBooking",
  incident: "catIncident",
  internal_staff: "catInternalStaff",
};

const PERMISSION_ACTIONS = ["view", "create", "edit", "delete"] as const;

// The action was printed raw under CSS `capitalize` — "view", "create". That
// renders the enum, not a word, and capitalising it does not translate it.
const PERMISSION_ACTION_KEYS: Record<
  (typeof PERMISSION_ACTIONS)[number],
  string
> = {
  view: "actView",
  create: "actCreate",
  edit: "actEdit",
  delete: "actDelete",
};

// ── NOTHING RENDERS UNTIL THE FACILITY'S OWN POLICY HAS ARRIVED ──────────
//
// The editor below seeds `useState` from what it is handed and a `useState`
// initialiser runs ONCE, so mounting it against the fallback and letting the
// query land afterwards would show the SHIPPED permission grid whatever the
// facility had saved — and the first Save would write that back over their own.
// This is the shape `check:settings-seeding` exists to catch.
function NotesConfig() {
  const { policy, configured, isPending } = useTagNotePolicy();

  if (isPending) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  return (
    <NotesConfigEditor
      key={configured ? "stored" : "shipped"}
      initialPolicy={policy}
    />
  );
}

function NotesConfigEditor({
  initialPolicy,
}: {
  initialPolicy: TagNotePolicy;
}) {
  const t = useSettingsText().section("tags-notes");
  const roleLabel = useFacilityRoleLabel();
  const saveSetting = useSaveFacilitySetting();
  const [settings, setSettings] = useState<TagNotePolicy>(initialPolicy);
  const [savedSettings, setSavedSettings] =
    useState<TagNotePolicy>(initialPolicy);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const handleSave = () => {
    saveSetting.mutate(
      { domain: "tag_note_settings", value: settings },
      {
        onSuccess: () => {
          // The BASELINE moves, not the draft — a switch flipped while the
          // request was in flight stays flipped.
          setSavedSettings(settings);
          toast.success(t("noteSettingsSaved"));
        },
        onError: (error) =>
          toast.error(
            error instanceof Error ? error.message : t("noteSettingsFailed"),
          ),
      },
    );
  };

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
          {t("notesTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Default visibility */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm font-medium">
              {t("defaultVisibility")}
            </Label>
            <p className="text-muted-foreground text-xs">
              {t(
                settings.noteSettings.defaultVisibility === "internal"
                  ? "defaultInternalHelp"
                  : "defaultSharedHelp",
              )}
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
            {t("rolePermissions")}
          </Label>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th
                    scope="col"
                    className="text-muted-foreground py-2 pr-4 text-left font-medium"
                  >
                    {t("categoryAction")}
                  </th>
                  {ALL_FACILITY_ROLES.map((role) => (
                    <th
                      scope="col"
                      key={role}
                      className="text-muted-foreground px-2 py-2 text-center text-xs font-medium"
                    >
                      {roleLabel(role)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(NOTE_CATEGORY_KEYS) as NoteCategory[]).map(
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
                                {t(NOTE_CATEGORY_KEYS[category])}
                              </span>
                            ) : null}
                            <span className="text-muted-foreground block pl-2 text-xs">
                              {t(PERMISSION_ACTION_KEYS[action])}
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
                                  aria-label={t("permissionCheckbox")
                                    .replace("{role}", roleLabel(role))
                                    .replace(
                                      "{action}",
                                      t(
                                        PERMISSION_ACTION_KEYS[action],
                                      ).toLocaleLowerCase(),
                                    )
                                    .replace(
                                      "{category}",
                                      t(NOTE_CATEGORY_KEYS[category]),
                                    )}
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

        {/* The grid above decides who sees an edit and a delete button on a
            note, so it needs somewhere to be saved. There was no save control
            on this card at all — the switches and the whole permission table
            lived in `useState` and were discarded on reload. */}
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          {isDirty && (
            <p className="text-ink-tertiary text-sm">{t("unsavedChanges")}</p>
          )}
          <Button
            onClick={handleSave}
            disabled={!isDirty || saveSetting.isPending}
          >
            <Save className="mr-2 size-4" />
            {t(saveSetting.isPending ? "saving" : "saveNoteSettings")}
          </Button>
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
