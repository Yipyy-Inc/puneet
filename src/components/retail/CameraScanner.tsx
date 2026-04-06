"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  CameraOff,
  Loader2,
  Zap,
  ZapOff,
  Focus,
  Check,
  Repeat,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CameraScannerProps {
  onScan: (code: string) => void;
}

type ScanState = "initializing" | "scanning" | "denied";

// ── Audio feedback ─────────────────────────────────────────────────────
const BEEP_FREQ = 1800;
const BEEP_DURATION = 80;

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = BEEP_FREQ;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + BEEP_DURATION / 1000);
    setTimeout(() => ctx.close(), BEEP_DURATION + 50);
  } catch {
    // AudioContext not available
  }
}

function vibrate() {
  navigator.vibrate?.([40, 30, 40]);
}

// ── Component ──────────────────────────────────────────────────────────
export function CameraScanner({ onScan }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const lastCodeRef = useRef("");
  const lastScanTimeRef = useRef(0);

  const [scanState, setScanState] = useState<ScanState>("initializing");
  const [manual, setManual] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [multiScan, setMultiScan] = useState(false);
  const [lastDetected, setLastDetected] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [scanCount, setScanCount] = useState(0);

  useEffect(() => {
    onScanRef.current = onScan;
  });

  // Success flash + haptic + sound, then emit to parent
  const emitScan = useCallback(
    (code: string) => {
      const now = Date.now();
      // Deduplicate — same code within 1.5s
      if (
        code === lastCodeRef.current &&
        now - lastScanTimeRef.current < 1500
      ) {
        return;
      }
      lastCodeRef.current = code;
      lastScanTimeRef.current = now;

      // Immediate feedback
      playBeep();
      vibrate();
      setFlash(true);
      setLastDetected(code);
      setScanCount((c) => c + 1);
      setTimeout(() => setFlash(false), 300);

      if (multiScan) {
        // Multi-scan: emit immediately, keep scanning
        onScanRef.current(code);
      } else {
        // Single-scan: show code briefly, then emit + close
        setTimeout(() => {
          onScanRef.current(code);
        }, 600);
      }
    },
    [multiScan],
  );

  // ── Camera lifecycle ─────────────────────────────────────────────────
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    let cancelled = false;

    const start = async () => {
      try {
        // Request the MAIN wide camera:
        // - zoom: 1.0 avoids telephoto lens
        // - 1280x720 resolution — telephoto cameras need higher, so browser picks wide
        // - continuous autofocus for close-range barcode reads
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            // @ts-expect-error -- zoom valid on Android/Chrome
            zoom: { ideal: 1.0 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        el.srcObject = stream;
        await el.play();

        const track = stream.getVideoTracks()[0];
        if (track) {
          const caps = track.getCapabilities?.() as
            | Record<string, unknown>
            | undefined;

          // Continuous autofocus
          try {
            if (caps?.focusMode) {
              await track.applyConstraints({
                advanced: [
                  { focusMode: "continuous" } as MediaTrackConstraintSet,
                ],
              });
            }
          } catch {
            /* not supported */
          }

          if (caps?.torch) setTorchSupported(true);
        }

        setScanState("scanning");
        scanningRef.current = true;

        // Pick the fastest scanning strategy
        if ("BarcodeDetector" in window) {
          startNativeScanning(el);
        } else {
          startZxingScanning(el);
        }
      } catch {
        if (!cancelled) setScanState("denied");
      }
    };

    // ── Native BarcodeDetector — hardware accelerated, scans full frame ──
    const startNativeScanning = (video: HTMLVideoElement) => {
      // @ts-expect-error -- BarcodeDetector exists on Chrome/Android
      const detector = new BarcodeDetector({
        formats: [
          "ean_13",
          "ean_8",
          "upc_a",
          "upc_e",
          "code_128",
          "code_39",
          "qr_code",
          "itf",
          "codabar",
          "data_matrix",
        ],
      });

      const scan = async () => {
        if (!scanningRef.current || cancelled) return;
        try {
          // Scans the ENTIRE frame — no cropping
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            emitScan(barcodes[0].rawValue);
          }
        } catch {
          // frame not ready
        }
        if (scanningRef.current && !cancelled) {
          requestAnimationFrame(scan);
        }
      };
      requestAnimationFrame(scan);
    };

    // ── ZXing fallback — Safari/Firefox ─────────────────────────────────
    const startZxingScanning = async (video: HTMLVideoElement) => {
      const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] =
        await Promise.all([import("@zxing/browser"), import("@zxing/library")]);

      if (cancelled) return;

      const hints = new Map<number, unknown>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.ITF,
        BarcodeFormat.CODABAR,
        BarcodeFormat.DATA_MATRIX,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      // Scan full frame — default charset
      hints.set(DecodeHintType.CHARACTER_SET, "UTF-8");

      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 50,
      });

      reader.decodeFromConstraints(
        {
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        video,
        (result) => {
          if (result && !cancelled) emitScan(result.getText());
        },
      );
    };

    start();

    return () => {
      cancelled = true;
      scanningRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [emitScan]);

  // ── Torch ────────────────────────────────────────────────────────────
  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn } as MediaTrackConstraintSet],
      });
      setTorchOn((prev) => !prev);
    } catch {
      /* not available */
    }
  };

  const handleManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (manual.trim()) {
      emitScan(manual.trim());
      setManual("");
    }
  };

  return (
    <div className="space-y-3">
      {/* Viewfinder */}
      <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          className="size-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* ── Success flash overlay ──────────────────────────────── */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 transition-opacity duration-200",
            flash
              ? "bg-emerald-400/25 opacity-100"
              : "bg-transparent opacity-0",
          )}
        />

        {scanState === "initializing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
            <Loader2 className="size-8 animate-spin" />
            <p className="text-sm">Starting camera…</p>
          </div>
        )}

        {scanState === "denied" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black px-8 text-center text-white">
            <CameraOff className="size-10 text-white/50" />
            <p className="text-sm font-semibold">Camera access denied</p>
            <p className="text-xs text-white/50">
              Allow camera in your browser settings, or enter the barcode below
            </p>
          </div>
        )}

        {scanState === "scanning" && (
          <>
            {/* Corner brackets */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-48 w-64">
                <div
                  className={cn(
                    "absolute top-0 left-0 h-7 w-7 rounded-tl border-t-[3px] border-l-[3px] transition-colors duration-200",
                    flash ? "border-emerald-400" : "border-white",
                  )}
                />
                <div
                  className={cn(
                    "absolute top-0 right-0 h-7 w-7 rounded-tr border-t-[3px] border-r-[3px] transition-colors duration-200",
                    flash ? "border-emerald-400" : "border-white",
                  )}
                />
                <div
                  className={cn(
                    "absolute bottom-0 left-0 h-7 w-7 rounded-bl border-b-[3px] border-l-[3px] transition-colors duration-200",
                    flash ? "border-emerald-400" : "border-white",
                  )}
                />
                <div
                  className={cn(
                    "absolute right-0 bottom-0 h-7 w-7 rounded-br border-r-[3px] border-b-[3px] transition-colors duration-200",
                    flash ? "border-emerald-400" : "border-white",
                  )}
                />
              </div>
            </div>

            {/* Scan line */}
            <div
              className="pointer-events-none absolute h-0.5 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
              style={{
                left: "calc(50% - 128px)",
                right: "calc(50% - 128px)",
                animation: "scanSweep 2s ease-in-out infinite",
                top: "50%",
              }}
            />

            {/* Top bar: focus + scan count */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-medium text-white/80 backdrop-blur-sm">
                <Focus className="size-3" />
                Auto-focus
              </div>
              {scanCount > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                  <Check className="size-3" />
                  {scanCount} scanned
                </div>
              )}
            </div>

            {/* Bottom bar: torch + multi-scan toggle */}
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMultiScan((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium backdrop-blur-sm transition-colors",
                  multiScan
                    ? "bg-blue-500/90 text-white"
                    : "bg-black/50 text-white/80 hover:bg-black/70",
                )}
                aria-label="Toggle multi-scan"
              >
                <Repeat className="size-3.5" />
                {multiScan ? "Multi" : "Single"}
              </button>
              {torchSupported && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={cn(
                    "rounded-full p-2.5 backdrop-blur-sm transition-colors",
                    torchOn
                      ? "bg-yellow-500/90 text-white"
                      : "bg-black/50 text-white hover:bg-black/70",
                  )}
                  aria-label={
                    torchOn ? "Turn off flashlight" : "Turn on flashlight"
                  }
                >
                  {torchOn ? (
                    <ZapOff className="size-5" />
                  ) : (
                    <Zap className="size-5" />
                  )}
                </button>
              )}
            </div>

            {/* Detected code banner */}
            {lastDetected && (
              <div className="absolute right-0 bottom-16 left-0 flex justify-center">
                <div className="flex items-center gap-2 rounded-full bg-emerald-600/90 px-4 py-1.5 text-sm font-semibold text-white shadow-lg backdrop-blur-sm">
                  <Check className="size-4" />
                  {lastDetected}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes scanSweep {
          0%,
          100% {
            transform: translateY(-96px);
          }
          50% {
            transform: translateY(96px);
          }
        }
      `}</style>

      <p className="text-muted-foreground text-center text-xs">
        Point at barcode and hold steady — scans automatically
      </p>

      {/* Manual entry */}
      <form className="flex gap-2" onSubmit={handleManual}>
        <Input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Or type barcode / SKU manually…"
          className="h-9 flex-1 text-sm"
          autoComplete="off"
          inputMode="text"
        />
        <Button
          type="submit"
          size="sm"
          className="h-9"
          disabled={!manual.trim()}
        >
          Add
        </Button>
      </form>
    </div>
  );
}
