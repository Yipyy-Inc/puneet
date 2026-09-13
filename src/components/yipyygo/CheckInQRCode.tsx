"use client";

import { QRCodeSVG } from "qrcode.react";

// A check-in code as a QR code. It carries the kiosk link the server answered
// (/api/customer/yipyy-go/bookings/[ref]/check-in-pass). It used to wrap a
// token that one browser made and kept in memory, which no other device could
// check.

interface CheckInQRCodeProps {
  /** The kiosk link, its code included. */
  url: string;
  /** What a screen reader announces in place of the pattern. */
  label: string;
  /** In pixels. */
  size?: number;
  className?: string;
}

export function CheckInQRCode({
  url,
  label,
  size = 256,
  className,
}: CheckInQRCodeProps) {
  return (
    <div role="img" aria-label={label} className={className}>
      <QRCodeSVG value={url} size={size} level="M" includeMargin />
    </div>
  );
}
