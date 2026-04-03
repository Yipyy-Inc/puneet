"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CameraScannerProps {
  onScan: (code: string) => void;
}

type ScanState = "initializing" | "scanning" | "denied";

export function CameraScanner({ onScan }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  // Detect API availability at render time so the effect never calls setState
  // synchronously at its top level (React Compiler constraint).
  const [scanState, setScanState] = useState<ScanState>(() => {
    if (typeof window === "undefined") return "initializing";
    return navigator.mediaDevices ? "initializing" : "denied";
  });
  const [manual, setManual] = useState("");

  // Keep callback ref fresh without re-running the camera effect
  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    let rafId: ReturnType<typeof requestAnimationFrame> | null = null;

    // If the API wasn't available, state was set to "denied" at init — bail.
    if (!navigator.mediaDevices) return;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        el.srcObject = s;
        el.play();
        setScanState("scanning");

        const BarcodeDetectorCtor = (
          window as unknown as {
            BarcodeDetector?: new (opts: { formats: string[] }) => {
              detect: (
                src: HTMLVideoElement,
              ) => Promise<{ rawValue: string }[]>;
            };
          }
        ).BarcodeDetector;

        // If BarcodeDetector isn't available (e.g. Firefox), camera still
        // shows and manual entry below works — no crash, no silent failure.
        if (!BarcodeDetectorCtor) return;

        const detector = new BarcodeDetectorCtor({
          formats: [
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
            "code_128",
            "code_39",
            "qr_code",
          ],
        });

        const scan = () => {
          if (cancelled) return;
          detector
            .detect(el)
            .then((barcodes) => {
              if (cancelled) return;
              if (barcodes.length > 0) {
                onScanRef.current(barcodes[0].rawValue);
                // Don't loop — caller will unmount this component
              } else {
                rafId = requestAnimationFrame(scan);
              }
            })
            .catch(() => {
              if (!cancelled) rafId = requestAnimationFrame(scan);
            });
        };

        // Short delay so the camera has time to focus before first detect pass
        const initTimer = setTimeout(() => {
          if (!cancelled) scan();
        }, 600);

        // Expose timer for cleanup
        (el as HTMLVideoElement & { _initTimer?: ReturnType<typeof setTimeout> })._initTimer =
          initTimer;
      })
      .catch(() => {
        if (!cancelled) setScanState("denied");
      });

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      const timer = (
        el as HTMLVideoElement & { _initTimer?: ReturnType<typeof setTimeout> }
      )._initTimer;
      if (timer !== undefined) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []); // runs once on mount — camera lifecycle owned by this component

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
              Allow camera in your browser settings, or enter the barcode
              below
            </p>
          </div>
        )}

        {scanState === "scanning" && (
          <>
            {/* Target box */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="size-52 rounded-2xl border-2 border-white/70 shadow-[inset_0_0_40px_rgba(0,0,0,0.25)]" />
            </div>
            {/* Animated scan line */}
            <div
              className="pointer-events-none absolute top-1/2 h-px -translate-y-1/2 animate-pulse bg-red-400/80"
              style={{ left: "calc(50% - 104px)", right: "calc(50% - 104px)" }}
            />
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
