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
import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import { shellText } from "@/lib/shell/text";
import type { AppLocale } from "@/lib/language-settings";
import { formatNoteDate } from "@/lib/format-utils";

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
  /** Words in this language rather than the app's — a page the signer
   *  reaches signed out, in their own (the agreements link, 2026-10-02). */
  locale?: AppLocale;
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
  label,
  witnessMode = false,
  disabled = false,
  initialSignature,
  readOnly = false,
  compact = false,
  className,
  locale: localeOverride,
}: SignaturePadProps) {
  const appText = useShellText("shared");
  const appLocale = useShellLocale();
  const locale = localeOverride ?? appLocale;
  const t = localeOverride
    ? (key: string) => shellText(localeOverride, "shared", key)
    : appText;
  const labelText = label ?? t("signature");
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

  // Initialize signature pad (and re-init when draw canvas remounts)
  useEffect(() => {
    if (readOnly || mode !== "draw") {
      padRef.current?.off();
      padRef.current = null;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const pad = new SignaturePadLib(canvas, {
      penColor: "#1e293b",
      minWidth: 1.5,
      maxWidth: 3,
    });

    pad.addEventListener("beginStroke", () => setIsEmpty(false));
    padRef.current = pad;

    const resizeCanvas = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      if (width <= 0 || height <= 0) return;

      const existingData = pad.toData();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);

      canvas.width = width * ratio;
      canvas.height = height * ratio;

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(ratio, ratio);

      if (existingData.length > 0) {
        pad.fromData(existingData);
        setIsEmpty(false);
      } else {
        pad.clear();
        setIsEmpty(true);
      }
    };

    resizeCanvas();
    const frameId = window.requestAnimationFrame(resizeCanvas);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
      });
      resizeObserver.observe(canvas);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      pad.off();
      if (padRef.current === pad) {
        padRef.current = null;
      }
    };
  }, [mode, readOnly]);

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
        <Label className="text-micro text-ink-tertiary uppercase">
          {labelText}
        </Label>
        <div className="border-line bg-card rounded-2xl border p-3">
          <img
            src={initialSignature}
            alt={t("signature")}
            className={cn("w-full object-contain", compact ? "h-20" : "h-32")}
          />
        </div>
        {signedMeta && (
          <p className="text-meta text-ink-tertiary">
            {t("signedOn").replace(
              "{date}",
              formatNoteDate(signedMeta.date, locale),
            )}
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
          {t("downloadSignature")}
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
          <ScrollArea className="border-line bg-card h-[200px] rounded-2xl border">
            <div className="text-meta text-ink-secondary max-w-none p-4 whitespace-pre-line">
              {agreementText}
            </div>
          </ScrollArea>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={agreed}
              onCheckedChange={(c) => setAgreed(c === true)}
            />
            <span className="text-meta text-body-ink">{t("agreeToTerms")}</span>
          </label>
        </div>
      )}

      {/* Mode tabs */}
      <div className="bg-surface-inset flex items-center gap-0.5 rounded-full p-0.75">
        <button
          type="button"
          onClick={() => setMode("draw")}
          className={cn(
            "text-body flex min-h-8.5 flex-1 items-center justify-center gap-1.5 rounded-full font-semibold transition-[background-color,box-shadow,color] duration-120 ease-[ease] motion-reduce:transition-none max-lg:min-h-10.5",
            mode === "draw"
              ? "bg-card text-body-ink shadow-card"
              : "text-ink-secondary hover:text-body-ink",
          )}
        >
          <Pen aria-hidden className="size-4" />
          {t("modeDraw")}
        </button>
        <button
          type="button"
          onClick={() => setMode("type")}
          className={cn(
            "text-body flex min-h-8.5 flex-1 items-center justify-center gap-1.5 rounded-full font-semibold transition-[background-color,box-shadow,color] duration-120 ease-[ease] motion-reduce:transition-none max-lg:min-h-10.5",
            mode === "type"
              ? "bg-card text-body-ink shadow-card"
              : "text-ink-secondary hover:text-body-ink",
          )}
        >
          <Type aria-hidden className="size-4" />
          {t("modeType")}
        </button>
      </div>

      {/* Canvas / Type input */}
      {mode === "draw" ? (
        <div
          className={cn(
            "border-line-strong relative overflow-hidden rounded-2xl border-[1.5px] border-dashed",
            agreed ? "bg-card" : "bg-surface-inset cursor-not-allowed",
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
              <Pen aria-hidden className="text-ink-disabled size-5" />
              <span className="text-meta text-ink-tertiary">
                {t("signHere")}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={t("typeFullName")}
            disabled={!agreed}
            className="text-center"
          />
          <div
            className={cn(
              "border-line bg-card flex items-center justify-center rounded-2xl border",
              compact ? "h-28" : "h-40",
            )}
          >
            {typedName.trim() ? (
              <span
                className="text-body-ink text-3xl"
                style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
              >
                {typedName}
              </span>
            ) : (
              <span className="text-meta text-ink-tertiary">
                {t("signatureAppearsHere")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <span className="text-micro text-ink-tertiary uppercase">
          {labelText}
        </span>
        {mode === "draw" && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={handleClear}
          >
            <Eraser aria-hidden className="size-4" />
            {t("clearSignature")}
          </Button>
        )}
      </div>

      {/* Witness */}
      {witnessMode && (
        <div className="space-y-1.5">
          <Label className="text-meta text-body-ink">{t("witnessName")}</Label>
          <Input
            value={witnessName}
            onChange={(e) => setWitnessName(e.target.value)}
            placeholder={t("witnessPlaceholder")}
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
          t("capturingSignature")
        ) : (
          <>
            <Check className="size-4" />
            {t("confirmSignature")}
          </>
        )}
      </Button>

      {/* Legal text */}
      <p className="text-meta text-ink-tertiary text-pretty">
        {t("legalNotice")}
      </p>
    </div>
  );
}
