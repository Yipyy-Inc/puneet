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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Eye } from "lucide-react";

interface EmailTemplateModalProps {
  template?: any;
  onClose: () => void;
}

export function EmailTemplateModal({
  template,
  onClose,
}: EmailTemplateModalProps) {
  const [formData, setFormData] = useState({
    name: template?.name || "",
    subject: template?.subject || "",
    body: template?.body || "",
    category: template?.category || "promotional",
  });

  const [previewMode, setPreviewMode] = useState(false);

  const availableVariables = [
    "{{client_name}}",
    "{{pet_name}}",
    "{{facility_name}}",
    "{{service_type}}",
    "{{appointment_time}}",
    "{{booking_date}}",
  ];

  const handleSave = () => {
    console.log("Saving template:", formData);
    onClose();
  };

  const insertVariable = (variable: string) => {
    setFormData({
      ...formData,
      body: formData.body + " " + variable,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {template ? "Edit Email Template" : "Create Email Template"}
        </DialogTitle>
        <DialogDescription>
          Create reusable email templates with dynamic variables
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {!previewMode ? (
          <>
            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Welcome New Client"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="promotional">Promotional</SelectItem>
                  <SelectItem value="transactional">Transactional</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subject Line */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="e.g., Welcome to {{facility_name}}!"
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="body">Email Body *</Label>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) =>
                  setFormData({ ...formData, body: e.target.value })
                }
                placeholder="Enter your email content here..."
                rows={10}
              />
            </div>

            {/* Available Variables */}
            <Card>
              <CardContent className="pt-6">
                <Label className="text-sm font-medium">
                  Available Variables
                </Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Click to insert into email body
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableVariables.map((variable) => (
                    <Badge
                      key={variable}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => insertVariable(variable)}
                    >
                      {variable}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">From:</Label>
                  <div className="font-medium">
                    {"{{facility_name}}"} &lt;noreply@facility.com&gt;
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Subject:
                  </Label>
                  <div className="font-medium">{formData.subject}</div>
                </div>
                <div className="border-t pt-4">
                  <div className="whitespace-pre-wrap">{formData.body}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <DialogFooter>
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? "Edit" : "Preview"}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name || !formData.subject || !formData.body}
            >
              <Mail className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </div>
        </div>
      </DialogFooter>
    </>
  );
}
