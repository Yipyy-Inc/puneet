import { AppointmentDetailPage } from "@/components/facility/grooming/appointment-detail-page";

export default async function GroomingAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AppointmentDetailPage id={id} />;
}
