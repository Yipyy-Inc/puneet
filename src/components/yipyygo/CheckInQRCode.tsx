"use client";

import { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { buildCheckInUrl } from "@/lib/qr-checkin";

interface CheckInQRCodeProps {
  /** Token from Express Check-in form (qrCheckInToken). */
  token: string;
  /** Optional: size in pixels (default 256). */
  size?: number;
  className?: string;
}

export function CheckInQRCode({
  token,
  size = 256,
  className,
}: CheckInQRCodeProps) {
  const url = useMemo(() => buildCheckInUrl(token), [token]);
  return (
    <div className={className}>
      <QRCodeSVG value={url} size={size} level="M" includeMargin />
    </div>
  );
}
