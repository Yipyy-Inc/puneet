import { RealSeriesDetail } from "../_components/real-series-detail";

export default async function TrainingSeriesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RealSeriesDetail seriesId={id} />;
}
