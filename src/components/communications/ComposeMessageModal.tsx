"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Send, Paperclip, X } from "lucide-react";
import { messageTemplates } from "@/data/communications-hub";

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
    // In a real app, would open file picker
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

  const availableTemplates = messageTemplates.filter(
    (t) => t.type === formData.type,
  );

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
            onValueChange={(value: any) =>
              setFormData({
                ...formData,
                type: value,
                subject: value === "sms" ? "" : formData.subject,
              })
            }
          >
            <SelectTrigger>
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
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              placeholder="Enter subject line"
            />
          </div>
        )}

        {/* Message Body */}
        <div className="space-y-2">
          <Label htmlFor="body">Message *</Label>
          <Textarea
            id="body"
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            placeholder="Enter your message..."
            rows={formData.type === "sms" ? 5 : 10}
          />
          {formData.type === "sms" && (
            <p className="text-xs text-muted-foreground">
              {formData.body.length} / 160 characters
            </p>
          )}
        </div>

        {/* File Attachments (Email only) */}
        {formData.type === "email" && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <Label>Attachments</Label>
                <Button variant="outline" size="sm" onClick={handleFileAttach}>
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attach File
                </Button>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAttachment(idx)}
                      >
                        <X className="h-4 w-4" />
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
          <Send className="h-4 w-4 mr-2" />
          Send {formData.type === "email" ? "Email" : "SMS"}
        </Button>
      </DialogFooter>
    </>
  );
}
