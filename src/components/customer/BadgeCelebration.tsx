"use client";

import { useEffect } from "react";

/**
 * Full-page celebration overlay shown when a customer newly earns a badge:
 * confetti rain + a badge reveal. Non-interactive (pointer-events-none) and
 * auto-dismisses after a few seconds. Confetti pieces are deterministic (no
 * Math.random) so they stay render-pure.
 */

const COLORS = [
  "#f59e0b",
  "#10b981",
  "#6366f1",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#a855f7",
];

const PIECES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  left: (i * 33) % 100,
  color: COLORS[i % COLORS.length],
  delay: (i % 8) * 0.12,
  duration: 1.9 + (i % 5) * 0.22,
  size: 6 + (i % 3) * 2,
}));

export function BadgeCelebration({
  icon,
  name,
  onDone,
}: {
  icon: string;
  name: string;
  onDone: () => void;
}) {
  useEffect(() => {
    // setState in the parent runs from this timeout (async) — not synchronously
    // in the effect body — so it doesn't trip react-hooks/set-state-in-effect.
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-60 flex items-center justify-center overflow-hidden">
      {PIECES.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 rounded-[1px]"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
          }}
        />
      ))}

      <div className="animate-in fade-in zoom-in-95 bg-background/95 flex flex-col items-center gap-2 rounded-2xl border px-10 py-7 shadow-xl backdrop-blur-sm duration-500">
        <div className="animate-in zoom-in-50 text-6xl duration-700">{icon}</div>
        <div className="text-primary text-xs font-semibold tracking-widest uppercase">
          Badge unlocked!
        </div>
        <div className="text-xl font-bold">{name}</div>
      </div>
    </div>
  );
}
