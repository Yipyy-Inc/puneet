"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Plus,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Archive,
  Pen,
  FolderOpen,
  Layers,
  Wand2,
  Globe,
} from "lucide-react";
import {
  waiverTemplates as seedTemplates,
  customWaiverCategories as seedCustomCategories,
  type DigitalWaiver,
  type WaiverCategory,
  type WaiverServiceTag,
  type WaiverTemplate,
} from "@/data/additional-features";
import { brandingSettings } from "@/data/global-settings";
import { useLocationContext } from "@/hooks/use-location-context";
import { toast } from "sonner";
import {
  waiverQueries,
  usePublishWaiver,
  useUpdateWaiver,
} from "@/lib/api/waivers";
import { fromLegacyWaiver, toLegacyWaiver } from "./waivers/legacy-shape";
import { WaiverEditorDialog } from "./waivers/WaiverEditorDialog";
import { TemplateEditorDialog } from "./waivers/TemplateEditorDialog";
import { CategoryManagerDialog } from "./waivers/CategoryManagerDialog";
import { WaiverContentRenderer } from "./waivers/WaiverContentRenderer";
import { bucketByCategory, resolveCategories } from "./waivers/categories";

const SERVICE_LABEL: Record<WaiverServiceTag, string> = {
  boarding: "Boarding",
  daycare: "Daycare",
  grooming: "Grooming",
  training: "Training",
  vet: "Vet",
  retail: "Retail",
  general: "General",
};

const SERVICE_BADGE: Record<WaiverServiceTag, string> = {
  boarding: "bg-blue-500/10 text-blue-700 border-blue-200",
  daycare: "bg-green-500/10 text-green-700 border-green-200",
  grooming: "bg-purple-500/10 text-purple-700 border-purple-200",
  training: "bg-orange-500/10 text-orange-700 border-orange-200",
  vet: "bg-rose-500/10 text-rose-700 border-rose-200",
  retail: "bg-amber-500/10 text-amber-700 border-amber-200",
  general: "bg-gray-500/10 text-gray-700 border-gray-200",
};

/** Services this facility offers — drives which tags can be assigned. */
function useFacilityServices(): WaiverServiceTag[] {
  // TODO: read from facility settings when wired to a real API.
  return ["boarding", "daycare", "grooming", "training"];
}

function getServices(item: {
  type: WaiverServiceTag;
  services?: WaiverServiceTag[];
}): WaiverServiceTag[] {
  return item.services && item.services.length > 0
    ? item.services
    : [item.type];
}

export function DigitalWaiversManager() {
  const facilityServices = useFacilityServices();
  const facilityName = brandingSettings.platformName;

  // ── THE WAIVERS ARE REAL ───────────────────────────────────────────────
  //
  // `waivers` in Postgres, scoped to this facility by the SESSION. `all=1`
  // asks for the retired ones too; a caller without `view_waivers` gets only
  // the active ones regardless, because RLS decides that rather than this line.
  //
  // What this replaced seeded `useState` from a fixture, so every waiver the
  // business published survived exactly as long as the tab did.
  const waiversQuery = useQuery(waiverQueries.all());
  const waivers = useMemo(
    () => (waiversQuery.data ?? []).map(toLegacyWaiver),
    [waiversQuery.data],
  );

  const publishWaiver = usePublishWaiver();
  const updateWaiver = useUpdateWaiver();
  const [templates, setTemplates] = useState<WaiverTemplate[]>(seedTemplates);
  const [customCategories, setCustomCategories] =
    useState<WaiverCategory[]>(seedCustomCategories);

  const [tab, setTab] = useState<"waivers" | "templates">("waivers");
  const [showEmpty, setShowEmpty] = useState(false);

  // Waiver editor
  const [waiverEditorOpen, setWaiverEditorOpen] = useState(false);
  const [waiverEditorTarget, setWaiverEditorTarget] = useState<
    DigitalWaiver | undefined
  >();
  const [waiverFromTemplate, setWaiverFromTemplate] = useState<
    WaiverTemplate | undefined
  >();

  // Template editor
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [templateEditorTarget, setTemplateEditorTarget] = useState<
    WaiverTemplate | undefined
  >();

  // Category manager
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  // Preview & delete
  const [previewWaiver, setPreviewWaiver] = useState<DigitalWaiver | null>(
    null,
  );
  const [previewTemplate, setPreviewTemplate] = useState<WaiverTemplate | null>(
    null,
  );
  const [deleteWaiver, setDeleteWaiver] = useState<DigitalWaiver | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<WaiverTemplate | null>(
    null,
  );

  const allCategories = useMemo(
    () => resolveCategories(facilityServices, customCategories),
    [facilityServices, customCategories],
  );
  const serviceCategories = useMemo(
    () => allCategories.filter((c) => c.kind === "service"),
    [allCategories],
  );

  const waiverGroups = useMemo(
    () => bucketByCategory(waivers, allCategories),
    [waivers, allCategories],
  );
  const templateGroups = useMemo(
    () => bucketByCategory(templates, allCategories),
    [templates, allCategories],
  );

  const stats = useMemo(
    () => ({
      totalWaivers: waivers.length,
      activeWaivers: waivers.filter((w) => w.isActive).length,
      totalTemplates: templates.length,
      totalCategories: allCategories.length,
    }),
    [waivers, templates, allCategories],
  );

  // Waiver handlers
  const openCreateWaiver = () => {
    setWaiverEditorTarget(undefined);
    setWaiverFromTemplate(undefined);
    setWaiverEditorOpen(true);
  };

  const openEditWaiver = (w: DigitalWaiver) => {
    setWaiverEditorTarget(w);
    setWaiverFromTemplate(undefined);
    setWaiverEditorOpen(true);
  };

  /**
   * Publish or rewrite a waiver — for real.
   *
   * Editing the text changes what the NEXT person signs and nothing about what
   * previous people agreed to: every signature carries its own copy and a hash
   * of it. That is what makes this edit safe to offer at all.
   */
  const handleSaveWaiver = async (next: DigitalWaiver) => {
    const editing = Boolean(waiverEditorTarget);
    try {
      if (editing) {
        await updateWaiver.mutateAsync({
          id: next.id,
          ...fromLegacyWaiver(next),
          active: next.isActive,
        });
      } else {
        await publishWaiver.mutateAsync(fromLegacyWaiver(next));
      }
    } catch (error) {
      // Reported as a failure rather than as a success somewhere else. What
      // this replaced spliced an array and could not fail.
      toast.error(
        editing
          ? `"${next.name}" was not updated.`
          : `"${next.name}" was not created.`,
        { description: (error as Error).message },
      );
      return;
    }
    toast.success(
      editing
        ? `Waiver "${next.name}" updated`
        : `Waiver "${next.name}" created`,
    );
  };

  // ── TEMPLATES AND CATEGORIES ARE STILL SESSION-ONLY ────────────────────
  //
  // The WAIVERS above are rows now. Templates and custom categories have no
  // table yet, and they keep the `useState` behaviour they had.
  //
  // That is a deliberate line rather than an oversight: a template is a
  // starting point for authoring, so losing one costs somebody re-typing. A
  // waiver is the record of what a customer agreed to, so losing one costs the
  // business its defence. Only the second was worth a migration today.
  //
  // What DID have to change is the wording. "Saved" over something that does
  // not outlive the tab is the shape `check:success-claims` exists to catch,
  // and this screen is not on its baseline.
  const handleSaveAsTemplate = (next: WaiverTemplate) => {
    setTemplates((prev) => [next, ...prev]);
    toast.success(`Template "${next.name}" ready to use`, {
      description:
        "Templates are not stored yet — this one lasts until reload.",
    });
  };

  /**
   * RETIRE, not delete.
   *
   * There is no delete route and no delete policy behind one. Removing the row
   * would destroy the only readable statement of what the business used to ask
   * people to agree to — and signatures name a waiver by an id with no foreign
   * key, so they would survive pointing at nothing.
   *
   * `active: false` takes it out of use and leaves the record.
   */
  const handleDeleteWaiver = async (w: DigitalWaiver) => {
    try {
      await updateWaiver.mutateAsync({ id: w.id, active: false });
    } catch (error) {
      toast.error(`"${w.name}" was not retired.`, {
        description: (error as Error).message,
      });
      return;
    }
    toast.success(`Waiver "${w.name}" retired`, {
      description: "It stays on record and can no longer be signed.",
    });
    setDeleteWaiver(null);
  };

  // Template handlers
  const openCreateTemplate = () => {
    setTemplateEditorTarget(undefined);
    setTemplateEditorOpen(true);
  };

  const openEditTemplate = (t: WaiverTemplate) => {
    setTemplateEditorTarget(t);
    setTemplateEditorOpen(true);
  };

  const applyTemplate = (t: WaiverTemplate) => {
    setWaiverEditorTarget(undefined);
    setWaiverFromTemplate(t);
    setWaiverEditorOpen(true);
  };

  const handleSaveTemplate = (next: WaiverTemplate) => {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === next.id);
      if (idx === -1) return [next, ...prev];
      const copy = prev.slice();
      copy[idx] = next;
      return copy;
    });
    toast.success(
      templateEditorTarget
        ? `Template "${next.name}" updated`
        : `Template "${next.name}" created`,
      {
        description: "Templates are not stored yet — this lasts until reload.",
      },
    );
  };

  const handleDeleteTemplate = (t: WaiverTemplate) => {
    setTemplates((prev) => prev.filter((x) => x.id !== t.id));
    toast.success(`Template "${t.name}" removed`, {
      description: "Templates are not stored yet — this lasts until reload.",
    });
    setDeleteTemplate(null);
  };

  return (
    <div className="space-y-6">
      <SharedWaiversBanner />

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatTile
          label="Total Waivers"
          value={stats.totalWaivers}
          icon={<FileText className="text-muted-foreground size-8" />}
        />
        <StatTile
          label="Active Waivers"
          value={stats.activeWaivers}
          valueClass="text-green-600"
          icon={<CheckCircle className="size-8 text-green-500" />}
        />
        <StatTile
          label="Templates"
          value={stats.totalTemplates}
          icon={<Layers className="text-muted-foreground size-8" />}
        />
        <StatTile
          label="Categories"
          value={stats.totalCategories}
          icon={<FolderOpen className="text-muted-foreground size-8" />}
        />
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "waivers" | "templates")}
        className="space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="waivers">Waivers</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 pr-2">
              <Switch
                id="show-empty"
                checked={showEmpty}
                onCheckedChange={setShowEmpty}
              />
              <Label
                htmlFor="show-empty"
                className="text-muted-foreground text-xs"
              >
                Show empty categories
              </Label>
            </div>
            <Button
              variant="outline"
              onClick={() => setCategoryManagerOpen(true)}
            >
              <FolderOpen className="mr-2 size-4" />
              Manage Categories
            </Button>
            {tab === "waivers" ? (
              <Button onClick={openCreateWaiver}>
                <Plus className="mr-2 size-4" />
                Create Waiver
              </Button>
            ) : (
              <Button onClick={openCreateTemplate}>
                <Plus className="mr-2 size-4" />
                Create Template
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="waivers" className="space-y-4">
          {waivers.length === 0 ? (
            <EmptyState
              icon={<FileText className="size-8 text-slate-400" />}
              title="No waivers yet"
              description="Create your first waiver, or apply a template from the Templates tab."
              action={
                <Button onClick={openCreateWaiver}>
                  <Plus className="mr-2 size-4" />
                  Create Waiver
                </Button>
              }
            />
          ) : (
            waiverGroups
              .filter((g) => showEmpty || g.items.length > 0)
              .map((group) => (
                <CategorySection
                  key={group.categoryId}
                  title={group.categoryName}
                  count={group.items.length}
                >
                  {group.items.length === 0 ? (
                    <EmptyCategoryRow />
                  ) : (
                    <WaiverRows
                      items={group.items}
                      onPreview={setPreviewWaiver}
                      onEdit={openEditWaiver}
                      onDelete={setDeleteWaiver}
                    />
                  )}
                </CategorySection>
              ))
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          {templates.length === 0 ? (
            <EmptyState
              icon={<Layers className="size-8 text-slate-400" />}
              title="No templates yet"
              description="Templates are reusable starting points for waivers. Create one, or save an existing waiver as a template."
              action={
                <Button onClick={openCreateTemplate}>
                  <Plus className="mr-2 size-4" />
                  Create Template
                </Button>
              }
            />
          ) : (
            templateGroups
              .filter((g) => showEmpty || g.items.length > 0)
              .map((group) => (
                <CategorySection
                  key={group.categoryId}
                  title={group.categoryName}
                  count={group.items.length}
                >
                  {group.items.length === 0 ? (
                    <EmptyCategoryRow />
                  ) : (
                    <TemplateRows
                      items={group.items}
                      onUse={applyTemplate}
                      onPreview={setPreviewTemplate}
                      onEdit={openEditTemplate}
                      onDelete={setDeleteTemplate}
                    />
                  )}
                </CategorySection>
              ))
          )}
        </TabsContent>
      </Tabs>

      {/* Waiver Editor */}
      <WaiverEditorDialog
        open={waiverEditorOpen}
        onOpenChange={setWaiverEditorOpen}
        waiver={waiverEditorTarget}
        initialFromTemplate={waiverFromTemplate}
        availableServices={facilityServices}
        facilityName={facilityName}
        categories={allCategories}
        onSave={handleSaveWaiver}
        onSaveTemplate={handleSaveAsTemplate}
      />

      {/* Template Editor */}
      <TemplateEditorDialog
        open={templateEditorOpen}
        onOpenChange={setTemplateEditorOpen}
        template={templateEditorTarget}
        availableServices={facilityServices}
        categories={allCategories}
        onSave={handleSaveTemplate}
      />

      {/* Category Manager */}
      <CategoryManagerDialog
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        serviceCategories={serviceCategories}
        customCategories={customCategories}
        onCustomCategoriesChange={setCustomCategories}
      />

      {/* Waiver Preview */}
      <Dialog
        open={!!previewWaiver}
        onOpenChange={() => setPreviewWaiver(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              {previewWaiver?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            {previewWaiver &&
              getServices(previewWaiver).map((s) => (
                <Badge key={s} variant="outline" className={SERVICE_BADGE[s]}>
                  {SERVICE_LABEL[s]}
                </Badge>
              ))}
            <Badge variant="outline">v{previewWaiver?.version}</Badge>
            {previewWaiver?.requiresSignature && (
              <Badge className="bg-blue-500/10 text-blue-700">
                <Pen className="mr-1 size-3" />
                Signature Required
              </Badge>
            )}
          </div>
          <ScrollArea className="max-h-[400px] rounded-lg border bg-white p-5">
            {previewWaiver && (
              <WaiverContentRenderer
                blocks={previewWaiver.blocks}
                content={previewWaiver.content}
                context={{
                  customerName: "Sample Customer",
                  petName: "Buddy",
                  facilityName,
                  services: getServices(previewWaiver),
                }}
              />
            )}
          </ScrollArea>
          <div className="text-muted-foreground text-xs">
            {previewWaiver?.expiryDays
              ? `Expires ${previewWaiver.expiryDays} days after signing`
              : "No expiration"}
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Preview */}
      <Dialog
        open={!!previewTemplate}
        onOpenChange={() => setPreviewTemplate(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-5" />
              {previewTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          {previewTemplate?.description && (
            <p className="text-muted-foreground text-sm">
              {previewTemplate.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {previewTemplate &&
              getServices(previewTemplate).map((s) => (
                <Badge key={s} variant="outline" className={SERVICE_BADGE[s]}>
                  {SERVICE_LABEL[s]}
                </Badge>
              ))}
            {previewTemplate?.requiresSignature && (
              <Badge className="bg-blue-500/10 text-blue-700">
                <Pen className="mr-1 size-3" />
                Signature Required
              </Badge>
            )}
          </div>
          <ScrollArea className="max-h-[400px] rounded-lg border bg-white p-5">
            {previewTemplate && (
              <WaiverContentRenderer
                blocks={previewTemplate.blocks}
                content={previewTemplate.content}
                context={{
                  customerName: "Sample Customer",
                  petName: "Buddy",
                  facilityName,
                  services: getServices(previewTemplate),
                }}
              />
            )}
          </ScrollArea>
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground text-xs">
              {previewTemplate?.expiryDays
                ? `Default expiry: ${previewTemplate.expiryDays} days`
                : "Default expiry: never"}
            </div>
            {previewTemplate && (
              <Button
                onClick={() => {
                  applyTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }}
              >
                <Wand2 className="mr-2 size-4" />
                Use Template
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Retire waiver. The copy already said signatures stay on record — that
          is now literally true rather than aspirational, and the title and
          button say "retire" so they match what happens. */}
      <AlertDialog
        open={!!deleteWaiver}
        onOpenChange={(open) => !open && setDeleteWaiver(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retire this waiver?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteWaiver?.name} will be taken out of use and can no longer be
              signed. It stays on record, and so does every signature already
              given against it — including the exact wording each person agreed
              to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteWaiver && handleDeleteWaiver(deleteWaiver)}
              className="bg-red-600 hover:bg-red-700"
            >
              Retire
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete template */}
      <AlertDialog
        open={!!deleteTemplate}
        onOpenChange={(open) => !open && setDeleteTemplate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTemplate?.name} will be removed. Waivers previously created
              from it are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTemplate && handleDeleteTemplate(deleteTemplate)
              }
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CategorySection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          {title}
          <span className="text-muted-foreground text-xs font-normal">
            ({count})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function EmptyCategoryRow() {
  return (
    <div className="rounded-md border border-dashed bg-slate-50 px-4 py-4 text-center text-xs text-slate-500">
      Nothing in this category yet.
    </div>
  );
}

function WaiverRows({
  items,
  onPreview,
  onEdit,
  onDelete,
}: {
  items: DigitalWaiver[];
  onPreview: (w: DigitalWaiver) => void;
  onEdit: (w: DigitalWaiver) => void;
  onDelete: (w: DigitalWaiver) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Services</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Signature</TableHead>
          <TableHead>Expiry</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((waiver) => {
          const tags = getServices(waiver);
          return (
            <TableRow key={waiver.id}>
              <TableCell className="font-medium">{waiver.name}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {tags.map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className={SERVICE_BADGE[s]}
                    >
                      {SERVICE_LABEL[s]}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">v{waiver.version}</Badge>
              </TableCell>
              <TableCell>
                {waiver.isActive ? (
                  <Badge className="bg-green-500/10 text-green-700">
                    Active
                  </Badge>
                ) : (
                  <Badge className="bg-gray-500/10 text-gray-700">
                    Inactive
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {waiver.requiresSignature ? (
                  <CheckCircle className="size-4 text-green-600" />
                ) : (
                  <XCircle className="size-4 text-gray-400" />
                )}
              </TableCell>
              <TableCell>
                {waiver.expiryDays ? `${waiver.expiryDays} days` : "Never"}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(waiver.updatedAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Preview"
                    onClick={() => onPreview(waiver)}
                  >
                    <Eye className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Edit"
                    onClick={() => onEdit(waiver)}
                  >
                    <Edit className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Retire"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => onDelete(waiver)}
                  >
                    <Archive className="size-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function TemplateRows({
  items,
  onUse,
  onPreview,
  onEdit,
  onDelete,
}: {
  items: WaiverTemplate[];
  onUse: (t: WaiverTemplate) => void;
  onPreview: (t: WaiverTemplate) => void;
  onEdit: (t: WaiverTemplate) => void;
  onDelete: (t: WaiverTemplate) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Services</TableHead>
          <TableHead>Signature</TableHead>
          <TableHead>Expiry</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((template) => {
          const tags = getServices(template);
          return (
            <TableRow key={template.id}>
              <TableCell>
                <div className="space-y-0.5">
                  <p className="font-medium">{template.name}</p>
                  {template.description && (
                    <p className="text-muted-foreground line-clamp-1 text-xs">
                      {template.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {tags.map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className={SERVICE_BADGE[s]}
                    >
                      {SERVICE_LABEL[s]}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                {template.requiresSignature ? (
                  <CheckCircle className="size-4 text-green-600" />
                ) : (
                  <XCircle className="size-4 text-gray-400" />
                )}
              </TableCell>
              <TableCell>
                {template.expiryDays ? `${template.expiryDays} days` : "Never"}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(template.updatedAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onUse(template)}
                    className="h-7"
                  >
                    <Wand2 className="mr-1 size-3" />
                    Use
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Preview"
                    onClick={() => onPreview(template)}
                  >
                    <Eye className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Edit"
                    onClick={() => onEdit(template)}
                  >
                    <Edit className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Delete"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => onDelete(template)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        {icon}
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground max-w-md text-xs">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}

function StatTile({
  label,
  value,
  icon,
  valueClass,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{label}</p>
            <p className={`text-2xl font-bold ${valueClass ?? ""}`}>{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function SharedWaiversBanner() {
  const ctx = useLocationContext();
  if (!ctx.isMultiLocation) return null;
  const enabled = ctx.settings.sharedWaivers;
  return (
    <div
      className={
        "flex items-start gap-2.5 rounded-xl border px-4 py-2.5 text-sm " +
        (enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300"
          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-300")
      }
    >
      <Globe className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-semibold">
          {enabled
            ? "Shared waivers enabled — clients sign once, valid at every location"
            : "Per-location waivers — clients re-sign at every location they visit"}
        </p>
        <p className="text-xs">
          Toggle in HQ Settings → Cross-Location Features. Waiver version
          updates always require re-signing.
        </p>
      </div>
    </div>
  );
}
