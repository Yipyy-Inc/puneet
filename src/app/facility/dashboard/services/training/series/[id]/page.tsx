import { notFound } from "next/navigation";
import { trainingSeriesList } from "@/data/training-series";
import { SeriesDetail } from "../_components/series-detail";

export default async function TrainingSeriesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exists = trainingSeriesList.some((s) => s.id === id);
  if (!exists) notFound();
  return <SeriesDetail seriesId={id} />;
}
