import { redirect } from "next/navigation";

export default async function CustomServiceIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/facility/dashboard/services/custom/${slug}/rates`);
}
