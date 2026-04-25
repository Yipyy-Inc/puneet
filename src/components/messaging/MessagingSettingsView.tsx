"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Smartphone,
  Mail,
  RefreshCw,
  Settings,
  AlertTriangle,
  Shield,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { messageTemplates as defaultTemplates } from "@/data/messaging";
import type { MessageTemplate, TemplateCategory } from "@/types/messaging";

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  booking: "bg-blue-100 text-blue-700 border-blue-200",
  boarding: "bg-emerald-100 text-emerald-700 border-emerald-200",
  grooming: "bg-pink-100 text-pink-700 border-pink-200",
  vaccination: "bg-amber-100 text-amber-700 border-amber-200",
  payment: "bg-red-100 text-red-700 border-red-200",
  general: "bg-slate-100 text-slate-600 border-slate-200",
};

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  booking: "Booking",
  boarding: "Boarding",
  grooming: "Grooming",
  vaccination: "Vaccination",
  payment: "Payment",
  general: "General",
};

const ALL_CATEGORIES: TemplateCategory[] = [
  "booking",
  "boarding",
  "grooming",
  "vaccination",
  "payment",
  "general",
];

const VARIABLES = ["{ClientName}", "{PetName}", "{NextAppointment}", "{Balance}", "{BookingLink}"];

// ── Template Editor ──────────────────────────────────────────────────

function TemplateEditor({
  template,
  onSave,
  onClose,
}: {
  template: Partial<MessageTemplate> | null;
  onSave: (t: MessageTemplate) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [category, setCategory] = useState<TemplateCategory>(template?.category ?? "general");
  const [smsBody, setSmsBody] = useState(template?.smsBody ?? "");
  const [emailSubject, setEmailSubject] = useState(template?.emailSubject ?? "");
  const [emailBody, setEmailBody] = useState(template?.emailBody ?? "");

  const save = () => {
    if (!name.trim() || (!smsBody.trim() && !emailBody.trim())) {
      toast.error("Please fill in the name and at least one message body");
      return;
    }
    onSave({
      id: template?.id ?? `tpl-${Date.now()}`,
      name,
      category,
      smsBody: smsBody || undefined,
      emailSubject: emailSubject || undefined,
      emailBody: emailBody || undefined,
      variables: VARIABLES.filter(
        (v) => smsBody.includes(v) || emailBody.includes(v),
      ),
    });
  };

  const insertVar = (v: string, field: "sms" | "email") => {
    if (field === "sms") setSmsBody((t) => t + v);
    else setEmailBody((t) => t + v);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Template Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Booking Confirmation"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* SMS body */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-2">
          <Smartphone className="size-3.5 text-blue-500" />
          SMS Body
        </Label>
        <Textarea
          value={smsBody}
          onChange={(e) => setSmsBody(e.target.value)}
          placeholder="SMS message text..."
          className="min-h-[80px] resize-none text-sm"
        />
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{smsBody.length} chars · {Math.ceil(smsBody.length / 160) || 0} segments</span>
          <div className="flex gap-1">
            {VARIABLES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertVar(v, "sms")}
                className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[9px] hover:border-blue-300 hover:text-blue-600"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-2">
          <Mail className="size-3.5 text-violet-500" />
          Email Subject
        </Label>
        <Input
          value={emailSubject}
          onChange={(e) => setEmailSubject(e.target.value)}
          placeholder="Email subject line..."
        />
      </div>
      <div className="space-y-1.5">
        <Label>Email Body</Label>
        <Textarea
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
          placeholder="Email body (plain text)..."
          className="min-h-[100px] resize-none text-sm"
        />
        <div className="flex justify-end gap-1">
          {VARIABLES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => insertVar(v, "email")}
              className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[9px] hover:border-violet-300 hover:text-violet-600"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save}>Save Template</Button>
      </div>
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────

export function MessagingSettingsView() {
  const [templates, setTemplates] = useState<MessageTemplate[]>(defaultTemplates);
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | "all">("all");
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  // General settings state
  const [autoSMSMissedCall, setAutoSMSMissedCall] = useState(true);
  const [autoReload, setAutoReload] = useState(true);
  const [liveChatEnabled, setLiveChatEnabled] = useState(false);
  const [businessHoursOnly, setBusinessHoursOnly] = useState(true);
  const [complianceNotice, setComplianceNotice] = useState(true);

  const filtered =
    categoryFilter === "all"
      ? templates
      : templates.filter((t) => t.category === categoryFilter);

  const saveTemplate = (t: MessageTemplate) => {
    setTemplates((prev) => {
      const idx = prev.findIndex((x) => x.id === t.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = t;
        return next;
      }
      return [...prev, t];
    });
    setEditingTemplate(null);
    toast.success(`Template "${t.name}" saved`);
  };

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success("Template deleted");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Messaging Settings</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configure templates, channels, and messaging behavior
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="size-4" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              id: "autoSMS",
              label: "Auto-SMS on Missed Call",
              description: "Send an automatic SMS when a call is missed",
              checked: autoSMSMissedCall,
              onChange: setAutoSMSMissedCall,
            },
            {
              id: "autoReload",
              label: "Auto-Reload SMS Credits",
              description: "Automatically top up credits when balance falls below threshold",
              checked: autoReload,
              onChange: setAutoReload,
            },
            {
              id: "compliance",
              label: "Compliance Recording Notice",
              description: "Notify clients that calls may be recorded",
              checked: complianceNotice,
              onChange: setComplianceNotice,
            },
            {
              id: "businessHours",
              label: "Send Only During Business Hours",
              description: "Hold scheduled messages until business hours",
              checked: businessHoursOnly,
              onChange: setBusinessHoursOnly,
            },
          ].map((setting) => (
            <div key={setting.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">{setting.label}</p>
                <p className="text-xs text-slate-400">{setting.description}</p>
              </div>
              <Switch
                checked={setting.checked}
                onCheckedChange={setting.onChange}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Live Chat */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4" />
            Live Chat Widget
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Enable Website Chat Widget</p>
              <p className="text-xs text-slate-400">Add a chat widget to your facility website</p>
            </div>
            <Switch checked={liveChatEnabled} onCheckedChange={setLiveChatEnabled} />
          </div>

          {liveChatEnabled && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Widget Color</Label>
                  <Input type="color" defaultValue="#3b82f6" className="h-9 cursor-pointer" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Greeting Message</Label>
                  <Input defaultValue="Hi! How can we help? 🐾" className="text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Offline Auto-Reply</Label>
                <Textarea
                  defaultValue="We're currently offline. Leave a message and we'll get back to you within 2 hours!"
                  className="min-h-[60px] resize-none text-sm"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-dashed border-blue-300 bg-blue-50 px-3 py-2.5">
                <p className="text-xs text-blue-700">
                  Copy and add this snippet to your website's{" "}
                  <code className="rounded bg-blue-100 px-1">{`</body>`}</code> tag
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-blue-300 text-xs text-blue-700 hover:bg-blue-100"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `<script src="https://doggieville.ca/widget.js" data-facility="dvm" async></script>`,
                    );
                    toast.success("Widget code copied to clipboard!");
                  }}
                >
                  Copy Code
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SMS Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="size-4" />
            SMS Credits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: "Plan Allowance", value: "1,000 / mo" },
              { label: "Remaining", value: "647", color: "text-blue-600" },
              { label: "Auto-reload", value: "ON" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-slate-50 py-4">
                <p className={cn("text-2xl font-bold", s.color ?? "text-slate-800")}>{s.value}</p>
                <p className="mt-1 text-xs text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="size-4 shrink-0 text-amber-500" />
            <p className="text-xs text-amber-700">
              Auto-reload: when credits fall below <strong>100</strong>, add{" "}
              <strong>500 credits ($20)</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Message Templates</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Reusable messages with variable support
            </p>
          </div>
          <Button
            className="gap-2"
            onClick={() => setEditingTemplate({ id: `tpl-new-${Date.now()}`, category: "general", name: "", variables: [] } as MessageTemplate)}
          >
            <Plus className="size-4" />
            New Template
          </Button>
        </div>

        {/* Category filter */}
        <div className="mb-4 flex gap-1.5 flex-wrap">
          {(["all", ...ALL_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter(c)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold capitalize transition-all",
                categoryFilter === c
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200",
              )}
            >
              {c === "all" ? "All" : CATEGORY_LABELS[c as TemplateCategory]}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((tpl) => (
            <Card key={tpl.id} className="group">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <FileText className="size-4 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{tpl.name}</span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            CATEGORY_COLORS[tpl.category],
                          )}
                        >
                          {CATEGORY_LABELS[tpl.category]}
                        </span>
                        <div className="flex gap-1">
                          {tpl.smsBody && (
                            <span className="flex items-center gap-0.5 text-[10px] text-blue-500">
                              <Smartphone className="size-2.5" /> SMS
                            </span>
                          )}
                          {tpl.emailBody && (
                            <span className="flex items-center gap-0.5 text-[10px] text-violet-500">
                              <Mail className="size-2.5" /> Email
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {tpl.smsBody ?? tpl.emailBody}
                      </p>
                      {tpl.variables.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {tpl.variables.map((v) => (
                            <span
                              key={v}
                              className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[9px] text-slate-500"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-full"
                      onClick={() => setEditingTemplate(tpl)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-full text-red-400 hover:bg-red-50 hover:text-red-600"
                      onClick={() => deleteTemplate(tpl.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed py-12 text-center">
              <FileText className="mx-auto mb-3 size-10 text-slate-200" />
              <p className="text-slate-400">No templates in this category</p>
            </div>
          )}
        </div>
      </div>

      {/* Template editor dialog */}
      <Dialog
        open={editingTemplate !== null}
        onOpenChange={(open) => { if (!open) setEditingTemplate(null); }}
      >
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-bold text-slate-900">
              {editingTemplate && defaultTemplates.find((t) => t.id === editingTemplate.id)
                ? "Edit Template"
                : "New Template"}
            </h2>
          </div>
          {editingTemplate !== null && (
            <TemplateEditor
              template={editingTemplate}
              onSave={saveTemplate}
              onClose={() => setEditingTemplate(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
