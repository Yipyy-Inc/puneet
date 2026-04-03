"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import { CameraOff, Loader2, Zap, ZapOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CameraScannerProps {
  onScan: (code: string) => void;
}

type ScanState = "initializing" | "scanning" | "denied";

export function CameraScanner({ onScan }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const controlsRef = useRef<IScannerControls | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const [scanState, setScanState] = useState<ScanState>("initializing");
  const [manual, setManual] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // Keep callback ref fresh — avoids re-running the camera effect on every render
  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let cancelled = false;

    const start = async () => {
      try {
        // Dynamic import — ZXing is heavy; load only when the scanner opens
        const [
          { BrowserMultiFormatReader },
          { DecodeHintType, BarcodeFormat },
        ] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);

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
        ]);

        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 150,
        });

        // decodeFromConstraints resolves once the camera stream is running
        // (not after the first scan). Camera-denied throws and we catch below.
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          el,
          (result) => {
            if (result && !cancelled) {
              onScanRef.current(result.getText());
            }
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
        setScanState("scanning");

        // Torch support — available on Chrome/Android; silently absent on iOS
        const stream = el.srcObject as MediaStream | null;
        const track = stream?.getVideoTracks()[0] ?? null;
        if (track) {
          videoTrackRef.current = track;
          const caps = track.getCapabilities?.() as
            | Record<string, unknown>
            | undefined;
          if (caps?.torch) setTorchSupported(true);
        }
      } catch {
        if (!cancelled) setScanState("denied");
      }
    };

    start();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      videoTrackRef.current = null;
    };
  }, []); // runs once on mount; camera lifecycle is fully owned here

  const toggleTorch = async () => {
    const track = videoTrackRef.current;
    if (!track) return;
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn } as MediaTrackConstraintSet],
      });
      setTorchOn((prev) => !prev);
    } catch {
      // Silently ignore — torch may not be available on this device/browser
    }
  };

  const handleManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (manual.trim()) onScanRef.current(manual.trim());
  };

  return (
    <div className="space-y-3">
      {/* Viewfinder */}
      <div className="relative aspect-square overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          className="size-full object-cover"
          playsInline
          muted
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
            {/* Target box */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="size-52 rounded-2xl border-2 border-white/70 shadow-[inset_0_0_40px_rgba(0,0,0,0.25)]" />
            </div>
            {/* Scan line */}
            <div
              className="pointer-events-none absolute top-1/2 h-px -translate-y-1/2 animate-pulse bg-red-400/80"
              style={{ left: "calc(50% - 104px)", right: "calc(50% - 104px)" }}
            />
            {/* Torch toggle — only shown if device supports it */}
            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                className="absolute right-3 bottom-3 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
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
          </>
        )}
      </div>

      <p className="text-muted-foreground text-center text-xs">
        EAN · UPC · Code 128 / 39 · QR — point and hold steady
      </p>

      {/* Manual / hardware-scanner fallback */}
      <form className="flex gap-2" onSubmit={handleManual}>
        <Input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Or enter barcode / SKU manually…"
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
