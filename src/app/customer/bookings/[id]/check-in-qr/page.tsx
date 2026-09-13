import { notFound } from "next/navigation";

import { CheckInCode } from "./_components/check-in-code";

// The code an owner shows at the desk for one booking. Opening the page makes
// the code: the server mints it, keeps only its hash, and answers the kiosk
// link the QR code carries (/api/customer/yipyy-go/bookings/[ref]/check-in-pass).
export default async function CheckInCodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bookingRef = Number(id);
  if (!Number.isSafeInteger(bookingRef) || bookingRef <= 0) notFound();

  return <CheckInCode bookingRef={bookingRef} />;
}
