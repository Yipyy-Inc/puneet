import { StaffProfileView } from "./staff-profile-view";

export default async function StaffProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StaffProfileView staffId={id} />;
}
