"use client";

import type { ReportCardBrandConfig } from "@/types/facility";
import { Phone, Mail, Globe, Facebook, Instagram, Twitter } from "lucide-react";

interface SocialMedia {
  facebook?: string;
  instagram?: string;
  twitter?: string;
}

interface BusinessProfile {
  businessName: string;
  email: string;
  phone: string;
  website: string;
  socialMedia?: SocialMedia;
}

export interface ReportCardBrandedFooterProps {
  brandConfig: ReportCardBrandConfig;
  profile: BusinessProfile;
  accentColor?: string;
}

export function ReportCardBrandedFooter({
  brandConfig,
  profile,
  accentColor,
}: ReportCardBrandedFooterProps) {
  const color = accentColor || brandConfig.accentColor || "#6366f1";
  const social = profile.socialMedia;
  const hasSocial =
    brandConfig.showSocialLinks &&
    social &&
    (social.facebook || social.instagram || social.twitter);
  const hasContact =
    brandConfig.showFacilityPhone ||
    brandConfig.showFacilityEmail ||
    brandConfig.showFacilityWebsite;

  return (
    <div className="space-y-3 px-6 pt-3 pb-5">
      {/* Custom footer text */}
      {brandConfig.footerText && (
        <p className="text-muted-foreground text-center text-sm italic">
          {brandConfig.footerText}
        </p>
      )}

      {/* Booking CTA */}
      {brandConfig.showBookingCta && brandConfig.bookingCtaText && (
        <div className="flex justify-center">
          <a
            href={brandConfig.bookingCtaUrl || "#"}
            className="inline-block rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: color }}
          >
            {brandConfig.bookingCtaText}
          </a>
        </div>
      )}

      {/* Contact info */}
      {hasContact && (
        <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-4 text-xs">
          {brandConfig.showFacilityPhone && (
            <span className="flex items-center gap-1">
              <Phone className="size-3" />
              {profile.phone}
            </span>
          )}
          {brandConfig.showFacilityEmail && (
            <span className="flex items-center gap-1">
              <Mail className="size-3" />
              {profile.email}
            </span>
          )}
          {brandConfig.showFacilityWebsite && (
            <span className="flex items-center gap-1">
              <Globe className="size-3" />
              {profile.website}
            </span>
          )}
        </div>
      )}

      {/* Social links */}
      {hasSocial && (
        <SocialLinks
          social={social}
          style={brandConfig.socialLinksStyle ?? "icons"}
          color={color}
        />
      )}

      {/* Powered by */}
      {brandConfig.showPoweredBy && (
        <p className="text-muted-foreground/50 mt-4 text-center text-[10px]">
          Powered by Yipyy
        </p>
      )}
    </div>
  );
}

function SocialLinks({
  social,
  style,
  color,
}: {
  social: SocialMedia;
  style: "icons" | "buttons" | "text_links";
  color: string;
}) {
  const links = [
    { url: social.facebook, icon: Facebook, label: "Facebook" },
    { url: social.instagram, icon: Instagram, label: "Instagram" },
    { url: social.twitter, icon: Twitter, label: "Twitter" },
  ].filter((l) => l.url);

  if (links.length === 0) return null;

  if (style === "text_links") {
    return (
      <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-2 text-xs">
        {links.map((l, i) => (
          <span key={l.label}>
            {i > 0 && <span className="mr-2">·</span>}
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {l.url}
            </a>
          </span>
        ))}
      </div>
    );
  }

  if (style === "buttons") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors hover:bg-slate-50"
          >
            <l.icon className="size-3" />
            {l.label}
          </a>
        ))}
      </div>
    );
  }

  // "icons" (default)
  return (
    <div className="flex items-center justify-center gap-3">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground transition-colors hover:text-gray-700"
          title={l.label}
        >
          <l.icon className="size-5" />
        </a>
      ))}
    </div>
  );
}
