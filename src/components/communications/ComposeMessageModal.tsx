"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Paperclip, X } from "lucide-react";
import { messageTemplates } from "@/data/communications-hub";
import { VariableInsertDropdown } from "@/components/shared/VariableInsertDropdown";
import { TemplatePreviewPanel } from "@/components/shared/TemplatePreviewPanel";
import { useInsertAtCursor } from "@/hooks/use-insert-at-cursor";
import {
  resolveTemplate,
  getMockPreviewData,
} from "@/lib/template-variable-resolver";
import { useAiText } from "@/hooks/use-ai-text";
import { AiGenerateButton } from "@/components/shared/AiGenerateButton";

interface ComposeMessageModalProps {
  onClose: () => void;
}

export function ComposeMessageModal({ onClose }: ComposeMessageModalProps) {
  const [formData, setFormData] = useState({
    type: "email" as "email" | "sms",
    to: "",
    subject: "",
    body: "",
    templateId: "",
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [activeField, setActiveField] = useState<"subject" | "body">("body");
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const handleTemplateSelect = (templateId: string) => {
    const template = messageTemplates.find((t) => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        templateId,
        type: template.type,
        subject: template.subject || "",
        body: template.body,
      });
    }
  };

  const handleFileAttach = () => {
    const mockFile = new File(["content"], "document.pdf", {
      type: "application/pdf",
    });
    setAttachments([...attachments, mockFile]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    console.log("Sending message:", formData, "Attachments:", attachments);
    onClose();
  };

  const activeRef = activeField === "subject" ? subjectRef : bodyRef;
  const activeValue = formData[activeField];
  const setActiveValue = useCallback(
    (newValue: string) => {
      setFormData((prev) => ({ ...prev, [activeField]: newValue }));
    },
    [activeField],
  );
  const handleInsertVariable = useInsertAtCursor(
    activeRef,
    activeValue,
    setActiveValue,
  );

  const aiBody = useAiText({
    type: formData.type === "sms" ? "sms_message" : "email_marketing",
    maxWords: formData.type === "sms" ? 30 : 150,
  });

  const availableTemplates = messageTemplates.filter(
    (t) => t.type === formData.type,
  );

  const hasVariables = formData.body.includes("{{");

  const estimatedSmsLength = useMemo(() => {
    if (formData.type !== "sms" || !hasVariables) return null;
    const resolved = resolveTemplate(formData.body, getMockPreviewData());
    return resolved.length;
  }, [formData.type, formData.body, hasVariables]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Compose Message</DialogTitle>
        <DialogDescription>
          Send an email or SMS message with optional templates and attachments
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Message Type */}
        <div className="space-y-2">
          <Label htmlFor="type">Message Type *</Label>
          <Select
            value={formData.type}
            onValueChange={(value: "email" | "sms") =>
              setFormData({
                ...formData,
                type: value,
                subject: value === "sms" ? "" : formData.subject,
              })
            }
          >
            <SelectTrigger aria-required="true">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Template Selection */}
        <div className="space-y-2">
          <Label htmlFor="template">Use Template (Optional)</Label>
          <Select
            value={formData.templateId}
            onValueChange={handleTemplateSelect}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a template or write from scratch" />
            </SelectTrigger>
            <SelectContent>
              {availableTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Recipient */}
        <div className="space-y-2">
          <Label htmlFor="to">
            {formData.type === "email" ? "Email Address" : "Phone Number"} *
          </Label>
          <Input
            id="to"
            aria-required="true"
            value={formData.to}
            onChange={(e) => setFormData({ ...formData, to: e.target.value })}
            placeholder={
              formData.type === "email"
                ? "recipient@example.com"
                : "+1234567890"
            }
          />
        </div>

        {/* Subject (Email only) */}
        {formData.type === "email" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="subject">Subject *</Label>
              {activeField === "subject" && (
                <VariableInsertDropdown
                  context="general"
                  onInsert={handleInsertVariable}
                />
              )}
            </div>
            <Input
              id="subject"
              ref={subjectRef}
              aria-required="true"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              onFocus={() => setActiveField("subject")}
              placeholder="Enter subject line"
            />
          </div>
        )}

        {/* Message Body */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="body">Message *</Label>
            <div className="flex items-center gap-1">
              <AiGenerateButton
                onClick={async () => {
                  const result = await aiBody.generate({
                    recipientName: formData.to,
                    channel: formData.type,
                    facilityName: "PawCare Facility",
                  });
                  if (result) setFormData({ ...formData, body: result });
                }}
                isGenerating={aiBody.isGenerating}
              />
              {(formData.type === "sms" || activeField === "body") && (
                <VariableInsertDropdown
                  context="general"
                  onInsert={handleInsertVariable}
                />
              )}
            </div>
          </div>
          <Textarea
            id="body"
            ref={bodyRef}
            aria-required="true"
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            onFocus={() => setActiveField("body")}
            placeholder="Enter your message..."
            rows={8}
            className="min-h-[180px] resize-y text-sm leading-7"
          />
          {formData.type === "sms" && (
            <div className="text-muted-foreground space-y-0.5 text-xs">
              <p>{formData.body.length} / 160 characters (template)</p>
              {estimatedSmsLength !== null && (
                <p
                  className={
                    estimatedSmsLength > 160 ? "font-medium text-amber-600" : ""
                  }
                >
                  ~{estimatedSmsLength} / 160 characters (estimated after
                  variables)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Template Preview */}
        {hasVariables && (
          <TemplatePreviewPanel
            template={formData.body}
            subject={formData.type === "email" ? formData.subject : undefined}
          />
        )}

        {/* File Attachments (Email only) */}
        {formData.type === "email" && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <Label>Attachments</Label>
                <Button variant="outline" size="sm" onClick={handleFileAttach}>
                  <Paperclip className="mr-2 size-4" />
                  Attach File
                </Button>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-sm border p-2"
                    >
                      <div className="flex items-center gap-2">
                        <Paperclip className="text-muted-foreground size-4" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${file.name}`}
                        onClick={() => handleRemoveAttachment(idx)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          disabled={
            !formData.to ||
            !formData.body ||
            (formData.type === "email" && !formData.subject)
          }
        >
          <Send className="mr-2 size-4" />
          Send {formData.type === "email" ? "Email" : "SMS"}
        </Button>
      </DialogFooter>
    </>
  );
}
