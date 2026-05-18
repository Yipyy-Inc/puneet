import { Suspense } from "react";
import { notFound } from "next/navigation";
import { clients } from "@/data/clients";
import { TrainingProfile } from "../_components/training-profile";

export default async function StudentTrainingProfilePage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const { petId: petIdRaw } = await params;
  const petId = Number(petIdRaw);
  if (!Number.isFinite(petId)) notFound();

  // Reject petIds the facility doesn't know about — TrainingProfile assumes a
  // valid pet on render.
  const exists = clients.some((c) => c.pets.some((p) => p.id === petId));
  if (!exists) notFound();

  return (
    <Suspense fallback={null}>
      <TrainingProfile petId={petId} />
    </Suspense>
  );
}
