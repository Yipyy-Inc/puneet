import { IntegrationDetailClient } from "./_components/integration-detail-client";

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IntegrationDetailClient integrationId={id} />;
}
