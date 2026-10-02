import { OwnerEvaluationCard } from "@/components/customer/evaluations/owner-evaluation-card";

// An evaluation report card, for the pet's owner (the client's mock,
// 2026-10-02) — the link the email and the text carry.
export default async function CustomerEvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OwnerEvaluationCard id={id} />;
}
