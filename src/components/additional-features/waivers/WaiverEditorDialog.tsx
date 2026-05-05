"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Heading1,
  Heading2,
  Type,
  List,
  Minus,
  Eye,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type DigitalWaiver,
  type WaiverBlock,
  type WaiverBlockColor,
  type WaiverBlockKind,
  type WaiverServiceTag,
} from "@/data/additional-features";
import { WaiverContentRenderer } from "./WaiverContentRenderer";

// Stable id generator for editor blocks.
let blockIdCounter = 0;
function newBlockId() {
  blockIdCounter += 1;
  return `b-${Date.now()}-${blockIdCounter}`;
}

const COLOR_OPTIONS: { value: WaiverBlockColor; label: string; swatch: string }[] =
  [
    { value: "default", label: "Default", swatch: "bg-slate-700" },
    { value: "muted", label: "Muted", swatch: "bg-slate-400" },
    { value: "red", label: "Red", swatch: "bg-red-500" },
    { value: "orange", label: "Orange", swatch: "bg-orange-500" },
    { value: "amber", label: "Amber", swatch: "bg-amber-500" },
    { value: "green", label: "Green", swatch: "bg-green-500" },
    { value: "blue", label: "Blue", swatch: "bg-blue-500" },
    { value: "purple", label: "Purple", swatch: "bg-purple-500" },
  ];

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

const MERGE_TOKENS: { token: string; label: string }[] = [
  { token: "{{customerName}}", label: "Customer Name" },
  { token: "{{petName}}", label: "Pet Name" },
  { token: "{{facilityName}}", label: "Facility Name" },
  { token: "{{services}}", label: "Services" },
  { token: "{{date}}", label: "Today's Date" },
];

function defaultBlocksForNew(): WaiverBlock[] {
  return [
    {
      id: newBlockId(),
      kind: "heading",
      text: "Untitled Waiver",
      bold: true,
      color: "blue",
    },
    {
      id: newBlockId(),
      kind: "paragraph",
      text: "I, {{customerName}}, agree to the terms below for {{petName}} at {{facilityName}}.",
    },
  ];
}

function blocksFromContent(content: string): WaiverBlock[] {
  // Convert legacy plain text into best-effort blocks.
  const lines = content.split("\n");
  const blocks: WaiverBlock[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      blocks.push({ id: newBlockId(), kind: "spacer", text: "" });
      continue;
    }
    const bold = /^\*\*(.+)\*\*$/.test(line);
    const stripped = bold ? line.replace(/^\*\*|\*\*$/g, "") : line;
    if (bold) {
      blocks.push({
        id: newBlockId(),
        kind: "subheading",
        text: stripped,
        bold: true,
        color: "blue",
      });
      continue;
    }
    const bullet = /^[-•]\s+/.test(line) || /^\d+\.\s+/.test(line);
    if (bullet) {
      blocks.push({
        id: newBlockId(),
        kind: "bullet",
        text: line.replace(/^[-•]\s+|^\d+\.\s+/, ""),
      });
      continue;
    }
    blocks.push({ id: newBlockId(), kind: "paragraph", text: line });
  }
  return blocks;
}

interface WaiverEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Waiver to edit; pass undefined for "create new". */
  waiver?: DigitalWaiver;
  /** Services available at this facility. */
  availableServices: WaiverServiceTag[];
  /** Facility brand name for live preview. */
  facilityName: string;
  onSave: (waiver: DigitalWaiver) => void;
}

export function WaiverEditorDialog({
  open,
  onOpenChange,
  waiver,
  availableServices,
  facilityName,
  onSave,
}: WaiverEditorDialogProps) {
  const isEdit = Boolean(waiver);

  const [name, setName] = useState("");
  const [services, setServices] = useState<WaiverServiceTag[]>([]);
  const [blocks, setBlocks] = useState<WaiverBlock[]>([]);
  const [version, setVersion] = useState("1.0");
  const [isActive, setIsActive] = useState(true);
  const [requiresSignature, setRequiresSignature] = useState(true);
  const [requireDigitalSignature, setRequireDigitalSignature] = useState(true);
  const [requiresWitness, setRequiresWitness] = useState(false);
  const [expiryDays, setExpiryDays] = useState<string>("365");
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  // Hydrate when opening.
  useEffect(() => {
    if (!open) return;
    if (waiver) {
      setName(waiver.name);
      setServices(waiver.services ?? [waiver.type]);
      setBlocks(
        waiver.blocks && waiver.blocks.length > 0
          ? waiver.blocks.map((b) => ({ ...b }))
          : blocksFromContent(waiver.content ?? ""),
      );
      setVersion(waiver.version);
      setIsActive(waiver.isActive);
      setRequiresSignature(waiver.requiresSignature);
      setRequireDigitalSignature(waiver.requireDigitalSignature);
      setRequiresWitness(waiver.requiresWitness);
      setExpiryDays(
        waiver.expiryDays !== undefined ? String(waiver.expiryDays) : "",
      );
    } else {
      setName("");
      setServices(
        availableServices.length > 0 ? [availableServices[0]] : ["general"],
      );
      setBlocks(defaultBlocksForNew());
      setVersion("1.0");
      setIsActive(true);
      setRequiresSignature(true);
      setRequireDigitalSignature(true);
      setRequiresWitness(false);
      setExpiryDays("365");
    }
    setTab("edit");
  }, [open, waiver, availableServices]);

  const serviceOptions = useMemo<WaiverServiceTag[]>(() => {
    const set = new Set<WaiverServiceTag>([
      ...availableServices,
      "general",
    ]);
    return Array.from(set);
  }, [availableServices]);

  const updateBlock = (id: string, patch: Partial<WaiverBlock>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    );
  };

  const addBlock = (kind: WaiverBlockKind) => {
    const defaults: Partial<WaiverBlock> =
      kind === "heading"
        ? { bold: true, color: "blue" }
        : kind === "subheading"
          ? { bold: true, color: "blue" }
          : {};
    setBlocks((prev) => [
      ...prev,
      { id: newBlockId(), kind, text: "", ...defaults },
    ]);
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = prev.slice();
      const [item] = copy.splice(idx, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const insertToken = (id: string, token: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, text: `${b.text}${token}` } : b)),
    );
  };

  const toggleService = (s: WaiverServiceTag) => {
    setServices((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const canSave =
    name.trim().length > 0 && services.length > 0 && blocks.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const now = new Date().toISOString();
    const expiry = expiryDays.trim() === "" ? undefined : Number(expiryDays);
    const cleanedBlocks = blocks.map(({ id, kind, text, color, bold, italic }) => ({
      id,
      kind,
      text,
      ...(color ? { color } : {}),
      ...(bold ? { bold } : {}),
      ...(italic ? { italic } : {}),
    }));
    const next: DigitalWaiver = {
      id: waiver?.id ?? `waiver-${Date.now()}`,
      name: name.trim(),
      type: services[0],
      services,
      content: cleanedBlocks
        .map((b) => (b.kind === "spacer" ? "" : b.text))
        .join("\n"),
      blocks: cleanedBlocks,
      version,
      isActive,
      requiresSignature,
      requireDigitalSignature,
      requiresWitness,
      expiryDays:
        expiry !== undefined && !Number.isNaN(expiry) && expiry > 0
          ? expiry
          : undefined,
      createdAt: waiver?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(next);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 sm:max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>
            {isEdit ? "Edit Waiver" : "Create Waiver"}
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "edit" | "preview")}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="px-6 pt-3">
            <TabsList className="grid w-fit grid-cols-2">
              <TabsTrigger value="edit" className="gap-1.5">
                <Pencil className="size-3.5" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-1.5">
                <Eye className="size-3.5" />
                Preview
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="edit"
            className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden"
          >
            <ScrollArea className="h-full">
              <div className="grid gap-6 px-6 py-4 lg:grid-cols-[1fr_320px]">
                {/* Left: blocks editor */}
                <div className="space-y-4">
                  <div className="grid grid-cols-[1fr_120px] gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="waiver-name">Waiver Name</Label>
                      <Input
                        id="waiver-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Boarding Liability Waiver"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="waiver-version">Version</Label>
                      <Input
                        id="waiver-version"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        placeholder="1.0"
                      />
                    </div>
                  </div>

                  {/* Services multi-select */}
                  <div className="space-y-1.5">
                    <Label>Applies to Services</Label>
                    <p className="text-muted-foreground text-xs">
                      Pick the services this waiver applies to. Tags shown to
                      customers will match.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {serviceOptions.map((s) => {
                        const active = services.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => toggleService(s)}
                            className={cn(
                              "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
                              active
                                ? SERVICE_BADGE[s]
                                : "border-slate-200 text-slate-500 hover:bg-slate-50",
                            )}
                          >
                            {SERVICE_LABEL[s]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground text-xs font-medium">
                      Add block:
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addBlock("heading")}
                    >
                      <Heading1 className="mr-1 size-3.5" />
                      Heading
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addBlock("subheading")}
                    >
                      <Heading2 className="mr-1 size-3.5" />
                      Subheading
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addBlock("paragraph")}
                    >
                      <Type className="mr-1 size-3.5" />
                      Paragraph
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addBlock("bullet")}
                    >
                      <List className="mr-1 size-3.5" />
                      Bullet
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addBlock("spacer")}
                    >
                      <Minus className="mr-1 size-3.5" />
                      Spacer
                    </Button>
                  </div>

                  {/* Blocks list */}
                  <div className="space-y-2">
                    {blocks.length === 0 && (
                      <div className="rounded-lg border border-dashed bg-slate-50 p-6 text-center text-xs text-slate-500">
                        No content yet. Use the toolbar above to add a heading,
                        paragraph, or bullet.
                      </div>
                    )}
                    {blocks.map((block, idx) => (
                      <BlockRow
                        key={block.id}
                        block={block}
                        canMoveUp={idx > 0}
                        canMoveDown={idx < blocks.length - 1}
                        onUpdate={(patch) => updateBlock(block.id, patch)}
                        onMove={(dir) => moveBlock(block.id, dir)}
                        onRemove={() => removeBlock(block.id)}
                        onInsertToken={(t) => insertToken(block.id, t)}
                      />
                    ))}
                  </div>
                </div>

                {/* Right: settings */}
                <div className="space-y-4">
                  <div className="rounded-lg border bg-slate-50/50 p-4 space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Settings
                    </p>

                    <ToggleRow
                      label="Active"
                      description="Visible to staff and customers"
                      checked={isActive}
                      onChange={setIsActive}
                    />
                    <ToggleRow
                      label="Requires Signature"
                      description="Customer must sign to accept"
                      checked={requiresSignature}
                      onChange={setRequiresSignature}
                    />
                    <ToggleRow
                      label="Digital Signature Pad"
                      description="Otherwise, a checkbox is enough"
                      checked={requireDigitalSignature}
                      onChange={setRequireDigitalSignature}
                      disabled={!requiresSignature}
                    />
                    <ToggleRow
                      label="Witness Required"
                      description="Captures a witness name + signature"
                      checked={requiresWitness}
                      onChange={setRequiresWitness}
                      disabled={!requiresSignature}
                    />

                    <div className="space-y-1.5">
                      <Label htmlFor="expiry-days" className="text-xs">
                        Expiry (days after signing)
                      </Label>
                      <Input
                        id="expiry-days"
                        type="number"
                        min={0}
                        placeholder="Leave blank for never"
                        value={expiryDays}
                        onChange={(e) => setExpiryDays(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border bg-blue-50/50 p-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                      Auto-fill tokens
                    </p>
                    <p className="text-xs text-slate-600">
                      Insert these in any block — they&apos;re replaced with
                      real values when a customer signs.
                    </p>
                    <ul className="space-y-1 text-xs">
                      {MERGE_TOKENS.map((t) => (
                        <li
                          key={t.token}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="text-slate-600">{t.label}</span>
                          <code className="rounded-sm bg-white px-1.5 py-0.5 font-mono text-[10px] text-blue-700">
                            {t.token}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent
            value="preview"
            className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden"
          >
            <ScrollArea className="h-full">
              <div className="mx-auto max-w-2xl space-y-3 p-6 ">
                <div className="flex flex-wrap items-center gap-2">
                  {services.map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className={SERVICE_BADGE[s]}
                    >
                      {SERVICE_LABEL[s]}
                    </Badge>
                  ))}
                  <Badge variant="outline">v{version}</Badge>
                </div>
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                  <WaiverContentRenderer
                    blocks={blocks}
                    context={{
                      customerName: "Sample Customer",
                      petName: "Buddy",
                      facilityName,
                      services,
                    }}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  Preview uses sample customer/pet data. Real values fill in at
                  signing time.
                </p>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEdit ? "Save Changes" : "Create Waiver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

function BlockRow({
  block,
  canMoveUp,
  canMoveDown,
  onUpdate,
  onMove,
  onRemove,
  onInsertToken,
}: {
  block: WaiverBlock;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onUpdate: (patch: Partial<WaiverBlock>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onInsertToken: (token: string) => void;
}) {
  const kindLabel: Record<WaiverBlockKind, string> = {
    heading: "Heading",
    subheading: "Subheading",
    paragraph: "Paragraph",
    bullet: "Bullet",
    spacer: "Spacer",
  };

  if (block.kind === "spacer") {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2">
        <span className="text-muted-foreground text-xs">— Spacer —</span>
        <BlockControls
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onMove={onMove}
          onRemove={onRemove}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-[10px]">
          {kindLabel[block.kind]}
        </Badge>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={block.bold ? "default" : "ghost"}
            className="size-7  p-0"
            onClick={() => onUpdate({ bold: !block.bold })}
            title="Bold"
          >
            <Bold className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={block.italic ? "default" : "ghost"}
            className="size-7  p-0"
            onClick={() => onUpdate({ italic: !block.italic })}
            title="Italic"
          >
            <Italic className="size-3.5" />
          </Button>
          <div className="mx-1 h-5 w-px bg-slate-200" />
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onUpdate({ color: c.value })}
              title={c.label}
              className={cn(
                "size-4 rounded-full border-2 transition",
                c.swatch,
                (block.color ?? "default") === c.value
                  ? "border-slate-900 ring-1 ring-slate-300"
                  : "border-white",
              )}
            />
          ))}
          <div className="mx-1 h-5 w-px bg-slate-200" />
          <BlockControls
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onMove={onMove}
            onRemove={onRemove}
          />
        </div>
      </div>

      <Textarea
        value={block.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        rows={block.kind === "paragraph" ? 3 : 2}
        placeholder={
          block.kind === "heading"
            ? "Heading text"
            : block.kind === "subheading"
              ? "Subheading text"
              : block.kind === "bullet"
                ? "Bullet item"
                : "Paragraph text. Use {{customerName}}, {{petName}}, {{facilityName}}, {{date}}..."
        }
        className={cn(
          "resize-none",
          block.kind === "heading" && "text-base font-semibold",
          block.kind === "subheading" && "text-sm font-semibold",
        )}
      />

      <div className="flex flex-wrap gap-1">
        {MERGE_TOKENS.map((t) => (
          <button
            key={t.token}
            type="button"
            onClick={() => onInsertToken(t.token)}
            className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-blue-50 hover:text-blue-700"
          >
            <Plus className="mr-0.5 inline size-2.5" />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BlockControls({
  canMoveUp,
  canMoveDown,
  onMove,
  onRemove,
}: {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="size-7  p-0"
        onClick={() => onMove(-1)}
        disabled={!canMoveUp}
        title="Move up"
      >
        <ChevronUp className="size-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="size-7  p-0"
        onClick={() => onMove(1)}
        disabled={!canMoveDown}
        title="Move down"
      >
        <ChevronDown className="size-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="size-7  p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={onRemove}
        title="Delete"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </>
  );
}
