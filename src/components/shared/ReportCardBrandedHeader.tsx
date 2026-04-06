"use client";

import Image from "next/image";
import type { ReportCardBrandConfig } from "@/types/facility";
import { cn } from "@/lib/utils";
import { Phone, Mail, Globe } from "lucide-react";

interface BusinessProfile {
  businessName: string;
  email: string;
  phone: string;
  website: string;
  logo: string;
}

export interface ReportCardBrandedHeaderProps {
  brandConfig: ReportCardBrandConfig;
  profile: BusinessProfile;
  title: string;
  subtitle?: string;
  accentColor?: string;
}

export function ReportCardBrandedHeader({
  brandConfig,
  profile,
  title,
  subtitle,
  accentColor,
}: ReportCardBrandedHeaderProps) {
  const color = accentColor || brandConfig.accentColor || "#6366f1";
  const style = brandConfig.headerStyle ?? "centered";
  const logoPos = brandConfig.logoPosition ?? "top_center";
  const showLogo = brandConfig.showFacilityLogo && profile.logo;
  const showName = brandConfig.showFacilityName !== false;

  if (style === "minimal") {
    return (
      <div className="px-6 py-4">
        {showName && (
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            {profile.businessName}
          </p>
        )}
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && (
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        )}
      </div>
    );
  }

  if (style === "banner") {
    return (
      <div>
        {/* Top bar */}
        <div
          className="flex items-center justify-between gap-4 px-6 py-3"
          style={{ backgroundColor: `${color}10` }}
        >
          <div className="flex items-center gap-3">
            {showLogo && (
              <div className="relative size-10 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={profile.logo}
                  alt={profile.businessName}
                  fill
                  className="object-contain"
                />
              </div>
            )}
            {showName && (
              <span className="text-sm font-semibold text-gray-800">
                {profile.businessName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {brandConfig.showFacilityPhone && (
              <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                <Phone className="size-3" />
                {profile.phone}
              </span>
            )}
            {brandConfig.showFacilityEmail && (
              <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                <Mail className="size-3" />
                {profile.email}
              </span>
            )}
            {brandConfig.showFacilityWebsite && (
              <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                <Globe className="size-3" />
                {profile.website}
              </span>
            )}
          </div>
        </div>
        {/* Title area */}
        <div className="px-6 pt-3 pb-4">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {subtitle && (
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          )}
        </div>
      </div>
    );
  }

  // "centered" (default)
  return (
    <div className="flex flex-col items-center px-6 pt-5 pb-4 text-center">
      {showLogo && (
        <div
          className={cn(
            "relative mb-2 size-16 overflow-hidden rounded-xl",
            logoPos === "top_left" && "self-start",
            logoPos === "top_right" && "self-end",
          )}
        >
          <Image
            src={profile.logo}
            alt={profile.businessName}
            fill
            className="object-contain"
          />
        </div>
      )}
      {showName && (
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          {profile.businessName}
        </p>
      )}
      <h2 className="mt-1 text-xl font-bold text-gray-900">{title}</h2>
      {subtitle && (
        <p className="text-muted-foreground mt-0.5 text-sm">{subtitle}</p>
      )}
    </div>
  );
}
