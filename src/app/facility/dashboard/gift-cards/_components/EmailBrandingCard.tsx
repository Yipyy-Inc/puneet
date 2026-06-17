"use client";

import { useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Palette, Upload, ImageIcon } from "lucide-react";
import { GiftCardEmailPreview } from "./GiftCardEmailPreview";

interface EmailBrandingCardProps {
  brandName: string;
  branding?: {
    primaryColor: string;
    footerText?: string;
    logoUrl?: string;
  };
  customDesign?: {
    label: string;
    imageUrl: string;
  };
}

export function EmailBrandingCard({
  brandName,
  branding,
  customDesign,
}: EmailBrandingCardProps) {
  const [primaryColor, setPrimaryColor] = useState(
    branding?.primaryColor ?? "#7C3AED",
  );
  const [footerText, setFooterText] = useState(branding?.footerText ?? "");
  const [logoUrl, setLogoUrl] = useState<string | undefined>(branding?.logoUrl);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [designLabel, setDesignLabel] = useState(customDesign?.label ?? "");
  const [designImageUrl, setDesignImageUrl] = useState<string | undefined>(
    customDesign?.imageUrl,
  );
  const [designError, setDesignError] = useState<string | null>(null);

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear the input so re-selecting the same file fires onChange again.
    e.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setLogoError("Please upload a PNG or JPG image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Image must be 2 MB or smaller.");
      return;
    }
    setLogoError(null);
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDesignUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear the input so re-selecting the same file fires onChange again.
    e.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setDesignError("Please upload a PNG or JPG image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setDesignError("Image must be 2 MB or smaller.");
      return;
    }
    setDesignError(null);
    const reader = new FileReader();
    reader.onload = () => setDesignImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="size-4" />
          Branding
        </CardTitle>
        <CardDescription>
          Customize the gift card delivery email and add a custom card design
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Facility Logo</Label>
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="bg-muted/30 flex size-14 shrink-0 items-center justify-center rounded-lg border p-1">
                <div
                  role="img"
                  aria-label="Current logo"
                  className="size-full bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${logoUrl})` }}
                />
              </div>
            ) : (
              <div className="text-muted-foreground bg-muted/30 flex size-14 shrink-0 items-center justify-center rounded-lg border">
                <ImageIcon className="size-5" />
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <label className="cursor-pointer gap-1.5">
                    <Upload className="size-3.5" />
                    {logoUrl ? "Replace" : "Upload logo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </label>
                </Button>
                {logoUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => {
                      setLogoUrl(undefined);
                      setLogoError(null);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                PNG or JPG, max 2 MB.
              </p>
            </div>
          </div>
          {logoError && <p className="text-destructive text-xs">{logoError}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Brand Color</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="size-10 cursor-pointer rounded-lg border p-0.5"
            />
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-32 font-mono text-sm"
              maxLength={7}
            />
            <div
              className="h-8 w-16 rounded-md"
              style={{ backgroundColor: primaryColor }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Email Footer Text</Label>
          <Input
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="Thank you for choosing us — where every tail tells a happy story."
          />
        </div>

        {/* Live preview */}
        <div className="space-y-1.5">
          <Label>Live Email Preview</Label>
          <GiftCardEmailPreview
            primaryColor={primaryColor}
            logoUrl={logoUrl}
            footerText={footerText}
            brandName={brandName}
          />
        </div>

        {/* Custom card design */}
        <div className="space-y-2 border-t pt-4">
          <div>
            <Label className="text-sm font-medium">Custom Card Design</Label>
            <p className="text-muted-foreground text-xs">
              Add one custom design — it appears in the gift card design picker
              when selling. PNG or JPG, max 2 MB.
            </p>
          </div>
          <div className="flex items-start gap-3">
            {designImageUrl ? (
              <div
                role="img"
                aria-label="Custom card design"
                className="aspect-16/10 w-28 shrink-0 rounded-lg border bg-cover bg-center"
                style={{ backgroundImage: `url(${designImageUrl})` }}
              />
            ) : (
              <div className="text-muted-foreground bg-muted/30 flex aspect-16/10 w-28 shrink-0 items-center justify-center rounded-lg border">
                <ImageIcon className="size-5" />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <Input
                value={designLabel}
                onChange={(e) => setDesignLabel(e.target.value)}
                placeholder="Design name (e.g. Whisker Wonderland)"
              />
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <label className="cursor-pointer gap-1.5">
                    <Upload className="size-3.5" />
                    {designImageUrl ? "Replace" : "Upload design"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={handleDesignUpload}
                    />
                  </label>
                </Button>
                {designImageUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => {
                      setDesignImageUrl(undefined);
                      setDesignError(null);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
          {designError && (
            <p className="text-destructive text-xs">{designError}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
