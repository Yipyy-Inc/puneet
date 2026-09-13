import { notFound } from "next/navigation";

import { YipyyGoForm } from "./_components/yipyy-go-form";

// The pre-arrival form for one booking, as its owner fills it in. The booking
// is the URL's ref and the pet the `?pet=` ref; who may open it, the
// facility's template, and whether each form can still change are the
// server's to say (/api/customer/yipyy-go/bookings/[ref]).
export default async function YipyyGoFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pet?: string | string[] }>;
}) {
  const { id } = await params;
  const bookingRef = Number(id);
  if (!Number.isSafeInteger(bookingRef) || bookingRef <= 0) notFound();

  const { pet } = await searchParams;
  const petRef = Number(Array.isArray(pet) ? pet[0] : pet);

  return (
    <YipyyGoForm
      bookingRef={bookingRef}
      petRef={Number.isSafeInteger(petRef) && petRef > 0 ? petRef : null}
    />
  );
}
