"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  type DigitalWaiver,
  type WaiverCategory,
  type WaiverServiceTag,
  type WaiverTemplate,
} from "@/data/additional-features";
import { blocksFromContent, MERGE_TOKENS } from "./editor-shared";

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

const DEFAULT_CONTENT = `**Untitled Waiver**

I, {{customerName}}, agree to the terms below for {{petName}} at {{facilityName}}.

- Add your terms here using bullet points.
- Use blank lines to separate sections.

**Acknowledgement**

By signing below, I confirm I have read and agree to the terms above on {{date}}.`;

interface WaiverEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Waiver to edit; pass undefined for "create new". */
  waiver?: DigitalWaiver;
  /** When set (and `waiver` is undefined), seed the form from this template. */
  initialFromTemplate?: WaiverTemplate;
  /** Services available at this facility. */
  availableServices: WaiverServiceTag[];
  /** Facility brand name (kept for API compatibility). */
  facilityName: string;
  /** Categories available for assignment. */
  categories: WaiverCategory[];
  onSave: (waiver: DigitalWaiver) => void;
  /** When provided, an "Also save as template" checkbox appears. Called with
   *  the same content/settings packaged as a template. */
  onSaveTemplate?: (template: WaiverTemplate) => void;
}

export function WaiverEditorDialog({
  open,
  onOpenChange,
  waiver,
  initialFromTemplate,
  availableServices,
  categories,
  onSave,
  onSaveTemplate,
}: WaiverEditorDialogProps) {
  const isEdit = Boolean(waiver);

  const [name, setName] = useState("");
  const [services, setServices] = useState<WaiverServiceTag[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [requiresSignature, setRequiresSignature] = useState(true);
  const [requireDigitalSignature, setRequireDigitalSignature] = useState(true);
  const [requiresWitness, setRequiresWitness] = useState(false);
  const [expiryDays, setExpiryDays] = useState("365");
  const [alsoSaveTemplate, setAlsoSaveTemplate] = useState(false);

  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    if (waiver) {
      setName(waiver.name);
      setServices(waiver.services ?? [waiver.type]);
      setCategoryId(waiver.categoryId ?? "");
      setContent(waiver.content ?? "");
      setIsActive(waiver.isActive);
      setRequiresSignature(waiver.requiresSignature);
      setRequireDigitalSignature(waiver.requireDigitalSignature);
      setRequiresWitness(waiver.requiresWitness);
      setExpiryDays(
        waiver.expiryDays !== undefined ? String(waiver.expiryDays) : "",
      );
    } else if (initialFromTemplate) {
      setName(initialFromTemplate.name);
      setServices(initialFromTemplate.services ?? [initialFromTemplate.type]);
      setCategoryId(initialFromTemplate.categoryId ?? "");
      setContent(initialFromTemplate.content);
      setIsActive(true);
      setRequiresSignature(initialFromTemplate.requiresSignature);
      setRequireDigitalSignature(initialFromTemplate.requireDigitalSignature);
      setRequiresWitness(initialFromTemplate.requiresWitness);
      setExpiryDays(
        initialFromTemplate.expiryDays !== undefined
          ? String(initialFromTemplate.expiryDays)
          : "",
      );
    } else {
      setName("");
      setServices(
        availableServices.length > 0 ? [availableServices[0]] : ["general"],
      );
      setCategoryId("");
      setContent(DEFAULT_CONTENT);
      setIsActive(true);
      setRequiresSignature(true);
      setRequireDigitalSignature(true);
      setRequiresWitness(false);
      setExpiryDays("365");
    }
    setAlsoSaveTemplate(false);
  }, [open, waiver, initialFromTemplate, availableServices]);

  const serviceOptions = useMemo<WaiverServiceTag[]>(() => {
    const set = new Set<WaiverServiceTag>([...availableServices, "general"]);
    return Array.from(set);
  }, [availableServices]);

  const toggleService = (s: WaiverServiceTag) => {
    setServices((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const insertToken = (token: string) => {
    const ta = contentRef.current;
    if (!ta) {
      setContent((c) => `${c}${token}`);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = content.slice(0, start) + token + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = start + token.length;
      ta.setSelectionRange(cursor, cursor);
    });
  };

  const canSave =
    name.trim().length > 0 && services.length > 0 && content.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const now = new Date().toISOString();
    const expiryNum = expiryDays.trim() === "" ? undefined : Number(expiryDays);
    const expiry =
      expiryNum !== undefined && !Number.isNaN(expiryNum) && expiryNum > 0
        ? expiryNum
        : undefined;
    const blocks = blocksFromContent(content);
    const next: DigitalWaiver = {
      id: waiver?.id ?? `waiver-${Date.now()}`,
      name: name.trim(),
      type: services[0],
      services,
      content,
      blocks,
      version: waiver?.version ?? "1.0",
      isActive,
      requiresSignature,
      requireDigitalSignature,
      requiresWitness,
      expiryDays: expiry,
      categoryId: categoryId || undefined,
      createdAt: waiver?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(next);
    if (alsoSaveTemplate && onSaveTemplate) {
      onSaveTemplate({
        id: `tpl-${Date.now() + 1}`,
        name: name.trim(),
        type: services[0],
        services,
        content,
        blocks,
        requiresSignature,
        requireDigitalSignature,
        requiresWitness,
        expiryDays: expiry,
        categoryId: categoryId || undefined,
        createdAt: now,
        updatedAt: now,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{isEdit ? "Edit Waiver" : "Create Waiver"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 px-6 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="waiver-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="waiver-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Boarding Liability Waiver"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Applies to <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {serviceOptions.map((s) => {
                  const active = services.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleService(s)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
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

            <div className="space-y-1.5">
              <Label htmlFor="waiver-category">Category</Label>
              <Select
                value={categoryId || "__auto"}
                onValueChange={(v) => setCategoryId(v === "__auto" ? "" : v)}
              >
                <SelectTrigger id="waiver-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto">
                    Auto (match by service)
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="waiver-content">
                Content <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="waiver-content"
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={14}
                className="font-mono text-sm/relaxed"
                placeholder="Write the waiver text. Use **bold lines** for section titles and `- item` for bullets."
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground text-xs">
                  Insert auto-fill:
                </span>
                {MERGE_TOKENS.map((t) => (
                  <button
                    key={t.token}
                    type="button"
                    onClick={() => insertToken(t.token)}
                    className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                Tip: wrap a line in <code>**double asterisks**</code> for a
                section title, start a line with <code>-&nbsp;</code> for a
                bullet, leave a blank line for spacing.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
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

              <div className="space-y-1.5 pt-1">
                <Label htmlFor="expiry-days" className="text-sm">
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
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col gap-2 border-t px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          {onSaveTemplate ? (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Checkbox
                checked={alsoSaveTemplate}
                onCheckedChange={(v) => setAlsoSaveTemplate(v === true)}
              />
              Also save as template
            </label>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {isEdit ? "Save Changes" : "Create Waiver"}
            </Button>
          </div>
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
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
