"use client";

import { Gift } from "lucide-react";

interface GiftCardEmailPreviewProps {
  /** Brand/header color, applied to the card, button, and accents. */
  primaryColor: string;
  /** Logo image URL or data URL; falls back to the brand name when absent. */
  logoUrl?: string;
  footerText: string;
  brandName: string;
}

/**
 * A realistic, live-updating preview of the gift card delivery email.
 * Renders email-client chrome around a branded body that contains a sample
 * gift card design. Pure presentation — re-renders as props change.
 */
export function GiftCardEmailPreview({
  primaryColor,
  logoUrl,
  footerText,
  brandName,
}: GiftCardEmailPreviewProps) {
  return (
    <div className="overflow-hidden rounded-xl border shadow-sm">
      {/* Email client chrome */}
      <div className="text-muted-foreground bg-muted/40 flex items-center justify-between border-b px-3 py-2 text-[11px]">
        <span className="truncate">
          From: {brandName} &lt;gifts@
          {brandName.toLowerCase().replace(/\s+/g, "")}.com&gt;
        </span>
        <span className="shrink-0">Inbox</span>
      </div>
      <div className="bg-background border-b px-4 py-2">
        <p className="truncate text-sm font-semibold">
          You&apos;ve received a gift card! 🎁
        </p>
      </div>

      {/* Email body */}
      <div
        className="space-y-4 px-5 py-6"
        style={{ backgroundColor: primaryColor + "0A" }}
      >
        {/* Brand header */}
        <div className="text-center">
          {logoUrl ? (
            <div
              role="img"
              aria-label={brandName}
              className="mx-auto h-10 w-40 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${logoUrl})` }}
            />
          ) : (
            <p className="text-lg font-bold" style={{ color: primaryColor }}>
              {brandName}
            </p>
          )}
        </div>

        <p className="text-foreground text-center text-sm">
          Hi Jordan, someone special sent you a gift!
        </p>

        {/* Sample gift card design */}
        <div
          className="relative mx-auto max-w-xs overflow-hidden rounded-xl p-4 text-white shadow-md"
          style={{
            backgroundImage: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)`,
          }}
        >
          {/* decorative accents */}
          <div className="absolute -top-6 -right-6 size-20 rounded-full bg-white/15" />
          <div className="absolute -bottom-8 -left-4 size-20 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wide uppercase opacity-90">
                Gift Card
              </span>
              <Gift className="size-4 opacity-90" />
            </div>
            <p className="mt-3 text-3xl font-bold">$100.00</p>
            <p className="mt-2 font-mono text-sm tracking-widest opacity-90">
              •••• •••• •••• 4821
            </p>
            <p className="mt-2 text-[11px] opacity-80">
              Redeemable at {brandName}
            </p>
          </div>
        </div>

        {/* Redeem button */}
        <div className="text-center">
          <span
            className="inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            Redeem Your Gift Card
          </span>
        </div>

        {/* Check balance link */}
        <p className="text-center text-[11px]">
          <span className="underline" style={{ color: primaryColor }}>
            Check your balance anytime
          </span>
        </p>

        {/* Footer */}
        <div className="border-t pt-3 text-center">
          <p className="text-muted-foreground text-[11px] italic">
            {footerText || "Your footer text will appear here."}
          </p>
        </div>
      </div>
    </div>
  );
}
