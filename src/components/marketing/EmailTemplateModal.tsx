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
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Eye, ChevronDown, Gift, MousePointerClick } from "lucide-react";
import type { EmailTemplate } from "@/data/marketing";
import { facilityBranding, EMAIL_USE_CASE_OPTIONS } from "@/data/marketing";
import { getContrastTextColor, hexToRgba } from "@/lib/color-utils";
import { VariableInsertDropdown } from "@/components/shared/VariableInsertDropdown";
import { useInsertAtCursor } from "@/hooks/use-insert-at-cursor";

interface EmailTemplateModalProps {
  template?: EmailTemplate | null;
  onClose: () => void;
}

const BRAND_TEXT_COLOR = getContrastTextColor(facilityBranding.primaryColor);

export function EmailTemplateModal({ template, onClose }: EmailTemplateModalProps) {
  const [formData, setFormData] = useState({
    name: template?.name || "",
    subject: template?.subject || "",
    body: template?.body || "",
    category: template?.category || "promotional",
    useCase: template?.useCase || ("" as string),
    offerHeadline: template?.offerSection?.headline || "",
    offerDescription: template?.offerSection?.description || "",
    offerCode: template?.offerSection?.code || "",
    offerExpiryDays: template?.offerSection?.expiryDays?.toString() || "",
    buttonText: template?.buttonText || "",
    buttonLink: template?.buttonLink || "",
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [offerOpen, setOfferOpen] = useState(!!template?.offerSection);
  const [activeField, setActiveField] = useState<"subject" | "body">("body");
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = () => {
    console.log("Saving template:", formData);
    onClose();
  };

  const update = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const activeRef = activeField === "subject" ? subjectRef : bodyRef;
  const activeValue = formData[activeField];
  const setActiveValue = useCallback(
    (newValue: string) => {
      setFormData((prev) => ({ ...prev, [activeField]: newValue }));
    },
    [activeField],
  );
  const insertVariable = useInsertAtCursor(activeRef, activeValue, setActiveValue);

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {template ? "Edit Email Template" : "Create Email Template"}
        </DialogTitle>
        <DialogDescription>
          Create reusable email templates with dynamic variables and branded preview
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[70vh]">
        <div className="space-y-6 py-4 pr-4">
          {!previewMode ? (
            <>
              {/* Name + Use Case row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    aria-required="true"
                    value={formData.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="e.g., Welcome New Client"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Use Case</Label>
                  <Select value={formData.useCase} onValueChange={(v) => update("useCase", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select use case..." />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_USE_CASE_OPTIONS.map((uc) => (
                        <SelectItem key={uc.value} value={uc.value}>
                          {uc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(v) => update("category", v)}>
                  <SelectTrigger aria-required="true">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="subject">Subject Line *</Label>
                  <VariableInsertDropdown
                    context="marketing"
                    onInsert={insertVariable}
                  />
                </div>
                <Input
                  id="subject"
                  ref={subjectRef}
                  aria-required="true"
                  value={formData.subject}
                  onChange={(e) => update("subject", e.target.value)}
                  onFocus={() => setActiveField("subject")}
                  placeholder="e.g., Welcome to {{facility_name}}!"
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label htmlFor="body">Email Body *</Label>
                <Textarea
                  id="body"
                  ref={bodyRef}
                  aria-required="true"
                  value={formData.body}
                  onChange={(e) => update("body", e.target.value)}
                  onFocus={() => setActiveField("body")}
                  placeholder="Enter your email content here..."
                  rows={8}
                />
              </div>

              {/* Offer Section (Collapsible) */}
              <Collapsible open={offerOpen} onOpenChange={setOfferOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      Offer / Promotion Section
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${offerOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Offer Headline</Label>
                      <Input
                        value={formData.offerHeadline}
                        onChange={(e) => update("offerHeadline", e.target.value)}
                        placeholder="e.g., Welcome Offer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Promo Code</Label>
                      <Input
                        value={formData.offerCode}
                        onChange={(e) => update("offerCode", e.target.value)}
                        placeholder="e.g., WELCOME10"
                        className="font-mono uppercase"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Offer Description</Label>
                    <Input
                      value={formData.offerDescription}
                      onChange={(e) => update("offerDescription", e.target.value)}
                      placeholder="e.g., 10% off your first booking"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Expires in (days)</Label>
                    <Input
                      type="number"
                      value={formData.offerExpiryDays}
                      onChange={(e) => update("offerExpiryDays", e.target.value)}
                      placeholder="e.g., 30"
                      className="w-32"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* CTA Button Section */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <MousePointerClick className="h-3.5 w-3.5" />
                    Call-to-Action Button
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Button Text</Label>
                      <Input
                        value={formData.buttonText}
                        onChange={(e) => update("buttonText", e.target.value)}
                        placeholder="e.g., Book Now"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Button Link</Label>
                      <Input
                        value={formData.buttonLink}
                        onChange={(e) => update("buttonLink", e.target.value)}
                        placeholder="e.g., {{booking_link}}"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            /* Enhanced Branded Preview */
            <Card className="overflow-hidden">
              <div
                className="h-2"
                style={{ backgroundColor: facilityBranding.primaryColor }}
              />
              <CardContent className="pt-4 space-y-4">
                {/* Logo */}
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: facilityBranding.primaryColor, color: BRAND_TEXT_COLOR }}
                  >
                    {facilityBranding.fromName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{facilityBranding.fromName}</div>
                    <div className="text-xs text-muted-foreground">{facilityBranding.replyToEmail}</div>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <Label className="text-xs text-muted-foreground">Subject</Label>
                  <div className="font-semibold">{formData.subject || "(no subject)"}</div>
                </div>

                {/* Body */}
                <div className="whitespace-pre-wrap text-sm leading-relaxed py-2">
                  {formData.body || "(empty body)"}
                </div>

                {/* Offer section */}
                {formData.offerHeadline && (
                  <div
                    className="rounded-lg p-4 text-center space-y-1"
                    style={{ backgroundColor: hexToRgba(facilityBranding.primaryColor, 0.06) }}
                  >
                    <div className="font-bold text-base">{formData.offerHeadline}</div>
                    {formData.offerDescription && (
                      <div className="text-sm text-muted-foreground">{formData.offerDescription}</div>
                    )}
                    {formData.offerCode && (
                      <div className="inline-block mt-2 px-4 py-1.5 bg-background border-2 border-dashed rounded font-mono font-bold text-sm">
                        {formData.offerCode}
                      </div>
                    )}
                    {formData.offerExpiryDays && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Valid for {formData.offerExpiryDays} days
                      </div>
                    )}
                  </div>
                )}

                {/* CTA Button */}
                {formData.buttonText && (
                  <div className="text-center py-2">
                    <span
                      className="inline-block px-8 py-3 rounded-lg font-semibold text-sm"
                      style={{ backgroundColor: facilityBranding.primaryColor, color: BRAND_TEXT_COLOR }}
                    >
                      {formData.buttonText}
                    </span>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t pt-4 space-y-2">
                  <div className="text-xs text-muted-foreground text-center">
                    {facilityBranding.footerText}
                  </div>
                  <div className="flex justify-center gap-3">
                    {facilityBranding.socialLinks.map((link) => (
                      <span key={link.platform} className="text-xs text-muted-foreground capitalize">
                        {link.platform}
                      </span>
                    ))}
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-primary underline">Unsubscribe</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <DialogFooter>
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
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
