"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import SignaturePadLib from "signature_pad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pen, Eraser, Download, Check, Type } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────

export interface SignatureResult {
  signatureData: string;
  signedAt: string;
  ipAddress: string;
  userAgent: string;
  deviceId: string;
  timezone: string;
  agreementText?: string;
  witnessName?: string;
}

interface SignaturePadProps {
  onSign: (data: SignatureResult) => void;
  onClear?: () => void;
  agreementText?: string;
  label?: string;
  witnessMode?: boolean;
  disabled?: boolean;
  initialSignature?: string;
  readOnly?: boolean;
  compact?: boolean;
  className?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function hashCode(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function generateDeviceId(): string {
  const raw = [
    navigator.userAgent,
    screen.width,
    screen.height,
    navigator.language,
    new Date().getTimezoneOffset(),
  ].join("|");
  return hashCode(raw);
}

async function getIpAddress(): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    return data.ip ?? "unavailable";
  } catch {
    return "unavailable";
  }
}

// ── Component ────────────────────────────────────────────────────────

export function SignaturePad({
  onSign,
  onClear,
  agreementText,
  label = "Signature",
  witnessMode = false,
  disabled = false,
  initialSignature,
  readOnly = false,
  compact = false,
  className,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [agreed, setAgreed] = useState(!agreementText);
  const [witnessName, setWitnessName] = useState("");
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("");
  const [signing, setSigning] = useState(false);
  const [signedMeta, setSignedMeta] = useState<{
    date: string;
    ip: string;
  } | null>(null);

  // Initialize signature pad
  useEffect(() => {
    if (!canvasRef.current || readOnly) return;
    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(ratio, ratio);

    const pad = new SignaturePadLib(canvas, {
      penColor: "#1e293b",
      minWidth: 1.5,
      maxWidth: 3,
    });

    pad.addEventListener("beginStroke", () => setIsEmpty(false));

    if (disabled || !agreed) {
      pad.off();
    }

    padRef.current = pad;

    return () => {
      pad.off();
    };
  }, [readOnly, disabled, agreed]);

  // Enable/disable based on agreement
  useEffect(() => {
    if (!padRef.current) return;
    if (agreed && !disabled) {
      padRef.current.on();
    } else {
      padRef.current.off();
    }
  }, [agreed, disabled]);

  const handleClear = useCallback(() => {
    padRef.current?.clear();
    setIsEmpty(true);
    setTypedName("");
    onClear?.();
  }, [onClear]);

  const handleConfirm = useCallback(async () => {
    setSigning(true);

    let signatureData: string;

    if (mode === "type" && typedName.trim()) {
      // Render typed name to canvas
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 600;
      tempCanvas.height = 150;
      const ctx = tempCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 600, 150);
        ctx.fillStyle = "#1e293b";
        ctx.font = "italic 48px Georgia, serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(typedName.trim(), 300, 75);
      }
      signatureData = tempCanvas.toDataURL("image/png");
    } else if (padRef.current && !padRef.current.isEmpty()) {
      signatureData = padRef.current.toDataURL("image/png");
    } else {
      setSigning(false);
      return;
    }

    const ip = await getIpAddress();
    const result: SignatureResult = {
      signatureData,
      signedAt: new Date().toISOString(),
      ipAddress: ip,
      userAgent: navigator.userAgent,
      deviceId: generateDeviceId(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      agreementText: agreementText ?? undefined,
      witnessName: witnessMode ? witnessName : undefined,
    };

    setSignedMeta({ date: result.signedAt, ip });
    setSigning(false);
    onSign(result);
  }, [mode, typedName, agreementText, witnessMode, witnessName, onSign]);

  const canConfirm =
    agreed &&
    !disabled &&
    ((mode === "draw" && !isEmpty) ||
      (mode === "type" && typedName.trim().length > 1));

  // ── Read-only view ─────────────────────────────────────────────────

  if (readOnly && initialSignature) {
    return (
      <div className={cn("space-y-2", className)}>
        <Label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          {label}
        </Label>
        <div className="rounded-xl border-2 border-slate-200 bg-white p-3">
          <img
            src={initialSignature}
            alt="Signature"
            className={cn("w-full object-contain", compact ? "h-20" : "h-32")}
          />
        </div>
        {signedMeta && (
          <p className="text-[11px] text-slate-400">
            Signed on{" "}
            {new Date(signedMeta.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            {signedMeta.ip !== "unavailable" && ` · IP: ${signedMeta.ip}`}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            const link = document.createElement("a");
            link.download = "signature.png";
            link.href = initialSignature;
            link.click();
          }}
        >
          <Download className="size-3.5" />
          Download
        </Button>
      </div>
    );
  }

  // ── Interactive view ───────────────────────────────────────────────

  return (
    <div className={cn("space-y-3", className)}>
      {/* Agreement text */}
      {agreementText && (
        <div className="space-y-2">
          <ScrollArea className="max-h-[200px] rounded-lg border bg-slate-50/50 p-4">
            <div className="prose prose-sm max-w-none text-sm/relaxed text-slate-600">
              {agreementText}
            </div>
          </ScrollArea>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={agreed}
              onCheckedChange={(c) => setAgreed(c === true)}
            />
            <span className="text-xs font-medium text-slate-600">
              I have read and agree to the terms above
            </span>
          </label>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
        <button
          type="button"
          onClick={() => setMode("draw")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all",
            mode === "draw"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-400 hover:text-slate-600",
          )}
        >
          <Pen className="size-3.5" />
          Draw
        </button>
        <button
          type="button"
          onClick={() => setMode("type")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all",
            mode === "type"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-400 hover:text-slate-600",
          )}
        >
          <Type className="size-3.5" />
          Type
        </button>
      </div>

      {/* Canvas / Type input */}
      {mode === "draw" ? (
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-white",
            !agreed && "opacity-50",
            compact ? "h-28" : "h-40",
          )}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 size-full"
            style={{ touchAction: "none" }}
          />
          {isEmpty && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
              <Pen className="size-5 text-slate-300" />
              <span className="text-sm text-slate-300">Sign here</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Type your full name"
            disabled={!agreed}
            className="text-center"
          />
          <div
            className={cn(
              "flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white",
              compact ? "h-28" : "h-40",
            )}
          >
            {typedName.trim() ? (
              <span
                className="text-3xl text-slate-700"
                style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
              >
                {typedName}
              </span>
            ) : (
              <span className="text-sm text-slate-300">
                Your signature will appear here
              </span>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wider text-slate-400 uppercase">
          {label}
        </span>
        {mode === "draw" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-slate-400"
            onClick={handleClear}
          >
            <Eraser className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Witness */}
      {witnessMode && (
        <div className="space-y-1.5">
          <Label className="text-xs">Witness Name</Label>
          <Input
            value={witnessName}
            onChange={(e) => setWitnessName(e.target.value)}
            placeholder="Full name of witness"
          />
        </div>
      )}

      {/* Confirm */}
      <Button
        className="w-full gap-1.5"
        disabled={!canConfirm || signing}
        onClick={handleConfirm}
      >
        {signing ? (
          "Capturing signature..."
        ) : (
          <>
            <Check className="size-4" />
            Confirm Signature
          </>
        )}
      </Button>

      {/* Legal text */}
      <p className="text-[10px] leading-relaxed text-slate-400">
        By signing above, you acknowledge that this electronic signature has the
        same legal validity as a handwritten signature. Your signature,
        timestamp, IP address, and device information are recorded for
        verification purposes.
      </p>
    </div>
  );
}
