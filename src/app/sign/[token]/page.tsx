import { SigningPortal } from "./_components/SigningPortal";

export default async function SignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SigningPortal token={token} />;
}
