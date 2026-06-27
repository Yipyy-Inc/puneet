"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** A mock voicemail player: a play/pause button + an animated progress bar that
 *  fills over the clip's duration. `onPlay` fires once when playback starts
 *  (used to clear the NEW badge). */
export function AudioBar({
  durationSeconds,
  onPlay,
  className,
}: {
  durationSeconds: number;
  onPlay?: () => void;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const total = Math.max(1, durationSeconds);
    const step = 100 / (total * 4); // a tick every 250ms
    let acc = 0;
    const id = setInterval(() => {
      acc += step;
      if (acc >= 100) {
        // interval callback (async) — safe to setState here
        setProgress(100);
        setPlaying(false);
        clearInterval(id);
      } else {
        setProgress(acc);
      }
    }, 250);
    return () => clearInterval(id);
  }, [playing, durationSeconds]);

  function toggle() {
    if (playing) {
      setPlaying(false);
      return;
    }
    setProgress(0);
    setPlaying(true);
    onPlay?.();
  }

  const elapsed = (progress / 100) * durationSeconds;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        aria-label={playing ? "Pause voicemail" : "Play voicemail"}
        onClick={toggle}
        className="bg-primary/10 text-primary hover:bg-primary/20 flex size-7 shrink-0 items-center justify-center rounded-full transition-colors"
      >
        {playing ? (
          <Pause className="size-3.5" />
        ) : (
          <Play className="size-3.5" />
        )}
      </button>
      <div className="bg-muted relative h-1.5 w-28 overflow-hidden rounded-full">
        <div
          className="bg-primary absolute top-0 left-0 h-full rounded-full transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-muted-foreground shrink-0 font-mono text-[11px] tabular-nums">
        {playing || progress > 0 ? fmt(elapsed) : fmt(durationSeconds)}
      </span>
    </div>
  );
}
