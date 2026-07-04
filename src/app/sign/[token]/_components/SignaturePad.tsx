"use client";

import { useRef, useState } from "react";
import { Eraser, PenLine, Type } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface CapturedSignatureValue {
  method: "drawn" | "typed";
  image: string;
  typedName?: string;
}

const CANVAS_W = 520;
const CANVAS_H = 150;

export function SignaturePad({
  onChange,
}: {
  onChange: (value: CapturedSignatureValue | null) => void;
}) {
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typed, setTyped] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasStrokes = useRef(false);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    hasStrokes.current = true;
  };

  const endDraw = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas && hasStrokes.current) {
      onChange({ method: "drawn", image: canvas.toDataURL("image/png") });
    }
  };

  const clearDraw = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokes.current = false;
    onChange(null);
  };

  const applyTyped = (value: string) => {
    setTyped(value);
    if (!value.trim()) {
      onChange(null);
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#111827";
    ctx.textBaseline = "middle";
    ctx.font =
      "48px 'Segoe Script', 'Brush Script MT', 'Snell Roundhand', cursive";
    ctx.fillText(value, 18, CANVAS_H / 2);
    onChange({
      method: "typed",
      image: canvas.toDataURL("image/png"),
      typedName: value,
    });
  };

  const switchMode = (next: "draw" | "type") => {
    if (next === mode) return;
    setMode(next);
    // Reset the pending value when switching input methods.
    if (next === "draw") {
      clearDraw();
    } else {
      applyTyped(typed);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <Button
          type="button"
          variant={mode === "draw" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => switchMode("draw")}
          className="h-7 gap-1.5"
        >
          <PenLine className="size-3.5" />
          Draw
        </Button>
        <Button
          type="button"
          variant={mode === "type" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => switchMode("type")}
          className="h-7 gap-1.5"
        >
          <Type className="size-3.5" />
          Type
        </Button>
        {mode === "draw" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearDraw}
            className="text-muted-foreground ml-auto h-7 gap-1.5"
          >
            <Eraser className="size-3.5" />
            Clear
          </Button>
        ) : null}
      </div>

      {mode === "draw" ? (
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
          className="h-[150px] w-full touch-none rounded-md border border-dashed bg-white"
        />
      ) : (
        <div
          className={cn(
            "flex h-[150px] w-full items-center rounded-md border border-dashed bg-white px-4",
          )}
        >
          <Input
            value={typed}
            onChange={(e) => applyTyped(e.target.value)}
            placeholder="Type your full name"
            className="border-0 bg-transparent text-2xl text-zinc-900 shadow-none focus-visible:ring-0"
            style={{
              fontFamily:
                "'Segoe Script', 'Brush Script MT', 'Snell Roundhand', cursive",
            }}
          />
        </div>
      )}
    </div>
  );
}
