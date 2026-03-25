"use client";

import { useState, useRef, useCallback } from "react";
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
import { MessageSquare } from "lucide-react";
import { VariableInsertDropdown } from "@/components/shared/VariableInsertDropdown";
import { TemplatePreviewPanel } from "@/components/shared/TemplatePreviewPanel";
import { useInsertAtCursor } from "@/hooks/use-insert-at-cursor";
import type { QuickReplyCategory } from "@/data/quick-replies";

interface QuickReplyModalProps {
  onClose: () => void;
}

export function QuickReplyModal({ onClose }: QuickReplyModalProps) {
  const [formData, setFormData] = useState<{
    name: string;
    body: string;
    category: QuickReplyCategory;
  }>({
    name: "",
    body: "",
    category: "general",
  });

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const setBody = useCallback(
    (v: string) => setFormData((prev) => ({ ...prev, body: v })),
    [],
  );
  const insertVariable = useInsertAtCursor(bodyRef, formData.body, setBody);

  const handleSave = () => {
    console.log("Saving quick reply:", formData);
    onClose();
  };

  const hasVariables = formData.body.includes("{{");

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Quick Reply</DialogTitle>
        <DialogDescription>
          Create a reusable quick reply template for chat and SMS conversations
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="qr-name">Name *</Label>
          <Input
            id="qr-name"
            aria-required="true"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="e.g., Greeting, Booking Confirmed"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="qr-category">Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value: QuickReplyCategory) =>
              setFormData((prev) => ({ ...prev, category: value }))
            }
          >
            <SelectTrigger aria-required="true">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="booking">Booking</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="support">Support</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="qr-body">Message *</Label>
            <VariableInsertDropdown
              context="general"
              onInsert={insertVariable}
            />
          </div>
          <Textarea
            id="qr-body"
            ref={bodyRef}
            aria-required="true"
            value={formData.body}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, body: e.target.value }))
            }
            placeholder="Hi {{customer_first_name}}! Thanks for reaching out..."
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            {formData.body.length} characters
          </p>
        </div>

        {hasVariables && (
          <TemplatePreviewPanel template={formData.body} />
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!formData.name || !formData.body}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Save Quick Reply
        </Button>
      </DialogFooter>
    </>
  );
}
