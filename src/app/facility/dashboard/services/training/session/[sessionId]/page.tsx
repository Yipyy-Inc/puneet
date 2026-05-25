import { Suspense } from "react";
import { SessionViewClient } from "./_components/session-view-client";

export default async function SessionViewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <Suspense fallback={null}>
      <SessionViewClient sessionId={sessionId} />
    </Suspense>
  );
}
