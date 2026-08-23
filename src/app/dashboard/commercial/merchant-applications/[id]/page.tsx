import { ApplicationReview } from "./_components/application-review";

export default async function MerchantApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ApplicationReview id={id} />;
}
