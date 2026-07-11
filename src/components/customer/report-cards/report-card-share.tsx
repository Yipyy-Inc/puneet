"use client";

import { Instagram, Facebook, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { businessProfile } from "@/data/settings";

/**
 * Social share row (Table 60) — Instagram / Facebook / WhatsApp. Facebook and
 * WhatsApp use their web share intents; Instagram (no web intent) uses the
 * native share sheet with the best photo pre-selected, falling back to copy.
 */
export function ReportCardShare({
  petName,
  serviceType,
  facilityName,
  photos,
  summary,
}: {
  petName: string;
  serviceType: string;
  facilityName: string;
  photos: string[];
  summary: string;
}) {
  const shareText = `${petName}'s ${serviceType} day at ${facilityName}! ${summary}`;
  const bestPhoto = photos[0]; // best photo pre-selected

  const getShareUrl = () =>
    businessProfile.website ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const openWindow = (url: string) =>
    window.open(url, "_blank", "noopener,noreferrer");

  const shareFacebook = () => {
    const url = getShareUrl();
    openWindow(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url,
      )}&quote=${encodeURIComponent(shareText)}`,
    );
  };

  const shareWhatsApp = () => {
    openWindow(
      `https://wa.me/?text=${encodeURIComponent(`${shareText} ${getShareUrl()}`)}`,
    );
  };

  const shareInstagram = async () => {
    try {
      if (bestPhoto && navigator.share) {
        const res = await fetch(bestPhoto);
        const blob = await res.blob();
        const file = new File([blob], `${petName}-${serviceType}.jpg`, {
          type: blob.type,
        });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: `${petName}'s ${serviceType} day`,
            text: shareText,
            files: [file],
          });
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({
          title: `${petName}'s ${serviceType} day`,
          text: shareText,
          url: getShareUrl(),
        });
        return;
      }
      // Desktop fallback: copy so the customer can paste into Instagram.
      await navigator.clipboard.writeText(`${shareText} ${getShareUrl()}`);
      toast.success("Copied — open Instagram to share");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error("Couldn't share");
    }
  };

  const btn =
    "flex size-9 items-center justify-center rounded-full border transition-colors hover:bg-slate-50 dark:hover:bg-slate-800";

  return (
    <div className="flex items-center justify-center gap-3 pt-1">
      <span className="text-muted-foreground text-xs">Share the memory:</span>
      <button
        type="button"
        onClick={shareInstagram}
        aria-label="Share to Instagram"
        className={btn}
      >
        <Instagram className="size-5 text-pink-600" />
      </button>
      <button
        type="button"
        onClick={shareFacebook}
        aria-label="Share to Facebook"
        className={btn}
      >
        <Facebook className="size-5 text-blue-600" />
      </button>
      <button
        type="button"
        onClick={shareWhatsApp}
        aria-label="Share to WhatsApp"
        title="WhatsApp"
        className={btn}
      >
        <MessageCircle className="size-5 text-green-600" />
      </button>
    </div>
  );
}
