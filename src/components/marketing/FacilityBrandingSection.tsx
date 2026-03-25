"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Save, Palette } from "lucide-react";
import { facilityBranding } from "@/data/marketing";
import { getContrastTextColor } from "@/lib/color-utils";

const SOCIAL_PLATFORMS = ["facebook", "instagram", "twitter", "tiktok", "youtube", "linkedin"];

interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

function withId(link: { platform: string; url: string }): SocialLink {
  return { ...link, id: crypto.randomUUID().slice(0, 8) };
}

export function FacilityBrandingSection() {
  const [formData, setFormData] = useState({
    logo: facilityBranding.logo,
    primaryColor: facilityBranding.primaryColor,
    secondaryColor: facilityBranding.secondaryColor,
    fromName: facilityBranding.fromName,
    replyToEmail: facilityBranding.replyToEmail,
    footerText: facilityBranding.footerText,
    socialLinks: facilityBranding.socialLinks.map(withId),
    unsubscribeLink: facilityBranding.unsubscribeLink,
  });

  const brandTextColor = getContrastTextColor(formData.primaryColor);

  const update = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addSocialLink = () => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, withId({ platform: "facebook", url: "" })],
    }));
  };

  const removeSocialLink = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((link: SocialLink) => link.id !== id),
    }));
  };

  const updateSocialLink = (id: string, field: "platform" | "url", value: string) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link: SocialLink) =>
        link.id === id ? { ...link, [field]: value } : link
      ),
    }));
  };

  const handleSave = () => {
    console.log("Saving branding:", formData);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Email Branding
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Form Fields */}
          <div className="space-y-4">
            {/* Logo */}
            <div className="space-y-2">
              <Label className="text-sm">Logo URL</Label>
              <Input
                value={formData.logo}
                onChange={(e) => update("logo", e.target.value)}
                placeholder="/logos/your-logo.png"
              />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Primary Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => update("primaryColor", e.target.value)}
                    className="w-10 h-9 rounded border cursor-pointer appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Primary color picker"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={(e) => update("primaryColor", e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Secondary Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) => update("secondaryColor", e.target.value)}
                    className="w-10 h-9 rounded border cursor-pointer appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Secondary color picker"
                  />
                  <Input
                    value={formData.secondaryColor}
                    onChange={(e) => update("secondaryColor", e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* From Name + Reply-to */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">From Name</Label>
                <Input
                  value={formData.fromName}
                  onChange={(e) => update("fromName", e.target.value)}
                  placeholder="e.g., Happy Paws Pet Care"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Reply-to Email</Label>
                <Input
                  type="email"
                  value={formData.replyToEmail}
                  onChange={(e) => update("replyToEmail", e.target.value)}
                  placeholder="hello@example.com"
                />
              </div>
            </div>

            {/* Footer Text */}
            <div className="space-y-2">
              <Label className="text-sm">Footer Text</Label>
              <Textarea
                value={formData.footerText}
                onChange={(e) => update("footerText", e.target.value)}
                rows={2}
                placeholder="Business name, address, phone..."
              />
            </div>

            {/* Social Links */}
            <div className="space-y-2">
              <Label className="text-sm">Social Links</Label>
              <div className="space-y-2">
                {formData.socialLinks.map((link: SocialLink) => (
                  <div key={link.id} className="flex gap-2 items-center">
                    <Select
                      value={link.platform}
                      onValueChange={(v) => updateSocialLink(link.id, "platform", v)}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOCIAL_PLATFORMS.map((p) => (
                          <SelectItem key={p} value={p} className="capitalize">
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={link.url}
                      onChange={(e) => updateSocialLink(link.id, "url", e.target.value)}
                      placeholder="https://..."
                      className="h-8 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => removeSocialLink(link.id)}
                      aria-label={`Remove ${link.platform} link`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addSocialLink}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Link
                </Button>
              </div>
            </div>

            <Button onClick={handleSave} className="w-full">
              <Save className="h-4 w-4 mr-2" /> Save Branding
            </Button>
          </div>

          {/* Right: Live Preview */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Live Preview</Label>
            <Card className="overflow-hidden">
              {/* Color bar */}
              <div className="h-2" style={{ backgroundColor: formData.primaryColor }} />
              <CardContent className="pt-4 space-y-3">
                {/* Logo + Name */}
                <div className="flex items-center gap-2.5 pb-3 border-b">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: formData.primaryColor, color: brandTextColor }}
                  >
                    {formData.fromName.charAt(0) || "?"}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{formData.fromName || "Your Business"}</div>
                    <div className="text-xs text-muted-foreground">{formData.replyToEmail || "email@example.com"}</div>
                  </div>
                </div>

                {/* Sample content */}
                <div className="text-sm text-muted-foreground py-2">
                  Hi Sarah, your email content will appear here with your branding applied automatically.
                </div>

                {/* Sample CTA */}
                <div className="text-center py-2">
                  <span
                    className="inline-block px-6 py-2.5 rounded-lg font-medium text-sm"
                    style={{ backgroundColor: formData.primaryColor, color: brandTextColor }}
                  >
                    Book Now
                  </span>
                </div>

                {/* Footer */}
                <div className="border-t pt-3 space-y-1.5">
                  <div className="text-xs text-muted-foreground text-center">
                    {formData.footerText || "Your business footer text"}
                  </div>
                  <div className="flex justify-center gap-3">
                    {formData.socialLinks.map((link: SocialLink) => (
                      <span key={link.id} className="text-xs text-muted-foreground capitalize">
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
