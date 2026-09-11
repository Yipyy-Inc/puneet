import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TrainingProfile } from "../_components/training-profile";

export default async function StudentTrainingProfilePage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const { petId: petIdRaw } = await params;
  const petId = Number(petIdRaw);
  if (!Number.isFinite(petId)) notFound();

  // Whether the pet exists was checked against `@/data/clients`, so every
  // real dog's profile was a 404. The profile reads the facility's own
  // clients and says so itself when the pet is not among them.
  return (
    <Suspense fallback={null}>
      <TrainingProfile petId={petId} />
    </Suspense>
  );
}
