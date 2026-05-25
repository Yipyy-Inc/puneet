import { Suspense } from "react";
import { AcceptOfferClient } from "./_components/accept-offer-client";

export default async function AcceptOfferPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = await params;
  return (
    <Suspense fallback={null}>
      <AcceptOfferClient enrollmentId={enrollmentId} />
    </Suspense>
  );
}
