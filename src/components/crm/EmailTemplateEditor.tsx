"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Mail,
  Eye,
  Copy,
  Edit2,
  Trash2,
  Plus,
  Save,
  X,
  Variable,
  Send,
} from "lucide-react";
import {
  EmailTemplate,
  EmailTemplateType,
  emailTemplates,
  renderTemplate,
} from "@/data/crm/email-templates";

interface EmailTemplateEditorProps {
  template?: EmailTemplate;
  onSave?: (template: Partial<EmailTemplate>) => void;
  onCancel?: () => void;
  mode?: "create" | "edit";
}

export function EmailTemplateEditor({
  template,
  onSave,
  onCancel,
  mode = "create",
}: EmailTemplateEditorProps) {
  const [name, setName] = useState(template?.name || "");
  const [type, setType] = useState<EmailTemplateType>(
    template?.type || "followup",
  );
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");
  const [showPreview, setShowPreview] = useState(false);

  const typeLabels: Record<EmailTemplateType, string> = {
    welcome: "Welcome",
    demo_invite: "Demo Invitation",
    demo_followup: "Demo Follow-up",
    proposal: "Proposal",
    followup: "General Follow-up",
    onboarding: "Onboarding",
    check_in: "Check-in",
  };

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = text.matchAll(regex);
    const variables = new Set<string>();
    for (const match of matches) {
      variables.add(match[1]);
    }
    return Array.from(variables);
  };

  const allVariables = [
    ...extractVariables(subject),
    ...extractVariables(body),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const insertVariable = (variable: string, target: "subject" | "body") => {
    const insertion = `{{${variable}}}`;
    if (target === "subject") {
      setSubject((prev) => prev + insertion);
    } else {
      setBody((prev) => prev + insertion);
    }
  };

  const commonVariables = [
    "contactName",
    "facilityName",
    "senderName",
    "senderTitle",
    "demoDate",
    "demoTime",
  ];

  const handleSave = () => {
    onSave?.({
      name,
      type,
      subject,
      body,
      variables: allVariables,
      isActive: true,
    });
  };

  // Sample values for preview
  const sampleValues: Record<string, string> = {
    contactName: "John Smith",
    facilityName: "Happy Paws Resort",
    senderName: "Sarah Johnson",
    senderTitle: "Account Executive",
    demoDate: "January 25, 2025",
    demoTime: "2:00 PM EST",
    demoDuration: "30",
    services: "Boarding, Daycare, Grooming",
    meetingPlatform: "Zoom",
    recommendedTier: "Pro",
    tierFeatures:
      "• Up to 20 staff users\n• Advanced booking & scheduling\n• Financial management tools",
    proposalExpiry: "February 15, 2025",
    selectedTier: "Pro",
    monthlyPrice: "$79",
    annualPrice: "$849",
    annualSavings: "$99",
    includedModules: "Booking, Customer Management, Financial Reporting",
    proposalDetails: "Full access to all Pro features with priority support",
    specialOffer: "Sign up before Feb 1st and get 2 months free!",
    signupLink: "https://petcare.com/signup/abc123",
    customMessage:
      "I wanted to check if you had any questions about the demo we conducted last week.",
    followupDuration: "15",
    postscript: "Our current promotion ends this Friday - don't miss out!",
    loginUrl: "https://app.petcare.com",
    username: "john@happypaws.com",
    trainingLink: "https://petcare.com/schedule-training",
    accountManager: "Sarah Johnson",
    gettingStartedLink: "https://petcare.com/docs/getting-started",
    tutorialsLink: "https://petcare.com/tutorials",
    helpCenterLink: "https://help.petcare.com",
    daysSinceOnboarding: "14",
    usageStats:
      "• 125 bookings created\n• 45 clients added\n• 8 staff members active",
    observation: "you haven't set up automated reminders yet",
    suggestion:
      "This feature can save your team hours each week - would you like a quick walkthrough?",
    demoSummary:
      "• Reviewed booking module and check-in process\n• Demonstrated client management features\n• Showed reporting capabilities",
  };

  const previewContent = renderTemplate(
    {
      id: "",
      name,
      type,
      subject,
      body,
      variables: allVariables,
      isActive: true,
      createdAt: "",
      updatedAt: "",
    },
    sampleValues,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="template-name">Template Name</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Welcome Email V2"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="template-type">Template Type</Label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as EmailTemplateType)}
          >
            <SelectTrigger id="template-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(typeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="subject">Subject Line</Label>
          <div className="flex gap-1">
            {commonVariables.slice(0, 3).map((v) => (
              <Button
                key={v}
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => insertVariable(v, "subject")}
              >
                <Variable className="h-3 w-3 mr-1" />
                {v}
              </Button>
            ))}
          </div>
        </div>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter email subject..."
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="body">Email Body</Label>
          <div className="flex gap-1 flex-wrap justify-end">
            {commonVariables.map((v) => (
              <Button
                key={v}
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => insertVariable(v, "body")}
              >
                <Variable className="h-3 w-3 mr-1" />
                {v}
              </Button>
            ))}
          </div>
        </div>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Enter email body..."
          className="min-h-[300px] font-mono text-sm"
        />
      </div>

      {allVariables.length > 0 && (
        <div className="space-y-2">
          <Label>Detected Variables</Label>
          <div className="flex flex-wrap gap-2">
            {allVariables.map((v) => (
              <Badge key={v} variant="secondary">
                {`{{${v}}}`}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={() => setShowPreview(true)}>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {mode === "create" ? "Create Template" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Subject:</div>
              <div className="font-medium">{previewContent.subject}</div>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-2">Body:</div>
              <div className="whitespace-pre-wrap text-sm">
                {previewContent.body}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EmailTemplateListProps {
  templates?: EmailTemplate[];
  onEdit?: (template: EmailTemplate) => void;
  onDelete?: (template: EmailTemplate) => void;
  onSend?: (template: EmailTemplate) => void;
  onDuplicate?: (template: EmailTemplate) => void;
}

export function EmailTemplateList({
  templates = emailTemplates,
  onEdit,
  onDelete,
  onSend,
  onDuplicate,
}: EmailTemplateListProps) {
  const typeLabels: Record<EmailTemplateType, string> = {
    welcome: "Welcome",
    demo_invite: "Demo Invitation",
    demo_followup: "Demo Follow-up",
    proposal: "Proposal",
    followup: "Follow-up",
    onboarding: "Onboarding",
    check_in: "Check-in",
  };

  const typeColors: Record<EmailTemplateType, string> = {
    welcome: "bg-green-100 text-green-800",
    demo_invite: "bg-blue-100 text-blue-800",
    demo_followup: "bg-purple-100 text-purple-800",
    proposal: "bg-amber-100 text-amber-800",
    followup: "bg-gray-100 text-gray-800",
    onboarding: "bg-emerald-100 text-emerald-800",
    check_in: "bg-cyan-100 text-cyan-800",
  };

  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-lg font-medium">No email templates</p>
        <p className="text-sm">Create your first template to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Card key={template.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-medium truncate">
                  {template.name}
                </CardTitle>
                <Badge
                  variant="secondary"
                  className={`mt-1 text-xs ${typeColors[template.type]}`}
                >
                  {typeLabels[template.type]}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                {onSend && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onSend(template)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(template)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Subject:</span>{" "}
                <span className="truncate block">{template.subject}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {template.body.substring(0, 100)}...
              </p>
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex flex-wrap gap-1">
                  {template.variables.slice(0, 3).map((v) => (
                    <Badge key={v} variant="outline" className="text-[10px]">
                      {v}
                    </Badge>
                  ))}
                  {template.variables.length > 3 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{template.variables.length - 3}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {onDuplicate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onDuplicate(template)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => onDelete(template)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface SendEmailDialogProps {
  template: EmailTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend?: (template: EmailTemplate, values: Record<string, string>) => void;
  recipientEmail?: string;
  recipientName?: string;
}

export function SendEmailDialog({
  template,
  open,
  onOpenChange,
  onSend,
  recipientEmail = "",
  recipientName = "",
}: SendEmailDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({
    contactName: recipientName,
  });

  if (!template) return null;

  const handleSend = () => {
    onSend?.(template, values);
    onOpenChange(false);
  };

  const preview = renderTemplate(template, values);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Email: {template.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Recipient Email</Label>
            <Input value={recipientEmail} readOnly className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label>Fill in Variables</Label>
            <div className="grid gap-3 md:grid-cols-2">
              {template.variables.map((variable) => (
                <div key={variable} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {variable}
                  </Label>
                  <Input
                    value={values[variable] || ""}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [variable]: e.target.value,
                      }))
                    }
                    placeholder={`Enter ${variable}...`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div>
                <span className="text-xs text-muted-foreground">Subject: </span>
                <span className="text-sm font-medium">{preview.subject}</span>
              </div>
              <div className="border-t pt-3">
                <div className="whitespace-pre-wrap text-sm">
                  {preview.body}
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend}>
            <Send className="h-4 w-4 mr-2" />
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
