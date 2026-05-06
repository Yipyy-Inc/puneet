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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
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

const DEFAULT_CONTENT = `**Untitled Template**

I, {{customerName}}, agree to the terms below for {{petName}} at {{facilityName}}.

- Add your reusable terms here.

**Acknowledgement**

By signing below, I confirm I have read and agree to these terms.`;

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: WaiverTemplate;
  availableServices: WaiverServiceTag[];
  categories: WaiverCategory[];
  onSave: (template: WaiverTemplate) => void;
}

export function TemplateEditorDialog({
  open,
  onOpenChange,
  template,
  availableServices,
  categories,
  onSave,
}: TemplateEditorDialogProps) {
  const isEdit = Boolean(template);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState<WaiverServiceTag[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [content, setContent] = useState("");
  const [requiresSignature, setRequiresSignature] = useState(true);
  const [requireDigitalSignature, setRequireDigitalSignature] = useState(true);
  const [requiresWitness, setRequiresWitness] = useState(false);
  const [expiryDays, setExpiryDays] = useState("365");

  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    if (template) {
      setName(template.name);
      setDescription(template.description ?? "");
      setServices(template.services ?? [template.type]);
      setCategoryId(template.categoryId ?? "");
      setContent(template.content);
      setRequiresSignature(template.requiresSignature);
      setRequireDigitalSignature(template.requireDigitalSignature);
      setRequiresWitness(template.requiresWitness);
      setExpiryDays(
        template.expiryDays !== undefined ? String(template.expiryDays) : "",
      );
    } else {
      setName("");
      setDescription("");
      setServices(
        availableServices.length > 0 ? [availableServices[0]] : ["general"],
      );
      setCategoryId("");
      setContent(DEFAULT_CONTENT);
      setRequiresSignature(true);
      setRequireDigitalSignature(true);
      setRequiresWitness(false);
      setExpiryDays("365");
    }
  }, [open, template, availableServices]);

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
    name.trim().length > 0 &&
    services.length > 0 &&
    content.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const now = new Date().toISOString();
    const expiryNum = expiryDays.trim() === "" ? undefined : Number(expiryDays);
    const next: WaiverTemplate = {
      id: template?.id ?? `tpl-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      type: services[0],
      services,
      content,
      blocks: blocksFromContent(content),
      requiresSignature,
      requireDigitalSignature,
      requiresWitness,
      expiryDays:
        expiryNum !== undefined && !Number.isNaN(expiryNum) && expiryNum > 0
          ? expiryNum
          : undefined,
      categoryId: categoryId || undefined,
      createdAt: template?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(next);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>
            {isEdit ? "Edit Template" : "Create Template"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 px-6 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Boarding Liability Starter"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-description">Description</Label>
              <Textarea
                id="tpl-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this template is for. Shown in the templates list."
                rows={2}
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
              <Label htmlFor="tpl-category">Category</Label>
              <Select
                value={categoryId || "__auto"}
                onValueChange={(v) => setCategoryId(v === "__auto" ? "" : v)}
              >
                <SelectTrigger id="tpl-category">
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
              <Label htmlFor="tpl-content">
                Content <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="tpl-content"
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={14}
                className="font-mono text-sm leading-relaxed"
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
                Tip: <code>**section title**</code>, <code>-&nbsp;item</code>{" "}
                for bullets, blank lines for spacing.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Default settings
              </p>
              <p className="text-muted-foreground text-xs">
                Inherited when applying this template to a new waiver.
              </p>

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
                <Label htmlFor="tpl-expiry-days" className="text-sm">
                  Expiry (days after signing)
                </Label>
                <Input
                  id="tpl-expiry-days"
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

        <DialogFooter className="border-t px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEdit ? "Save Changes" : "Create Template"}
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
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
