"use client";

import { useRef, useState } from "react";
import { Video } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { isVideoUrl, looksLikeBrokenVideoUrl } from "@/lib/training-media";

/** The exact warning copy required for a private/unavailable video link. */
const PRIVATE_WARNING =
  "This video appears to be private or unavailable. Owners may not be able to view it. Please check the link or use an unlisted video.";

interface Props {
  /** Current links, one per array entry (mirrors the resources string[]). */
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Multi-line "Video / resource links" input with on-blur validation. When the
 * trainer tabs out, any YouTube/Vimeo link is checked for public accessibility
 * (via the /api/video-check oEmbed proxy); a malformed video link is caught
 * client-side without a network round-trip. If any video link is private or
 * unavailable, a non-blocking yellow warning appears beneath the field so the
 * trainer fixes it before owners hit a broken embed in the portal. Non-video
 * URLs are accepted as-is and never warn.
 */
export function VideoLinksTextarea({
  value,
  onChange,
  placeholder,
  className,
}: Props) {
  const [warning, setWarning] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  // Monotonic guard so a superseded validation (trainer edited + re-blurred)
  // can't overwrite the latest result.
  const runRef = useRef(0);

  async function validate(lines: string[]) {
    const run = ++runRef.current;
    const videos = lines
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((url) => isVideoUrl(url));

    if (videos.length === 0) {
      setWarning(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    try {
      const statuses = await Promise.all(
        videos.map(async (url) => {
          // A clearly-malformed YouTube video id can't resolve — flag without a
          // network call. Everything else (valid ids, /live/, playlists,
          // channels, Vimeo) defers to the oEmbed proxy, which is authoritative
          // for "public vs private/unavailable" and never false-positives.
          if (looksLikeBrokenVideoUrl(url)) return "unavailable" as const;
          try {
            const res = await fetch(
              `/api/video-check?url=${encodeURIComponent(url)}`,
            );
            if (!res.ok) return "unknown" as const;
            const data = (await res.json()) as { status?: string };
            return (data.status ?? "unknown") as
              | "ok"
              | "unavailable"
              | "unknown";
          } catch {
            // Network/offline — inconclusive, never a false warning.
            return "unknown" as const;
          }
        }),
      );
      if (run !== runRef.current) return; // superseded
      setWarning(statuses.includes("unavailable") ? PRIVATE_WARNING : null);
    } finally {
      if (run === runRef.current) setChecking(false);
    }
  }

  return (
    <div className="space-y-1">
      <Textarea
        value={value.join("\n")}
        onChange={(e) => {
          // Clear a stale warning the moment the trainer starts fixing the
          // link; it re-checks on the next blur.
          if (warning) setWarning(null);
          onChange(
            e.target.value
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
          );
        }}
        onBlur={() => validate(value)}
        placeholder={placeholder ?? "Video / resource links — one per line"}
        className={className}
      />
      {checking && (
        <p className="text-muted-foreground text-[11px]">
          Checking video links…
        </p>
      )}
      {warning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/30">
          <p className="inline-flex items-start gap-1.5 text-[12px] font-medium text-amber-800 dark:text-amber-200">
            <Video className="mt-0.5 size-3.5 shrink-0" />
            {warning}
          </p>
        </div>
      )}
    </div>
  );
}
