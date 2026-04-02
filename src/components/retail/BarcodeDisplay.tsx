"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * Simple CODE128-style barcode SVG renderer.
 * Generates a visual barcode from a string code — not a real CODE128 encoder
 * (that requires a library), but a deterministic bar pattern from the code
 * that looks authentic and is consistent for the same input.
 *
 * For production, swap this with JsBarcode or bwip-js for scanner-readable output.
 */

interface BarcodeDisplayProps {
  code: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
}

function hashChar(ch: string, idx: number): number[] {
  const v = ch.charCodeAt(0) + idx * 7;
  // Generate a deterministic pattern of bar widths from the character
  return [
    ((v >> 0) & 1) + 1,
    1,
    ((v >> 1) & 1) + 1,
    1,
    ((v >> 2) & 1) + 1,
    1,
    ((v >> 3) & 1) + 1,
    1,
  ];
}

function generateBars(code: string): { x: number; w: number }[] {
  const bars: { x: number; w: number }[] = [];
  let x = 0;

  // Start guard
  bars.push({ x, w: 2 });
  x += 3;
  bars.push({ x, w: 1 });
  x += 2;
  bars.push({ x, w: 2 });
  x += 3;

  // Data bars
  for (let i = 0; i < code.length; i++) {
    const widths = hashChar(code[i], i);
    for (let j = 0; j < widths.length; j++) {
      if (j % 2 === 0) {
        // Bar (dark)
        bars.push({ x, w: widths[j] });
      }
      x += widths[j];
    }
  }

  // Stop guard
  x += 1;
  bars.push({ x, w: 2 });
  x += 3;
  bars.push({ x, w: 2 });
  x += 3;
  bars.push({ x, w: 1 });

  return bars;
}

export function BarcodeDisplay({
  code,
  width = 200,
  height = 60,
  showText = true,
  className,
}: BarcodeDisplayProps) {
  const bars = useMemo(() => generateBars(code), [code]);
  const totalWidth =
    bars.length > 0
      ? bars[bars.length - 1].x + bars[bars.length - 1].w + 2
      : 100;
  const totalHeight = showText ? height + 18 : height;

  return (
    <div className={cn("inline-flex flex-col items-center", className)}>
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        width={width}
        height={width * (totalHeight / totalWidth)}
        className="shrink-0"
      >
        {/* White background */}
        <rect
          x={0}
          y={0}
          width={totalWidth}
          height={totalHeight}
          fill="white"
        />

        {/* Bars */}
        {bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y={0}
            width={bar.w}
            height={height}
            fill="black"
          />
        ))}

        {/* Code text */}
        {showText && (
          <text
            x={totalWidth / 2}
            y={height + 14}
            textAnchor="middle"
            fontSize={10}
            fontFamily="monospace"
            fill="black"
          >
            {code}
          </text>
        )}
      </svg>
    </div>
  );
}
